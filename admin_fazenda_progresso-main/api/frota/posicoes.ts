import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMssqlPool } from '../_lib/mssql.js';

// Consulta posições enriquecidas a partir de vw_UltimaPosicao
// Filtrando apenas por Nome ou CodigoEquipamento que contenham "cam", "caminhao", "caminhão".
const QUERY = `
WITH LeiturasJanela AS (
  SELECT
    EquipamentoId,
    VelocidadeKmh,
    ColetadoEmUtc,
    LEAD(ColetadoEmUtc) OVER (PARTITION BY EquipamentoId ORDER BY ColetadoEmUtc) AS ProximaColetaUtc
  FROM LeiturasLocalizacao
  WHERE ColetadoEmUtc >= DATEADD(HOUR, -24, SYSUTCDATETIME())
),
ResumoMovimento AS (
  SELECT
    EquipamentoId,
    AVG(CAST(VelocidadeKmh AS FLOAT)) AS VelocidadeMediaCalculadaKmh,
    SUM(CASE
          WHEN VelocidadeKmh IS NOT NULL AND VelocidadeKmh <= 1 AND ProximaColetaUtc IS NOT NULL
          THEN LEAST(DATEDIFF(SECOND, ColetadoEmUtc, ProximaColetaUtc), 1800)
          ELSE 0
        END) AS TempoParadoSegundosCalculado,
    COUNT(*) AS QtdLeiturasJanela
  FROM LeiturasJanela
  GROUP BY EquipamentoId
)
SELECT
  p.*,
  sens.PorcentagemCargaBateria, sens.TensaoBateria, sens.TemperaturaBateria,
  sens.UmidadeSolo, sens.UmidadeSolo2, sens.UmidadeSolo3,
  sens.Temperatura AS TemperaturaAmbiente,
  sens.EnergiaGeradaDia, sens.EnergiaConsumidaDia, sens.ColetadoEmUtc AS SensorColetadoEmUtc,
  oper.ConsumoMedioLitros, oper.VelocidadeMedia AS VelocidadeMediaOperacao, oper.RpmMedio,
  oper.TempoMotorLigadoSegundos, oper.TempoMotorOciosoSegundos, oper.AreaOperacional,
  oper.ColetadoEmUtc AS OperacaoColetadoEmUtc,
  rm.VelocidadeMediaCalculadaKmh, rm.TempoParadoSegundosCalculado, rm.QtdLeiturasJanela,
  loc.HorimetroOdometro AS HorimetroOdometroLeitura, imp.Descricao AS ImplementoAcoplado,
  alr.AlarmesUltimas24h
FROM vw_UltimaPosicao p
OUTER APPLY (
  SELECT TOP 1 ls.*
  FROM LeiturasSensor ls
  WHERE ls.EquipamentoId = p.EquipamentoId
  ORDER BY ls.ColetadoEmUtc DESC
) sens
OUTER APPLY (
  SELECT TOP 1 lo.*
  FROM LeiturasOperacao lo
  WHERE lo.EquipamentoId = p.EquipamentoId
  ORDER BY lo.ColetadoEmUtc DESC
) oper
OUTER APPLY (
  SELECT TOP 1 loc2.HorimetroOdometro, loc2.ImplementoId
  FROM LeiturasLocalizacao loc2
  WHERE loc2.EquipamentoId = p.EquipamentoId
  ORDER BY loc2.ColetadoEmUtc DESC
) loc
LEFT JOIN Implementos imp ON imp.ImplementoId = loc.ImplementoId
LEFT JOIN ResumoMovimento rm ON rm.EquipamentoId = p.EquipamentoId
OUTER APPLY (
  SELECT COUNT(*) AS AlarmesUltimas24h
  FROM AlarmesEquipamento al
  WHERE al.EquipamentoId = p.EquipamentoId
    AND al.ColetadoEmUtc >= DATEADD(HOUR, -24, SYSUTCDATETIME())
) alr
WHERE (
  p.Nome LIKE '%cam%'
  OR p.Nome LIKE '%caminh%'
  OR p.Nome LIKE '%caminhão%'
  OR p.CodigoEquipamento LIKE '%cam%'
)
ORDER BY p.CodigoEquipamento
`;

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const pool = await getMssqlPool();
    const result = await pool.request().query(QUERY);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Erro ao consultar posições enriquecidas:', error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server)' });
  }
}
