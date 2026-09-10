import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { exigirAcessoCustos } from './custosAuth.js';
import { consultarSankhya } from './estoquePainel.js';

const TABELAS_PERMITIDAS = new Set(['TGFPRO', 'TGFEST', 'TGFLOC', 'TGFGIR', 'TGFCUS', 'TGFITE', 'TGFCAB', 'TGFTOP', 'TGFPAR', 'TGFITC', 'TGFCOT', 'TSIUSU']);
const ESQUEMA = `TGFPRO(CODPROD,DESCRPROD,REFERENCIA,MARCA,ATIVO,ESTMIN,ESTMAX); TGFEST(CODPROD,CODLOCAL,CODEMP,CONTROLE,ESTOQUE); TGFGIR(CODPROD,CODLOCAL,CODEMP,GIRODIARIO,DIASSEMVENDA,ESTCUSTGER,PRODFALTA,ESTMINGIR,PONTOPED); TGFCUS(CODPROD,CODEMP,CUSMEDICM,CUSSEMICM,DTATUAL,NUNOTA); TGFLOC(CODLOCAL,DESCRLOCAL); TGFITE(NUNOTA,CODPROD,QTDNEG,CUSTO); TGFCAB(NUNOTA,CODEMP,DTNEG,CODTIPOPER,CODPARC); TGFTOP(CODTIPOPER,ATUALEST,DESCROPER); TGFPAR(CODPARC,NOMEPARC); TGFITC(NUMCOTACAO,CODPARC,CONFIABFORN,QUALATEND,QUALPROD,PRAZOENTREGA,MELHOR); TGFCOT(NUMCOTACAO,DHINIC,DHFINAL,SITUACAO,CODUSUREQ); TSIUSU(CODUSU,NOMEUSU).`;

function normalizarSituacao(sql: string) {
  // Em algumas instalações Sankhya SITUACAO é inteiro; ao comparar com 'N',
  // 'F' ou 'C' o SQL Server tenta converter a letra para número. Sempre
  // comparar a representação textual mantém a consulta compatível nos dois casos.
  return sql
    .replace(/\b((?:[A-Z][A-Z0-9_]*\.)?SITUACAO)\s*(NOT\s+IN|IN)\s*(\([^)]*\))/gi, 'CAST($1 AS VARCHAR(20)) $2 $3')
    .replace(/\b((?:[A-Z][A-Z0-9_]*\.)?SITUACAO)\s*(=|!=|<>)\s*'([^']*)'/gi, "CAST($1 AS VARCHAR(20)) $2 '$3'");
}

function consultaAtalho(pergunta: string) {
  const texto = pergunta.toLocaleLowerCase();
  if (/fornecedor/.test(texto) && /prazo/.test(texto)) return `SELECT TOP 100 PAR.NOMEPARC AS FORNECEDOR, AVG(TRY_CONVERT(DECIMAL(18,2), ITC.PRAZOENTREGA)) AS PRAZOMEDIO, COUNT(*) AS TOTALCOTACOES
    FROM TGFITC ITC LEFT JOIN TGFPAR PAR ON PAR.CODPARC=ITC.CODPARC GROUP BY PAR.NOMEPARC ORDER BY PRAZOMEDIO ASC`;
  if (/cota[cç][aã]o/.test(texto) && /(abert|prazo)/.test(texto)) return `SELECT TOP 100 COT.NUMCOTACAO, COT.DHINIC, COT.DHFINAL, COT.SITUACAO, USU.NOMEUSU AS COMPRADOR
    FROM TGFCOT COT LEFT JOIN TSIUSU USU ON USU.CODUSU=COT.CODUSUREQ WHERE CAST(COT.SITUACAO AS VARCHAR(20)) NOT IN ('F','C') ORDER BY COT.DHFINAL ASC`;
  if (/(abaixo|ruptura|mínimo|minimo)/.test(texto) && /(produto|estoque)/.test(texto)) return `SELECT TOP 100 P.CODPROD, P.DESCRPROD, E.ESTOQUE, P.ESTMIN AS MINIMO, L.DESCRLOCAL AS LOCAL
    FROM TGFPRO P JOIN TGFEST E ON E.CODPROD=P.CODPROD LEFT JOIN TGFLOC L ON L.CODLOCAL=E.CODLOCAL WHERE P.ATIVO='S' AND P.ESTMIN IS NOT NULL AND E.ESTOQUE<=P.ESTMIN ORDER BY E.ESTOQUE ASC`;
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
      messages: [{ role: 'system', content: `Você é um assistente de estoque Sankhya. Converta perguntas em SQL SOMENTE LEITURA. Use exclusivamente este schema: ${ESQUEMA} Responda JSON {"sql":"..."}. Use SELECT ou WITH, no máximo TOP 100; nunca use ponto-e-vírgula, DML, metadados ou tabelas fora da lista. REGRA DE TIPO: TGFCOT.SITUACAO pode ser número ou texto; nunca compare SITUACAO diretamente com letras. Quando precisar filtrar, use CAST(COT.SITUACAO AS VARCHAR(20)).` }, { role: 'user', content: pergunta }],
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
