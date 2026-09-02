import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMssqlPool } from '../_lib/mssql.js';
import sql from 'mssql';

// "Minha Meta" (PRD 4.3/4.4): mesmo cálculo de progresso do painel de logística
// (admin_fazenda_progresso-main/api/metas/painel.ts), mas devolvendo só a(s) linha(s) do
// motorista logado — nunca dado de remuneração/meta de outro motorista (regra de privacidade
// não-negociável do PRD). Também calcula a posição no ranking dentro da mesma Atividade,
// pra tela poder mostrar "você está em Xº lugar" sem o app buscar a lista inteira de motoristas.
//
// CPK aqui é só custo controlável do equipamento (combustível+pneus+manutenção), SEM o custo do
// próprio motorista — decisão do PRD seção 6 (Cristiano: motorista não deve carregar o próprio
// salário na meta dele).
function competenciaAtualYYYYMM(): string {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
}

const QUERY = `
WITH Consumo AS (
  SELECT EquipamentoId, SUM(CAST(ConsumoMedioLitros AS FLOAT)) AS LitrosConsumidosMes
  FROM LeiturasOperacao
  WHERE ColetadoEmUtc >= @inicioCompetencia AND ColetadoEmUtc < @fimCompetencia
  GROUP BY EquipamentoId
),
Calculado AS (
  SELECT
    v.EquipamentoId, v.NomeEquipamento, v.Atividade, v.CompetenciaMeta, v.MotoristaNomeFicha,
    v.KmLHistorico, v.MetaKmL, v.KmLFuturo, v.CpkHistorico, v.MetaCpk, v.CpkFuturo, v.ReconhecimentoMensal,
    CASE WHEN c.LitrosConsumidosMes > 0
         THEN v.VariacaoHorimetroOdometroMes / c.LitrosConsumidosMes
         ELSE NULL END AS KmLRealizado,
    CASE WHEN v.VariacaoHorimetroOdometroMes > 0
         THEN (ISNULL(v.CustoCombustivelMes,0) + ISNULL(v.CustoPneusMes,0) + ISNULL(v.CustoManutencaoMes,0)) / v.VariacaoHorimetroOdometroMes
         ELSE NULL END AS CpkRealizado
  FROM vw_PainelMotoristaVeiculo v
  LEFT JOIN Consumo c ON c.EquipamentoId = v.EquipamentoId
  WHERE v.CompetenciaMeta = @competencia
),
ComPercentual AS (
  SELECT *,
    CASE WHEN MetaKmL > 0 AND KmLRealizado IS NOT NULL THEN (KmLRealizado / MetaKmL) * 100 ELSE NULL END AS PercentualMetaKmL,
    CASE WHEN MetaCpk > 0 AND CpkRealizado > 0 THEN (MetaCpk / CpkRealizado) * 100 ELSE NULL END AS PercentualMetaCpk
  FROM Calculado
),
ComMedia AS (
  SELECT *,
    CASE
      WHEN PercentualMetaKmL IS NULL AND PercentualMetaCpk IS NULL THEN NULL
      ELSE (ISNULL(PercentualMetaKmL, 0) + ISNULL(PercentualMetaCpk, 0))
           / (CASE WHEN PercentualMetaKmL IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN PercentualMetaCpk IS NOT NULL THEN 1 ELSE 0 END)
    END AS PercentualMedio
  FROM ComPercentual
),
ComRanking AS (
  SELECT *,
    RANK() OVER (PARTITION BY Atividade ORDER BY PercentualMedio DESC) AS PosicaoRanking,
    COUNT(*) OVER (PARTITION BY Atividade) AS TotalMotoristasAtividade
  FROM ComMedia
)
SELECT * FROM ComRanking WHERE MotoristaNomeFicha = @motorista
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const motorista = typeof req.query.motorista === 'string' ? req.query.motorista : null;
    if (!motorista) {
      res.status(400).json({ error: 'Parâmetro motorista é obrigatório' });
      return;
    }

    const competencia = typeof req.query.competencia === 'string' ? req.query.competencia : competenciaAtualYYYYMM();
    const [ano, mes] = competencia.split('-').map(Number);
    const inicioCompetencia = new Date(Date.UTC(ano, mes - 1, 1));
    const fimCompetencia = new Date(Date.UTC(ano, mes, 1));

    const pool = await getMssqlPool();
    const result = await pool
      .request()
      .input('motorista', sql.NVarChar, motorista)
      .input('competencia', sql.NVarChar, competencia)
      .input('inicioCompetencia', sql.DateTime2, inicioCompetencia)
      .input('fimCompetencia', sql.DateTime2, fimCompetencia)
      .query(QUERY);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Erro ao consultar minha-meta:', error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server)' });
  }
}
