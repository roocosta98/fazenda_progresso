import { useEffect, useRef, useState } from 'react';
import { Bell, Sparkles } from 'lucide-react';
import { CHANGELOG } from '../../data/changelog';

const CHAVE_ULTIMA_VISTA = 'fazendaProgresso.changelogVisto';
// Identificador único de uma entrada — várias entradas podem cair no mesmo dia, então "data"
// sozinha não basta mais pra distinguir/marcar como vista; combina com a hora quando existir.
const idEntrada = (entrada: { data: string; hora?: string }) => `${entrada.data} ${entrada.hora ?? ''}`;

export function Novidades() {
  const [aberto, setAberto] = useState(false);
  const [naoLido, setNaoLido] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const ultimaVista = localStorage.getItem(CHAVE_ULTIMA_VISTA);
      setNaoLido(!!CHANGELOG[0] && ultimaVista !== idEntrada(CHANGELOG[0]));
    } catch { /* localStorage indisponível (modo privado etc.) — sem indicador, sem quebrar a tela */ }
  }, []);

  useEffect(() => {
    const fecharAoClicarFora = (evento: MouseEvent) => {
      if (ref.current && !ref.current.contains(evento.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', fecharAoClicarFora);
    return () => document.removeEventListener('mousedown', fecharAoClicarFora);
  }, []);

  const alternar = () => {
    setAberto((atual) => !atual);
    if (!aberto && CHANGELOG[0]) {
      try { localStorage.setItem(CHAVE_ULTIMA_VISTA, idEntrada(CHANGELOG[0])); } catch { /* ignora */ }
      setNaoLido(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={alternar}
        className="relative p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
        title="Novidades do sistema"
      >
        <Bell size={16} />
        {naoLido && <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />}
      </button>
      {aberto && (
        <div className="absolute right-0 mt-1.5 w-80 max-h-[70vh] overflow-y-auto bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50">
          <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center gap-2">
            <Sparkles size={14} className="text-emerald-600" />
            <p className="text-xs font-bold text-slate-800">Novidades do sistema</p>
          </div>
          <div className="divide-y divide-slate-100">
            {CHANGELOG.map((entrada) => (
              <div key={idEntrada(entrada)} className="px-3.5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5">
                  {entrada.data}{entrada.hora && <span className="text-emerald-700/70 font-semibold"> · {entrada.hora}</span>}
                </p>
                <ul className="space-y-1.5">
                  {entrada.itens.map((item, indice) => (
                    <li key={indice} className="text-xs text-slate-600 leading-snug flex gap-1.5">
                      <span className="text-emerald-500 shrink-0">•</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
