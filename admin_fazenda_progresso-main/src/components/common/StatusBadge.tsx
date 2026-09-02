import { Clock, Calendar, CheckCircle2, Play, XCircle } from 'lucide-react';
import type { StatusSolicitacao } from '../../types';

interface StatusBadgeProps {
  status: StatusSolicitacao;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const configs = {
    pendente: {
      color: 'bg-amber-100 text-amber-700 border-amber-200',
      icon: <Clock size={12} className="mr-1.5" />,
      label: 'Pendente'
    },
    agendada: {
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: <Calendar size={12} className="mr-1.5" />,
      label: 'Agendada'
    },
    em_execucao: {
      color: 'bg-violet-100 text-violet-700 border-violet-200',
      icon: <Play size={12} className="mr-1.5 fill-current" />,
      label: 'Em Execução'
    },
    concluida: {
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 size={12} className="mr-1.5" />,
      label: 'Concluída'
    },
    cancelada: {
      color: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: <XCircle size={12} className="mr-1.5" />,
      label: 'Cancelada'
    }
  };

  const config = configs[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
};
