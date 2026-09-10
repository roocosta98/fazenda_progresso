import { Router } from 'express';
import sql from 'mssql';
import { getMssqlPool } from '../lib/mssql.js';

const router = Router();

// Parte de vw_UltimaPosicao (exatamente como o cliente indicou: ORDER BY 2 = CodigoEquipamento),
// enriquecida com:
// - tipo do equipamento (Equipamentos/TiposEquipamento)
// - a leitura mais recente de sensores e de operação por equipamento (LeiturasSensor/LeiturasOperacao,
//   via OUTER APPLY TOP 1) — RpmMedio só existe aqui, não tem como calcular RPM a partir do GPS
// - velocidade média e tempo parado ESTIMADOS a partir do histórico de GPS das últimas 24h
//   (LeiturasLocalizacao), pra quando LeiturasOperacao ainda não tiver dado oficial calculado
//   pelo sistema do cliente
// - horímetro/odômetro e implemento acoplado (última leitura de LeiturasLocalizacao + Implementos)
const POSICOES_QUERY = `
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
  te.Descricao AS TipoEquipamento,
  sens.PorcentagemCargaBateria, sens.TensaoBateria, sens.TemperaturaBateria,
  sens.UmidadeSolo, sens.UmidadeSolo2, sens.UmidadeSolo3,
  sens.Temperatura AS TemperaturaAmbiente,
  sens.EnergiaGeradaDia, sens.EnergiaConsumidaDia, sens.ColetadoEmUtc AS SensorColetadoEmUtc,
  oper.ConsumoMedioLitros, oper.VelocidadeMedia AS VelocidadeMediaOperacao, oper.RpmMedio,
  oper.TempoMotorLigadoSegundos, oper.TempoMotorOciosoSegundos, oper.AreaOperacional,
  oper.ColetadoEmUtc AS OperacaoColetadoEmUtc,
  rm.VelocidadeMediaCalculadaKmh, rm.TempoParadoSegundosCalculado, rm.QtdLeiturasJanela,
  loc.HorimetroOdometro, imp.Descricao AS ImplementoAcoplado
FROM vw_UltimaPosicao p
LEFT JOIN Equipamentos eq ON eq.EquipamentoId = p.EquipamentoId
LEFT JOIN TiposEquipamento te ON te.TipoEquipamentoId = eq.TipoEquipamentoId
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
ORDER BY p.CodigoEquipamento
`;

router.get('/posicoes', async (_req, res) => {
  try {
    const pool = await getMssqlPool();
    const result = await pool.request().query(POSICOES_QUERY);
    res.json(result.recordset);
  } catch (error) {
    console.error('Erro ao consultar posições enriquecidas:', error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server)' });
  }
});

// Histórico de posições de um equipamento (LeiturasLocalizacao), usado pro rastro no mapa
// e pro gráfico de velocidade ao longo do tempo. ?equipamentoId=233&horas=24
router.get('/trajeto', async (req, res) => {
  const equipamentoId = Number(req.query.equipamentoId);
  const horas = Number(req.query.horas ?? 24);

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
    res.json(result.recordset);
  } catch (error) {
    console.error('Erro ao consultar trajeto:', error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server)' });
  }
});

const EQUIPAMENTOS_QUERY = `
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

router.get('/equipamentos', async (_req, res) => {
  try {
    const pool = await getMssqlPool();
    const result = await pool.request().query(EQUIPAMENTOS_QUERY);
    res.json(result.recordset);
  } catch (error) {
    console.error('Erro ao consultar Equipamentos:', error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server)' });
  }
});

router.get('/operadores', async (_req, res) => {
  try {
    const pool = await getMssqlPool();
    const result = await pool.request().query('SELECT * FROM Operadores ORDER BY Nome');
    res.json(result.recordset);
  } catch (error) {
    console.error('Erro ao consultar Operadores:', error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server)' });
  }
});

export default router;
