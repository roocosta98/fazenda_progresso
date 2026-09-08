import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from '../_lib/mssql.js';
import { FILTRO_TIPO_CAMINHAO_LIKE } from '../_lib/tipoEquipamento.js';
import { exigirAcessoCustos } from '../_lib/custosAuth.js';

// Filtro de veículos (caminhões): busca direta pelo nome/código sem depender de TiposEquipamento
const EXISTS_CAMINHAO = (equipamentoIdExpr: string) => `
  (${equipamentoIdExpr} IS NOT NULL)
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
    .input('motorista', sql.NVarChar, motorista)
    .input('tipoCaminhao', sql.NVarChar, FILTRO_TIPO_CAMINHAO_LIKE)
    .query(`
      WITH ConsumoDiario AS (
        SELECT
          EquipamentoId,
          CAST(ColetadoEmUtc AS date) AS Dia,
          SUM(CAST(ISNULL(ConsumoMedioLitros, 0) AS float)) AS LitrosConsumidosDia
        FROM LeiturasOperacao
        WHERE ColetadoEmUtc >= @dataInicio AND ColetadoEmUtc < @dataFim
        GROUP BY EquipamentoId, CAST(ColetadoEmUtc AS date)
      )
      SELECT r.*, c.LitrosConsumidosDia
      FROM vw_ResultadoDiarioVeiculo r
      LEFT JOIN ConsumoDiario c
        ON c.EquipamentoId = r.EquipamentoId AND c.Dia = CAST(r.Dia AS date)
      WHERE r.Dia >= @dataInicio AND r.Dia < @dataFim
        AND (@equipamentoId IS NULL OR r.EquipamentoId = @equipamentoId)
        AND (@motorista IS NULL OR r.MotoristaNomeFicha = @motorista)
        AND ${EXISTS_CAMINHAO('r.EquipamentoId')}
      ORDER BY r.Dia
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

