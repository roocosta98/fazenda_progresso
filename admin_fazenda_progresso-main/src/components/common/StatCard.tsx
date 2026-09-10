import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  colorClass?: string;
}

export const StatCard = ({ title, value, subtitle, icon, colorClass = 'text-slate-600' }: StatCardProps) => {
  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-2xs flex items-center justify-between transition-all hover:border-slate-300">
      <div className="min-w-0 pr-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 truncate">
          {title}
        </p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">{value}</h3>
          {subtitle && (
            <span className="text-[11px] font-medium text-slate-500 truncate">{subtitle}</span>
          )}
        </div>
      </div>
      <div
        className={`w-9 h-9 rounded-md flex items-center justify-center bg-slate-50 border border-slate-200/80 shrink-0 ${colorClass}`}
      >
        {icon}
      </div>
    </div>
  );
};
