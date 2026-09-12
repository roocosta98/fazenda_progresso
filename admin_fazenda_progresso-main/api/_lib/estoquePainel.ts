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
  // Grupos de produto que não fazem sentido pro controle de estoque operacional (materiais de
  // escritório, imobilizado, serviços tomados, energia elétrica, produtos obsoletos etc). Aplicado
  // em toda tela de Estoque, EXCETO o KPI "Valor total em estoque" (VALORTOTALESTOQUE), que deve
  // continuar somando o valor de todos os grupos.
  const filtroGrupo = 'GRU.CODGRUPAI NOT IN (9000000,13000000,15000000,16000000,22000000,23000000,24000000,25000000,27000000,29000000,98000000)';
  return {
  ruptura: `SELECT TOP 2000 P.CODPROD, P.DESCRPROD, P.REFERENCIA, L.DESCRLOCAL AS LOCAL, E.CONTROLE AS LOTE,
      E.ESTOQUE, P.ESTMIN AS MINIMO, P.ESTMAX AS MAXIMO, G.ESTMINGIR AS MINIMOSUGERIDO, G.DIASRUPTURA, G.PRODFALTA, G.PONTOPED AS PONTOPEDIDO
    FROM TGFPRO P LEFT JOIN TGFEST E ON E.CODPROD=P.CODPROD AND E.CODEMP=1 LEFT JOIN TGFLOC L ON L.CODLOCAL=E.CODLOCAL
      LEFT JOIN TGFGIR G ON G.CODPROD=P.CODPROD AND G.CODLOCAL=E.CODLOCAL AND G.CODEMP=1
      INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=P.CODGRUPOPROD
    WHERE P.ATIVO='S' AND (G.PRODFALTA='S' OR (P.ESTMIN IS NOT NULL AND E.ESTOQUE<=P.ESTMIN)) AND ${filtroGrupo}
    ORDER BY G.DIASRUPTURA DESC, E.ESTOQUE ASC`,
  // Query fornecida pelo Eder: estoque real (local padrão + outros locais, já líquido de
  // reservado), quantidade a comprar, última movimentação de saída e há quantos dias está parado,
  // excluindo os grupos de produto que não fazem sentido pra controle de giro (materiais de
  // escritório, imobilizado, serviços etc — mesma lista usada no giro por produto/KPIs).
  semMovimentacao: `SELECT
      CODPROD, DESCRPROD,
      SUM(ISNULL(CODLOCALPADRAO,0)+ISNULL(OUTROS,0)) AS ESTOQUE,
      ESTMIN, ESTMAX,
      CASE WHEN SUM(ISNULL(CODLOCALPADRAO,0)+ISNULL(OUTROS,0)) >= ESTMIN THEN 0 ELSE ESTMAX-SUM(ISNULL(CODLOCALPADRAO,0)+ISNULL(OUTROS,0)) END AS QTD_COMPRAR,
      SUM(CODLOCALPADRAO) AS CODLOCALPADRAO, DESCRLOCAL_PADRAO,
      SUM(OUTROS) AS OUTROS_LOCAIS, DESC_OUTROS_LOCAIS,
      CUSSEMICM, SUM(ISNULL(CODLOCALPADRAO,0)+ISNULL(OUTROS,0))*CUSSEMICM AS TOTAL,
      UTILIZADO, DIAS_SEM_USO, ULTIMA_MOV, SITUACAO
    FROM (
      SELECT
        P.CODPROD, P.DESCRPROD, C.CUSSEMICM,
        CASE WHEN SUM(E.ESTOQUE - E.RESERVADO) > 0 THEN C.CUSSEMICM * SUM(E.ESTOQUE - E.RESERVADO) ELSE 0 END AS TOTAL,
        P.ESTMIN, P.ESTMAX,
        CASE WHEN P.ESTMIN < SUM(E.ESTOQUE - E.RESERVADO) THEN 0 ELSE P.ESTMAX - SUM(E.ESTOQUE - E.RESERVADO) END AS QTD_COMPRAR,
        (SELECT YEAR(MAX(DTNEG)) FROM TGFITE I JOIN TGFCAB C2 ON C2.NUNOTA = I.NUNOTA WHERE I.CODPROD = P.CODPROD AND C2.CODEMP = E.CODEMP AND I.ATUALESTOQUE = -1) AS UTILIZADO,
        DATEDIFF(DAY,(SELECT MAX(DTNEG) FROM TGFITE I JOIN TGFCAB C2 ON C2.NUNOTA = I.NUNOTA WHERE I.CODPROD = P.CODPROD AND C2.CODEMP = E.CODEMP AND C2.TIPMOV IN ('Q','F') AND I.ATUALESTOQUE = -1), GETDATE()) AS DIAS_SEM_USO,
        (SELECT MAX(DTNEG) FROM TGFITE I JOIN TGFCAB C2 ON C2.NUNOTA = I.NUNOTA WHERE I.CODPROD = P.CODPROD AND C2.CODEMP = E.CODEMP AND C2.TIPMOV IN ('Q','F') AND I.ATUALESTOQUE = -1) AS ULTIMA_MOV,
        CASE WHEN CASE WHEN SUM(E.ESTOQUE - E.RESERVADO) > 0 THEN SUM(E.ESTOQUE - E.RESERVADO) ELSE 0 END = 0 THEN 'N' ELSE 'S' END AS SITUACAO,
        SUM(CASE WHEN P.CODLOCALPADRAO = E.CODLOCAL THEN (E.ESTOQUE - E.RESERVADO) END) AS CODLOCALPADRAO,
        (SELECT STRING_AGG(CONCAT(EST.ESTOQUE,' - ',LOC.DESCRLOCAL,'Reservado = ',EST.RESERVADO,' |'), '  ***  | ')
          FROM TGFEST EST JOIN TGFLOC LOC ON LOC.CODLOCAL = EST.CODLOCAL
          WHERE EST.CODPROD = P.CODPROD AND EST.ESTOQUE > 0 AND LOC.CODLOCAL = P.CODLOCALPADRAO AND EST.CODEMP = E.CODEMP) AS DESCRLOCAL_PADRAO,
        SUM(CASE WHEN P.CODLOCALPADRAO <> E.CODLOCAL THEN (E.ESTOQUE - E.RESERVADO) END) AS OUTROS,
        (SELECT STRING_AGG(CONCAT(EST.ESTOQUE,' - ',LOC.DESCRLOCAL,'Reservado = ',EST.RESERVADO,' |'), ', ')
          FROM TGFEST EST JOIN TGFLOC LOC ON LOC.CODLOCAL = EST.CODLOCAL
          WHERE EST.CODPROD = P.CODPROD AND EST.ESTOQUE > 0 AND EST.CODLOCAL <> P.CODLOCALPADRAO AND EST.CODEMP = E.CODEMP) AS DESC_OUTROS_LOCAIS
      FROM TGFPRO P
      JOIN TGFEST E ON E.CODPROD = P.CODPROD
      LEFT JOIN TGFCUS C ON C.CODPROD = P.CODPROD AND C.DTATUAL = (SELECT MAX(DTATUAL) FROM TGFCUS WHERE CODPROD = C.CODPROD AND DTATUAL <= GETDATE())
      JOIN TGFGRU GRU ON GRU.CODGRUPOPROD = P.CODGRUPOPROD
      WHERE E.CODEMP = 1
        AND ${filtroGrupo}
      GROUP BY P.CODPROD,P.DESCRPROD,C.CUSSEMICM,P.ESTMIN,P.ESTMAX,E.CODEMP,P.CODLOCALPADRAO
    ) AS AAA
    GROUP BY CODPROD,DESCRPROD,CUSSEMICM,ESTMIN,ESTMAX,UTILIZADO,DIAS_SEM_USO,ULTIMA_MOV,SITUACAO,DESCRLOCAL_PADRAO,DESC_OUTROS_LOCAIS`,
  valor: `WITH Base AS (
      SELECT P.CODPROD, P.DESCRPROD, ISNULL(EST.ESTOQUE, 0) AS ESTOQUE, CUS.CUSTO, ISNULL(EST.ESTOQUE, 0)*CUS.CUSTO AS VALORTOTAL
      FROM TGFPRO P
      INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=P.CODGRUPOPROD
      CROSS APPLY (SELECT SUM(E.ESTOQUE) AS ESTOQUE FROM TGFEST E WHERE E.CODPROD=P.CODPROD AND E.CODEMP=1) EST
      CROSS APPLY (SELECT TOP 1 COALESCE(C.CUSMEDICM,C.CUSSEMICM) AS CUSTO FROM TGFCUS C WHERE C.CODPROD=P.CODPROD AND C.CODEMP=1 ORDER BY C.DTATUAL DESC,C.NUNOTA DESC) CUS
      WHERE P.ATIVO='S' AND CUS.CUSTO IS NOT NULL AND ${filtroGrupo}
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
      INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=P.CODGRUPOPROD
      CROSS APPLY (SELECT SUM(E.ESTOQUE) AS ESTOQUE FROM TGFEST E WHERE E.CODPROD=P.CODPROD AND E.CODEMP=1) EST
      CROSS APPLY (SELECT TOP 1 COALESCE(C.CUSMEDICM,C.CUSSEMICM) AS CUSTO FROM TGFCUS C WHERE C.CODPROD=P.CODPROD AND C.CODEMP=1 ORDER BY C.DTATUAL DESC,C.NUNOTA DESC) CUS
      WHERE P.ATIVO='S' AND CUS.CUSTO IS NOT NULL AND ${filtroGrupo}
    ), Pareto AS (
      SELECT VALORTOTAL, SUM(VALORTOTAL) OVER(ORDER BY VALORTOTAL DESC ROWS UNBOUNDED PRECEDING) / NULLIF(SUM(VALORTOTAL) OVER(),0) AS ACUMULADO FROM Base
    ) SELECT
        CASE WHEN ACUMULADO<=.80 THEN 'A' WHEN ACUMULADO<=.95 THEN 'B' ELSE 'C' END AS CLASSEABC,
        COUNT(*) AS QTDPRODUTOS, SUM(VALORTOTAL) AS VALORTOTAL
      FROM Pareto GROUP BY CASE WHEN ACUMULADO<=.80 THEN 'A' WHEN ACUMULADO<=.95 THEN 'B' ELSE 'C' END`,
  // CONFIABFORN/QUALATEND/QUALPROD ficam com valor 0 em praticamente 100% das linhas
  // (nunca são de fato preenchidos nesta instalação do Sankhya) — mostrar essas colunas
  // é ruído. PRAZOENTREGA e MELHOR (vitória de cotação) são os campos com dado real.
  // TGFITC tem uma linha "resumo" por produto (CABECALHO='S', CODPARC=0) com o STATUSPRODCOT
  // verdadeiro, e uma linha por fornecedor cotado (CABECALHO='N', CODPARC<>0) cujo STATUSPRODCOT
  // fica desatualizado (ex.: continua 'O'/Aberta mesmo depois do produto já estar Fechado na
  // linha resumo) — confirmado com o Eder (cotação 62: Fechada na linha resumo, mas a linha do
  // fornecedor vencedor ainda mostrava 'O'). Por isso "cancelada" aqui é checado na linha resumo
  // correspondente, não na própria linha do fornecedor.
  fornecedores: `SELECT TOP 2000 PAR.NOMEPARC AS FORNECEDOR,
      COUNT(*) AS TOTALCOTACOES,
      SUM(CASE WHEN ITC.MELHOR='S' THEN 1 ELSE 0 END) AS TOTALVENCIDAS,
      ROUND(100.0 * SUM(CASE WHEN ITC.MELHOR='S' THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 1) AS TAXAVITORIA,
      AVG(CAST(ITC.PRAZOENTREGA AS DECIMAL(18,2))) AS PRAZOMEDIO,
      COUNT(DISTINCT ITC.CODPROD) AS PRODUTOSDISTINTOS
    FROM TGFITC ITC LEFT JOIN TGFPAR PAR ON PAR.CODPARC=ITC.CODPARC
      INNER JOIN TGFPRO PRO ON PRO.CODPROD=ITC.CODPROD INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=PRO.CODGRUPOPROD
    WHERE ITC.CODPARC <> 0 AND ${filtroGrupo}
      AND NOT EXISTS (SELECT 1 FROM TGFITC H WHERE H.CABECALHO='S' AND H.NUMCOTACAO=ITC.NUMCOTACAO AND H.CODPROD=ITC.CODPROD AND H.CODLOCAL=ITC.CODLOCAL AND H.CONTROLE=ITC.CONTROLE AND H.DIFERENCIADOR=ITC.DIFERENCIADOR AND H.STATUSPRODCOT='C')
    GROUP BY PAR.NOMEPARC
    ORDER BY TOTALVENCIDAS DESC, TOTALCOTACOES DESC`,
  // A "situação do produto" oficial do Sankhya é TGFITC.STATUSPRODCOT (O=Aberta, A=Aprovada,
  // C=Cancelada, E=Enviada, F=Fechada, P=Precificada) — mas só a linha resumo por produto
  // (CABECALHO='S') carrega o valor confiável; por isso todo agregado de "em aberto" filtra
  // CABECALHO='S', nunca as linhas por fornecedor.
  cotacoes: `SELECT TOP 2000 COT.NUMCOTACAO, COT.DHINIC, COT.DHFINAL, USU.NOMEUSU AS COMPRADOR,
      (SELECT COUNT(*) FROM TGFITC I INNER JOIN TGFPRO PRO ON PRO.CODPROD=I.CODPROD INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=PRO.CODGRUPOPROD WHERE I.NUMCOTACAO=COT.NUMCOTACAO AND I.CABECALHO='S' AND ${filtroGrupo}) AS TOTALITENS,
      (SELECT COUNT(*) FROM TGFITC I INNER JOIN TGFPRO PRO ON PRO.CODPROD=I.CODPROD INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=PRO.CODGRUPOPROD WHERE I.NUMCOTACAO=COT.NUMCOTACAO AND I.CABECALHO='S' AND I.STATUSPRODCOT='O' AND ${filtroGrupo}) AS ITENSEMABERTO
    FROM TGFCOT COT LEFT JOIN TSIUSU USU ON USU.CODUSU=COT.CODUSUREQ
    WHERE EXISTS (SELECT 1 FROM TGFITC I INNER JOIN TGFPRO PRO ON PRO.CODPROD=I.CODPROD INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=PRO.CODGRUPOPROD WHERE I.NUMCOTACAO=COT.NUMCOTACAO AND I.CABECALHO='S' AND I.STATUSPRODCOT='O' AND ${filtroGrupo})
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
    INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD = PRO.CODGRUPOPROD
    LEFT JOIN ESTOQUE EST ON EST.CODEMP = MOV.CODEMP AND EST.CODPROD = MOV.CODPROD
    WHERE ${filtroGrupo}
    ORDER BY MOV.QTD_REQUISICAO DESC`,
  // O filtro de grupo (filtroGrupo) vale em toda tela de Estoque, EXCETO o KPI
  // VALORTOTALESTOQUE ("Valor total em estoque"), que continua somando todos os grupos.
  kpis: `SELECT
    (SELECT COUNT(DISTINCT P.CODPROD) FROM TGFPRO P LEFT JOIN TGFEST E ON E.CODPROD=P.CODPROD AND E.CODEMP=1 LEFT JOIN TGFGIR G ON G.CODPROD=P.CODPROD AND G.CODLOCAL=E.CODLOCAL AND G.CODEMP=1 INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=P.CODGRUPOPROD WHERE P.ATIVO='S' AND (G.PRODFALTA='S' OR (P.ESTMIN IS NOT NULL AND E.ESTOQUE<=P.ESTMIN)) AND ${filtroGrupo}) AS TOTALRUPTURA,
    (SELECT COUNT(DISTINCT G.CODPROD) FROM TGFGIR G JOIN TGFPRO P ON P.CODPROD=G.CODPROD INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=P.CODGRUPOPROD WHERE P.ATIVO='S' AND G.CODEMP=1 AND G.DIASSEMVENDA>=90 AND ${filtroGrupo}) AS TOTALSEMMOVIMENTACAO,
    (SELECT COUNT(DISTINCT COT.NUMCOTACAO) FROM TGFCOT COT WHERE EXISTS (SELECT 1 FROM TGFITC I INNER JOIN TGFPRO PRO ON PRO.CODPROD=I.CODPROD INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=PRO.CODGRUPOPROD WHERE I.NUMCOTACAO=COT.NUMCOTACAO AND I.CABECALHO='S' AND I.STATUSPRODCOT='O' AND ${filtroGrupo})) AS TOTALCOTACOES,
    (SELECT SUM(ISNULL(EST.ESTOQUE,0)*CUS.CUSTO) FROM TGFPRO P CROSS APPLY (SELECT SUM(E.ESTOQUE) AS ESTOQUE FROM TGFEST E WHERE E.CODPROD=P.CODPROD AND E.CODEMP=1) EST CROSS APPLY (SELECT TOP 1 COALESCE(C.CUSMEDICM,C.CUSSEMICM) AS CUSTO FROM TGFCUS C WHERE C.CODPROD=P.CODPROD AND C.CODEMP=1 ORDER BY C.DTATUAL DESC,C.NUNOTA DESC) CUS WHERE P.ATIVO='S' AND CUS.CUSTO IS NOT NULL) AS VALORTOTALESTOQUE,
    (SELECT SUM(GIR.CONSUMO) FROM (
        SELECT ITE.CODPROD, SUM(CASE WHEN CAB.TIPMOV='Q' THEN ITE.QTDNEG ELSE 0 END) AS CONSUMO
        FROM TGFCAB CAB INNER JOIN TGFITE ITE ON ITE.NUNOTA=CAB.NUNOTA
        WHERE ${filtroData} AND CAB.TIPMOV IN ('C','Q','E','F') AND CAB.STATUSNOTA='L' AND CAB.CODEMP=1
        GROUP BY ITE.CODPROD
      ) GIR INNER JOIN TGFPRO PRO ON PRO.CODPROD=GIR.CODPROD INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=PRO.CODGRUPOPROD
      WHERE ${filtroGrupo}
    ) AS CONSUMOPERIODO,
    (SELECT SUM(ISNULL(EST.ESTOQUE,0)) FROM TGFPRO P CROSS APPLY (SELECT SUM(E.ESTOQUE) AS ESTOQUE FROM TGFEST E WHERE E.CODPROD=P.CODPROD AND E.CODEMP=1) EST INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=P.CODGRUPOPROD WHERE P.ATIVO='S' AND ${filtroGrupo}) AS ESTOQUETOTALGIRO`,
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
