import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from '../_lib/mssql.js';

// AlarmesEquipamento (eventos de risco: frenagem brusca, aceleração — PRD 5.1/5.2) e
// MetricasEquipamento (nível de tanque, RPM/pressão/vazão de bomba — PRD 5.1) no mesmo arquivo
// via ?tipo=alarmes|metricas — a Vercel no plano Hobby limita a 12 serverless functions por
// deploy, e cada arquivo em api/*.ts conta como uma; agrupar rotas do mesmo tema (leituras de
// equipamento "por evento"/"conforme disponível") evita estourar esse limite (eram
// api/frota/alarmes.ts + api/frota/metricas.ts antes). ?equipamentoId=233&horas=24
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawTipo = Array.isArray(req.query.tipo) ? req.query.tipo[0] : req.query.tipo;
  const tabela = rawTipo === 'metricas' ? 'MetricasEquipamento' : rawTipo === 'alarmes' ? 'AlarmesEquipamento' : null;

  if (!tabela) {
    res.status(400).json({ error: 'Parâmetro tipo é obrigatório e deve ser "alarmes" ou "metricas"' });
    return;
  }

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
        FROM ${tabela}
        WHERE EquipamentoId = @equipamentoId
          AND ColetadoEmUtc >= DATEADD(HOUR, -@horas, SYSUTCDATETIME())
        ORDER BY ColetadoEmUtc DESC
      `);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error(`Erro ao consultar ${tabela}:`, error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server)' });
  }
}
