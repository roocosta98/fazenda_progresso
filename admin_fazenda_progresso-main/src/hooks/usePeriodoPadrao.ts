import { useEffect, useRef, useState } from 'react';
import { diasAtrasISO, hojeISO } from '../components/common/vizTokens';
import { useConfiguracaoGeral } from './useConfiguracaoGeral';

const PRAZO_INICIAL = 30;

// Substitui o par de useState de dataDe/dataAte que cada tela de filtro de período tinha:
// começa em "últimos 30 dias" e, assim que a configuração geral carrega, aplica o prazo
// padrão cadastrado em Administração > Configurações Gerais — mas só se o usuário ainda não
// mexeu manualmente no filtro (senão a tela "puxaria o tapete" da escolha dele ao terminar
// de carregar).
export function usePeriodoPadrao() {
  const { prazoPadraoDias, carregado } = useConfiguracaoGeral();
  const [dataDe, setDataDeBase] = useState(() => diasAtrasISO(PRAZO_INICIAL));
  const [dataAte, setDataAteBase] = useState(hojeISO());
  const alterouRef = useRef(false);

  useEffect(() => {
    if (carregado && !alterouRef.current) {
      setDataDeBase(diasAtrasISO(prazoPadraoDias));
      setDataAteBase(hojeISO());
    }
  }, [carregado, prazoPadraoDias]);

  const setDataDe = (valor: string) => { alterouRef.current = true; setDataDeBase(valor); };
  const setDataAte = (valor: string) => { alterouRef.current = true; setDataAteBase(valor); };

  return { dataDe, setDataDe, dataAte, setDataAte };
}
