import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMssqlPool } from '../_lib/mssql.js';

// Histórico de Avaliação de Condução (IEC) — header + itens agregados via FOR JSON, pra tela
// mostrar cada avaliação com o detalhe por critério sem N chamadas.
const QUERY = `
SELECT
  a.AvaliacaoConducaoId, a.MotoristaNomeFicha, a.Avaliador, a.DataHora, a.NotaFinal, a.Observacao,
  (
    SELECT i.Criterio, i.Nota
    FROM AvaliacaoConducaoItem i
    WHERE i.AvaliacaoConducaoId = a.AvaliacaoConducaoId
    FOR JSON PATH
  ) AS ItensJson
FROM AvaliacaoConducao a
ORDER BY a.DataHora DESC
`;

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const pool = await getMssqlPool();
    const result = await pool.request().query(QUERY);
    const linhas = result.recordset.map((linha) => ({
      ...linha,
      Itens: linha.ItensJson ? JSON.parse(linha.ItensJson) : [],
    }));
    res.status(200).json(linhas);
  } catch (error) {
    console.error('Erro ao consultar AvaliacaoConducao:', error);
    res.status(502).json({ error: 'Falha ao consultar o banco de dados da fazenda (SQL Server). As tabelas AvaliacaoConducao/AvaliacaoConducaoItem existem?' });
  }
}