// Motivos de parada/operação já AGREGADOS no banco (o front antes lia uma coluna
// "MotivoParada" que não existe nesta view e caía tudo num único "Outros"). O contrato real,
// confirmado no DBeaver, é: EquipamentoId, Dia, Estado, OperacaoDescricao, QtdLeituras,
// MinutosAproximados. Agrupo por Estado + OperacaoDescricao e devolvo já ordenado por tempo,
// que é exatamente o que a tela precisa desenhar.
//
// O filtro de motorista não existe nesta view (ela é por equipamento), então resolvo pelos
// equipamentos que aquele motorista rodou no período, via vw_ResultadoDiarioVeiculo.
async function modoMotivos(req: VercelRequest, res: VercelResponse) {
  const equipamentoId = equipamentoIdNumerico(req);
  const motorista = typeof req.query.motorista === 'string' ? req.query.motorista : null;
  const { dataInicio, dataFim } = parseIntervaloDatas(req);

  const pool = await getMssqlPool();
  const result = await pool.request()
    .input('equipamentoId', sql.Int, equipamentoId)
    .input('motorista', sql.NVarChar, motorista)
    .input('dataInicio', sql.DateTime2, dataInicio)
    .input('dataFim', sql.DateTime2, dataFim)
    .query(`
      WITH JornadaDiaria AS (
        -- Um motorista pode ter mais de um turno no mesmo dia. Agregar antes do join
        -- evita duplicar os motivos/valores do veículo quando isso acontecer.
        SELECT MotoristaNomeFicha, Dia,
          SUM(DATEDIFF(MINUTE, Entrada, Saida)) AS MinutosJornada,
          MIN(CASE WHEN Homologada = 1 THEN 1 ELSE 0 END) AS Homologada
        FROM JornadaMotorista
        GROUP BY MotoristaNomeFicha, Dia
      ), MotivosValidos AS (
       SELECT
        m.EquipamentoId, m.Dia, m.Estado, m.OperacaoDescricao, m.QtdLeituras,
        CASE WHEN ISNULL(j.MinutosJornada, 0) <= 0 THEN 0
             ELSE IIF(ISNULL(m.MinutosAproximados, 0) > j.MinutosJornada,
                      j.MinutosJornada, ISNULL(m.MinutosAproximados, 0)) END AS MinutosValidos,
        r.CustoMotoristaRateadoDia,
        r.CustoCombustivelDia,
        j.MinutosJornada,
        j.Homologada,
        ch.ValorHora AS CustoHoraMaquina,
        ch.Homologado AS MaquinaHomologada
      FROM vw_MotivosOperacaoEquipamento m
      LEFT JOIN vw_ResultadoDiarioVeiculo r ON r.EquipamentoId=m.EquipamentoId AND CAST(r.Dia AS date)=CAST(m.Dia AS date)
      LEFT JOIN JornadaDiaria j ON j.MotoristaNomeFicha=r.MotoristaNomeFicha AND j.Dia=CAST(m.Dia AS date)
      OUTER APPLY (SELECT TOP 1 ValorHora, Homologado FROM CustoHoraMaquina c WHERE c.EquipamentoId=m.EquipamentoId AND c.VigenciaInicio<=CAST(m.Dia AS date) AND (c.VigenciaFim IS NULL OR c.VigenciaFim>=CAST(m.Dia AS date)) ORDER BY c.VigenciaInicio DESC) ch
      WHERE m.Dia >= @dataInicio AND m.Dia < @dataFim
        -- A Solinftec pode preencher Estado e OperacaoDescricao ao mesmo tempo;
        -- excluir se "Final de turno" vier em qualquer uma das duas colunas.
        AND LOWER(CONCAT(ISNULL(m.OperacaoDescricao, ''), ' ', ISNULL(m.Estado, ''))) NOT LIKE '%final de turno%'
      )
      SELECT
        m.Estado,
        m.OperacaoDescricao,
        SUM(ISNULL(m.MinutosValidos, 0)) AS MinutosAproximados,
        SUM(ISNULL(m.QtdLeituras, 0)) AS QtdLeituras,
        SUM(CASE WHEN m.MinutosJornada > 0 THEN ISNULL(m.CustoMotoristaRateadoDia,0)*m.MinutosValidos/m.MinutosJornada ELSE 0 END) AS CustoMotorista,
        -- "desligado" contém a palavra "ligado"; por isso ele precisa ser
        -- explicitamente excluído antes de cobrar máquina e diesel.
        SUM(CASE WHEN LOWER(ISNULL(m.Estado,'')) LIKE '%ligado%'
                       AND LOWER(ISNULL(m.Estado,'')) NOT LIKE '%desligado%'
                 THEN ISNULL(m.CustoCombustivelDia,0)*m.MinutosValidos/NULLIF(m.MinutosJornada,0) ELSE 0 END) AS CustoCombustivel,
        SUM(CASE WHEN LOWER(ISNULL(m.Estado,'')) LIKE '%ligado%'
                       AND LOWER(ISNULL(m.Estado,'')) NOT LIKE '%desligado%'
                 THEN ISNULL(m.CustoHoraMaquina,0)*m.MinutosValidos/60.0 ELSE 0 END) AS CustoMaquina,
        MIN(CASE WHEN ISNULL(m.Homologada,0)=1 AND (m.CustoHoraMaquina IS NULL OR ISNULL(m.MaquinaHomologada,0)=1) THEN 1 ELSE 0 END) AS Homologado
      FROM MotivosValidos m
      WHERE m.Dia >= @dataInicio AND m.Dia < @dataFim
        AND (@equipamentoId IS NULL OR m.EquipamentoId = @equipamentoId)
        AND (@motorista IS NULL OR EXISTS (
          SELECT 1 FROM vw_ResultadoDiarioVeiculo r
          WHERE r.EquipamentoId = m.EquipamentoId
            AND r.MotoristaNomeFicha = @motorista
            AND r.Dia >= @dataInicio AND r.Dia < @dataFim
        ))
      GROUP BY m.Estado, m.OperacaoDescricao
      HAVING SUM(ISNULL(m.MinutosValidos, 0)) > 0
      ORDER BY MinutosAproximados DESC
    `);

  res.status(200).json(result.recordset);
}

