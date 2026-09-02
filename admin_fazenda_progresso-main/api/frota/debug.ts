import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMssqlPool } from '../_lib/mssql.js';

// Endpoint de diagnóstico: confirma se LeiturasOperacao/LeiturasSensor têm dados
// e se os EquipamentoId batem com os de vw_UltimaPosicao. Não usado pela tela,
// só pra investigar por que "Operação"/"Sensores" aparecem vazios no popup.
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const pool = await getMssqlPool();
    const [posicoes, operacao, sensor, amostraOperacao, amostraSensor] = await Promise.all([
      pool.request().query('SELECT COUNT(*) AS total, MIN(EquipamentoId) AS minEquipamentoId, MAX(EquipamentoId) AS maxEquipamentoId FROM vw_UltimaPosicao'),
      pool.request().query('SELECT COUNT(*) AS total, MAX(ColetadoEmUtc) AS ultimoRegistro FROM LeiturasOperacao'),
      pool.request().query('SELECT COUNT(*) AS total, MAX(ColetadoEmUtc) AS ultimoRegistro FROM LeiturasSensor'),
      pool.request().query('SELECT TOP 5 * FROM LeiturasOperacao ORDER BY ColetadoEmUtc DESC'),
      pool.request().query('SELECT TOP 5 * FROM LeiturasSensor ORDER BY ColetadoEmUtc DESC'),
    ]);
    res.status(200).json({
      vw_UltimaPosicao: posicoes.recordset[0],
      LeiturasOperacao: operacao.recordset[0],
      LeiturasSensor: sensor.recordset[0],
      amostraLeiturasOperacao: amostraOperacao.recordset,
      amostraLeiturasSensor: amostraSensor.recordset,
    });
  } catch (error) {
    console.error('Erro no diagnóstico:', error);
    res.status(502).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
