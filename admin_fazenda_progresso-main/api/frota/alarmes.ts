import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from '../_lib/mssql.js';

// AlarmesEquipamento — "eventos de risco" do PRD (seção 5.1/5.2): frenagem brusca, aceleração,
// alarmes de origem Solinftec com operação e justificativa associadas. Por evento, então busca
// os últimos N alarmes de um equipamento (não é "última leitura", pode ter zero num período
// tranquilo) — mesmo padrão de api/frota/trajeto.ts. ?equipamentoId=233&horas=24
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
        SELECT TOP 50 *
        FROM AlarmesEquipamento
        WHERE EquipamentoId = @equipamentoId
          AND ColetadoEmUtc >= DATEADD(HOUR, -@horas, SYSUTCDATETIME())
        ORDER BY ColetadoEmUtc DESC
      `);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Erro ao consultar AlarmesEquipamento:', error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server)' });
  }
}
