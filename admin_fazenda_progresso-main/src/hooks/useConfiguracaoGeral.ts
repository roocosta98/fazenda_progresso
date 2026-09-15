import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { cabecalhoPerfil } from '../utils/apiAuth';
import type { PerfilUsuario } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export type TipoPeriodoPadrao = 'dias' | 'mes_atual' | 'trimestre_atual' | 'ano_atual';
export type PeriodoPadrao = { tipo: TipoPeriodoPadrao; dias: number };
export const PERIODO_PADRAO_FALLBACK: PeriodoPadrao = { tipo: 'dias', dias: 30 };

// Cache simples em memória (módulo, não localStorage): a configuração geral é lida por toda
// tela que monta um filtro de período, então evita repetir a mesma chamada em cada uma delas
// durante a navegação. invalidarCacheConfiguracaoGeral() é chamado depois de salvar na tela
// de Configurações Gerais pra próxima leitura pegar o valor novo.
let cache: PeriodoPadrao | null = null;
let promessaEmAndamento: Promise<PeriodoPadrao> | null = null;

async function buscarPeriodoPadrao(perfil?: PerfilUsuario): Promise<PeriodoPadrao> {
  if (cache !== null) return cache;
  if (!promessaEmAndamento) {
    promessaEmAndamento = fetch(`${API_URL}/api/administracao/geral`, { headers: cabecalhoPerfil(perfil) })
      .then((resposta) => (resposta.ok ? resposta.json() : { periodoPadrao: PERIODO_PADRAO_FALLBACK }))
      .then((corpo) => {
        const valor: PeriodoPadrao = corpo?.periodoPadrao ?? PERIODO_PADRAO_FALLBACK;
        cache = valor;
        return valor;
      })
      .catch(() => PERIODO_PADRAO_FALLBACK)
      .finally(() => { promessaEmAndamento = null; });
  }
  return promessaEmAndamento;
}

export function invalidarCacheConfiguracaoGeral() { cache = null; promessaEmAndamento = null; }

export function useConfiguracaoGeral() {
  const { usuario } = useAuth();
  const [periodoPadrao, setPeriodoPadrao] = useState<PeriodoPadrao>(cache ?? PERIODO_PADRAO_FALLBACK);
  const [carregado, setCarregado] = useState(cache !== null);

  useEffect(() => {
    let vivo = true;
    buscarPeriodoPadrao(usuario?.perfil).then((valor) => {
      if (vivo) { setPeriodoPadrao(valor); setCarregado(true); }
    });
    return () => { vivo = false; };
  }, [usuario?.perfil]);

  return { periodoPadrao, carregado };
}