// Motor ligado x ocioso — contrato real da view (confirmado no DBeaver): EquipamentoId, Dia,
// MinutosMotorLigado, MinutosMotorOcioso. O front antes lia MinutosProdutivos/MinutosOciosos/
// MinutosAproximados (nomes que não existem aqui), então o total dava 0 e a rosca ficava vazia.
// Devolvo o total do período já somado + a série por dia, pra tela não ter que somar nada.
async function modoMotor(req: VercelRequest, res: VercelResponse) {
  const equipamentoId = equipamentoIdNumerico(req);
  const motorista = typeof req.query.motorista === 'string' ? req.query.motorista : null;
  const { dataInicio, dataFim } = parseIntervaloDatas(req);

  const pool = await getMssqlPool();

  const filtroMotorista = `
    AND (@motorista IS NULL OR EXISTS (
      SELECT 1 FROM vw_ResultadoDiarioVeiculo r
      WHERE r.EquipamentoId = t.EquipamentoId
        AND r.MotoristaNomeFicha = @motorista
        AND r.Dia >= @dataInicio AND r.Dia < @dataFim
    ))
  `;

  const totais = await pool.request()
    .input('equipamentoId', sql.Int, equipamentoId)
    .input('motorista', sql.NVarChar, motorista)
    .input('dataInicio', sql.DateTime2, dataInicio)
    .input('dataFim', sql.DateTime2, dataFim)
    .query(`
      WITH JornadaDiaria AS (
        SELECT MotoristaNomeFicha, Dia, SUM(DATEDIFF(MINUTE, Entrada, Saida)) AS MinutosJornada
        FROM JornadaMotorista
        GROUP BY MotoristaNomeFicha, Dia
      )
      SELECT
        SUM(CASE WHEN ISNULL(j.MinutosJornada,0) <= 0 THEN 0 ELSE IIF(ISNULL(t.MinutosMotorLigado,0)>j.MinutosJornada,j.MinutosJornada,ISNULL(t.MinutosMotorLigado,0)) END) AS MinutosMotorLigado,
        SUM(CASE WHEN ISNULL(j.MinutosJornada,0) <= 0 THEN 0 ELSE IIF(ISNULL(t.MinutosMotorOcioso,0)>j.MinutosJornada,j.MinutosJornada,ISNULL(t.MinutosMotorOcioso,0)) END) AS MinutosMotorOcioso,
        COUNT(DISTINCT t.Dia) AS DiasComDado
      FROM vw_TempoMotorEquipamento t
      LEFT JOIN vw_ResultadoDiarioVeiculo rj ON rj.EquipamentoId=t.EquipamentoId AND CAST(rj.Dia AS date)=CAST(t.Dia AS date)
      LEFT JOIN JornadaDiaria j ON j.MotoristaNomeFicha=rj.MotoristaNomeFicha AND j.Dia=CAST(t.Dia AS date)
      WHERE t.Dia >= @dataInicio AND t.Dia < @dataFim
        AND (@equipamentoId IS NULL OR t.EquipamentoId = @equipamentoId)
        ${filtroMotorista}
    `);

  const porDia = await pool.request()
    .input('equipamentoId', sql.Int, equipamentoId)
    .input('motorista', sql.NVarChar, motorista)
    .input('dataInicio', sql.DateTime2, dataInicio)
    .input('dataFim', sql.DateTime2, dataFim)
    .query(`
      WITH JornadaDiaria AS (
        SELECT MotoristaNomeFicha, Dia, SUM(DATEDIFF(MINUTE, Entrada, Saida)) AS MinutosJornada
        FROM JornadaMotorista
        GROUP BY MotoristaNomeFicha, Dia
      )
      SELECT
        t.Dia,
        SUM(CASE WHEN ISNULL(j.MinutosJornada,0) <= 0 THEN 0 ELSE IIF(ISNULL(t.MinutosMotorLigado,0)>j.MinutosJornada,j.MinutosJornada,ISNULL(t.MinutosMotorLigado,0)) END) AS MinutosMotorLigado,
        SUM(CASE WHEN ISNULL(j.MinutosJornada,0) <= 0 THEN 0 ELSE IIF(ISNULL(t.MinutosMotorOcioso,0)>j.MinutosJornada,j.MinutosJornada,ISNULL(t.MinutosMotorOcioso,0)) END) AS MinutosMotorOcioso
      FROM vw_TempoMotorEquipamento t
      LEFT JOIN vw_ResultadoDiarioVeiculo rj ON rj.EquipamentoId=t.EquipamentoId AND CAST(rj.Dia AS date)=CAST(t.Dia AS date)
      LEFT JOIN JornadaDiaria j ON j.MotoristaNomeFicha=rj.MotoristaNomeFicha AND j.Dia=CAST(t.Dia AS date)
      WHERE t.Dia >= @dataInicio AND t.Dia < @dataFim
        AND (@equipamentoId IS NULL OR t.EquipamentoId = @equipamentoId)
        ${filtroMotorista}
      GROUP BY t.Dia
      ORDER BY t.Dia
    `);

  const linha = totais.recordset[0] ?? { MinutosMotorLigado: 0, MinutosMotorOcioso: 0, DiasComDado: 0 };
  res.status(200).json({
    minutosMotorLigado: Number(linha.MinutosMotorLigado ?? 0),
    minutosMotorOcioso: Number(linha.MinutosMotorOcioso ?? 0),
    diasComDado: Number(linha.DiasComDado ?? 0),
    porDia: porDia.recordset,
  });
}

