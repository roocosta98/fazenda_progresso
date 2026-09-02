import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMssqlPool } from '../_lib/mssql.js';

// Lista de motoristas reais pra tela de login do App (PRD 4.3: motorista se identifica pelo
// próprio nome). Dado real vindo de MetasMotoristas do mês corrente (não é mock) — a decisão de
// não construir um sistema de senha/matrícula do zero pro protótipo foi confirmada com o Rodrigo;
// isso é suficiente pra respeitar a regra de privacidade (cada motorista só vê a própria meta,
// nunca a de outro) porque a "Minha Meta" filtra estritamente pelo nome escolhido aqui.
const QUERY = `
SELECT DISTINCT MotoristaNomeFicha
FROM MetasMotoristas
WHERE MotoristaNomeFicha IS NOT NULL
  AND CompetenciaMeta = FORMAT(SYSUTCDATETIME(), 'yyyy-MM')
ORDER BY MotoristaNomeFicha
`;

// Fallback: se não houver registro pra competência atual (ex.: banco ainda não tem o mês
// corrente lançado), traz os nomes distintos de qualquer competência — melhor mostrar a lista
// real do banco do que uma tela de login vazia.
const QUERY_FALLBACK = `
SELECT DISTINCT MotoristaNomeFicha
FROM MetasMotoristas
WHERE MotoristaNomeFicha IS NOT NULL
ORDER BY MotoristaNomeFicha
`;

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const pool = await getMssqlPool();
    let result = await pool.request().query(QUERY);
    if (result.recordset.length === 0) {
      result = await pool.request().query(QUERY_FALLBACK);
    }
    res.status(200).json(result.recordset.map((r) => r.MotoristaNomeFicha as string));
  } catch (error) {
    console.error('Erro ao consultar motoristas (MetasMotoristas):', error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server)' });
  }
}
