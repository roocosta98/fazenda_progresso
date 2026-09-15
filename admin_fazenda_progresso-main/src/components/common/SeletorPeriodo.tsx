import { useState } from 'react';
import { diasAtrasISO, hojeISO } from './vizTokens';
import { useConfiguracaoGeral } from '../../hooks/useConfiguracaoGeral';

const PRESETS = [7, 15, 30, 60, 90];

// Seletor de período relativo ("últimos N dias") em vez de um "de-até" fixo como padrão —
// o "de-até" continua existindo, só aparece atrás do botão Personalizado pra quem realmente
// precisa de um intervalo específico. O preset destacado com "(padrão)" é o prazo configurado
// em Administração > Configurações Gerais.
export function SeletorPeriodo({ dataDe, setDataDe, dataAte, setDataAte }: {
  dataDe: string; setDataDe: (v: string) => void;
  dataAte: string; setDataAte: (v: string) => void;
}) {
  const { prazoPadraoDias } = useConfiguracaoGeral();
  const presetAtivo = dataAte === hojeISO() ? PRESETS.find((dias) => dataDe === diasAtrasISO(dias)) ?? null : null;
  const [personalizado, setPersonalizado] = useState(presetAtivo === null);

  const aplicarPreset = (dias: number) => {
    setPersonalizado(false);
    setDataDe(diasAtrasISO(dias));
    setDataAte(hojeISO());
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS.map((dias) => {
        const ativo = !personalizado && presetAtivo === dias;
        return (
          <button key={dias} type="button" onClick={() => aplicarPreset(dias)}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${ativo ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            Últimos {dias} dias{dias === prazoPadraoDias ? ' (padrão)' : ''}
          </button>
        );
      })}
      <button type="button" onClick={() => setPersonalizado(true)}
        className={`px-2.5 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${personalizado ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
        Personalizado
      </button>
      {personalizado && (
        <>
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">De</span>
            <input type="date" value={dataDe} max={dataAte} onChange={(e) => setDataDe(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Até</span>
            <input type="date" value={dataAte} min={dataDe} onChange={(e) => setDataAte(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700" />
          </div>
        </>
      )}
    </div>
  );
}
