import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import sql from 'mssql';
import { getMssqlPool } from './mssql.js';

const MODULOS = new Set(['logistica_frota', 'estoque', 'producao_batata', 'manutencao']);

function exigirAdmin(req: VercelRequest, res: VercelResponse) {
  if (String(req.headers['x-user-type'] ?? '') !== 'admin') { res.status(403).json({ error: 'Apenas administradores podem gerir usuários.' }); return false; }
  return true;
}

export async function usuariosSistema(req: VercelRequest, res: VercelResponse) {
  const acao = String(req.body?.acao ?? req.query.acao ?? '');
  if (acao === 'login') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const senha = String(req.body?.senha ?? '');
    try {
      const pool = await getMssqlPool();
      const resultado = await pool.request().input('email', sql.NVarChar, email).query(`SELECT UsuarioId,Nome,Email,TipoUsuario,SenhaHash,SenhaSalt,IteracoesSenha FROM dbo.UsuariosSistema WHERE Email=@email AND Ativo=1`);
      const conta = resultado.recordset[0];
      if (!conta) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      const hash = pbkdf2Sync(senha, conta.SenhaSalt, Number(conta.IteracoesSenha), Buffer.from(conta.SenhaHash).length, 'sha512');
      if (!Buffer.from(conta.SenhaHash).equals(hash)) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      const permissoes = await pool.request().input('usuarioId', sql.Int, conta.UsuarioId).query('SELECT Modulo FROM dbo.UsuarioModulo WHERE UsuarioId=@usuarioId');
      return res.status(200).json({ id: String(conta.UsuarioId), nome: conta.Nome, email: conta.Email, perfil: 'logistica', tipoUsuario: conta.TipoUsuario, modulos: permissoes.recordset.map((linha) => linha.Modulo) });
    } catch (erro) { return res.status(502).json({ error: erro instanceof Error ? erro.message : 'Não foi possível validar o acesso.' }); }
  }
  if (!exigirAdmin(req, res)) return;
  try {
    const pool = await getMssqlPool();
    if (req.method === 'GET') {
      const resultado = await pool.request().query(`SELECT U.UsuarioId, U.Nome, U.Email, U.TipoUsuario, U.Ativo, U.CriadoEm, M.Modulo FROM dbo.UsuariosSistema U LEFT JOIN dbo.UsuarioModulo M ON M.UsuarioId=U.UsuarioId ORDER BY U.Nome`);
      const usuarios = new Map<number, Record<string, unknown>>();
      resultado.recordset.forEach((linha) => { const id = Number(linha.UsuarioId); const atual = usuarios.get(id) ?? { ...linha, modulos: [] as string[] }; delete atual.Modulo; if (linha.Modulo) (atual.modulos as string[]).push(String(linha.Modulo)); usuarios.set(id, atual); });
      return res.status(200).json([...usuarios.values()]);
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
    const { nome, email, senha, tipoUsuario, modulos } = req.body ?? {};
    const modulosValidos = Array.isArray(modulos) ? modulos.filter((modulo): modulo is string => typeof modulo === 'string' && MODULOS.has(modulo)) : [];
    if (!String(nome ?? '').trim() || !/^\S+@\S+\.\S+$/.test(String(email ?? '')) || String(senha ?? '').length < 8) return res.status(400).json({ error: 'Informe nome, e-mail válido e senha com pelo menos 8 caracteres.' });
    if (!['admin', 'comum'].includes(tipoUsuario)) return res.status(400).json({ error: 'Tipo de usuário inválido.' });
    if (tipoUsuario === 'comum' && !modulosValidos.length) return res.status(400).json({ error: 'Usuário comum precisa de ao menos um módulo.' });
    const salt = randomBytes(16); const hash = pbkdf2Sync(String(senha), salt, 210000, 64, 'sha512');
    const transacao = new sql.Transaction(pool); await transacao.begin();
    try {
      const criado = await new sql.Request(transacao).input('nome', sql.NVarChar, String(nome).trim()).input('email', sql.NVarChar, String(email).trim().toLowerCase()).input('tipo', sql.NVarChar, tipoUsuario).input('hash', sql.VarBinary, hash).input('salt', sql.VarBinary, salt).query(`INSERT INTO dbo.UsuariosSistema(Nome,Email,TipoUsuario,SenhaHash,SenhaSalt) OUTPUT INSERTED.UsuarioId VALUES(@nome,@email,@tipo,@hash,@salt)`);
      const usuarioId = criado.recordset[0].UsuarioId;
      for (const modulo of tipoUsuario === 'admin' ? [...MODULOS] : modulosValidos) await new sql.Request(transacao).input('usuarioId', sql.Int, usuarioId).input('modulo', sql.NVarChar, modulo).query('INSERT INTO dbo.UsuarioModulo(UsuarioId,Modulo) VALUES(@usuarioId,@modulo)');
      await transacao.commit(); return res.status(201).json({ usuarioId });
    } catch (erro) { await transacao.rollback(); throw erro; }
  } catch (erro) { res.status(502).json({ error: erro instanceof Error ? erro.message : 'Falha ao gerir usuários.' }); }
}
