import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMssqlPool } from '../_lib/mssql.js';
import sql from 'mssql';
import { FILTRO_TIPO_CAMINHAO_LIKE } from '../_lib/tipoEquipamento.js';
import { exigirAcessoCustos } from '../_lib/custosAuth.js';
import { painelEstoque } from '../_lib/estoquePainel.js';
import { pesquisarEstoque } from '../_lib/estoquePesquisa.js';
import { usuariosSistema } from '../_lib/usuariosSistema.js';

// Módulo Gastos do PRD (seção 6): CustosFixosEquipamento + Motoristas, com
// CustoOperacionalTotalMes = custo motorista + custo fixo.
//
// Consulta direto a tabela CustosFixosEquipamento (tentativa original) falhou em produção:
// "Invalid column name 'CompetenciaCustoFixo'" — os nomes documentados no PRD (seção 8.1) são
// os nomes de SAÍDA da view vw_PainelMotoristaVeiculo, não necessariamente os nomes reais das
// colunas nas tabelas base (a view renomeia internamente). Pra não chutar nome de coluna que eu
// não posso conferir no schema real, esta query usa só a view — já comprovado funcionando em
// produção (api/metas/painel.ts) com estes mesmos nomes.
//
// Limitação conhecida: um equipamento com custo lançado mas SEM registro em MetasMotoristas
// naquele mês não aparece aqui (a view só junta quem tem meta). Se isso for um problema real,
// preciso do nome exato da coluna de competência em CustosFixosEquipamento pra consultar a
// tabela base diretamente (rodar `SELECT TOP 1 * FROM CustosFixosEquipamento` no DBeaver resolve).
const QUERY = `
SELECT
  v.EquipamentoId, v.CompetenciaMeta,
  v.CodigoEquipamento, v.NomeEquipamento, v.Fazenda, v.GrupoFrente,
  v.CustoCombustivelMes, v.CustoPneusMes, v.CustoManutencaoMes, v.CustoSeguroMes, v.CustoOutrosMes, v.CustoFixoTotalMes,
  v.MotoristaNomeFicha, v.MotoristaNomeFolha, v.SalarioBase, v.EncargosPercentual, v.CustoMotoristaMes, v.CustoOperacionalTotalMes
FROM vw_PainelMotoristaVeiculo v
WHERE v.CompetenciaMeta >= @inicioCompetencia AND v.CompetenciaMeta < @fimCompetencia
  AND (@equipamentoId IS NULL OR v.EquipamentoId = @equipamentoId)
  AND (@motorista IS NULL OR v.MotoristaNomeFicha = @motorista)
  AND (
    v.NomeEquipamento LIKE '%cam%'
    OR v.NomeEquipamento LIKE '%caminh%'
    OR v.NomeEquipamento LIKE '%caminhão%'
    OR v.CodigoEquipamento LIKE '%cam%'
  )
ORDER BY v.NomeEquipamento
`;

function competenciaAtualYYYYMM(): string {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.query.modo === 'usuarios') return usuariosSistema(req, res);
  if (req.query.modo === 'estoque-pesquisar') return pesquisarEstoque(req, res);
  if (req.query.modo === 'estoque') return painelEstoque(req, res);
  if (!exigirAcessoCustos(req, res)) return;
  try {
    const dataInicioStr = typeof req.query.dataInicio === 'string' ? req.query.dataInicio : null;
    const dataFimStr = typeof req.query.dataFim === 'string' ? req.query.dataFim : null;

    const hoje = new Date();
    const fimDefault = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() + 1));
    const inicioDefault = new Date(fimDefault);
    inicioDefault.setUTCDate(inicioDefault.getUTCDate() - 30);

    const inicioCompetencia = dataInicioStr ? new Date(`${dataInicioStr}T00:00:00Z`) : inicioDefault;
    const dataFimBase = dataFimStr ? new Date(`${dataFimStr}T00:00:00Z`) : null;
    const fimCompetencia = dataFimBase ? new Date(dataFimBase.getTime() + 24 * 60 * 60 * 1000) : fimDefault;

    const equipamentoIdRaw = Array.isArray(req.query.equipamentoId) ? req.query.equipamentoId[0] : req.query.equipamentoId;
    const equipamentoId = Number.isFinite(Number(equipamentoIdRaw)) ? Number(equipamentoIdRaw) : null;
    const motorista = typeof req.query.motorista === 'string' ? req.query.motorista : null;

    const pool = await getMssqlPool();
    const result = await pool
      .request()
      .input('inicioCompetencia', sql.DateTime2, inicioCompetencia)
      .input('fimCompetencia', sql.DateTime2, fimCompetencia)
      .input('equipamentoId', sql.Int, equipamentoId)
      .input('motorista', sql.NVarChar, motorista)
      .input('tipoCaminhao', sql.NVarChar, FILTRO_TIPO_CAMINHAO_LIKE)
      .query(QUERY);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Erro ao consultar vw_PainelMotoristaVeiculo (Gastos):', error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server)' });
  }
}
