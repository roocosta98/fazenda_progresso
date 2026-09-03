import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMssqlPool } from '../_lib/mssql.js';

// Lista os insights já gerados (InsightIA), mais recentes primeiro.
// ?resolvido=false esconde os já tratados (default da tela); ?resolvido=true mostra só os tratados.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const resolvidoParam = typeof req.query.resolvido === 'string' ? req.query.resolvido : null;

    const pool = await getMssqlPool();
    const request = pool.request();
    let where = '';
    if (resolvidoParam === 'false') {
      where = 'WHERE Resolvido = 0';
    } else if (resolvidoParam === 'true') {
      where = 'WHERE Resolvido = 1';
    }

    const result = await request.query(`
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
