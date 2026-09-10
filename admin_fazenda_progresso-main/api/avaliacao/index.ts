import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from '../_lib/mssql.js';

// GET (listar) e POST (criar) no mesmo arquivo — a Vercel no plano Hobby limita a 12
// serverless functions por deploy; agrupar rotas relacionadas evita estourar esse limite
// conforme o número de endpoints cresce (era api/avaliacao/listar.ts + criar.ts antes).

const QUERY_LISTAR = `
SELECT
  a.AvaliacaoConducaoId, a.MotoristaNomeFicha, a.Avaliador, a.DataHora, a.NotaFinal, a.Observacao,
  (
    SELECT i.Criterio, i.Nota
    FROM AvaliacaoConducaoItem i
    WHERE i.AvaliacaoConducaoId = a.AvaliacaoConducaoId
    FOR JSON PATH
  ) AS ItensJson
FROM AvaliacaoConducao a
ORDER BY a.DataHora DESC
`;

interface AvaliacaoPayload {
  motoristaNomeFicha: string;
  avaliador: string;
  observacao?: string;
  itens: { criterio: string; nota: number }[];
}

async function listar(res: VercelResponse) {
  try {
    const pool = await getMssqlPool();
    const result = await pool.request().query(QUERY_LISTAR);
    const linhas = result.recordset.map((linha) => ({
      ...linha,
      Itens: linha.ItensJson ? JSON.parse(linha.ItensJson) : [],
    }));
    res.status(200).json(linhas);
  } catch (error) {
    console.error('Erro ao consultar AvaliacaoConducao:', error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server). As tabelas AvaliacaoConducao/AvaliacaoConducaoItem existem?' });
  }
}

async function criar(req: VercelRequest, res: VercelResponse) {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return listar(res);
  if (req.method === 'POST') return criar(req, res);
  res.status(405).json({ error: 'Método não permitido' });
}
