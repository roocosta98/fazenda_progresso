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

// As consultas reproduzem o módulo de estoque recebido: dados reais do
// Sankhya (TGF*) e cada seção é independente para um schema incompleto não
// derrubar o painel inteiro.
const consultas = {
  ruptura: `SELECT TOP 100 P.CODPROD, P.DESCRPROD, P.REFERENCIA, L.DESCRLOCAL AS LOCAL, E.CODEMP AS EMPRESA, E.CONTROLE AS LOTE,
      E.ESTOQUE, P.ESTMIN AS MINIMO, P.ESTMAX AS MAXIMO, G.ESTMINGIR AS MINIMOSUGERIDO, G.DIASRUPTURA, G.PRODFALTA, G.PONTOPED AS PONTOPEDIDO
    FROM TGFPRO P LEFT JOIN TGFEST E ON E.CODPROD=P.CODPROD LEFT JOIN TGFLOC L ON L.CODLOCAL=E.CODLOCAL
      LEFT JOIN TGFGIR G ON G.CODPROD=P.CODPROD AND G.CODLOCAL=E.CODLOCAL AND G.CODEMP=E.CODEMP
    WHERE P.ATIVO='S' AND (G.PRODFALTA='S' OR (P.ESTMIN IS NOT NULL AND E.ESTOQUE<=P.ESTMIN))
    ORDER BY G.DIASRUPTURA DESC, E.ESTOQUE ASC`,
  semMovimentacao: `SELECT TOP 100 P.CODPROD, P.DESCRPROD, L.DESCRLOCAL AS LOCAL, G.CODEMP AS EMPRESA, G.GIRODIARIO, G.DIASSEMVENDA, G.ESTCUSTGER AS VALORESTOQUE
    FROM TGFGIR G JOIN TGFPRO P ON P.CODPROD=G.CODPROD LEFT JOIN TGFLOC L ON L.CODLOCAL=G.CODLOCAL
    WHERE P.ATIVO='S' AND G.DIASSEMVENDA>=90 ORDER BY G.DIASSEMVENDA DESC`,
  valor: `WITH Base AS (
      SELECT P.CODPROD, P.DESCRPROD, ISNULL(EST.ESTOQUE, 0) AS ESTOQUE, CUS.CUSTO, ISNULL(EST.ESTOQUE, 0)*CUS.CUSTO AS VALORTOTAL
      FROM TGFPRO P
      CROSS APPLY (SELECT SUM(E.ESTOQUE) AS ESTOQUE FROM TGFEST E WHERE E.CODPROD=P.CODPROD AND E.CODEMP=1) EST
      CROSS APPLY (SELECT TOP 1 COALESCE(C.CUSMEDICM,C.CUSSEMICM) AS CUSTO FROM TGFCUS C WHERE C.CODPROD=P.CODPROD AND C.CODEMP=1 ORDER BY C.DTATUAL DESC,C.NUNOTA DESC) CUS
      WHERE P.ATIVO='S' AND CUS.CUSTO IS NOT NULL
    ), Pareto AS (
      SELECT *, SUM(VALORTOTAL) OVER(ORDER BY VALORTOTAL DESC ROWS UNBOUNDED PRECEDING) / NULLIF(SUM(VALORTOTAL) OVER(),0) AS ACUMULADO FROM Base
    ) SELECT TOP 100 CODPROD, DESCRPROD, ESTOQUE, CUSTO, VALORTOTAL,
      CASE WHEN ACUMULADO<=.80 THEN 'A' WHEN ACUMULADO<=.95 THEN 'B' ELSE 'C' END AS CLASSEABC
    FROM Pareto ORDER BY VALORTOTAL DESC`,
  fornecedores: `SELECT TOP 100 PAR.NOMEPARC AS FORNECEDOR, AVG(CAST(ITC.CONFIABFORN AS DECIMAL(18,2))) AS CONFIABILIDADE,
      AVG(CAST(ITC.QUALATEND AS DECIMAL(18,2))) AS QUALIDADEATENDIMENTO, AVG(CAST(ITC.QUALPROD AS DECIMAL(18,2))) AS QUALIDADEPRODUTO,
      AVG(CAST(ITC.PRAZOENTREGA AS DECIMAL(18,2))) AS PRAZOMEDIO, COUNT(*) AS TOTALCOTACOES,
      SUM(CASE WHEN ITC.MELHOR='S' THEN 1 ELSE 0 END) AS TOTALVENCIDAS
    FROM TGFITC ITC LEFT JOIN TGFPAR PAR ON PAR.CODPARC=ITC.CODPARC GROUP BY PAR.NOMEPARC
    ORDER BY TOTALVENCIDAS DESC, CONFIABILIDADE DESC`,
  cotacoes: `SELECT TOP 100 COT.NUMCOTACAO, COT.DHINIC, COT.DHFINAL, COT.SITUACAO, USU.NOMEUSU AS COMPRADOR,
      (SELECT COUNT(*) FROM TGFITC I WHERE I.NUMCOTACAO=COT.NUMCOTACAO) AS TOTALITENS
    FROM TGFCOT COT LEFT JOIN TSIUSU USU ON USU.CODUSU=COT.CODUSUREQ
    WHERE CAST(COT.SITUACAO AS VARCHAR(20)) NOT IN ('F','C') ORDER BY COT.DHFINAL ASC`,
  giroProdutos: `WITH MOVIMENTOS AS (
      SELECT CAB.CODEMP, ITE.CODPROD,
        SUM(CASE WHEN CAB.TIPMOV IN('C','F') THEN ITE.QTDNEG ELSE 0 END) AS QTD_COMPRA,
        SUM(CASE WHEN CAB.TIPMOV = 'Q' THEN ITE.QTDNEG ELSE 0 END) AS QTD_REQUISICAO,
        SUM(CASE WHEN CAB.TIPMOV = 'E' THEN ITE.QTDNEG ELSE 0 END) AS QTD_DEV_COMPRA
      FROM TGFCAB CAB
      INNER JOIN TGFITE ITE ON ITE.NUNOTA = CAB.NUNOTA
      WHERE CAB.DTNEG BETWEEN DATEADD(DAY,-90,GETDATE()) AND GETDATE()
        AND CAB.TIPMOV IN ('C','Q','E','F') AND CAB.STATUSNOTA = 'L' AND CAB.CODEMP = 1
      GROUP BY CAB.CODEMP, ITE.CODPROD
    ), ESTOQUE AS (
      SELECT EST.CODEMP, EST.CODPROD, SUM(EST.ESTOQUE) AS ESTOQUE_ATUAL FROM TGFEST EST GROUP BY EST.CODEMP, EST.CODPROD
    )
    SELECT TOP 100 MOV.CODEMP, MOV.CODPROD, PRO.DESCRPROD,
      MOV.QTD_COMPRA, MOV.QTD_DEV_COMPRA, MOV.QTD_COMPRA - MOV.QTD_DEV_COMPRA AS COMPRA_LIQUIDA,
      MOV.QTD_REQUISICAO AS CONSUMO,
      ISNULL(EST.ESTOQUE_ATUAL, 0) AS ESTOQUE_ATUAL, ISNULL(PRO.ESTMIN, 0) AS ESTMIN, ISNULL(PRO.ESTMAX, 0) AS ESTMAX,
      CASE WHEN ISNULL(EST.ESTOQUE_ATUAL, 0) > 0 THEN MOV.QTD_REQUISICAO / NULLIF(EST.ESTOQUE_ATUAL, 0) ELSE 0 END AS GIRO_ESTOQUE,
      CASE WHEN MOV.QTD_REQUISICAO > 0 THEN ISNULL(EST.ESTOQUE_ATUAL, 0) / NULLIF(MOV.QTD_REQUISICAO / 90.0, 0) ELSE NULL END AS DIAS_COBERTURA
    FROM MOVIMENTOS MOV
    INNER JOIN TGFPRO PRO ON PRO.CODPROD = MOV.CODPROD
    LEFT JOIN ESTOQUE EST ON EST.CODEMP = MOV.CODEMP AND EST.CODPROD = MOV.CODPROD
    INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD = PRO.CODGRUPOPROD
    WHERE GRU.CODGRUPAI NOT IN (9000000,13000000,15000000,16000000,22000000,23000000,24000000,25000000,27000000,29000000,98000000)
    ORDER BY MOV.CODEMP, MOV.QTD_REQUISICAO DESC`,
  kpis: `SELECT
    (SELECT COUNT(DISTINCT P.CODPROD) FROM TGFPRO P LEFT JOIN TGFEST E ON E.CODPROD=P.CODPROD LEFT JOIN TGFGIR G ON G.CODPROD=P.CODPROD AND G.CODLOCAL=E.CODLOCAL AND G.CODEMP=E.CODEMP WHERE P.ATIVO='S' AND (G.PRODFALTA='S' OR (P.ESTMIN IS NOT NULL AND E.ESTOQUE<=P.ESTMIN))) AS TOTALRUPTURA,
    (SELECT COUNT(DISTINCT G.CODPROD) FROM TGFGIR G JOIN TGFPRO P ON P.CODPROD=G.CODPROD WHERE P.ATIVO='S' AND G.DIASSEMVENDA>=90) AS TOTALSEMMOVIMENTACAO,
    (SELECT COUNT(*) FROM TGFCOT WHERE CAST(SITUACAO AS VARCHAR(20)) NOT IN ('F','C')) AS TOTALCOTACOES,
    (SELECT SUM(ISNULL(EST.ESTOQUE,0)*CUS.CUSTO) FROM TGFPRO P CROSS APPLY (SELECT SUM(E.ESTOQUE) AS ESTOQUE FROM TGFEST E WHERE E.CODPROD=P.CODPROD AND E.CODEMP=1) EST CROSS APPLY (SELECT TOP 1 COALESCE(C.CUSMEDICM,C.CUSSEMICM) AS CUSTO FROM TGFCUS C WHERE C.CODPROD=P.CODPROD AND C.CODEMP=1 ORDER BY C.DTATUAL DESC,C.NUNOTA DESC) CUS WHERE P.ATIVO='S' AND CUS.CUSTO IS NOT NULL) AS VALORTOTALESTOQUE,
    (SELECT SUM(I.CUSTO*I.QTDNEG) FROM TGFITE I WHERE EXISTS (SELECT 1 FROM TGFCAB C WHERE C.NUNOTA=I.NUNOTA AND C.CODEMP=1 AND C.DTNEG>=DATEADD(DAY,-90,GETDATE()) AND EXISTS (SELECT 1 FROM TGFTOP T WHERE T.CODTIPOPER=C.CODTIPOPER AND T.ATUALEST='B' AND T.DESCROPER LIKE '%VENDA%'))) AS CUSTOVENDAS90`
};

export async function painelEstoque(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
  if (!exigirAcessoCustos(req, res)) return;
  try {
    const erros: Record<string, string> = {};
    const executar = async (nome: keyof typeof consultas) => {
      try { return await consultarSankhya(consultas[nome]); }
      catch (error) { erros[nome] = error instanceof Error ? error.message : 'Falha na consulta'; return []; }
    };
    const [ruptura, semMovimentacao, valor, fornecedores, cotacoes, giroProdutos, kpiRows] = await Promise.all([
      executar('ruptura'), executar('semMovimentacao'), executar('valor'), executar('fornecedores'), executar('cotacoes'), executar('giroProdutos'), executar('kpis'),
    ]);
    const kpis = kpiRows[0] ?? {};
    const giroEstoque90Dias = Number(kpis.CUSTOVENDAS90 ?? 0) / Number(kpis.VALORTOTALESTOQUE ?? 0) || null;
    res.status(200).json({ ruptura, semMovimentacao, valor, fornecedores, cotacoes, giroProdutos, kpis: { ...kpis, giroEstoque90Dias }, erros });
  } catch (error) {
    res.status(502).json({ error: 'Não foi possível conectar ao banco de dados de estoque.', detalhe: error instanceof Error ? error.message : undefined });
  }
}
