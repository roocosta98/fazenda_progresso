import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from '../_lib/mssql.js';
import { FILTRO_TIPO_CAMINHAO_LIKE } from '../_lib/tipoEquipamento.js';

// Só caminhão em todas as views por equipamento (pedido do Rodrigo) — nenhuma delas traz
// TipoEquipamento no próprio contrato de campos, então filtro via EXISTS contra
// Equipamentos/TiposEquipamento pelo EquipamentoId de cada view, sem mexer no restante da query.
const EXISTS_CAMINHAO = (equipamentoIdExpr: string) => `
  EXISTS (
    SELECT 1 FROM Equipamentos eq
    JOIN TiposEquipamento te ON te.TipoEquipamentoId = eq.TipoEquipamentoId
    WHERE eq.EquipamentoId = ${equipamentoIdExpr} AND te.Descricao LIKE @tipoCaminhao
  )
`;

// Painel de Metas Completo (diário) — PRD v3 seção 5. As 6 views novas (migração
// sql/013_painel_metas_completo.sql, já aplicada pelo cliente) resolvem todo o dado — aqui só
// leio, sem recalcular nada. Um arquivo só, roteado por ?modo=, pelo mesmo motivo do
// api/frota/leituras.ts: a Vercel Hobby limita a 12 serverless functions por deploy, e o Admin
// já estava em 11 antes deste endpoint (10 depois de consolidar alarmes+metricas).
//
// Lição da entrega anterior (PRD v2): "Competencia*" nas views são colunas DATE de verdade, nunca
// comparar com string "AAAA-MM" — sempre range >= X AND < Y. Aplico a mesma cautela aqui pra "Dia"
// e "Competencia" das views novas, mesmo sem ter confirmado o tipo exato: um range é seguro nos
// dois casos (DATE ou DATETIME2), uma comparação de igualdade de string não é.

function competenciaAtualYYYYMM(): string {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
}

function parseCompetencia(valor: unknown): { inicio: Date; fim: Date } {
  const referencia = typeof valor === 'string' ? valor : competenciaAtualYYYYMM();
  const [ano, mes] = referencia.split('-').map(Number);
  return {
    inicio: new Date(Date.UTC(ano, mes - 1, 1)),
    fim: new Date(Date.UTC(ano, mes, 1)),
  };
}

function parseIntervaloDatas(req: VercelRequest): { dataInicio: Date; dataFim: Date } {
  const rawInicio = Array.isArray(req.query.dataInicio) ? req.query.dataInicio[0] : req.query.dataInicio;
  const rawFim = Array.isArray(req.query.dataFim) ? req.query.dataFim[0] : req.query.dataFim;

  const hoje = new Date();
  const fimDefault = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() + 1));
  const inicioDefault = new Date(fimDefault);
  inicioDefault.setUTCDate(inicioDefault.getUTCDate() - 30);

  const dataInicio = typeof rawInicio === 'string' && rawInicio ? new Date(`${rawInicio}T00:00:00Z`) : inicioDefault;
  const dataFimBase = typeof rawFim === 'string' && rawFim ? new Date(`${rawFim}T00:00:00Z`) : null;
  // dataFim é exclusiva (+1 dia) pra incluir o dia informado inteiro, mesmo que "Dia" venha como DATETIME2
  const dataFim = dataFimBase ? new Date(dataFimBase.getTime() + 24 * 60 * 60 * 1000) : fimDefault;

  return { dataInicio, dataFim };
}

function equipamentoIdNumerico(req: VercelRequest): number | null {
  const raw = Array.isArray(req.query.equipamentoId) ? req.query.equipamentoId[0] : req.query.equipamentoId;
  const numero = Number(raw);
  return Number.isFinite(numero) ? numero : null;
}

async function modoDiario(req: VercelRequest, res: VercelResponse) {
  const { dataInicio, dataFim } = parseIntervaloDatas(req);
  const equipamentoId = equipamentoIdNumerico(req);
  const motorista = typeof req.query.motorista === 'string' ? req.query.motorista : null;

  const pool = await getMssqlPool();

  const porVeiculo = await pool.request()
    .input('dataInicio', sql.DateTime2, dataInicio)
    .input('dataFim', sql.DateTime2, dataFim)
    .input('equipamentoId', sql.Int, equipamentoId)
    .input('tipoCaminhao', sql.NVarChar, FILTRO_TIPO_CAMINHAO_LIKE)
    .query(`
      SELECT * FROM vw_ResultadoDiarioVeiculo
      WHERE Dia >= @dataInicio AND Dia < @dataFim
        AND (@equipamentoId IS NULL OR EquipamentoId = @equipamentoId)
        AND ${EXISTS_CAMINHAO('EquipamentoId')}
      ORDER BY Dia
    `);

  const porMotorista = await pool.request()
    .input('dataInicio', sql.DateTime2, dataInicio)
    .input('dataFim', sql.DateTime2, dataFim)
    .input('motorista', sql.NVarChar, motorista)
    .query(`
      SELECT * FROM vw_ResultadoDiarioMotorista
      WHERE Dia >= @dataInicio AND Dia < @dataFim
        AND (@motorista IS NULL OR MotoristaNomeFicha = @motorista)
      ORDER BY Dia
    `);

  res.status(200).json({ porVeiculo: porVeiculo.recordset, porMotorista: porMotorista.recordset });
}

