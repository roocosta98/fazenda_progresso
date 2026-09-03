import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMssqlPool } from '../_lib/mssql.js';
import sql from 'mssql';
import { FILTRO_TIPO_CAMINHAO_LIKE } from '../_lib/tipoEquipamento.js';

// Painel de Metas (PRD "Metas, Leituras, Gastos e Consumos", seção 4.3/4.4/8.1).
// Lê vw_PainelMotoristaVeiculo (já cruza Equipamentos + posição + MetasMotoristas + Motoristas +
// CustosFixosEquipamento) e adiciona, por cima, o cálculo de progresso do mês (a view só traz o
// valor da META pronto, não recalcula — quem calcula o REALIZADO é este endpoint, seção 4.4 do PRD):
//
// - KmLRealizado = km rodado no mês (VariacaoHorimetroOdometroMes) / litros consumidos no mês.
//   Litros consumidos = soma de LeiturasOperacao.ConsumoMedioLitros no período (leitura D-1,
//   uma linha por dia) — ASSUNÇÃO: cada linha representa o consumo daquele dia, não uma média
//   corrida. Se a semântica real for outra, ajustar só esta soma.
// - CpkRealizado = só custos controláveis (PRD 4.1: combustível, pneus, manutenção — sem seguro/
//   outros e SEM o custo do motorista, decisão registrada no PRD seção 6: o motorista não pode
//   carregar o próprio salário na meta dele) / km rodado no mês.
// - PercentualMetaKmL/Cpk = realizado vs. MetaKmL/MetaCpk da view.
//
// Equipamento tipo (pra filtro "só caminhão", PRD 5.2) não está no contrato da view — junta com
// Equipamentos/TiposEquipamento pelo EquipamentoId, igual ao padrão de api/frota/equipamentos.ts.
const QUERY = `
WITH Consumo AS (
  SELECT EquipamentoId, SUM(CAST(ConsumoMedioLitros AS FLOAT)) AS LitrosConsumidosMes
  FROM LeiturasOperacao
  WHERE ColetadoEmUtc >= @inicioCompetencia AND ColetadoEmUtc < @fimCompetencia
  GROUP BY EquipamentoId
)
SELECT
  v.*,
  te.Descricao AS TipoEquipamento,
  c.LitrosConsumidosMes,
  CASE WHEN c.LitrosConsumidosMes > 0
       THEN v.VariacaoHorimetroOdometroMes / c.LitrosConsumidosMes
       ELSE NULL END AS KmLRealizado,
  CASE WHEN v.VariacaoHorimetroOdometroMes > 0
       THEN (ISNULL(v.CustoCombustivelMes,0) + ISNULL(v.CustoPneusMes,0) + ISNULL(v.CustoManutencaoMes,0)) / v.VariacaoHorimetroOdometroMes
       ELSE NULL END AS CpkRealizado
FROM vw_PainelMotoristaVeiculo v
LEFT JOIN Equipamentos eq ON eq.EquipamentoId = v.EquipamentoId
LEFT JOIN TiposEquipamento te ON te.TipoEquipamentoId = eq.TipoEquipamentoId
LEFT JOIN Consumo c ON c.EquipamentoId = v.EquipamentoId
WHERE v.CompetenciaMeta >= @inicioCompetencia AND v.CompetenciaMeta < @fimCompetencia
  AND te.Descricao LIKE @tipoCaminhao
ORDER BY v.Atividade, v.MotoristaNomeFicha
`;

function competenciaAtualYYYYMM(): string {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const competencia = typeof req.query.competencia === 'string' ? req.query.competencia : null;
    const referencia = competencia ?? competenciaAtualYYYYMM();
    const [ano, mes] = referencia.split('-').map(Number);
    const inicioCompetencia = new Date(Date.UTC(ano, mes - 1, 1));
    const fimCompetencia = new Date(Date.UTC(ano, mes, 1));

    const pool = await getMssqlPool();
    const result = await pool
      .request()
      .input('inicioCompetencia', sql.DateTime2, inicioCompetencia)
      .input('fimCompetencia', sql.DateTime2, fimCompetencia)
      .input('tipoCaminhao', sql.NVarChar, FILTRO_TIPO_CAMINHAO_LIKE)
      .query(QUERY);

    const linhas = result.recordset.map((linha) => ({
      ...linha,
      // Regra de privacidade do PRD (4.3): quem chama este endpoint num contexto de ranking
      // público não deve receber campos de remuneração — o filtro de exibição é feito no
      // frontend por tela (Painel/Gastos vs. Ranking), mas o motorista órfão (sem vínculo)
      // fica marcado aqui pra a tela decidir ocultar sem quebrar.
      MetaOrfa: !linha.MotoristaNomeFicha,
    }));

    res.status(200).json(linhas);
  } catch (error) {
    console.error('Erro ao consultar vw_PainelMotoristaVeiculo:', error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server)' });
  }
}
