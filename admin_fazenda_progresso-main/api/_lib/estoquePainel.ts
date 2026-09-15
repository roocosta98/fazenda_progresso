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
// derrubar o painel inteiro. Ruptura, Curva ABC, sem movimentação e cotações refletem o
// estoque/cadastro ATUAL (não fazem sentido filtrados por período); o consumo por requisição
// (giro/KPI) e a Análise de Fornecedores (cotações no período) variam com o filtro de data da tela.
function montarConsultas(dataInicio: string, dataFim: string, dias: number) {
  const filtroData = `CAB.DTNEG >= CONVERT(date,'${dataInicio}',23) AND CAB.DTNEG < DATEADD(DAY,1,CONVERT(date,'${dataFim}',23))`;
  // Grupos de produto que não fazem sentido pro controle de estoque operacional (materiais de
  // escritório, imobilizado, serviços tomados, energia elétrica, produtos obsoletos etc). Aplicado
  // em toda tela de Estoque, EXCETO o KPI "Valor total em estoque" (VALORTOTALESTOQUE), que deve
  // continuar somando o valor de todos os grupos.
  const filtroGrupo = 'GRU.CODGRUPAI NOT IN (9000000,13000000,15000000,16000000,22000000,23000000,24000000,25000000,27000000,29000000,98000000)';
  return {
  // Éder pediu pra não considerar lote na ruptura: TGFEST tem uma linha por (produto, local,
  // lote), e comparar o saldo de UM lote contra o mínimo do PRODUTO (P.ESTMIN, que não é por
  // lote) gerava dezenas de linhas repetidas do mesmo item — cada lote com saldo baixo isolado,
  // mesmo quando o produto somado (todos os locais/lotes) tinha estoque de sobra pras aplicações
  // (caso real: CARTAP BR 1KG). Corrigido pra somar o estoque de todos os locais/lotes por
  // produto (mesmo padrão já usado em "sem movimentação") antes de comparar com o mínimo.
  ruptura: `SELECT TOP 2000 P.CODPROD, P.DESCRPROD, P.REFERENCIA,
      ISNULL(EST.ESTOQUE,0) AS ESTOQUE, P.ESTMIN AS MINIMO, P.ESTMAX AS MAXIMO,
      GIR.MINIMOSUGERIDO, GIR.DIASRUPTURA, GIR.PRODFALTA, GIR.PONTOPEDIDO
    FROM TGFPRO P
      INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=P.CODGRUPOPROD
      OUTER APPLY (SELECT SUM(E.ESTOQUE) AS ESTOQUE FROM TGFEST E WHERE E.CODPROD=P.CODPROD AND E.CODEMP=1) EST
      OUTER APPLY (SELECT MAX(G.ESTMINGIR) AS MINIMOSUGERIDO, MAX(G.DIASRUPTURA) AS DIASRUPTURA,
          MAX(CASE WHEN G.PRODFALTA='S' THEN 'S' ELSE 'N' END) AS PRODFALTA, MAX(G.PONTOPED) AS PONTOPEDIDO
        FROM TGFGIR G WHERE G.CODPROD=P.CODPROD AND G.CODEMP=1) GIR
    WHERE P.ATIVO='S' AND ${filtroGrupo}
      AND (GIR.PRODFALTA='S' OR (P.ESTMIN IS NOT NULL AND ISNULL(EST.ESTOQUE,0)<=P.ESTMIN))
    ORDER BY GIR.DIASRUPTURA DESC, EST.ESTOQUE ASC`,
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
  // Análise de Fornecedores fornecida pela Fazenda Progresso (script próprio deles, não gerado
  // por nós) — Supplier Score ponderado (35% taxa de vitória, 30% competitividade de preço vs.
  // concorrentes na MESMA cotação/item, 15% prazo, 10% cobertura de produtos, 10% volume),
  // competitividade e economia calculadas item a item comparando o preço de cada fornecedor
  // contra a média dos concorrentes na mesma cotação — nunca inventado, é aritmética sobre preços
  // reais das cotações do período filtrado na tela. Adaptado do original em dois pontos: (1) filtro
  // de grupo de produto (filtroGrupo) igual ao resto do módulo; (2) período fixo de 90 dias trocado
  // pelo filtro de data da tela (igual giro de estoque); (3) ITC.PRAZOMEDIO trocado por
  // ITC.PRAZOENTREGA — o primeiro fica em branco em praticamente 100% das linhas nesta instalação
  // do Sankhya (mesmo problema já documentado em CONFIABFORN/QUALATEND/QUALPROD), o segundo é o
  // campo de prazo que de fato vem preenchido (confirmado na consulta antiga de fornecedores);
  // (4) "venceu a cotação" trocado de ITC.SITUACAO='A' pra ITC.MELHOR='S' — validado contra a
  // consulta de detalhe de cotação do próprio Sankhya (MELHORFORNEC/MELHORPRECO ali são sempre
  // calculados com WHERE MELHOR='S', nunca com SITUACAO). SITUACAO é o status de workflow do item
  // (Enviada/Rejeitada/Gerada/Aprovada etc., visto no relatório em STATUSENVIO incluindo 'A' junto
  // com 'E','R','G') — não é exclusivo de "essa foi a proposta vencedora", então usar SITUACAO='A'
  // pra taxa de vitória contaria aprovações de workflow que não são necessariamente o melhor preço.
  // MELHOR é o campo dedicado do Sankhya pra "essa cotação venceu" — mesmo campo já usado (e
  // confirmado como dado real) na consulta antiga de fornecedores, antes da troca pelo script novo.
  fornecedores: `WITH
    BASE AS (
      SELECT COT.NUMCOTACAO, COT.DHINIC, COT.CODEMP, ITC.CODPARC, PAR.NOMEPARC, PAR.RAZAOSOCIAL, PAR.CGC_CPF,
        ITC.CODPROD, PRO.DESCRPROD, PRO.CODGRUPOPROD, ITC.CONTROLE, ITC.CODLOCAL, ITC.DIFERENCIADOR,
        ITC.PRECO, ITC.QTDCOTADA, ITC.PRAZOENTREGA, ITC.SITUACAO, ITC.MELHOR,
        CASE WHEN COALESCE(ITC.PRECO,0)>0 THEN 1 ELSE 0 END AS RESPONDEU,
        CASE WHEN ITC.MELHOR='S' THEN 1 ELSE 0 END AS VENCEU
      FROM TGFCOT COT
        INNER JOIN TGFITC ITC ON ITC.NUMCOTACAO=COT.NUMCOTACAO
        INNER JOIN TGFPAR PAR ON PAR.CODPARC=ITC.CODPARC
        INNER JOIN TGFPRO PRO ON PRO.CODPROD=ITC.CODPROD
        INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=PRO.CODGRUPOPROD
      WHERE COT.DHINIC >= CONVERT(date,'${dataInicio}',23) AND COT.DHINIC < DATEADD(DAY,1,CONVERT(date,'${dataFim}',23))
        AND ITC.CABECALHO='N' AND ITC.CODPARC>0 AND ${filtroGrupo}
    ),
    PRECO_ITEM AS (
      SELECT B.*,
        SUM(CASE WHEN B.PRECO>0 THEN B.PRECO ELSE 0 END) OVER (PARTITION BY B.NUMCOTACAO,B.CODPROD,B.CONTROLE,B.CODLOCAL,B.DIFERENCIADOR) AS SOMA_PRECOS_ITEM,
        SUM(CASE WHEN B.PRECO>0 THEN 1 ELSE 0 END) OVER (PARTITION BY B.NUMCOTACAO,B.CODPROD,B.CONTROLE,B.CODLOCAL,B.DIFERENCIADOR) AS QTD_PRECOS_ITEM
      FROM BASE B
    ),
    COMPARATIVO_ITEM AS (
      SELECT P.*, CASE WHEN P.PRECO>0 AND P.QTD_PRECOS_ITEM>1 THEN (P.SOMA_PRECOS_ITEM-P.PRECO)/NULLIF(P.QTD_PRECOS_ITEM-1,0) END AS PRECO_MEDIO_CONCORRENTES
      FROM PRECO_ITEM P
    ),
    INDICADORES AS (
      SELECT C.CODPARC, MAX(C.NOMEPARC) AS FORNECEDOR, MAX(C.RAZAOSOCIAL) AS RAZAOSOCIAL, MAX(C.CGC_CPF) AS CNPJ_CPF,
        COUNT(DISTINCT C.NUMCOTACAO) AS TOTAL_COTACOES,
        COUNT(DISTINCT CASE WHEN C.RESPONDEU=1 THEN C.NUMCOTACAO END) AS COTACOES_RESPONDIDAS,
        COUNT(DISTINCT CASE WHEN C.VENCEU=1 THEN C.NUMCOTACAO END) AS COTACOES_VENCIDAS,
        COUNT(DISTINCT CASE WHEN C.RESPONDEU=1 AND C.VENCEU=0 THEN C.NUMCOTACAO END) AS COTACOES_SEM_VITORIA,
        SUM(C.RESPONDEU) AS ITENS_COTADOS, SUM(C.VENCEU) AS ITENS_VENCIDOS,
        SUM(CASE WHEN C.RESPONDEU=1 AND C.VENCEU=0 THEN 1 ELSE 0 END) AS ITENS_NAO_VENCIDOS,
        ROUND(100*COUNT(DISTINCT CASE WHEN C.RESPONDEU=1 THEN C.NUMCOTACAO END)/NULLIF(COUNT(DISTINCT C.NUMCOTACAO),0),2) AS TAXA_RESPOSTA_PCT,
        ROUND(100*SUM(C.VENCEU)/NULLIF(SUM(C.RESPONDEU),0),2) AS TAXA_VITORIA_PCT,
        ROUND(100*COUNT(DISTINCT CASE WHEN C.VENCEU=1 THEN C.NUMCOTACAO END)/NULLIF(COUNT(DISTINCT CASE WHEN C.RESPONDEU=1 THEN C.NUMCOTACAO END),0),2) AS TAXA_VITORIA_COTACAO_PCT,
        ROUND(AVG(CASE WHEN C.RESPONDEU=1 THEN C.PRAZOENTREGA END),2) AS PRAZO_MEDIO_DIAS,
        COUNT(DISTINCT CASE WHEN C.RESPONDEU=1 THEN C.CODPROD END) AS PRODUTOS_DISTINTOS,
        COUNT(DISTINCT CASE WHEN C.RESPONDEU=1 THEN C.CODGRUPOPROD END) AS CATEGORIAS_DISTINTAS,
        ROUND(AVG(CASE WHEN C.PRECO>0 THEN C.PRECO END),4) AS PRECO_MEDIO_FORNECEDOR,
        ROUND(AVG(C.PRECO_MEDIO_CONCORRENTES),4) AS PRECO_MEDIO_CONCORRENTES,
        ROUND(AVG(CASE WHEN C.PRECO>0 AND C.PRECO_MEDIO_CONCORRENTES>0 THEN (C.PRECO_MEDIO_CONCORRENTES-C.PRECO)/C.PRECO_MEDIO_CONCORRENTES*100 END),2) AS COMPETITIVIDADE_PRECO_MEDIA_PCT,
        ROUND(100*SUM(CASE WHEN C.PRECO>0 AND C.PRECO_MEDIO_CONCORRENTES>0 AND COALESCE(C.QTDCOTADA,0)>0 THEN (C.PRECO_MEDIO_CONCORRENTES-C.PRECO)*C.QTDCOTADA ELSE 0 END)/
          NULLIF(SUM(CASE WHEN C.PRECO>0 AND C.PRECO_MEDIO_CONCORRENTES>0 AND COALESCE(C.QTDCOTADA,0)>0 THEN C.PRECO_MEDIO_CONCORRENTES*C.QTDCOTADA ELSE 0 END),0),2) AS COMPETITIVIDADE_PRECO_PCT,
        SUM(CASE WHEN C.PRECO>0 AND C.PRECO_MEDIO_CONCORRENTES>0 THEN 1 ELSE 0 END) AS ITENS_COM_COMPARACAO_PRECO,
        ROUND(SUM(CASE WHEN C.VENCEU=1 AND C.PRECO>0 AND C.PRECO_MEDIO_CONCORRENTES>0 AND COALESCE(C.QTDCOTADA,0)>0 THEN (C.PRECO_MEDIO_CONCORRENTES-C.PRECO)*C.QTDCOTADA ELSE 0 END),2) AS ECONOMIA_LIQUIDA_VS_MEDIA,
        ROUND(SUM(CASE WHEN C.VENCEU=1 AND C.PRECO>0 AND C.PRECO_MEDIO_CONCORRENTES>C.PRECO AND COALESCE(C.QTDCOTADA,0)>0 THEN (C.PRECO_MEDIO_CONCORRENTES-C.PRECO)*C.QTDCOTADA ELSE 0 END),2) AS ECONOMIA_POSITIVA_VS_MEDIA,
        MIN(C.DHINIC) AS PRIMEIRA_COTACAO_PERIODO, MAX(C.DHINIC) AS ULTIMA_COTACAO
      FROM COMPARATIVO_ITEM C GROUP BY C.CODPARC
    ),
    FORNECEDORES_VALIDOS AS (SELECT I.* FROM INDICADORES I WHERE I.COTACOES_RESPONDIDAS>0),
    SCORE_COMPONENTES AS (
      SELECT F.*,
        CASE WHEN F.TAXA_VITORIA_PCT IS NOT NULL THEN ROUND(100*CUME_DIST() OVER (PARTITION BY CASE WHEN F.TAXA_VITORIA_PCT IS NULL THEN 1 ELSE 0 END ORDER BY F.TAXA_VITORIA_PCT),2) END AS SCORE_VITORIA,
        CASE WHEN COALESCE(F.COMPETITIVIDADE_PRECO_PCT,F.COMPETITIVIDADE_PRECO_MEDIA_PCT) IS NOT NULL THEN ROUND(100*CUME_DIST() OVER (PARTITION BY CASE WHEN COALESCE(F.COMPETITIVIDADE_PRECO_PCT,F.COMPETITIVIDADE_PRECO_MEDIA_PCT) IS NULL THEN 1 ELSE 0 END ORDER BY COALESCE(F.COMPETITIVIDADE_PRECO_PCT,F.COMPETITIVIDADE_PRECO_MEDIA_PCT)),2) END AS SCORE_COMPETITIVIDADE,
        CASE WHEN F.PRAZO_MEDIO_DIAS IS NOT NULL THEN ROUND(100*CUME_DIST() OVER (PARTITION BY CASE WHEN F.PRAZO_MEDIO_DIAS IS NULL THEN 1 ELSE 0 END ORDER BY F.PRAZO_MEDIO_DIAS DESC),2) END AS SCORE_PRAZO,
        ROUND(100*CUME_DIST() OVER (ORDER BY F.PRODUTOS_DISTINTOS),2) AS SCORE_COBERTURA,
        ROUND(100*CUME_DIST() OVER (ORDER BY F.TOTAL_COTACOES),2) AS SCORE_VOLUME
      FROM FORNECEDORES_VALIDOS F
    ),
    SCORE_FINAL AS (
      SELECT S.*, ROUND((
          CASE WHEN S.SCORE_VITORIA IS NOT NULL THEN S.SCORE_VITORIA*35 ELSE 0 END +
          CASE WHEN S.SCORE_COMPETITIVIDADE IS NOT NULL THEN S.SCORE_COMPETITIVIDADE*30 ELSE 0 END +
          CASE WHEN S.SCORE_PRAZO IS NOT NULL THEN S.SCORE_PRAZO*15 ELSE 0 END +
          CASE WHEN S.SCORE_COBERTURA IS NOT NULL THEN S.SCORE_COBERTURA*10 ELSE 0 END +
          CASE WHEN S.SCORE_VOLUME IS NOT NULL THEN S.SCORE_VOLUME*10 ELSE 0 END
        )/NULLIF(
          CASE WHEN S.SCORE_VITORIA IS NOT NULL THEN 35 ELSE 0 END +
          CASE WHEN S.SCORE_COMPETITIVIDADE IS NOT NULL THEN 30 ELSE 0 END +
          CASE WHEN S.SCORE_PRAZO IS NOT NULL THEN 15 ELSE 0 END +
          CASE WHEN S.SCORE_COBERTURA IS NOT NULL THEN 10 ELSE 0 END +
          CASE WHEN S.SCORE_VOLUME IS NOT NULL THEN 10 ELSE 0 END, 0),2) AS SUPPLIER_SCORE
      FROM SCORE_COMPONENTES S
    ),
    CLASSIFICADO AS (
      SELECT S.*,
        CASE WHEN S.SUPPLIER_SCORE>=85 THEN 'Excelente' WHEN S.SUPPLIER_SCORE>=70 THEN 'Bom' WHEN S.SUPPLIER_SCORE>=50 THEN 'Regular' ELSE 'Atencao' END AS FAIXA_SUPPLIER_SCORE,
        CASE WHEN COALESCE(S.COMPETITIVIDADE_PRECO_PCT,S.COMPETITIVIDADE_PRECO_MEDIA_PCT)>0 THEN 'Mais competitivo' WHEN COALESCE(S.COMPETITIVIDADE_PRECO_PCT,S.COMPETITIVIDADE_PRECO_MEDIA_PCT)<0 THEN 'Mais caro' ELSE 'Neutro' END AS STATUS_COMPETITIVIDADE
      FROM SCORE_FINAL S
    ),
    RANKING AS (
      SELECT C.*, DENSE_RANK() OVER (ORDER BY C.SUPPLIER_SCORE DESC, C.TAXA_VITORIA_PCT DESC, COALESCE(C.COMPETITIVIDADE_PRECO_PCT,C.COMPETITIVIDADE_PRECO_MEDIA_PCT) DESC, C.PRAZO_MEDIO_DIAS ASC, C.TOTAL_COTACOES DESC) AS RANKING_GERAL
      FROM CLASSIFICADO C
    ),
    KPI_GERAIS AS (
      SELECT COUNT(*) AS FORNECEDORES_ATIVOS_PERIODO, MIN(R.PRAZO_MEDIO_DIAS) AS MELHOR_PRAZO_MEDIO_PERIODO,
        MAX(R.TAXA_VITORIA_PCT) AS MAIOR_TAXA_VITORIA_PERIODO, SUM(R.ECONOMIA_POSITIVA_VS_MEDIA) AS ECONOMIA_ACUMULADA_PERIODO,
        (SELECT COUNT(DISTINCT CASE WHEN B.RESPONDEU=1 THEN B.CODGRUPOPROD END) FROM BASE B) AS CATEGORIAS_ATENDIDAS_PERIODO
      FROM RANKING R
    )
    SELECT TOP 2000
      R.RANKING_GERAL, CASE WHEN R.RANKING_GERAL=1 THEN 'S' ELSE 'N' END AS MELHOR_FORNECEDOR_PERIODO,
      R.CODPARC, R.FORNECEDOR, R.RAZAOSOCIAL, R.CNPJ_CPF,
      R.SUPPLIER_SCORE, R.FAIXA_SUPPLIER_SCORE, R.SCORE_VITORIA, R.SCORE_COMPETITIVIDADE, R.SCORE_PRAZO, R.SCORE_COBERTURA, R.SCORE_VOLUME,
      R.TOTAL_COTACOES, R.COTACOES_RESPONDIDAS, R.COTACOES_VENCIDAS, R.COTACOES_SEM_VITORIA,
      R.ITENS_COTADOS, R.ITENS_VENCIDOS, R.ITENS_NAO_VENCIDOS,
      R.TAXA_RESPOSTA_PCT, R.TAXA_VITORIA_PCT, R.TAXA_VITORIA_COTACAO_PCT,
      R.PRAZO_MEDIO_DIAS, R.PRODUTOS_DISTINTOS, R.CATEGORIAS_DISTINTAS,
      R.PRECO_MEDIO_FORNECEDOR, R.PRECO_MEDIO_CONCORRENTES, R.COMPETITIVIDADE_PRECO_PCT, R.COMPETITIVIDADE_PRECO_MEDIA_PCT, R.STATUS_COMPETITIVIDADE,
      R.ITENS_COM_COMPARACAO_PRECO, R.ECONOMIA_LIQUIDA_VS_MEDIA, R.ECONOMIA_POSITIVA_VS_MEDIA,
      R.PRIMEIRA_COTACAO_PERIODO, R.ULTIMA_COTACAO,
      K.FORNECEDORES_ATIVOS_PERIODO, K.MELHOR_PRAZO_MEDIO_PERIODO, K.MAIOR_TAXA_VITORIA_PERIODO, K.CATEGORIAS_ATENDIDAS_PERIODO, K.ECONOMIA_ACUMULADA_PERIODO
    FROM RANKING R CROSS JOIN KPI_GERAIS K
    ORDER BY R.RANKING_GERAL, R.SUPPLIER_SCORE DESC, R.FORNECEDOR`,
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
  // Sugestão do Eder: mostrar essa quebra por situação ao clicar no card "Cotações em aberto" —
  // conta ITENS de cotação (linha resumo, CABECALHO='S'), não cotações, igual ao agrupamento que
  // ele mostrou direto no Sankhya (ex.: Fechada 350, Aberta 23, Cancelada 16, Aprovada 1, Precificada 4).
  cotacoesPorSituacao: `SELECT
      CASE I.STATUSPRODCOT WHEN 'O' THEN 'Aberta' WHEN 'A' THEN 'Aprovada' WHEN 'C' THEN 'Cancelada' WHEN 'E' THEN 'Enviada' WHEN 'F' THEN 'Fechada' WHEN 'P' THEN 'Precificada' ELSE I.STATUSPRODCOT END AS SITUACAO,
      COUNT(*) AS TOTALITENS
    FROM TGFITC I INNER JOIN TGFPRO PRO ON PRO.CODPROD=I.CODPROD INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=PRO.CODGRUPOPROD
    WHERE I.CABECALHO='S' AND ${filtroGrupo}
    GROUP BY I.STATUSPRODCOT
    ORDER BY TOTALITENS DESC`,
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
    ), BASE AS (
      SELECT MOV.CODPROD, PRO.DESCRPROD,
        MOV.QTD_COMPRA, MOV.QTD_DEV_COMPRA, MOV.QTD_COMPRA - MOV.QTD_DEV_COMPRA AS COMPRA_LIQUIDA,
        MOV.QTD_REQUISICAO AS CONSUMO,
        ISNULL(EST.ESTOQUE_ATUAL, 0) AS ESTOQUE_ATUAL, ISNULL(PRO.ESTMIN, 0) AS ESTMIN, ISNULL(PRO.ESTMAX, 0) AS ESTMAX
      FROM MOVIMENTOS MOV
      INNER JOIN TGFPRO PRO ON PRO.CODPROD = MOV.CODPROD
      INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD = PRO.CODGRUPOPROD
      LEFT JOIN ESTOQUE EST ON EST.CODEMP = MOV.CODEMP AND EST.CODPROD = MOV.CODPROD
      WHERE ${filtroGrupo}
    )
    -- Giro = Requisições / Estoque médio do período (guia do Éder: nunca soma compra+requisição
    -- no numerador, e usa a MÉDIA entre estoque inicial e final, não só o saldo atual). TGFEST só
    -- guarda o saldo atual (não histórico), então o estoque inicial é reconstruído de trás pra
    -- frente (atual - compra líquida + consumo do período) — por isso só é exato quando o
    -- filtro de período termina hoje, que é o caso padrão da tela.
    SELECT TOP 2000 CODPROD, DESCRPROD, QTD_COMPRA, QTD_DEV_COMPRA, COMPRA_LIQUIDA, CONSUMO,
      ESTOQUE_ATUAL, ESTMIN, ESTMAX,
      (ESTOQUE_ATUAL - COMPRA_LIQUIDA + CONSUMO) AS ESTOQUE_INICIAL,
      CASE WHEN ((ESTOQUE_ATUAL - COMPRA_LIQUIDA + CONSUMO) + ESTOQUE_ATUAL) > 0
        THEN CONSUMO / (((ESTOQUE_ATUAL - COMPRA_LIQUIDA + CONSUMO) + ESTOQUE_ATUAL) / 2.0) ELSE 0 END AS GIRO_ESTOQUE,
      CASE WHEN CONSUMO > 0 THEN ESTOQUE_ATUAL / NULLIF(CONSUMO / ${dias}.0, 0) ELSE NULL END AS DIAS_COBERTURA
    FROM BASE
    ORDER BY CONSUMO DESC`,
  // Quantidade de itens em estoque por local/depósito — cadastro atual, mesmo escopo de grupo
  // das demais telas. Usado no painel de Inventário (distribuição por local).
  distribuicaoLocal: `SELECT TOP 30 L.DESCRLOCAL AS LOCAL, SUM(E.ESTOQUE) AS ESTOQUE
    FROM TGFEST E
      INNER JOIN TGFLOC L ON L.CODLOCAL=E.CODLOCAL
      INNER JOIN TGFPRO P ON P.CODPROD=E.CODPROD
      INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=P.CODGRUPOPROD
    WHERE E.CODEMP=1 AND P.ATIVO='S' AND E.ESTOQUE>0 AND ${filtroGrupo}
    GROUP BY L.DESCRLOCAL
    ORDER BY SUM(E.ESTOQUE) DESC`,
  // O filtro de grupo (filtroGrupo) vale em toda tela de Estoque, EXCETO o KPI
  // VALORTOTALESTOQUE ("Valor total em estoque"), que continua somando todos os grupos.
  kpis: `SELECT
    -- Mesmo critério (por produto, somando todos os locais/lotes) da consulta "ruptura" acima —
    -- nunca compara o saldo de um lote isolado contra o mínimo do produto.
    (SELECT COUNT(*) FROM TGFPRO P INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=P.CODGRUPOPROD
        OUTER APPLY (SELECT SUM(E.ESTOQUE) AS ESTOQUE FROM TGFEST E WHERE E.CODPROD=P.CODPROD AND E.CODEMP=1) EST
        OUTER APPLY (SELECT MAX(CASE WHEN G.PRODFALTA='S' THEN 'S' ELSE 'N' END) AS PRODFALTA FROM TGFGIR G WHERE G.CODPROD=P.CODPROD AND G.CODEMP=1) GIR
      WHERE P.ATIVO='S' AND ${filtroGrupo} AND (GIR.PRODFALTA='S' OR (P.ESTMIN IS NOT NULL AND ISNULL(EST.ESTOQUE,0)<=P.ESTMIN))) AS TOTALRUPTURA,
    -- Mesma agregação por produto (soma de todos os locais/lotes) — item "acima do máximo"
    -- configurado, sinal de excesso de compra/estoque parado.
    (SELECT COUNT(*) FROM TGFPRO P INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=P.CODGRUPOPROD
        OUTER APPLY (SELECT SUM(E.ESTOQUE) AS ESTOQUE FROM TGFEST E WHERE E.CODPROD=P.CODPROD AND E.CODEMP=1) EST
      WHERE P.ATIVO='S' AND ${filtroGrupo} AND P.ESTMAX IS NOT NULL AND P.ESTMAX>0 AND ISNULL(EST.ESTOQUE,0)>P.ESTMAX) AS TOTALACIMAMAXIMO,
    -- Produtos com estoque > 0 mas sem "local padrão" definido no cadastro (P.CODLOCALPADRAO) —
    -- não há como saber onde esse item deveria estar fisicamente por padrão.
    (SELECT COUNT(*) FROM TGFPRO P INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=P.CODGRUPOPROD
        OUTER APPLY (SELECT SUM(E.ESTOQUE) AS ESTOQUE FROM TGFEST E WHERE E.CODPROD=P.CODPROD AND E.CODEMP=1) EST
      WHERE P.ATIVO='S' AND ${filtroGrupo} AND P.CODLOCALPADRAO IS NULL AND ISNULL(EST.ESTOQUE,0)>0) AS TOTALSEMLOCALIZACAO,
    (SELECT COUNT(*) FROM TGFPRO P INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=P.CODGRUPOPROD WHERE P.ATIVO='S' AND ${filtroGrupo}) AS TOTALSKUS,
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
    -- Compra líquida do período (mesmo escopo de produto do consumo acima) — usada só pra
    -- reconstruir o estoque inicial e calcular o giro pela média (ver comentário no handler).
    (SELECT SUM(GIR.COMPRALIQUIDA) FROM (
        SELECT ITE.CODPROD, SUM(CASE WHEN CAB.TIPMOV IN('C','F') THEN ITE.QTDNEG WHEN CAB.TIPMOV='E' THEN -ITE.QTDNEG ELSE 0 END) AS COMPRALIQUIDA
        FROM TGFCAB CAB INNER JOIN TGFITE ITE ON ITE.NUNOTA=CAB.NUNOTA
        WHERE ${filtroData} AND CAB.TIPMOV IN ('C','Q','E','F') AND CAB.STATUSNOTA='L' AND CAB.CODEMP=1
        GROUP BY ITE.CODPROD
      ) GIR INNER JOIN TGFPRO PRO ON PRO.CODPROD=GIR.CODPROD INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD=PRO.CODGRUPOPROD
      WHERE ${filtroGrupo}
    ) AS COMPRALIQUIDAPERIODO,
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
    const [ruptura, semMovimentacao, valor, curvaAbc, fornecedores, cotacoes, cotacoesPorSituacao, giroProdutos, distribuicaoLocal, kpiRows] = await Promise.all([
      executar('ruptura'), executar('semMovimentacao'), executar('valor'), executar('curvaAbc'), executar('fornecedores'), executar('cotacoes'), executar('cotacoesPorSituacao'), executar('giroProdutos'), executar('distribuicaoLocal'), executar('kpis'),
    ]);
    const kpis = kpiRows[0] ?? {};
    // Giro = Requisições / Estoque médio (guia do Éder — nunca soma compra+requisição, e usa a
    // média entre estoque inicial e final, não só o saldo atual). O saldo inicial é reconstruído
    // (atual - compra líquida + consumo do período), então só é exato quando o período filtrado
    // termina hoje — o padrão da tela.
    const consumoPeriodo = Number(kpis.CONSUMOPERIODO ?? 0);
    const compraLiquidaPeriodo = Number(kpis.COMPRALIQUIDAPERIODO ?? 0);
    const estoqueAtualGiro = Number(kpis.ESTOQUETOTALGIRO ?? 0);
    const estoqueInicialGiro = estoqueAtualGiro - compraLiquidaPeriodo + consumoPeriodo;
    const estoqueMedioGiro = (estoqueInicialGiro + estoqueAtualGiro) / 2;
    const giroEstoque = estoqueMedioGiro > 0 ? consumoPeriodo / estoqueMedioGiro : null;
    res.status(200).json({ ruptura, semMovimentacao, valor, curvaAbc, fornecedores, cotacoes, cotacoesPorSituacao, giroProdutos, distribuicaoLocal, kpis: { ...kpis, giroEstoque }, periodo: { dataInicio, dataFim }, erros });
  } catch (error) {
    res.status(502).json({ error: 'Não foi possível conectar ao banco de dados de estoque.', detalhe: error instanceof Error ? error.message : undefined });
  }
}