async function modoMotivos(req: VercelRequest, res: VercelResponse) {
  const equipamentoId = equipamentoIdNumerico(req);
  if (equipamentoId === null) {
    res.status(400).json({ error: 'Parâmetro equipamentoId é obrigatório e deve ser numérico' });
    return;
  }
  const { dataInicio, dataFim } = parseIntervaloDatas(req);

  const pool = await getMssqlPool();
  const result = await pool.request()
    .input('equipamentoId', sql.Int, equipamentoId)
    .input('dataInicio', sql.DateTime2, dataInicio)
    .input('dataFim', sql.DateTime2, dataFim)
    .input('tipoCaminhao', sql.NVarChar, FILTRO_TIPO_CAMINHAO_LIKE)
    .query(`
      SELECT * FROM vw_MotivosOperacaoEquipamento
      WHERE EquipamentoId = @equipamentoId AND Dia >= @dataInicio AND Dia < @dataFim
        AND ${EXISTS_CAMINHAO('EquipamentoId')}
      ORDER BY MinutosAproximados DESC
    `);

  res.status(200).json(result.recordset);
}

async function modoMotor(req: VercelRequest, res: VercelResponse) {
  const equipamentoId = equipamentoIdNumerico(req);
  if (equipamentoId === null) {
    res.status(400).json({ error: 'Parâmetro equipamentoId é obrigatório e deve ser numérico' });
    return;
  }
  const { dataInicio, dataFim } = parseIntervaloDatas(req);

  const pool = await getMssqlPool();
  const result = await pool.request()
    .input('equipamentoId', sql.Int, equipamentoId)
    .input('dataInicio', sql.DateTime2, dataInicio)
    .input('dataFim', sql.DateTime2, dataFim)
    .input('tipoCaminhao', sql.NVarChar, FILTRO_TIPO_CAMINHAO_LIKE)
    .query(`
      SELECT * FROM vw_TempoMotorEquipamento
      WHERE EquipamentoId = @equipamentoId AND Dia >= @dataInicio AND Dia < @dataFim
        AND ${EXISTS_CAMINHAO('EquipamentoId')}
      ORDER BY Dia
    `);

  res.status(200).json(result.recordset);
}

async function modoProgresso(req: VercelRequest, res: VercelResponse) {
  const { inicio, fim } = parseCompetencia(req.query.competencia);

  const pool = await getMssqlPool();

  const porVeiculo = await pool.request()
    .input('inicioCompetencia', sql.DateTime2, inicio)
    .input('fimCompetencia', sql.DateTime2, fim)
    .input('tipoCaminhao', sql.NVarChar, FILTRO_TIPO_CAMINHAO_LIKE)
    .query(`
      SELECT * FROM vw_ProgressoMensalVeiculo
      WHERE Competencia >= @inicioCompetencia AND Competencia < @fimCompetencia
        AND ${EXISTS_CAMINHAO('EquipamentoId')}
      ORDER BY SaldoAcumuladoMes DESC
    `);

  const porMotorista = await pool.request()
    .input('inicioCompetencia', sql.DateTime2, inicio)
    .input('fimCompetencia', sql.DateTime2, fim)
    .query(`
      SELECT * FROM vw_ProgressoMensalMotorista
      WHERE Competencia >= @inicioCompetencia AND Competencia < @fimCompetencia
      ORDER BY SaldoAcumuladoMes DESC
    `);

  res.status(200).json({ porVeiculo: porVeiculo.recordset, porMotorista: porMotorista.recordset });
}

