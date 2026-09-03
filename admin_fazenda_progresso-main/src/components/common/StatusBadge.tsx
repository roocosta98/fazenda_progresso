import { Clock, Calendar, CheckCircle2, Play, XCircle } from 'lucide-react';
import type { StatusSolicitacao } from '../../types';

interface StatusBadgeProps {
  status: StatusSolicitacao;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const configs = {
    pendente: {
      color: 'bg-amber-50 text-amber-800 border-amber-200/80',
      icon: <Clock size={11} className="mr-1 text-amber-600 shrink-0" />,
      label: 'Pendente',
    },
    agendada: {
      color: 'bg-sky-50 text-sky-800 border-sky-200/80',
      icon: <Calendar size={11} className="mr-1 text-sky-600 shrink-0" />,
      label: 'Agendada',
    },
    em_execucao: {
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
      icon: <Play size={10} className="mr-1 text-emerald-600 fill-current shrink-0" />,
      label: 'Em Operação',
    },
    concluida: {
      color: 'bg-slate-100 text-slate-800 border-slate-200',
      icon: <CheckCircle2 size={11} className="mr-1 text-emerald-600 shrink-0" />,
      label: 'Concluída',
    },
    cancelada: {
      color: 'bg-rose-50 text-rose-800 border-rose-200/80',
      icon: <XCircle size={11} className="mr-1 text-rose-600 shrink-0" />,
      label: 'Cancelada',
    },
  };

  const config = configs[status] ?? configs.pendente;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${config.color}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
};
