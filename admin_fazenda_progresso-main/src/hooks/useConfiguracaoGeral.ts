import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { cabecalhoPerfil } from '../utils/apiAuth';
import type { PerfilUsuario } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? '';
export const PRAZO_PADRAO_DIAS_FALLBACK = 30;

// Cache simples em memória (módulo, não localStorage): a configuração geral é lida por toda
// tela que monta um filtro de período, então evita repetir a mesma chamada em cada uma delas
// durante a navegação. invalidarCacheConfiguracaoGeral() é chamado depois de salvar na tela
// de Configurações Gerais pra próxima leitura pegar o valor novo.
let cache: number | null = null;
let promessaEmAndamento: Promise<number> | null = null;

async function buscarPrazoPadrao(perfil?: PerfilUsuario): Promise<number> {
  if (cache !== null) return cache;
  if (!promessaEmAndamento) {
    promessaEmAndamento = fetch(`${API_URL}/api/administracao/geral`, { headers: cabecalhoPerfil(perfil) })
      .then((resposta) => (resposta.ok ? resposta.json() : { prazoPadraoDias: PRAZO_PADRAO_DIAS_FALLBACK }))
      .then((corpo) => { cache = Number(corpo?.prazoPadraoDias) || PRAZO_PADRAO_DIAS_FALLBACK; return cache; })
      .catch(() => PRAZO_PADRAO_DIAS_FALLBACK)
      .finally(() => { promessaEmAndamento = null; });
  }
  return promessaEmAndamento;
}

export function invalidarCacheConfiguracaoGeral() { cache = null; promessaEmAndamento = null; }

export function useConfiguracaoGeral() {
  const { usuario } = useAuth();
  const [prazoPadraoDias, setPrazoPadraoDias] = useState(cache ?? PRAZO_PADRAO_DIAS_FALLBACK);
  const [carregado, setCarregado] = useState(cache !== null);

  useEffect(() => {
    let vivo = true;
    buscarPrazoPadrao(usuario?.perfil).then((valor) => {
      if (vivo) { setPrazoPadraoDias(valor); setCarregado(true); }
    });
    return () => { vivo = false; };
  }, [usuario?.perfil]);

  return { prazoPadraoDias, carregado };
}
