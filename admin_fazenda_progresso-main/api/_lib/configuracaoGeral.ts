import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from './mssql.js';

const CHAVE_PRAZO_PADRAO = 'prazoPadraoDias';
export const PRAZO_PADRAO_DIAS_FALLBACK = 30;

// Mesmo padrão de admin usado em iaConhecimento.ts: o proxy de autenticação do frontend
// sobrescreve este header a partir da sessão logada — nunca é o navegador quem decide.
function exigirAdmin(req: VercelRequest, res: VercelResponse) {
  if (String(req.headers['x-user-type'] ?? '') !== 'admin') { res.status(403).json({ error: 'Apenas administradores podem alterar as configurações gerais.' }); return false; }
  return true;
}

// GET é lido por qualquer tela que monte um filtro de período (não só Admin) pra saber
// qual período relativo mostrar como padrão — por isso não tem gate de admin.
export async function configuracaoGeral(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    if (req.method === 'GET') {
      const pool = await getMssqlPool();
      const resultado = await pool.request().input('chave', sql.NVarChar, CHAVE_PRAZO_PADRAO)
        .query(`SELECT Valor FROM dbo.ConfiguracaoSistema WHERE Chave=@chave`);
      const prazoPadraoDias = Number(resultado.recordset[0]?.Valor) || PRAZO_PADRAO_DIAS_FALLBACK;
      return res.status(200).json({ prazoPadraoDias });
    }
    if (req.method === 'PUT') {
      if (!exigirAdmin(req, res)) return;
      const dias = Number(req.body?.prazoPadraoDias);
      if (!Number.isInteger(dias) || dias < 1 || dias > 365) return res.status(400).json({ error: 'Informe um prazo entre 1 e 365 dias.' });
      const pool = await getMssqlPool();
      await pool.request()
        .input('chave', sql.NVarChar, CHAVE_PRAZO_PADRAO)
        .input('valor', sql.NVarChar, String(dias))
        .query(`MERGE dbo.ConfiguracaoSistema AS destino USING (SELECT @chave AS Chave) AS origem ON destino.Chave = origem.Chave
                WHEN MATCHED THEN UPDATE SET Valor=@valor, AtualizadoEm=SYSUTCDATETIME()
                WHEN NOT MATCHED THEN INSERT (Chave, Valor, AtualizadoEm) VALUES (@chave, @valor, SYSUTCDATETIME());`);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    // Mesma postura tolerante do treinamento de IA: se dbo.ConfiguracaoSistema ainda não existe
    // nesta instalação, o sistema inteiro segue com o padrão de 30 dias em vez de tela quebrada.
    if (req.method === 'GET') return res.status(200).json({ prazoPadraoDias: PRAZO_PADRAO_DIAS_FALLBACK });
    res.status(502).json({ error: error instanceof Error ? error.message : 'Falha ao salvar configuração geral. A tabela dbo.ConfiguracaoSistema existe no banco?' });
  }
}
