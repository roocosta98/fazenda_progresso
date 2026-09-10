import React from 'react';
import { AlertTriangle, Info, LoaderCircle } from 'lucide-react';

// Componentes de apresentação compartilhados pelos painéis (tokens e formatadores em vizTokens.ts).

export const CardKpi = ({ label, valor, apoio, destaque, tom }: {
  label: string;
  valor: string;
  apoio: string;
  destaque?: boolean;
  tom?: string;
}) => (
  <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${destaque ? 'bg-green-50/50 border-2 border-green-600/40' : 'bg-white border-slate-200/80'}`}>
    <span className={`text-[10px] font-bold uppercase tracking-wider ${destaque ? 'text-green-800' : 'text-slate-400'}`}>{label}</span>
    <div className="my-1.5">
      <span className="text-xl font-black tracking-tight" style={{ color: tom ?? (destaque ? '#15803d' : '#0f172a') }}>{valor}</span>
    </div>
    <span className={`text-[10px] font-medium ${destaque ? 'text-green-700' : 'text-slate-500'}`}>{apoio}</span>
  </div>
);

export const CardViz = ({ titulo, acessorio, children }: {
  titulo: string;
  acessorio?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200/80">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
      <h3 className="text-sm font-bold text-slate-900">{titulo}</h3>
      {acessorio}
    </div>
    <div className="mt-4">{children}</div>
  </div>
);

// Indicador padrão de carregamento — usar em todo painel que busca dado assíncrono,
// no lugar de um "Carregando..." simples, para manter a experiência consistente.
export const Carregando = ({ mensagem = 'Carregando...' }: { mensagem?: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
    <LoaderCircle size={26} className="animate-spin text-emerald-600" />
    <span className="text-xs font-semibold">{mensagem}</span>
  </div>
);

export const SemDado = ({ mensagem }: { mensagem: string }) => (
  <div className="flex items-center justify-center gap-2 py-12 text-xs text-slate-400">
    <Info size={14} /> {mensagem}
  </div>
);

// Distinto de SemDado: isso é uma falha real (timeout, 5xx), não ausência de dado no
// período — sem essa diferença, um erro passageiro parece "não tem nada aqui" pro usuário.
export const ErroCarregamento = ({ mensagem }: { mensagem: string }) => (
  <div className="flex items-center justify-center gap-2 py-12 text-xs text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
    <AlertTriangle size={14} /> {mensagem}
  </div>
);

export const Legenda = ({ itens }: { itens: { cor: string; rotulo: string }[] }) => (
  <div className="flex items-center gap-4 text-xs">
    {itens.map((i) => (
      <div key={i.rotulo} className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: i.cor }} />
        <span className="text-slate-600 text-[11px] font-medium">{i.rotulo}</span>
      </div>
    ))}
  </div>
);
