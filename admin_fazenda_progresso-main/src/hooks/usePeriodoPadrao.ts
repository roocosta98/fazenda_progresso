import { useEffect, useRef, useState } from 'react';
import { diasAtrasISO, hojeISO, primeiroDiaAnoISO, primeiroDiaMesISO, primeiroDiaTrimestreISO } from '../components/common/vizTokens';
import { useConfiguracaoGeral, type PeriodoPadrao } from './useConfiguracaoGeral';

const DIAS_INICIAL = 30;

function calcularDataDe(periodo: PeriodoPadrao): string {
  switch (periodo.tipo) {
    case 'mes_atual': return primeiroDiaMesISO();
    case 'trimestre_atual': return primeiroDiaTrimestreISO();
    case 'ano_atual': return primeiroDiaAnoISO();
    default: return diasAtrasISO(periodo.dias);
  }
}

// Substitui o par de useState de dataDe/dataAte que cada tela de filtro "de-até" tinha: começa
// em "últimos 30 dias" e, assim que a configuração geral carrega, aplica o período padrão
// cadastrado em Administração > Configurações Gerais (dias fixos, mês/trimestre/ano atual) —
// mas só se o usuário ainda não mexeu manualmente no filtro (senão a tela "puxaria o tapete" da
// escolha dele ao terminar de carregar). A tela em si sempre mostra e deixa editar "De" e "Até"
// livremente — só o valor INICIAL vem da configuração.
export function usePeriodoPadrao() {
  const { periodoPadrao, carregado } = useConfiguracaoGeral();
  const [dataDe, setDataDeBase] = useState(() => diasAtrasISO(DIAS_INICIAL));
  const [dataAte, setDataAteBase] = useState(hojeISO());
  const alterouRef = useRef(false);

  useEffect(() => {
    if (carregado && !alterouRef.current) {
      setDataDeBase(calcularDataDe(periodoPadrao));
      setDataAteBase(hojeISO());
    }
  }, [carregado, periodoPadrao]);

  const setDataDe = (valor: string) => { alterouRef.current = true; setDataDeBase(valor); };
  const setDataAte = (valor: string) => { alterouRef.current = true; setDataAteBase(valor); };

  return { dataDe, setDataDe, dataAte, setDataAte };
}
