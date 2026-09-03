import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from '../_lib/mssql.js';
import { FILTRO_TIPO_CAMINHAO_LIKE } from '../_lib/tipoEquipamento.js';

// Só caminhão nesta tela (pedido do Rodrigo: nunca trazer trator nem outro tipo) — filtro
// hard-coded no backend, não é flag na UI.
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
WHERE te.Descricao LIKE @tipoCaminhao
ORDER BY eq.Nome
`;

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const pool = await getMssqlPool();
    const result = await pool.request()
      .input('tipoCaminhao', sql.NVarChar, FILTRO_TIPO_CAMINHAO_LIKE)
      .query(QUERY);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Erro ao consultar Equipamentos:', error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server)' });
  }
}
