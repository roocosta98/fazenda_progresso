import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { exigirAcessoCustos } from './custosAuth.js';
import { consultarSankhya } from './estoquePainel.js';

const TABELAS_PERMITIDAS = new Set(['TGFPRO', 'TGFEST', 'TGFLOC', 'TGFGIR', 'TGFCUS', 'TGFITE', 'TGFCAB', 'TGFTOP', 'TGFPAR', 'TGFITC', 'TGFCOT', 'TSIUSU']);
const ESQUEMA = `TGFPRO(CODPROD,DESCRPROD,REFERENCIA,MARCA,ATIVO,ESTMIN,ESTMAX); TGFEST(CODPROD,CODLOCAL,CODEMP,CONTROLE,ESTOQUE); TGFGIR(CODPROD,CODLOCAL,CODEMP,GIRODIARIO,DIASSEMVENDA,ESTCUSTGER,PRODFALTA,ESTMINGIR,PONTOPED); TGFCUS(CODPROD,CODEMP,CUSMEDICM,CUSSEMICM,DTATUAL,NUNOTA); TGFLOC(CODLOCAL,DESCRLOCAL); TGFITE(NUNOTA,CODPROD,QTDNEG,CUSTO); TGFCAB(NUNOTA,CODEMP,DTNEG,CODTIPOPER,CODPARC); TGFTOP(CODTIPOPER,ATUALEST,DESCROPER); TGFPAR(CODPARC,NOMEPARC); TGFITC(NUMCOTACAO,CODPROD,CODPARC,SITUACAO,CONFIABFORN,QUALATEND,QUALPROD,PRAZOENTREGA,MELHOR); TGFCOT(NUMCOTACAO,DHINIC,DHFINAL,SITUACAO,CODUSUREQ); TSIUSU(CODUSU,NOMEUSU).`;

function normalizarSituacao(sql: string) {
  // Em algumas instalações Sankhya SITUACAO é inteiro (código); nesta instalação é o
  // status por extenso ("Fechada", "Cancelada" etc — confirmado no Sankhya). Comparar
  // sempre em texto maiúsculo/sem espaços e cobrir os dois formatos (letra ou palavra)
  // evita que "NOT IN ('F','C')" deixe de bater com um SITUACAO='Fechada' de verdade.
  return sql
    .replace(/\b((?:[A-Z][A-Z0-9_]*\.)?SITUACAO)\s*NOT\s+IN\s*\(\s*'F'\s*,\s*'C'\s*\)/gi,
      "UPPER(LTRIM(RTRIM(CAST($1 AS VARCHAR(20))))) NOT IN ('F','C','FECHADA','CANCELADA')")
    .replace(/\b((?:[A-Z][A-Z0-9_]*\.)?SITUACAO)\s*(NOT\s+IN|IN)\s*(\([^)]*\))/gi, 'CAST($1 AS VARCHAR(20)) $2 $3')
    .replace(/\b((?:[A-Z][A-Z0-9_]*\.)?SITUACAO)\s*(=|!=|<>)\s*'([^']*)'/gi, "CAST($1 AS VARCHAR(20)) $2 '$3'");
}

function consultaAtalho(pergunta: string) {
  // Normaliza acento (mínimo -> minimo) pra não precisar duplicar cada regex.
  const texto = pergunta.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Os atalhos existem só pra responder rápido e sem custo de IA os 3 botões de sugestão
  // fixos da tela ("Produtos com estoque abaixo do mínimo", "fornecedores... melhor prazo",
  // "Cotações em aberto..."). Um match por palavra solta (ex.: "produto" + "mínimo"
  // aparecendo em qualquer pergunta analítica não relacionada, tipo "quantos produtos têm
  // X, traga contagem mínimo e máximo") já sequestrou pergunta legítima e devolveu a query
  // errada — silenciosamente, sem erro. Por isso agora exige a frase inteira, não palavras
  // soltas, e só considera perguntas curtas (perto do tamanho dos botões de sugestão).
  if (texto.length > 80) return null;
  if (/fornecedor(es)?/.test(texto) && /melhor\s+prazo/.test(texto)) return `SELECT TOP 100 PAR.NOMEPARC AS FORNECEDOR, AVG(TRY_CONVERT(DECIMAL(18,2), ITC.PRAZOENTREGA)) AS PRAZOMEDIO, COUNT(*) AS TOTALCOTACOES
    FROM TGFITC ITC LEFT JOIN TGFPAR PAR ON PAR.CODPARC=ITC.CODPARC GROUP BY PAR.NOMEPARC ORDER BY PRAZOMEDIO ASC`;
  if (/cota[cç][aã]o|cota[cç][oõ]es/.test(texto) && /em\s+abert/.test(texto)) return `SELECT TOP 100 COT.NUMCOTACAO, COT.DHINIC, COT.DHFINAL, USU.NOMEUSU AS COMPRADOR
    FROM TGFCOT COT LEFT JOIN TSIUSU USU ON USU.CODUSU=COT.CODUSUREQ
    WHERE EXISTS (SELECT 1 FROM TGFITC I WHERE I.NUMCOTACAO=COT.NUMCOTACAO AND UPPER(LTRIM(RTRIM(CAST(I.SITUACAO AS VARCHAR(20))))) NOT IN ('F','C','FECHADA','CANCELADA'))
    ORDER BY COT.DHFINAL ASC`;
  if (/estoque\s+abaixo\s+do\s+minimo|abaixo\s+do\s+minimo/.test(texto)) return `SELECT TOP 100 P.CODPROD, P.DESCRPROD, E.ESTOQUE, P.ESTMIN AS MINIMO, L.DESCRLOCAL AS LOCAL
    FROM TGFPRO P JOIN TGFEST E ON E.CODPROD=P.CODPROD AND E.CODEMP=1 LEFT JOIN TGFLOC L ON L.CODLOCAL=E.CODLOCAL WHERE P.ATIVO='S' AND P.ESTMIN IS NOT NULL AND E.ESTOQUE<=P.ESTMIN ORDER BY E.ESTOQUE ASC`;
  return null;
}

