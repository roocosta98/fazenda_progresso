import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMssqlPool } from '../_lib/mssql.js';

// Busca veículos (caminhões) diretamente de vw_UltimaPosicao / Equipamentos
// Filtrando apenas por Nome e CodigoEquipamento que contenham "cam", "caminhao", "caminhão".
const QUERY = `
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

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const pool = await getMssqlPool();
    const result = await pool.request().query(QUERY);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Erro ao consultar Equipamentos:', error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server)' });
  }
}