// Lista de motoristas pro filtro da tela. Precisa vir da MESMA fonte que o filtro compara
// (MotoristaNomeFicha das views de metas) — antes a tela populava o dropdown com Operadores.Nome
// (nome da telemetria), que é outro cadastro, então o filtro quase nunca casava.
async function modoMotoristas(req: VercelRequest, res: VercelResponse) {
  const { dataInicio, dataFim } = parseIntervaloDatas(req);

  const pool = await getMssqlPool();
  const result = await pool.request()
    .input('dataInicio', sql.DateTime2, dataInicio)
    .input('dataFim', sql.DateTime2, dataFim)
    .query(`
      SELECT DISTINCT MotoristaNomeFicha
      FROM vw_ResultadoDiarioVeiculo
      WHERE MotoristaNomeFicha IS NOT NULL
        AND Dia >= @dataInicio AND Dia < @dataFim
      ORDER BY MotoristaNomeFicha
    `);

  // Se o intervalo escolhido ainda não tem dado diário sincronizado, o dropdown não deve ficar
  // vazio — cai pra lista da ficha de metas (visão mensal), que é o mesmo domínio de nome.
  if (result.recordset.length > 0) {
    res.status(200).json(result.recordset.map((l) => l.MotoristaNomeFicha as string));
    return;
  }

  const fallback = await pool.request().query(`
    SELECT DISTINCT MotoristaNomeFicha
    FROM vw_PainelMotoristaVeiculo
    WHERE MotoristaNomeFicha IS NOT NULL
    ORDER BY MotoristaNomeFicha
  `);
  res.status(200).json(fallback.recordset.map((l) => l.MotoristaNomeFicha as string));
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
  
  const equipamentoId = equipamentoIdNumerico(req);
  const motorista = typeof req.query.motorista === 'string' ? req.query.motorista : null;

  const pool = await getMssqlPool();

  const tendenciaMensal = await pool.request()
    .input('inicioTendencia', sql.DateTime2, inicioTendencia)
    .input('fimMesCorrente', sql.DateTime2, fimMesCorrente)
    .input('equipamentoId', sql.Int, equipamentoId)
    .input('motorista', sql.NVarChar, motorista)
    .input('tipoCaminhao', sql.NVarChar, FILTRO_TIPO_CAMINHAO_LIKE)
    .query(`
      SELECT
        CompetenciaMeta,
        SUM(ISNULL(CustoFixoTotalMes, 0)) AS CustoFixoTotalMes,
        SUM(ISNULL(CustoOperacionalTotalMes, CustoFixoTotalMes)) AS CustoOperacionalTotalMes
      FROM vw_PainelMotoristaVeiculo
      WHERE CompetenciaMeta >= @inicioTendencia AND CompetenciaMeta < @fimMesCorrente
        AND (@equipamentoId IS NULL OR EquipamentoId = @equipamentoId)
        AND (@motorista IS NULL OR MotoristaNomeFicha = @motorista)
        AND ${EXISTS_CAMINHAO('EquipamentoId')}
      GROUP BY CompetenciaMeta
      ORDER BY CompetenciaMeta
    `);

  const porFrenteFazenda = await pool.request()
    .input('inicioMesCorrente', sql.DateTime2, inicioMesCorrente)
    .input('fimMesCorrente', sql.DateTime2, fimMesCorrente)
    .input('equipamentoId', sql.Int, equipamentoId)
    .input('motorista', sql.NVarChar, motorista)
    .input('tipoCaminhao', sql.NVarChar, FILTRO_TIPO_CAMINHAO_LIKE)
    .query(`
      SELECT
        GrupoFrente, Fazenda,
        SUM(ISNULL(CustoFixoTotalMes, 0)) AS CustoFixoTotalMes,
        SUM(ISNULL(CustoOperacionalTotalMes, CustoFixoTotalMes)) AS CustoOperacionalTotalMes
      FROM vw_PainelMotoristaVeiculo
      WHERE CompetenciaMeta >= @inicioMesCorrente AND CompetenciaMeta < @fimMesCorrente
        AND (@equipamentoId IS NULL OR EquipamentoId = @equipamentoId)
        AND (@motorista IS NULL OR MotoristaNomeFicha = @motorista)
        AND ${EXISTS_CAMINHAO('EquipamentoId')}
      GROUP BY GrupoFrente, Fazenda
      ORDER BY CustoOperacionalTotalMes DESC
    `);

  const [pontoEquilibrio, alarmes24h] = await Promise.all([
    pool.request()
      .input('inicioMesCorrente', sql.DateTime2, inicioMesCorrente)
      .input('fimMesCorrente', sql.DateTime2, fimMesCorrente)
      .input('motorista', sql.NVarChar, motorista)
      .query(`
        SELECT
          COUNT(*) AS TotalMotoristas,
          SUM(CASE WHEN SaldoAcumuladoMes >= 0 THEN 1 ELSE 0 END) AS DentroDoPontoDeEquilibrio
        FROM vw_ProgressoMensalMotorista
        WHERE Competencia >= @inicioMesCorrente AND Competencia < @fimMesCorrente
          AND (@motorista IS NULL OR MotoristaNomeFicha = @motorista)
      `)
      .then((r) => r.recordset[0])
      .catch((error) => {
        console.error('Dashboard executivo: falha ao agregar ponto de equilíbrio:', error);
        return { TotalMotoristas: 0, DentroDoPontoDeEquilibrio: 0 };
      }),
    pool.request()
      .input('equipamentoId', sql.Int, equipamentoId)
      .input('tipoCaminhao', sql.NVarChar, FILTRO_TIPO_CAMINHAO_LIKE)
      .query(`
        SELECT COUNT(*) AS QtdAlarmes24h FROM AlarmesEquipamento
        WHERE ColetadoEmUtc >= DATEADD(HOUR, -24, SYSUTCDATETIME())
          AND (@equipamentoId IS NULL OR EquipamentoId = @equipamentoId)
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
  if (!exigirAcessoCustos(req, res)) return;

  try {
    switch (modo) {
      case 'diario':
        return await modoDiario(req, res);
      case 'motivos':
        return await modoMotivos(req, res);
      case 'motor':
        return await modoMotor(req, res);
      case 'motoristas':
        return await modoMotoristas(req, res);
      case 'progresso':
        return await modoProgresso(req, res);
      case 'executivo':
        return await modoExecutivo(req, res);
      default:
        res.status(400).json({ error: 'Parâmetro modo é obrigatório: diario, motivos, motor, motoristas, progresso ou executivo' });
    }
  } catch (error) {
    console.error(`Erro ao consultar painel diário (modo=${modo}):`, error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server). As views do painel diário (sql/013_painel_metas_completo.sql) existem?' });
  }
}
