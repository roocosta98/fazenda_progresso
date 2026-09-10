import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMssqlPool } from '../_lib/mssql.js';

// Unificação de api/frota/equipamentos.ts e api/frota/operadores.ts em [recurso].ts
// para manter o total de Serverless Functions abaixo do limite de 12 da Vercel Hobby.
// Atende:
// - /api/frota/equipamentos
// - /api/frota/operadores

const QUERY_EQUIPAMENTOS = `
SELECT
  p.EquipamentoId,
  p.CodigoEquipamento,
  p.Nome,
  p.GrupoFrente,
  p.Fazenda,
  p.Operador,
  p.Estado,
  p.HorimetroOdometro,
  p.ColetadoEm
FROM vw_UltimaPosicao p
WHERE (
  p.Nome LIKE '%cam%'
  OR p.Nome LIKE '%caminh%'
  OR p.Nome LIKE '%caminhão%'
  OR p.CodigoEquipamento LIKE '%cam%'
)
ORDER BY p.Nome
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const recurso = req.query.recurso || (req.url?.includes('operadores') ? 'operadores' : 'equipamentos');

  try {
    const pool = await getMssqlPool();

    if (recurso === 'operadores') {
      const result = await pool.request().query('SELECT * FROM Operadores ORDER BY Nome');
      return res.status(200).json(result.recordset);
    }

    // Default: equipamentos
    const result = await pool.request().query(QUERY_EQUIPAMENTOS);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error(`Erro ao consultar ${recurso}:`, error);
    return res.status(502).json({ error: `Falha ao consultar o banco de dados da fazenda (${recurso})` });
  }
}
