import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { exigirAcessoCustos } from './custosAuth.js';
import { consultarSankhya } from './estoquePainel.js';

const TABELAS_PERMITIDAS = new Set(['TGFPRO', 'TGFEST', 'TGFLOC', 'TGFGIR', 'TGFCUS', 'TGFITE', 'TGFCAB', 'TGFTOP', 'TGFPAR', 'TGFITC', 'TGFCOT', 'TSIUSU']);
const ESQUEMA = `TGFPRO(CODPROD,DESCRPROD,REFERENCIA,MARCA,ATIVO,ESTMIN,ESTMAX); TGFEST(CODPROD,CODLOCAL,CODEMP,CONTROLE,ESTOQUE); TGFGIR(CODPROD,CODLOCAL,CODEMP,GIRODIARIO,DIASSEMVENDA,ESTCUSTGER,PRODFALTA,ESTMINGIR,PONTOPED); TGFCUS(CODPROD,CODEMP,CUSMEDICM,CUSSEMICM,DTATUAL,NUNOTA); TGFLOC(CODLOCAL,DESCRLOCAL); TGFITE(NUNOTA,CODPROD,QTDNEG,CUSTO); TGFCAB(NUNOTA,CODEMP,DTNEG,CODTIPOPER,CODPARC); TGFTOP(CODTIPOPER,ATUALEST,DESCROPER); TGFPAR(CODPARC,NOMEPARC); TGFITC(NUMCOTACAO,CODPARC,CONFIABFORN,QUALATEND,QUALPROD,PRAZOENTREGA,MELHOR); TGFCOT(NUMCOTACAO,DHINIC,DHFINAL,SITUACAO,CODUSUREQ); TSIUSU(CODUSU,NOMEUSU).`;

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
      messages: [{ role: 'system', content: `Você é um assistente de estoque Sankhya. Converta perguntas em SQL SOMENTE LEITURA. Use exclusivamente este schema: ${ESQUEMA} Responda JSON {"sql":"..."}. Use SELECT ou WITH, no máximo TOP 100; nunca use ponto-e-vírgula, DML, metadados ou tabelas fora da lista.` }, { role: 'user', content: pergunta }],
    });
    const gerado = JSON.parse(consulta.choices[0]?.message.content ?? '{}') as { sql?: string };
    const sql = validarSql(String(gerado.sql ?? ''));
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
