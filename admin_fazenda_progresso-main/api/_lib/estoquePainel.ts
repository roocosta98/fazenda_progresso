import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exigirAcessoCustos } from './custosAuth.js';

let tokenSankhya: { valor: string; expiraEm: number } | null = null;

async function autenticarSankhya() {
  if (tokenSankhya && tokenSankhya.expiraEm > Date.now()) return tokenSankhya.valor;
  const url = process.env.SANKHYA_API_URL?.replace(/\/$/, '');
  const clientId = process.env.SANKHYA_CLIENT_ID;
  const clientSecret = process.env.SANKHYA_CLIENT_SECRET;
  const xToken = process.env.SANKHYA_X_TOKEN;
  if (!url || !clientId || !clientSecret || !xToken) {
    throw new Error('Integração Sankhya não configurada. Cadastre SANKHYA_API_URL, SANKHYA_CLIENT_ID, SANKHYA_CLIENT_SECRET e SANKHYA_X_TOKEN na Vercel.');
  }
  const resposta = await fetch(`${url}/authenticate`, {
    method: 'POST', headers: { 'X-Token': xToken, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
  });
  if (!resposta.ok) throw new Error(`Não foi possível autenticar no Sankhya (${resposta.status}).`);
  const corpo = await resposta.json() as { access_token?: string; expires_in?: number };
  if (!corpo.access_token) throw new Error('Sankhya não retornou access_token.');
  tokenSankhya = { valor: corpo.access_token, expiraEm: Date.now() + Math.max((corpo.expires_in ?? 60) - 15, 5) * 1000 };
  return tokenSankhya.valor;
}

export async function consultarSankhya(sql: string): Promise<Record<string, unknown>[]> {
  const url = process.env.SANKHYA_API_URL?.replace(/\/$/, '');
  const executar = async (token: string) => {
    const resposta = await fetch(`${url}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } }),
    });
    if (!resposta.ok) throw new Error(`Consulta ao Sankhya falhou (${resposta.status}).`);
    return resposta.json() as Promise<{ status?: string; statusMessage?: string; responseBody?: { fieldsMetadata?: { name?: string }[]; rows?: unknown[][] } }>;
  };
  let retorno = await executar(await autenticarSankhya());
  if (retorno.status !== '1') {
    tokenSankhya = null;
    retorno = await executar(await autenticarSankhya());
  }
  if (retorno.status !== '1') throw new Error(`Sankhya: ${retorno.statusMessage ?? 'consulta rejeitada'}`);
  const colunas = retorno.responseBody?.fieldsMetadata?.map((campo) => campo.name ?? '') ?? [];
  return (retorno.responseBody?.rows ?? []).map((linha) => Object.fromEntries(colunas.map((coluna, indice) => [coluna, linha[indice] ?? null])));
}

// A API do Sankhya (DbExplorerSP.executeQuery) não aceita parâmetros — o SQL vai como texto puro
// direto pra query. Por isso as datas do filtro nunca são interpoladas cruas: sempre validadas
// contra este formato antes de entrar em qualquer string de SQL.
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function validarDataIso(valor: unknown): string | null {
  return typeof valor === 'string' && DATA_ISO.test(valor) ? valor : null;
}

function primeiroDiaMesAtualIso(): string {
  const agora = new Date();
  return `${agora.getUTCFullYear()}-${String(agora.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function hojeIso(): string {
  return new Date().toISOString().split('T')[0];
}

function periodoEstoque(req: VercelRequest): { dataInicio: string; dataFim: string; dias: number } {
  const dataInicio = validarDataIso(Array.isArray(req.query.dataInicio) ? req.query.dataInicio[0] : req.query.dataInicio) ?? primeiroDiaMesAtualIso();
  const dataFim = validarDataIso(Array.isArray(req.query.dataFim) ? req.query.dataFim[0] : req.query.dataFim) ?? hojeIso();
  const dias = Math.max(Math.round((new Date(`${dataFim}T00:00:00Z`).getTime() - new Date(`${dataInicio}T00:00:00Z`).getTime()) / 86_400_000) + 1, 1);
  return { dataInicio, dataFim, dias };
}

// As consultas reproduzem o módulo de estoque recebido: dados reais do
// Sankhya (TGF*) e cada seção é independente para um schema incompleto não
// derrubar o painel inteiro. Ruptura, Curva ABC, sem movimentação, fornecedores e cotações
// refletem o estoque/cadastro ATUAL (não fazem sentido filtrados por período); só o consumo por
// requisição (giro/KPI) varia com o período escolhido no filtro de data da tela.
function montarConsultas(dataInicio: string, dataFim: string, dias: number) {
  const filtroData = `CAB.DTNEG >= CONVERT(date,'${dataInicio}',23) AND CAB.DTNEG < DATEADD(DAY,1,CONVERT(date,'${dataFim}',23))`;
  return {
  ruptura: `SELECT TOP 2000 P.CODPROD, P.DESCRPROD, P.REFERENCIA, L.DESCRLOCAL AS LOCAL, E.CONTROLE AS LOTE,
      E.ESTOQUE, P.ESTMIN AS MINIMO, P.ESTMAX AS MAXIMO, G.ESTMINGIR AS MINIMOSUGERIDO, G.DIASRUPTURA, G.PRODFALTA, G.PONTOPED AS PONTOPEDIDO
    FROM TGFPRO P LEFT JOIN TGFEST E ON E.CODPROD=P.CODPROD AND E.CODEMP=1 LEFT JOIN TGFLOC L ON L.CODLOCAL=E.CODLOCAL
      LEFT JOIN TGFGIR G ON G.CODPROD=P.CODPROD AND G.CODLOCAL=E.CODLOCAL AND G.CODEMP=1
    WHERE P.ATIVO='S' AND (G.PRODFALTA='S' OR (P.ESTMIN IS NOT NULL AND E.ESTOQUE<=P.ESTMIN))
    ORDER BY G.DIASRUPTURA DESC, E.ESTOQUE ASC`,
  semMovimentacao: `SELECT TOP 2000 P.CODPROD, P.DESCRPROD, L.DESCRLOCAL AS LOCAL, G.GIRODIARIO, G.DIASSEMVENDA, G.ESTCUSTGER AS VALORESTOQUE
    FROM TGFGIR G JOIN TGFPRO P ON P.CODPROD=G.CODPROD LEFT JOIN TGFLOC L ON L.CODLOCAL=G.CODLOCAL
    WHERE P.ATIVO='S' AND G.CODEMP=1 AND G.DIASSEMVENDA>=90 ORDER BY G.DIASSEMVENDA DESC`,
  valor: `WITH Base AS (
      SELECT P.CODPROD, P.DESCRPROD, ISNULL(EST.ESTOQUE, 0) AS ESTOQUE, CUS.CUSTO, ISNULL(EST.ESTOQUE, 0)*CUS.CUSTO AS VALORTOTAL
      FROM TGFPRO P
      CROSS APPLY (SELECT SUM(E.ESTOQUE) AS ESTOQUE FROM TGFEST E WHERE E.CODPROD=P.CODPROD AND E.CODEMP=1) EST
      CROSS APPLY (SELECT TOP 1 COALESCE(C.CUSMEDICM,C.CUSSEMICM) AS CUSTO FROM TGFCUS C WHERE C.CODPROD=P.CODPROD AND C.CODEMP=1 ORDER BY C.DTATUAL DESC,C.NUNOTA DESC) CUS
      WHERE P.ATIVO='S' AND CUS.CUSTO IS NOT NULL
    ), Pareto AS (
      SELECT *, SUM(VALORTOTAL) OVER(ORDER BY VALORTOTAL DESC ROWS UNBOUNDED PRECEDING) / NULLIF(SUM(VALORTOTAL) OVER(),0) AS ACUMULADO FROM Base
    ) SELECT TOP 2000 CODPROD, DESCRPROD, ESTOQUE, CUSTO, VALORTOTAL,
      CASE WHEN ACUMULADO<=.80 THEN 'A' WHEN ACUMULADO<=.95 THEN 'B' ELSE 'C' END AS CLASSEABC
    FROM Pareto ORDER BY VALORTOTAL DESC`,
  // Curva ABC agregada sobre a base INTEIRA (não só os 100 produtos de maior valor da consulta
  // "valor" acima) — com ~22 mil produtos ativos precificados, o top 100 por valor já ultrapassa
  // 80% do valor total sozinho, então toda consulta limitada dava 100% Curva A e nada em B/C.
  curvaAbc: `WITH Base AS (
      SELECT ISNULL(EST.ESTOQUE, 0)*CUS.CUSTO AS VALORTOTAL
      FROM TGFPRO P
      CROSS APPLY (SELECT SUM(E.ESTOQUE) AS ESTOQUE FROM TGFEST E WHERE E.CODPROD=P.CODPROD AND E.CODEMP=1) EST
      CROSS APPLY (SELECT TOP 1 COALESCE(C.CUSMEDICM,C.CUSSEMICM) AS CUSTO FROM TGFCUS C WHERE C.CODPROD=P.CODPROD AND C.CODEMP=1 ORDER BY C.DTATUAL DESC,C.NUNOTA DESC) CUS
      WHERE P.ATIVO='S' AND CUS.CUSTO IS NOT NULL
    ), Pareto AS (
      SELECT VALORTOTAL, SUM(VALORTOTAL) OVER(ORDER BY VALORTOTAL DESC ROWS UNBOUNDED PRECEDING) / NULLIF(SUM(VALORTOTAL) OVER(),0) AS ACUMULADO FROM Base
    ) SELECT
        CASE WHEN ACUMULADO<=.80 THEN 'A' WHEN ACUMULADO<=.95 THEN 'B' ELSE 'C' END AS CLASSEABC,
        COUNT(*) AS QTDPRODUTOS, SUM(VALORTOTAL) AS VALORTOTAL
      FROM Pareto GROUP BY CASE WHEN ACUMULADO<=.80 THEN 'A' WHEN ACUMULADO<=.95 THEN 'B' ELSE 'C' END`,
  // CONFIABFORN/QUALATEND/QUALPROD ficam com valor 0 em praticamente 100% das linhas
  // (nunca são de fato preenchidos nesta instalação do Sankhya) — mostrar essas colunas
  // é ruído. PRAZOENTREGA e MELHOR (vitória de cotação) são os campos com dado real.
  fornecedores: `SELECT TOP 2000 PAR.NOMEPARC AS FORNECEDOR,
      COUNT(*) AS TOTALCOTACOES,
      SUM(CASE WHEN ITC.MELHOR='S' THEN 1 ELSE 0 END) AS TOTALVENCIDAS,
      ROUND(100.0 * SUM(CASE WHEN ITC.MELHOR='S' THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 1) AS TAXAVITORIA,
      AVG(CAST(ITC.PRAZOENTREGA AS DECIMAL(18,2))) AS PRAZOMEDIO,
      COUNT(DISTINCT ITC.CODPROD) AS PRODUTOSDISTINTOS
    FROM TGFITC ITC LEFT JOIN TGFPAR PAR ON PAR.CODPARC=ITC.CODPARC
    WHERE ITC.CODPARC <> 0
    GROUP BY PAR.NOMEPARC
    ORDER BY TOTALVENCIDAS DESC, TOTALCOTACOES DESC`,
  // O status da cotação em si (TGFCOT.SITUACAO) não reflete o fechamento real -
  // cada item tem sua própria situação (TGFITC.SITUACAO), e uma cotação só está
  // de fato "em aberto" se ainda tiver algum item não Fechado/Cancelado.
  cotacoes: `SELECT TOP 2000 COT.NUMCOTACAO, COT.DHINIC, COT.DHFINAL, USU.NOMEUSU AS COMPRADOR,
      (SELECT COUNT(*) FROM TGFITC I WHERE I.NUMCOTACAO=COT.NUMCOTACAO) AS TOTALITENS,
      (SELECT COUNT(*) FROM TGFITC I WHERE I.NUMCOTACAO=COT.NUMCOTACAO AND UPPER(LTRIM(RTRIM(CAST(I.SITUACAO AS VARCHAR(20))))) NOT IN ('F','C','FECHADA','CANCELADA')) AS ITENSEMABERTO
    FROM TGFCOT COT LEFT JOIN TSIUSU USU ON USU.CODUSU=COT.CODUSUREQ
    WHERE EXISTS (SELECT 1 FROM TGFITC I WHERE I.NUMCOTACAO=COT.NUMCOTACAO AND UPPER(LTRIM(RTRIM(CAST(I.SITUACAO AS VARCHAR(20))))) NOT IN ('F','C','FECHADA','CANCELADA'))
    ORDER BY COT.DHFINAL ASC`,
  giroProdutos: `WITH MOVIMENTOS AS (
      SELECT CAB.CODEMP, ITE.CODPROD,
        SUM(CASE WHEN CAB.TIPMOV IN('C','F') THEN ITE.QTDNEG ELSE 0 END) AS QTD_COMPRA,
        SUM(CASE WHEN CAB.TIPMOV = 'Q' THEN ITE.QTDNEG ELSE 0 END) AS QTD_REQUISICAO,
        SUM(CASE WHEN CAB.TIPMOV = 'E' THEN ITE.QTDNEG ELSE 0 END) AS QTD_DEV_COMPRA
      FROM TGFCAB CAB
      INNER JOIN TGFITE ITE ON ITE.NUNOTA = CAB.NUNOTA
      WHERE ${filtroData}
        AND CAB.TIPMOV IN ('C','Q','E','F') AND CAB.STATUSNOTA = 'L' AND CAB.CODEMP = 1
      GROUP BY CAB.CODEMP, ITE.CODPROD
    ), ESTOQUE AS (
      SELECT EST.CODEMP, EST.CODPROD, SUM(EST.ESTOQUE) AS ESTOQUE_ATUAL FROM TGFEST EST GROUP BY EST.CODEMP, EST.CODPROD
    )
    SELECT TOP 2000 MOV.CODPROD, PRO.DESCRPROD,
      MOV.QTD_COMPRA, MOV.QTD_DEV_COMPRA, MOV.QTD_COMPRA - MOV.QTD_DEV_COMPRA AS COMPRA_LIQUIDA,
      MOV.QTD_REQUISICAO AS CONSUMO,
      ISNULL(EST.ESTOQUE_ATUAL, 0) AS ESTOQUE_ATUAL, ISNULL(PRO.ESTMIN, 0) AS ESTMIN, ISNULL(PRO.ESTMAX, 0) AS ESTMAX,
      CASE WHEN ISNULL(EST.ESTOQUE_ATUAL, 0) > 0 THEN MOV.QTD_REQUISICAO / NULLIF(EST.ESTOQUE_ATUAL, 0) ELSE 0 END AS GIRO_ESTOQUE,
      CASE WHEN MOV.QTD_REQUISICAO > 0 THEN ISNULL(EST.ESTOQUE_ATUAL, 0) / NULLIF(MOV.QTD_REQUISICAO / ${dias}.0, 0) ELSE NULL END AS DIAS_COBERTURA
    FROM MOVIMENTOS MOV
    INNER JOIN TGFPRO PRO ON PRO.CODPROD = MOV.CODPROD
    LEFT JOIN ESTOQUE EST ON EST.CODEMP = MOV.CODEMP AND EST.CODPROD = MOV.CODPROD
    INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD = PRO.CODGRUPOPROD
    WHERE GRU.CODGRUPAI NOT IN (9000000,13000000,15000000,16000000,22000000,23000000,24000000,25000000,27000000,29000000,98000000)
    ORDER BY MOV.QTD_REQUISICAO DESC`,
  kpis: `SELECT
    (SELECT COUNT(DISTINCT P.CODPROD) FROM TGFPRO P LEFT JOIN TGFEST E ON E.CODPROD=P.CODPROD AND E.CODEMP=1 LEFT JOIN TGFGIR G ON G.CODPROD=P.CODPROD AND G.CODLOCAL=E.CODLOCAL AND G.CODEMP=1 WHERE P.ATIVO='S' AND (G.PRODFALTA='S' OR (P.ESTMIN IS NOT NULL AND E.ESTOQUE<=P.ESTMIN))) AS TOTALRUPTURA,
    (SELECT COUNT(DISTINCT G.CODPROD) FROM TGFGIR G JOIN TGFPRO P ON P.CODPROD=G.CODPROD WHERE P.ATIVO='S' AND G.CODEMP=1 AND G.DIASSEMVENDA>=90) AS TOTALSEMMOVIMENTACAO,
    (SELECT COUNT(DISTINCT COT.NUMCOTACAO) FROM TGFCOT COT WHERE EXISTS (SELECT 1 FROM TGFITC I WHERE I.NUMCOTACAO=COT.NUMCOTACAO AND UPPER(LTRIM(RTRIM(CAST(I.SITUACAO AS VARCHAR(20))))) NOT IN ('F','C','FECHADA','CANCELADA'))) AS TOTALCOTACOES,
    (SELECT SUM(ISNULL(EST.ESTOQUE,0)*CUS.CUSTO) FROM TGFPRO P CROSS APPLY (SELECT SUM(E.ESTOQUE) AS ESTOQUE FROM TGFEST E WHERE E.CODPROD=P.CODPROD AND E.CODEMP=1) EST CROSS APPLY (SELECT TOP 1 COALESCE(C.CUSMEDICM,C.CUSSEMICM) AS CUSTO FROM TGFCUS C WHERE C.CODPROD=P.CODPROD AND C.CODEMP=1 ORDER BY C.DTATUAL DESC,C.NUNOTA DESC) CUS WHERE P.ATIVO='S' AND CUS.CUSTO IS NOT NULL) AS VALORTOTALESTOQUE,
    (SELECT SUM(GIR.CONSUMO) FROM (
        SELECT ITE.CODPROD, SUM(CASE WHEN CAB.TIPMOV='Q' THEN ITE.QTDNEG ELSE 0 END) AS CONSUMO
        FROM TGFCAB CAB INNER JOIN TGFITE ITE ON ITE.NUNOTA=CAB.NUNOTA
        WHERE ${filtroData} AND CAB.TIPMOV IN ('C','Q','E','F') AND CAB.STATUSNOTA='L' AND CAB.CODEMP=1
        GROUP BY ITE.CODPROD
      ) GIR INNER JOIN TGFPRO PRO ON PRO.CODPROD=GIR.CODPROD INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=PRO.CODGRUPOPROD
      WHERE GRU.CODGRUPAI NOT IN (9000000,13000000,15000000,16000000,22000000,23000000,24000000,25000000,27000000,29000000,98000000)
    ) AS CONSUMOPERIODO,
    (SELECT SUM(ISNULL(EST.ESTOQUE,0)) FROM TGFPRO P CROSS APPLY (SELECT SUM(E.ESTOQUE) AS ESTOQUE FROM TGFEST E WHERE E.CODPROD=P.CODPROD AND E.CODEMP=1) EST INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=P.CODGRUPOPROD WHERE P.ATIVO='S' AND GRU.CODGRUPAI NOT IN (9000000,13000000,15000000,16000000,22000000,23000000,24000000,25000000,27000000,29000000,98000000)) AS ESTOQUETOTALGIRO`,
  };
}

export async function painelEstoque(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
  if (!exigirAcessoCustos(req, res)) return;
  try {
    const { dataInicio, dataFim, dias } = periodoEstoque(req);
    const consultas = montarConsultas(dataInicio, dataFim, dias);
    const erros: Record<string, string> = {};
    const executar = async (nome: keyof typeof consultas) => {
      try { return await consultarSankhya(consultas[nome]); }
      catch (error) { erros[nome] = error instanceof Error ? error.message : 'Falha na consulta'; return []; }
    };
    const [ruptura, semMovimentacao, valor, curvaAbc, fornecedores, cotacoes, giroProdutos, kpiRows] = await Promise.all([
      executar('ruptura'), executar('semMovimentacao'), executar('valor'), executar('curvaAbc'), executar('fornecedores'), executar('cotacoes'), executar('giroProdutos'), executar('kpis'),
    ]);
    const kpis = kpiRows[0] ?? {};
    const giroEstoque = Number(kpis.CONSUMOPERIODO ?? 0) / Number(kpis.ESTOQUETOTALGIRO ?? 0) || null;
    res.status(200).json({ ruptura, semMovimentacao, valor, curvaAbc, fornecedores, cotacoes, giroProdutos, kpis: { ...kpis, giroEstoque }, periodo: { dataInicio, dataFim }, erros });
  } catch (error) {
    res.status(502).json({ error: 'Não foi possível conectar ao banco de dados de estoque.', detalhe: error instanceof Error ? error.message : undefined });
  }
}
