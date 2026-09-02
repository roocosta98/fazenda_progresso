import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  colorClass: string;
}

export const StatCard = ({ title, value, subtitle, icon, colorClass }: StatCardProps) => {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-slate-200/80 flex items-center justify-between group hover:shadow-md transition-all">
      <div>
        <p className="text-sm font-semibold text-slate-500 mb-1">{title}</p>
        <div className="flex items-baseline space-x-2">
          <h3 className="text-4xl font-black text-slate-800 tracking-tight">{value}</h3>
          {subtitle && <span className="text-xs font-semibold text-slate-400">{subtitle}</span>}
        </div>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-transform group-hover:scale-110 ${colorClass}`}>
        {icon}
      </div>
    </div>
  );
};
