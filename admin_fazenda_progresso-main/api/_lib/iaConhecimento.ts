import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from 'mssql';
import { getMssqlPool } from './mssql.js';
import { validarSomenteLeitura } from './querySistema.js';
import { QUERIES_CONECTADAS } from './queriesConectadas.js';

// Mesmo padrão de admin usado em usuariosSistema.ts: o proxy de autenticação do frontend
// sobrescreve este header a partir da sessão logada — nunca é o navegador quem decide.
function exigirAdmin(req: VercelRequest, res: VercelResponse) {
  if (String(req.headers['x-user-type'] ?? '') !== 'admin') { res.status(403).json({ error: 'Apenas administradores podem gerir a configuração de IA.' }); return false; }
  return true;
}

// Concatena o conteúdo ativo de um módulo (+ o que for marcado "geral") pra injetar como
// contexto extra no prompt da IA. Chamada direta, servidor-a-servidor — nunca exposta por
// rota HTTP própria, então não precisa (nem deve) do gate de admin acima.
const RUBRICA_TIPO: Record<string, string> = { schema: 'Esquema de banco de dados', prompt: 'Instrução de prompt', texto: 'Conteúdo/observação' };

export async function treinamentoAtivo(modulo: string): Promise<string> {
  try {
    const pool = await getMssqlPool();
    const resultado = await pool.request()
      .input('modulo', sql.NVarChar, modulo)
      // Tipo='query' fica de fora do contexto da IA de propósito: é SQL executável (ver
      // querySistema.ts), não é texto explicativo pra IA ler — incluir aqui só jogaria a query
      // inteira no prompt sem necessidade.
      .query(`SELECT Titulo, Conteudo, Tipo FROM dbo.ConfiguracaoIA WHERE Ativo=1 AND Tipo<>'query' AND (Modulo=@modulo OR Modulo='geral') ORDER BY CASE Tipo WHEN 'schema' THEN 0 WHEN 'prompt' THEN 1 ELSE 2 END, AtualizadoEm DESC`);
    if (!resultado.recordset.length) return '';
    return resultado.recordset.map((linha) => `### [${RUBRICA_TIPO[linha.Tipo] ?? 'Conteúdo'}] ${linha.Titulo}\n${linha.Conteudo}`).join('\n\n');
  } catch (error) {
    // Treinamento é só contexto extra: se a tabela ainda não existe nesta instalação ou a
    // consulta falhar por qualquer motivo, a IA segue funcionando normalmente sem ele.
    console.error('Falha ao carregar treinamento de IA (seguindo sem contexto extra):', error);
    return '';
  }
}

// A coluna ChaveQuery (server/sql/queries_editaveis_ia.sql) é uma migração recente — enquanto
// ela não roda no banco desta instalação, a tela inteira de Treinamento de IA (não só o tipo
// "query") não pode quebrar por causa disso. Checa a existência da coluna a cada request (é uma
// consulta de catálogo, barata) em vez de assumir uma versão fixa de schema.
async function colunaChaveQueryExiste(pool: sql.ConnectionPool): Promise<boolean> {
  try {
    const resultado = await pool.request()
      .query(`SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='ConfiguracaoIA' AND COLUMN_NAME='ChaveQuery'`);
    return resultado.recordset.length > 0;
  } catch {
    return false;
  }
}

// Pré-cadastra (uma vez só, por chave) a query que já está de verdade plugada no backend (ver
// QUERIES_CONECTADAS/querySistema.ts) — assim que a migração da coluna ChaveQuery rodar, ela já
// aparece sozinha na lista, INATIVA, sem precisar clicar em "Usar modelo". Fica inativa de
// propósito: a query do código continua valendo até alguém revisar e ativar essa entrada.
async function semearQueriesConectadas(pool: sql.ConnectionPool): Promise<void> {
  for (const query of QUERIES_CONECTADAS) {
    try {
      const existente = await pool.request().input('chaveQuery', sql.NVarChar, query.chaveQuery)
        .query(`SELECT TOP 1 1 AS ok FROM dbo.ConfiguracaoIA WHERE Tipo='query' AND ChaveQuery=@chaveQuery`);
      if (existente.recordset.length > 0) continue;
      await pool.request()
        .input('titulo', sql.NVarChar, query.titulo)
        .input('conteudo', sql.NVarChar(sql.MAX), query.conteudo)
        .input('modulo', sql.NVarChar, query.modulo)
        .input('chaveQuery', sql.NVarChar, query.chaveQuery)
        .query(`INSERT INTO dbo.ConfiguracaoIA(Titulo,Conteudo,Modulo,Tipo,ChaveQuery,Ativo,CriadoPor) VALUES(@titulo,@conteudo,@modulo,'query',@chaveQuery,0,'Auto-cadastro (query já conectada)')`);
    } catch (error) {
      console.error(`Falha ao pré-cadastrar a query conectada '${query.chaveQuery}' (seguindo sem ela):`, error);
    }
  }
}

