import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from './mssql.js';

export async function manutencao(req: VercelRequest, res: VercelResponse) {
  try {
    const pool = await getMssqlPool();
    if (req.method === 'GET') {
      const [ativos, ordens, preventivas, kpis] = await Promise.all([
        pool.request().query('SELECT AtivoId,CodigoEquipamento,Nome,Tipo,Localizacao,Ativo FROM dbo.AtivoManutencao ORDER BY Nome'),
        pool.request().query(`SELECT TOP 100 O.OrdemServicoId,O.AtivoId,A.Nome AS AtivoNome,O.Tipo,O.Status,O.Descricao,O.Responsavel,O.Abertura,O.Conclusao,O.CustoPecas,O.CustoMaoObra FROM dbo.OrdemServicoManutencao O JOIN dbo.AtivoManutencao A ON A.AtivoId=O.AtivoId ORDER BY CASE O.Status WHEN 'aberta' THEN 0 WHEN 'em_execucao' THEN 1 ELSE 2 END,O.Abertura DESC`),
        pool.request().query(`SELECT P.PreventivaId,P.AtivoId,A.Nome AS AtivoNome,P.Descricao,P.Regra,P.ProximaData,P.ProximoValor,P.Ativa FROM dbo.PreventivaManutencao P JOIN dbo.AtivoManutencao A ON A.AtivoId=P.AtivoId WHERE P.Ativa=1 ORDER BY P.ProximaData ASC`),
        pool.request().query(`SELECT (SELECT COUNT(*) FROM dbo.OrdemServicoManutencao WHERE Status<>'concluida') AS OSABERTAS, (SELECT COUNT(*) FROM dbo.OrdemServicoManutencao WHERE Status<>'concluida' AND Abertura<DATEADD(DAY,-7,CAST(GETDATE() AS DATE))) AS OSATRASADAS, (SELECT ISNULL(SUM(CustoPecas+CustoMaoObra),0) FROM dbo.OrdemServicoManutencao WHERE Abertura>=DATEADD(DAY,-30,CAST(GETDATE() AS DATE))) AS CUSTO30DIAS, (SELECT COUNT(*) FROM dbo.OrdemServicoManutencao WHERE Tipo='preventiva') AS PREVENTIVAS, (SELECT COUNT(*) FROM dbo.OrdemServicoManutencao) AS TOTALOS`),
      ]);
      return res.status(200).json({ ativos: ativos.recordset, ordens: ordens.recordset, preventivas: preventivas.recordset, kpis: kpis.recordset[0] });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
    const corpo = req.body ?? {};
    if (corpo.acao === 'ativo') {
      if (!String(corpo.nome ?? '').trim() || !String(corpo.tipo ?? '').trim()) return res.status(400).json({ error: 'Informe nome e tipo do ativo.' });
      await pool.request().input('codigo', sql.NVarChar, String(corpo.codigoEquipamento ?? '').trim() || null).input('nome', sql.NVarChar, String(corpo.nome).trim()).input('tipo', sql.NVarChar, String(corpo.tipo).trim()).input('local', sql.NVarChar, String(corpo.localizacao ?? '').trim() || null).query('INSERT INTO dbo.AtivoManutencao(CodigoEquipamento,Nome,Tipo,Localizacao) VALUES(@codigo,@nome,@tipo,@local)');
    } else if (corpo.acao === 'os') {
      if (!Number(corpo.ativoId) || !['preventiva','corretiva'].includes(corpo.tipo) || !String(corpo.descricao ?? '').trim() || !String(corpo.abertura ?? '')) return res.status(400).json({ error: 'Preencha ativo, tipo, descrição e data de abertura.' });
      await pool.request().input('ativo', sql.Int, Number(corpo.ativoId)).input('tipo', sql.NVarChar, corpo.tipo).input('descricao', sql.NVarChar, corpo.descricao).input('responsavel', sql.NVarChar, String(corpo.responsavel ?? '').trim() || null).input('abertura', sql.Date, corpo.abertura).input('pecas', sql.Decimal(18,2), Number(corpo.custoPecas ?? 0)).input('mao', sql.Decimal(18,2), Number(corpo.custoMaoObra ?? 0)).query(`INSERT INTO dbo.OrdemServicoManutencao(AtivoId,Tipo,Descricao,Responsavel,Abertura,CustoPecas,CustoMaoObra) VALUES(@ativo,@tipo,@descricao,@responsavel,@abertura,@pecas,@mao)`);
    } else if (corpo.acao === 'preventiva') {
      if (!Number(corpo.ativoId) || !String(corpo.descricao ?? '').trim() || !['data','km','horimetro'].includes(corpo.regra)) return res.status(400).json({ error: 'Preencha ativo, descrição e regra da preventiva.' });
      await pool.request().input('ativo',sql.Int,Number(corpo.ativoId)).input('descricao',sql.NVarChar,corpo.descricao).input('regra',sql.NVarChar,corpo.regra).input('data',sql.Date,corpo.proximaData || null).input('valor',sql.Decimal(18,2),corpo.proximoValor ? Number(corpo.proximoValor) : null).query('INSERT INTO dbo.PreventivaManutencao(AtivoId,Descricao,Regra,ProximaData,ProximoValor) VALUES(@ativo,@descricao,@regra,@data,@valor)');
    } else return res.status(400).json({ error: 'Ação inválida.' });
    return res.status(201).json({ ok: true });
  } catch (e) { const detalhe = e instanceof Error ? e.message : ''; return res.status(502).json({ error: /AtivoManutencao|OrdemServicoManutencao|PreventivaManutencao/.test(detalhe) ? 'Estrutura de Manutenção pendente no SQL Server. Execute server/sql/manutencao.sql.' : 'Falha ao salvar Manutenção.', detalhe }); }
}
