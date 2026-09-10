import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from './mssql.js';

function numero(valor: unknown) { return Number(valor ?? 0); }

export async function producaoBatata(req: VercelRequest, res: VercelResponse) {
  try {
    const pool = await getMssqlPool();
    if (req.method === 'GET') {
      const [safras, lancamentos, resumo] = await Promise.all([
        pool.request().query('SELECT SafraId, Nome, Inicio, Fim, Ativa FROM dbo.SafraBatata ORDER BY Ativa DESC, Inicio DESC'),
        pool.request().query(`SELECT TOP 100 L.LancamentoId, L.SafraId, S.Nome AS SafraNome, L.Dia, L.Toneladas, L.CustoOperacional, L.EquipamentoId, L.Origem, L.Observacao
          FROM dbo.LancamentoProducaoBatata L INNER JOIN dbo.SafraBatata S ON S.SafraId=L.SafraId ORDER BY L.Dia DESC, L.LancamentoId DESC`),
        pool.request().query(`SELECT S.SafraId, S.Nome, S.Inicio, S.Fim, S.Ativa,
          ISNULL(SUM(L.Toneladas), 0) AS Toneladas, ISNULL(SUM(L.CustoOperacional), 0) AS Custo,
          CASE WHEN ISNULL(SUM(L.Toneladas), 0) > 0 THEN SUM(L.CustoOperacional) / SUM(L.Toneladas) ELSE NULL END AS CustoPorTonelada,
          COUNT(L.LancamentoId) AS Lancamentos
          FROM dbo.SafraBatata S LEFT JOIN dbo.LancamentoProducaoBatata L ON L.SafraId=S.SafraId
          GROUP BY S.SafraId,S.Nome,S.Inicio,S.Fim,S.Ativa ORDER BY S.Ativa DESC,S.Inicio DESC`),
      ]);
      return res.status(200).json({ safras: safras.recordset, lancamentos: lancamentos.recordset, resumo: resumo.recordset });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
    const corpo = req.body ?? {};
    if (corpo.acao === 'safra') {
      const nome = String(corpo.nome ?? '').trim(); const inicio = String(corpo.inicio ?? ''); const fim = corpo.fim ? String(corpo.fim) : null;
      if (!nome || !inicio) return res.status(400).json({ error: 'Informe nome e início da safra.' });
      const criado = await pool.request().input('nome', sql.NVarChar, nome).input('inicio', sql.Date, inicio).input('fim', sql.Date, fim).query('INSERT INTO dbo.SafraBatata(Nome,Inicio,Fim,Ativa) OUTPUT INSERTED.SafraId VALUES(@nome,@inicio,@fim,1)');
      return res.status(201).json({ safraId: criado.recordset[0].SafraId });
    }
    if (corpo.acao === 'lancamento') {
      const safraId = numero(corpo.safraId); const toneladas = numero(corpo.toneladas); const custo = numero(corpo.custoOperacional); const dia = String(corpo.dia ?? '');
      if (!safraId || !dia || toneladas <= 0 || custo < 0) return res.status(400).json({ error: 'Informe safra, data, toneladas e custo operacional válidos.' });
      const criado = await pool.request().input('safraId', sql.Int, safraId).input('dia', sql.Date, dia).input('toneladas', sql.Decimal(18, 3), toneladas).input('custo', sql.Decimal(18, 2), custo).input('equipamentoId', sql.Int, Number.isFinite(numero(corpo.equipamentoId)) && corpo.equipamentoId ? numero(corpo.equipamentoId) : null).input('origem', sql.NVarChar, corpo.origem === 'frota' ? 'frota' : 'manual').input('observacao', sql.NVarChar, String(corpo.observacao ?? '').trim() || null).query('INSERT INTO dbo.LancamentoProducaoBatata(SafraId,Dia,Toneladas,CustoOperacional,EquipamentoId,Origem,Observacao) OUTPUT INSERTED.LancamentoId VALUES(@safraId,@dia,@toneladas,@custo,@equipamentoId,@origem,@observacao)');
      return res.status(201).json({ lancamentoId: criado.recordset[0].LancamentoId });
    }
    return res.status(400).json({ error: 'Ação de produção inválida.' });
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : '';
    const mensagem = /SafraBatata|LancamentoProducaoBatata/i.test(detalhe) ? 'Estrutura de Produção/Batata pendente no SQL Server. Execute server/sql/producao_batata.sql no banco conectado à Vercel.' : 'Falha ao consultar os dados de Produção/Batata.';
    console.error('Erro Produção/Batata:', erro);
    return res.status(502).json({ error: mensagem, detalhe });
  }
}
