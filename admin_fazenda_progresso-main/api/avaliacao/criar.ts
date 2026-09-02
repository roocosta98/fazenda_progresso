import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from '../_lib/mssql.js';

// Grava a Avaliação de Condução (IEC, PRD 4.5) — encarregado/motorista educador lança a nota
// direto no portal em vez do aplicativo separado do cliente. Tabelas novas AvaliacaoConducao +
// AvaliacaoConducaoItem (server/sql/checklist_avaliacao.sql — precisa ter sido executado no SQL
// Server antes deste endpoint funcionar).
interface AvaliacaoPayload {
  motoristaNomeFicha: string;
  avaliador: string;
  observacao?: string;
  itens: { criterio: string; nota: number }[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const payload = req.body as AvaliacaoPayload;
  if (!payload?.motoristaNomeFicha || !payload?.avaliador || !Array.isArray(payload.itens) || payload.itens.length === 0) {
    res.status(400).json({ error: 'motoristaNomeFicha, avaliador e itens são obrigatórios' });
    return;
  }

  const notaFinal = payload.itens.reduce((soma, i) => soma + i.nota, 0) / payload.itens.length;

  try {
    const pool = await getMssqlPool();

    const header = await pool.request()
      .input('motoristaNomeFicha', sql.NVarChar, payload.motoristaNomeFicha)
      .input('avaliador', sql.NVarChar, payload.avaliador)
      .input('notaFinal', sql.Decimal(5, 2), notaFinal)
      .input('observacao', sql.NVarChar, payload.observacao ?? null)
      .query(`
        INSERT INTO AvaliacaoConducao (MotoristaNomeFicha, Avaliador, NotaFinal, Observacao)
        OUTPUT INSERTED.AvaliacaoConducaoId
        VALUES (@motoristaNomeFicha, @avaliador, @notaFinal, @observacao)
      `);

    const avaliacaoConducaoId = header.recordset[0].AvaliacaoConducaoId as number;

    for (const item of payload.itens) {
      await pool.request()
        .input('avaliacaoConducaoId', sql.Int, avaliacaoConducaoId)
        .input('criterio', sql.NVarChar, item.criterio)
        .input('nota', sql.Decimal(5, 2), item.nota)
        .query(`
          INSERT INTO AvaliacaoConducaoItem (AvaliacaoConducaoId, Criterio, Nota)
          VALUES (@avaliacaoConducaoId, @criterio, @nota)
        `);
    }

    res.status(200).json({ ok: true, avaliacaoConducaoId, notaFinal });
  } catch (error) {
    console.error('Erro ao gravar AvaliacaoConducao:', error);
    res.status(502).json({ error: 'Falha ao gravar no banco de dados da fazenda (SQL Server). As tabelas AvaliacaoConducao/AvaliacaoConducaoItem existem?' });
  }
}
