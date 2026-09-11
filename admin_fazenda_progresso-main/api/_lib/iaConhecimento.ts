import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from './mssql.js';

// Mesmo padrão de admin usado em usuariosSistema.ts: o proxy de autenticação do frontend
// sobrescreve este header a partir da sessão logada — nunca é o navegador quem decide.
function exigirAdmin(req: VercelRequest, res: VercelResponse) {
  if (String(req.headers['x-user-type'] ?? '') !== 'admin') { res.status(403).json({ error: 'Apenas administradores podem gerir a configuração de IA.' }); return false; }
  return true;
}

// Concatena o conteúdo ativo de um módulo (+ o que for marcado "geral") pra injetar como
// contexto extra no prompt da IA. Chamada direta, servidor-a-servidor — nunca exposta por
// rota HTTP própria, então não precisa (nem deve) do gate de admin acima.
export async function treinamentoAtivo(modulo: string): Promise<string> {
  try {
    const pool = await getMssqlPool();
    const resultado = await pool.request()
      .input('modulo', sql.NVarChar, modulo)
      .query(`SELECT Titulo, Conteudo FROM dbo.ConfiguracaoIA WHERE Ativo=1 AND (Modulo=@modulo OR Modulo='geral') ORDER BY AtualizadoEm DESC`);
    if (!resultado.recordset.length) return '';
    return resultado.recordset.map((linha) => `### ${linha.Titulo}\n${linha.Conteudo}`).join('\n\n');
  } catch (error) {
    // Treinamento é só contexto extra: se a tabela ainda não existe nesta instalação ou a
    // consulta falhar por qualquer motivo, a IA segue funcionando normalmente sem ele.
    console.error('Falha ao carregar treinamento de IA (seguindo sem contexto extra):', error);
    return '';
  }
}

export async function configuracaoIA(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (!exigirAdmin(req, res)) return;
  try {
    const pool = await getMssqlPool();
    if (req.method === 'GET') {
      const resultado = await pool.request().query(`SELECT ConfiguracaoIAId, Titulo, Conteudo, Modulo, Ativo, CriadoEm, AtualizadoEm, CriadoPor FROM dbo.ConfiguracaoIA ORDER BY AtualizadoEm DESC`);
      return res.status(200).json(resultado.recordset);
    }
    if (req.method === 'POST') {
      const { titulo, conteudo, modulo, criadoPor } = req.body ?? {};
      if (!String(titulo ?? '').trim() || !String(conteudo ?? '').trim()) return res.status(400).json({ error: 'Informe título e conteúdo.' });
      const criado = await pool.request()
        .input('titulo', sql.NVarChar, String(titulo).trim())
        .input('conteudo', sql.NVarChar(sql.MAX), String(conteudo))
        .input('modulo', sql.NVarChar, String(modulo ?? 'estoque').trim() || 'estoque')
        .input('criadoPor', sql.NVarChar, criadoPor ? String(criadoPor) : null)
        .query(`INSERT INTO dbo.ConfiguracaoIA(Titulo,Conteudo,Modulo,CriadoPor) OUTPUT INSERTED.ConfiguracaoIAId VALUES(@titulo,@conteudo,@modulo,@criadoPor)`);
      return res.status(201).json({ configuracaoIAId: criado.recordset[0].ConfiguracaoIAId });
    }
    if (req.method === 'PUT') {
      const id = Number(req.body?.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido.' });
      const { titulo, conteudo, modulo, ativo } = req.body ?? {};
      if (!String(titulo ?? '').trim() || !String(conteudo ?? '').trim()) return res.status(400).json({ error: 'Informe título e conteúdo.' });
      await pool.request()
        .input('id', sql.Int, id)
        .input('titulo', sql.NVarChar, String(titulo).trim())
        .input('conteudo', sql.NVarChar(sql.MAX), String(conteudo))
        .input('modulo', sql.NVarChar, String(modulo ?? 'estoque').trim() || 'estoque')
        .input('ativo', sql.Bit, ativo ? 1 : 0)
        .query(`UPDATE dbo.ConfiguracaoIA SET Titulo=@titulo, Conteudo=@conteudo, Modulo=@modulo, Ativo=@ativo, AtualizadoEm=SYSUTCDATETIME() WHERE ConfiguracaoIAId=@id`);
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'DELETE') {
      const id = Number(Array.isArray(req.query.id) ? req.query.id[0] : req.query.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido.' });
      await pool.request().input('id', sql.Int, id).query(`DELETE FROM dbo.ConfiguracaoIA WHERE ConfiguracaoIAId=@id`);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : 'Falha ao gerir configuração de IA. A tabela dbo.ConfiguracaoIA existe no banco?' });
  }
}
