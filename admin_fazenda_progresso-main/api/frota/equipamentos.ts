import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMssqlPool } from '../_lib/mssql.js';

const QUERY = `
SELECT
  eq.EquipamentoId, eq.CodigoEquipamento, eq.Nome, eq.CriadoEm, eq.AtualizadoEm,
  te.Descricao AS TipoEquipamento,
  gf.Nome AS GrupoFrente,
  fz.Nome AS Fazenda
FROM Equipamentos eq
LEFT JOIN TiposEquipamento te ON te.TipoEquipamentoId = eq.TipoEquipamentoId
LEFT JOIN GruposFrente gf ON gf.GrupoFrenteId = eq.GrupoFrenteId
LEFT JOIN Fazendas fz ON fz.FazendaId = eq.FazendaId
ORDER BY eq.Nome
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
