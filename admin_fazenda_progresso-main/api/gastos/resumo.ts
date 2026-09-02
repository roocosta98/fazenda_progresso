import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMssqlPool } from '../_lib/mssql.js';
import sql from 'mssql';

// Módulo Gastos do PRD (seção 6): CustosFixosEquipamento (por competência/equipamento) +
// Motoristas (salário/encargos), com CustoOperacionalTotalMes = custo motorista + custo fixo.
//
// Parte de CustosFixosEquipamento (não de vw_PainelMotoristaVeiculo) pra não perder equipamento
// que tenha custo lançado mas nenhum registro em MetasMotoristas naquele mês (ex.: equipamento
// que não é caminhão/não participa do Programa Motorista de Excelência) — enriquece com os
// campos de motorista/custo operacional da view (aliases já documentados no PRD seção 8.1)
// só quando existir o vínculo.
const QUERY = `
SELECT
  cf.EquipamentoId, cf.CompetenciaCustoFixo,
  eq.CodigoEquipamento, eq.Nome AS NomeEquipamento,
  te.Descricao AS TipoEquipamento, fz.Nome AS Fazenda, gf.Nome AS GrupoFrente,
  cf.CustoCombustivelMes, cf.CustoPneusMes, cf.CustoManutencaoMes, cf.CustoSeguroMes, cf.CustoOutrosMes, cf.CustoFixoTotalMes,
  v.MotoristaNomeFicha, v.MotoristaNomeFolha, v.SalarioBase, v.EncargosPercentual, v.CustoMotoristaMes, v.CustoOperacionalTotalMes
FROM CustosFixosEquipamento cf
LEFT JOIN Equipamentos eq ON eq.EquipamentoId = cf.EquipamentoId
LEFT JOIN TiposEquipamento te ON te.TipoEquipamentoId = eq.TipoEquipamentoId
LEFT JOIN GruposFrente gf ON gf.GrupoFrenteId = eq.GrupoFrenteId
LEFT JOIN Fazendas fz ON fz.FazendaId = eq.FazendaId
LEFT JOIN vw_PainelMotoristaVeiculo v ON v.EquipamentoId = cf.EquipamentoId AND v.CompetenciaCustoFixo = cf.CompetenciaCustoFixo
WHERE (@competencia IS NULL OR cf.CompetenciaCustoFixo = @competencia)
ORDER BY eq.Nome
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const competencia = typeof req.query.competencia === 'string' ? req.query.competencia : null;
    const pool = await getMssqlPool();
    const result = await pool.request().input('competencia', sql.NVarChar, competencia).query(QUERY);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Erro ao consultar CustosFixosEquipamento:', error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server)' });
  }
}
