import type { VercelRequest, VercelResponse } from '@vercel/node';

const PERFIS_AUTORIZADOS = new Set(['logistica', 'diretoria', 'admin']);

/**
 * Barreira adicional para respostas com remuneração/custos não homologados.
 * O proxy de autenticação deve sobrescrever (e nunca repassar do navegador) este header.
 */
export function exigirAcessoCustos(req: VercelRequest, res: VercelResponse): boolean {
  const perfil = String(req.headers['x-user-profile'] ?? '').toLowerCase();
  if (!PERFIS_AUTORIZADOS.has(perfil)) {
    res.status(403).json({ error: 'Perfil sem permissão para visualizar custos operacionais.' });
    return false;
  }
  return true;
}
