import type { LucideIcon } from 'lucide-react';
import { Construction } from 'lucide-react';

interface EmConstrucaoProps {
  titulo: string;
  descricao?: string;
  Icon?: LucideIcon;
}

export function EmConstrucao({ titulo, descricao, Icon = Construction }: EmConstrucaoProps) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{titulo}</p>
      <h1 className="text-2xl font-bold text-slate-800 mt-1">Painel de {titulo}</h1>
      <div className="mt-6 bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
        <Icon size={32} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">Este módulo ainda está em construção.</p>
        <p className="text-sm text-slate-400 mt-1">{descricao ?? 'Em breve, os dados e telas dessa área estarão disponíveis aqui.'}</p>
      </div>
    </div>
  );
}
