import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from '../_lib/mssql.js';

// Lista de motoristas reais pra tela de login do App (PRD 4.3: motorista se identifica pelo
// próprio nome). Dado real vindo de vw_PainelMotoristaVeiculo do mês corrente (não é mock).
//
// Consultar a tabela base MetasMotoristas direto (tentativa original) falhou em produção:
// "Invalid column name 'MotoristaNomeFicha'"/"CompetenciaMeta" — esses nomes são a SAÍDA da view
// vw_PainelMotoristaVeiculo (que renomeia internamente), não os nomes reais das colunas na
// tabela base. Por isso a query usa a view, igual ao admin (api/metas/painel.ts). O filtro de
// competência também mudou de comparação de texto ('2026-09') pra intervalo de data, porque
// CompetenciaMeta é uma coluna DATE de verdade, não string.
const QUERY = `
SELECT DISTINCT MotoristaNomeFicha
FROM vw_PainelMotoristaVeiculo
WHERE MotoristaNomeFicha IS NOT NULL
  AND CompetenciaMeta >= @inicioCompetencia AND CompetenciaMeta < @fimCompetencia
ORDER BY MotoristaNomeFicha
`;

// Fallback: se não houver registro pra competência atual (ex.: banco ainda não tem o mês
// corrente lançado), traz os nomes distintos de qualquer competência — melhor mostrar a lista
// real do banco do que uma tela de login vazia.
const QUERY_FALLBACK = `
SELECT DISTINCT MotoristaNomeFicha
FROM vw_PainelMotoristaVeiculo
WHERE MotoristaNomeFicha IS NOT NULL
ORDER BY MotoristaNomeFicha
`;

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const agora = new Date();
    const inicioCompetencia = new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), 1));
    const fimCompetencia = new Date(Date.UTC(agora.getFullYear(), agora.getMonth() + 1, 1));

    const pool = await getMssqlPool();
    let result = await pool
      .request()
      .input('inicioCompetencia', sql.DateTime2, inicioCompetencia)
      .input('fimCompetencia', sql.DateTime2, fimCompetencia)
      .query(QUERY);
    if (result.recordset.length === 0) {
      result = await pool.request().query(QUERY_FALLBACK);
    }
    res.status(200).json(result.recordset.map((r) => r.MotoristaNomeFicha as string));
  } catch (error) {
    console.error('Erro ao consultar motoristas (vw_PainelMotoristaVeiculo):', error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server)' });
  }
}