export async function configuracaoIA(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (!exigirAdmin(req, res)) return;
  try {
    const pool = await getMssqlPool();
    const temChaveQuery = await colunaChaveQueryExiste(pool);

    if (req.method === 'GET') {
      if (temChaveQuery) await semearQueriesConectadas(pool);
      const resultado = temChaveQuery
        ? await pool.request().query(`SELECT ConfiguracaoIAId, Titulo, Conteudo, Modulo, Tipo, ChaveQuery, Ativo, CriadoEm, AtualizadoEm, CriadoPor FROM dbo.ConfiguracaoIA ORDER BY AtualizadoEm DESC`)
        : await pool.request().query(`SELECT ConfiguracaoIAId, Titulo, Conteudo, Modulo, Tipo, Ativo, CriadoEm, AtualizadoEm, CriadoPor FROM dbo.ConfiguracaoIA ORDER BY AtualizadoEm DESC`);
      const linhas = temChaveQuery ? resultado.recordset : resultado.recordset.map((linha) => ({ ...linha, ChaveQuery: null }));
      return res.status(200).json(linhas);
    }
    if (req.method === 'POST') {
      const { titulo, conteudo, modulo, tipo, chaveQuery, criadoPor } = req.body ?? {};
      if (!String(titulo ?? '').trim() || !String(conteudo ?? '').trim()) return res.status(400).json({ error: 'Informe título e conteúdo.' });
      if (tipo === 'query') {
        if (!temChaveQuery) return res.status(409).json({ error: 'A coluna ChaveQuery ainda não existe neste banco. Rode server/sql/queries_editaveis_ia.sql antes de cadastrar uma query executável.' });
        if (!String(chaveQuery ?? '').trim()) return res.status(400).json({ error: 'Informe a chave da query (ex.: estoque.fornecedores).' });
        const motivo = validarSomenteLeitura(String(conteudo));
        if (motivo) return res.status(400).json({ error: `Query recusada: ${motivo}.` });
      }
      const requisicao = pool.request()
        .input('titulo', sql.NVarChar, String(titulo).trim())
        .input('conteudo', sql.NVarChar(sql.MAX), String(conteudo))
        .input('modulo', sql.NVarChar, String(modulo ?? 'estoque').trim() || 'estoque')
        .input('tipo', sql.NVarChar, String(tipo ?? 'texto').trim() || 'texto')
        .input('criadoPor', sql.NVarChar, criadoPor ? String(criadoPor) : null);
      const criado = temChaveQuery
        ? await requisicao.input('chaveQuery', sql.NVarChar, tipo === 'query' ? String(chaveQuery).trim() : null)
            .query(`INSERT INTO dbo.ConfiguracaoIA(Titulo,Conteudo,Modulo,Tipo,ChaveQuery,CriadoPor) OUTPUT INSERTED.ConfiguracaoIAId VALUES(@titulo,@conteudo,@modulo,@tipo,@chaveQuery,@criadoPor)`)
        : await requisicao.query(`INSERT INTO dbo.ConfiguracaoIA(Titulo,Conteudo,Modulo,Tipo,CriadoPor) OUTPUT INSERTED.ConfiguracaoIAId VALUES(@titulo,@conteudo,@modulo,@tipo,@criadoPor)`);
      return res.status(201).json({ configuracaoIAId: criado.recordset[0].ConfiguracaoIAId });
    }
    if (req.method === 'PUT') {
      const id = Number(req.body?.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido.' });
      const { titulo, conteudo, modulo, tipo, chaveQuery, ativo } = req.body ?? {};
      if (!String(titulo ?? '').trim() || !String(conteudo ?? '').trim()) return res.status(400).json({ error: 'Informe título e conteúdo.' });
      if (tipo === 'query') {
        if (!temChaveQuery) return res.status(409).json({ error: 'A coluna ChaveQuery ainda não existe neste banco. Rode server/sql/queries_editaveis_ia.sql antes de cadastrar uma query executável.' });
        if (!String(chaveQuery ?? '').trim()) return res.status(400).json({ error: 'Informe a chave da query (ex.: estoque.fornecedores).' });
        const motivo = validarSomenteLeitura(String(conteudo));
        if (motivo) return res.status(400).json({ error: `Query recusada: ${motivo}.` });
      }
      const requisicao = pool.request()
        .input('id', sql.Int, id)
        .input('titulo', sql.NVarChar, String(titulo).trim())
        .input('conteudo', sql.NVarChar(sql.MAX), String(conteudo))
        .input('modulo', sql.NVarChar, String(modulo ?? 'estoque').trim() || 'estoque')
        .input('tipo', sql.NVarChar, String(tipo ?? 'texto').trim() || 'texto')
        .input('ativo', sql.Bit, ativo ? 1 : 0);
      if (temChaveQuery) {
        await requisicao.input('chaveQuery', sql.NVarChar, tipo === 'query' ? String(chaveQuery).trim() : null)
          .query(`UPDATE dbo.ConfiguracaoIA SET Titulo=@titulo, Conteudo=@conteudo, Modulo=@modulo, Tipo=@tipo, ChaveQuery=@chaveQuery, Ativo=@ativo, AtualizadoEm=SYSUTCDATETIME() WHERE ConfiguracaoIAId=@id`);
      } else {
        await requisicao.query(`UPDATE dbo.ConfiguracaoIA SET Titulo=@titulo, Conteudo=@conteudo, Modulo=@modulo, Tipo=@tipo, Ativo=@ativo, AtualizadoEm=SYSUTCDATETIME() WHERE ConfiguracaoIAId=@id`);
      }
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
