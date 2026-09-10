import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from '../_lib/mssql.js';

// Histórico de posições de um equipamento (LeiturasLocalizacao), usado pro rastro no mapa
// e pro gráfico de velocidade ao longo do tempo. ?equipamentoId=233&horas=24
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawEquipamentoId = Array.isArray(req.query.equipamentoId) ? req.query.equipamentoId[0] : req.query.equipamentoId;
  const rawHoras = Array.isArray(req.query.horas) ? req.query.horas[0] : req.query.horas;

  const equipamentoId = Number(rawEquipamentoId);
  const horas = Number(rawHoras ?? 24);

  if (!Number.isFinite(equipamentoId)) {
    res.status(400).json({ error: 'Parâmetro equipamentoId é obrigatório e deve ser numérico' });
    return;
  }

  try {
    const pool = await getMssqlPool();
    const result = await pool.request()
      .input('equipamentoId', sql.Int, equipamentoId)
      .input('horas', sql.Int, Number.isFinite(horas) ? horas : 24)
      .query(`
        SELECT Latitude, Longitude, VelocidadeKmh, ColetadoEmUtc
        FROM LeiturasLocalizacao
        WHERE EquipamentoId = @equipamentoId
          AND ColetadoEmUtc >= DATEADD(HOUR, -@horas, SYSUTCDATETIME())
          AND Latitude IS NOT NULL
          AND Longitude IS NOT NULL
        ORDER BY ColetadoEmUtc ASC
      `);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Erro ao consultar trajeto:', error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server)' });
  }
}
