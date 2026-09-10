import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from '../_lib/mssql.js';

// GET (listar) e POST (atualizar lido/resolvido) no mesmo arquivo — a Vercel no plano
// Hobby limita a 12 serverless functions por deploy; agrupar rotas relacionadas evita
// estourar esse limite conforme o número de endpoints cresce (era listar.ts + atualizar.ts).

async function listar(req: VercelRequest, res: VercelResponse) {
  try {
    const resolvidoParam = typeof req.query.resolvido === 'string' ? req.query.resolvido : null;

    const pool = await getMssqlPool();
    let where = '';
    if (resolvidoParam === 'false') {
      where = 'WHERE Resolvido = 0';
    } else if (resolvidoParam === 'true') {
      where = 'WHERE Resolvido = 1';
    }

    const result = await pool.request().query(`
      SELECT * FROM InsightIA
      ${where}
      ORDER BY GeradoEm DESC
    `);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Erro ao consultar InsightIA:', error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server). A tabela InsightIA existe?' });
  }
}

async function atualizar(req: VercelRequest, res: VercelResponse) {
  const { insightId, lido, resolvido, resolvidoPor } = req.body ?? {};
  if (typeof insightId !== 'number') {
    res.status(400).json({ error: 'insightId é obrigatório e deve ser numérico' });
    return;
  }

  try {
    const pool = await getMssqlPool();
    await pool.request()
      .input('insightId', sql.Int, insightId)
      .input('lido', sql.Bit, typeof lido === 'boolean' ? lido : null)
      .input('resolvido', sql.Bit, typeof resolvido === 'boolean' ? resolvido : null)
      .input('resolvidoPor', sql.NVarChar, resolvido ? (resolvidoPor ?? null) : null)
      .query(`
        UPDATE InsightIA
        SET
          Lido = COALESCE(@lido, Lido),
          Resolvido = COALESCE(@resolvido, Resolvido),
          ResolvidoPor = CASE WHEN @resolvido = 1 THEN @resolvidoPor ELSE ResolvidoPor END,
          ResolvidoEm = CASE WHEN @resolvido = 1 THEN SYSUTCDATETIME() ELSE ResolvidoEm END
        WHERE InsightId = @insightId
      `);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Erro ao atualizar InsightIA:', error);
    res.status(502).json({ error: 'Falha ao atualizar o insight no banco de dados' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return listar(req, res);
  if (req.method === 'POST') return atualizar(req, res);
  res.status(405).json({ error: 'Método não permitido' });
}
