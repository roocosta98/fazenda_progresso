import { useState } from 'react';
import { diasAtrasISO, hojeISO, primeiroDiaAnoISO, primeiroDiaMesISO, primeiroDiaTrimestreISO } from './vizTokens';
import { useConfiguracaoGeral } from '../../hooks/useConfiguracaoGeral';

const PRESETS_DIAS = [7, 15, 30, 60, 90];
const PRESETS_NOMEADOS: { rotulo: string; dataDe: () => string }[] = [
  { rotulo: 'Mês atual', dataDe: primeiroDiaMesISO },
  { rotulo: 'Trimestre atual', dataDe: primeiroDiaTrimestreISO },
  { rotulo: 'Ano atual', dataDe: primeiroDiaAnoISO },
];

// Seletor de período relativo ("últimos N dias", "mês/trimestre/ano atual") em vez de um
// "de-até" fixo como padrão — o "de-até" continua existindo, só aparece atrás do botão
// Personalizado pra quem realmente precisa de um intervalo específico. O preset de dias
// destacado com "(padrão)" é o prazo configurado em Administração > Configurações Gerais.
export function SeletorPeriodo({ dataDe, setDataDe, dataAte, setDataAte }: {
  dataDe: string; setDataDe: (v: string) => void;
  dataAte: string; setDataAte: (v: string) => void;
}) {
  const { prazoPadraoDias } = useConfiguracaoGeral();
  const noPeriodoAtual = dataAte === hojeISO();
  const presetDiasAtivo = noPeriodoAtual ? PRESETS_DIAS.find((dias) => dataDe === diasAtrasISO(dias)) ?? null : null;
  const presetNomeadoAtivo = noPeriodoAtual ? PRESETS_NOMEADOS.find((p) => dataDe === p.dataDe())?.rotulo ?? null : null;
  const [personalizado, setPersonalizado] = useState(presetDiasAtivo === null && presetNomeadoAtivo === null);

  const aplicarDataDe = (calcularDataDe: () => string) => {
    setPersonalizado(false);
    setDataDe(calcularDataDe());
    setDataAte(hojeISO());
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS_DIAS.map((dias) => {
        const ativo = !personalizado && presetDiasAtivo === dias;
        return (
          <button key={dias} type="button" onClick={() => aplicarDataDe(() => diasAtrasISO(dias))}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${ativo ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            Últimos {dias} dias{dias === prazoPadraoDias ? ' (padrão)' : ''}
          </button>
        );
      })}
      <span className="w-px h-4 bg-slate-200 mx-0.5" />
      {PRESETS_NOMEADOS.map((preset) => {
        const ativo = !personalizado && presetNomeadoAtivo === preset.rotulo;
        return (
          <button key={preset.rotulo} type="button" onClick={() => aplicarDataDe(preset.dataDe)}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${ativo ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {preset.rotulo}
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
