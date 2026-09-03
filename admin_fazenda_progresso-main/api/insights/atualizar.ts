import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from '../_lib/mssql.js';

// Marca um insight como lido e/ou resolvido. Body: { insightId, lido?, resolvido?, resolvidoPor? }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

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