// Dashboard Executivo (melhoria pedida pelo Rodrigo) + "Dashboard Geral" do PRD §11.1: tendência
// de custo dos últimos 6 meses, comparação por frente/fazenda no mês corrente, quantos motoristas
// estão dentro do ponto de equilíbrio e alarmes das últimas 24h. Não recalcula Km/L realizado
// (exigiria repetir o cruzamento com LeiturasOperacao mês a mês) — fica pra uma iteração futura.
async function modoExecutivo(req: VercelRequest, res: VercelResponse) {
  const { inicio: inicioMesCorrente, fim: fimMesCorrente } = parseCompetencia(req.query.competencia);
  const inicioTendencia = new Date(Date.UTC(inicioMesCorrente.getUTCFullYear(), inicioMesCorrente.getUTCMonth() - 5, 1));

  const pool = await getMssqlPool();

  const tendenciaMensal = await pool.request()
    .input('inicioTendencia', sql.DateTime2, inicioTendencia)
    .input('fimMesCorrente', sql.DateTime2, fimMesCorrente)
    .input('tipoCaminhao', sql.NVarChar, FILTRO_TIPO_CAMINHAO_LIKE)
    .query(`
      SELECT
        CompetenciaMeta,
        SUM(ISNULL(CustoFixoTotalMes, 0)) AS CustoFixoTotalMes,
        SUM(ISNULL(CustoOperacionalTotalMes, CustoFixoTotalMes)) AS CustoOperacionalTotalMes
      FROM vw_PainelMotoristaVeiculo
      WHERE CompetenciaMeta >= @inicioTendencia AND CompetenciaMeta < @fimMesCorrente
        AND ${EXISTS_CAMINHAO('EquipamentoId')}
      GROUP BY CompetenciaMeta
      ORDER BY CompetenciaMeta
    `);

  const porFrenteFazenda = await pool.request()
    .input('inicioMesCorrente', sql.DateTime2, inicioMesCorrente)
    .input('fimMesCorrente', sql.DateTime2, fimMesCorrente)
    .input('tipoCaminhao', sql.NVarChar, FILTRO_TIPO_CAMINHAO_LIKE)
    .query(`
      SELECT
        GrupoFrente, Fazenda,
        SUM(ISNULL(CustoFixoTotalMes, 0)) AS CustoFixoTotalMes,
        SUM(ISNULL(CustoOperacionalTotalMes, CustoFixoTotalMes)) AS CustoOperacionalTotalMes
      FROM vw_PainelMotoristaVeiculo
      WHERE CompetenciaMeta >= @inicioMesCorrente AND CompetenciaMeta < @fimMesCorrente
        AND ${EXISTS_CAMINHAO('EquipamentoId')}
      GROUP BY GrupoFrente, Fazenda
      ORDER BY CustoOperacionalTotalMes DESC
    `);

  const [pontoEquilibrio, alarmes24h] = await Promise.all([
    pool.request()
      .input('inicioMesCorrente', sql.DateTime2, inicioMesCorrente)
      .input('fimMesCorrente', sql.DateTime2, fimMesCorrente)
      .query(`
        SELECT
          COUNT(*) AS TotalMotoristas,
          SUM(CASE WHEN SaldoAcumuladoMes >= 0 THEN 1 ELSE 0 END) AS DentroDoPontoDeEquilibrio
        FROM vw_ProgressoMensalMotorista
        WHERE Competencia >= @inicioMesCorrente AND Competencia < @fimMesCorrente
      `)
      .then((r) => r.recordset[0])
      .catch((error) => {
        console.error('Dashboard executivo: falha ao agregar ponto de equilíbrio:', error);
        return { TotalMotoristas: 0, DentroDoPontoDeEquilibrio: 0 };
      }),
    pool.request()
      .input('tipoCaminhao', sql.NVarChar, FILTRO_TIPO_CAMINHAO_LIKE)
      .query(`
        SELECT COUNT(*) AS QtdAlarmes24h FROM AlarmesEquipamento
        WHERE ColetadoEmUtc >= DATEADD(HOUR, -24, SYSUTCDATETIME())
          AND ${EXISTS_CAMINHAO('EquipamentoId')}
      `)
      .then((r) => r.recordset[0].QtdAlarmes24h as number)
      .catch((error) => {
        console.error('Dashboard executivo: falha ao contar alarmes:', error);
        return 0;
      }),
  ]);

  res.status(200).json({
    tendenciaMensal: tendenciaMensal.recordset,
    porFrenteFazenda: porFrenteFazenda.recordset,
    pontoEquilibrio,
    alarmes24h,
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const modo = Array.isArray(req.query.modo) ? req.query.modo[0] : req.query.modo;

  try {
    switch (modo) {
      case 'diario':
        return await modoDiario(req, res);
      case 'motivos':
        return await modoMotivos(req, res);
      case 'motor':
        return await modoMotor(req, res);
      case 'progresso':
        return await modoProgresso(req, res);
      case 'executivo':
        return await modoExecutivo(req, res);
      default:
        res.status(400).json({ error: 'Parâmetro modo é obrigatório: diario, motivos, motor, progresso ou executivo' });
    }
  } catch (error) {
    console.error(`Erro ao consultar painel diário (modo=${modo}):`, error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server). As views do painel diário (sql/013_painel_metas_completo.sql) existem?' });
  }
}