function validarSql(sql: string) {
  const normalizado = sql.trim();
  if (!/^(SELECT|WITH)\b/i.test(normalizado) || /;|--|\/\*|\*\/|\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|MERGE|TRUNCATE|GRANT|REVOKE|INTO)\b/i.test(normalizado)) throw new Error('A IA gerou uma consulta não permitida.');
  const tabelas = [...normalizado.matchAll(/\b(?:FROM|JOIN)\s+([A-Z][A-Z0-9_]*)/gi)].map((item) => item[1].toUpperCase());
  if (!tabelas.length || tabelas.some((tabela) => !TABELAS_PERMITIDAS.has(tabela))) throw new Error('A consulta tentou usar uma tabela fora do módulo de estoque.');
  return normalizado;
}

export async function pesquisarEstoque(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (!exigirAcessoCustos(req, res)) return;
  const pergunta = String(req.body?.pergunta ?? '').trim();
  if (!pergunta) return res.status(400).json({ error: 'Digite uma pergunta sobre o estoque.' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'A pesquisa por IA precisa de OPENAI_API_KEY configurada na Vercel.' });
  try {
    const ia = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const consulta = await ia.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini', temperature: 0,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: `Você é um assistente de estoque Sankhya. Converta perguntas em SQL SOMENTE LEITURA. Use exclusivamente este schema: ${ESQUEMA} Responda JSON {"sql":"..."}. Use SELECT ou WITH, no máximo TOP 100; nunca use ponto-e-vírgula, DML, metadados ou tabelas fora da lista. REGRA DE EMPRESA: o sistema opera apenas com a empresa 1 (CODEMP = 1); sempre filtre CODEMP = 1 em TGFEST, TGFGIR, TGFCUS e TGFCAB, mesmo que a pergunta não mencione empresa. REGRA DE COTAÇÃO: TGFCOT.SITUACAO não indica se a cotação está fechada de fato — o status real está em TGFITC.SITUACAO (por item); uma cotação só está em aberto se existir item com UPPER(LTRIM(RTRIM(CAST(SITUACAO AS VARCHAR(20))))) NOT IN ('F','C','FECHADA','CANCELADA'). REGRA DE TIPO: SITUACAO pode ser número, letra ou palavra por extenso ("Fechada", "Cancelada" etc); nunca compare só com letra, sempre normalize com UPPER(LTRIM(RTRIM(CAST(... AS VARCHAR(20))))) e cubra os dois formatos.` }, { role: 'user', content: pergunta }],
    });
    const gerado = JSON.parse(consulta.choices[0]?.message.content ?? '{}') as { sql?: string };
    const sql = validarSql(normalizarSituacao(consultaAtalho(pergunta) ?? String(gerado.sql ?? '')));
    const linhas = await consultarSankhya(sql);
    const resumoResposta = await ia.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini', temperature: 0,
      messages: [{ role: 'system', content: 'Resuma somente os dados recebidos em português, em no máximo 3 frases. Não invente fatos.' }, { role: 'user', content: `Pergunta: ${pergunta}\nDados: ${JSON.stringify(linhas.slice(0, 40))}` }],
    });
    res.status(200).json({ sql, linhas, resumo: resumoResposta.choices[0]?.message.content ?? null });
  } catch (error) {
    console.error('Pesquisa de estoque:', error);
    res.status(502).json({ error: error instanceof Error ? error.message : 'Falha ao pesquisar o estoque.' });
  }
}
