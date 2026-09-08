import type { PerfilUsuario } from '../types';

export const cabecalhoPerfil = (perfil: PerfilUsuario | undefined): HeadersInit => ({
  'x-user-profile': perfil ?? 'nao-autenticado',
});
