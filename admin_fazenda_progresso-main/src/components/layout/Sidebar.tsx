import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { List, Clock, LayoutDashboard, Truck, Map as MapIcon, Leaf, MonitorPlay, BarChart3 } from 'lucide-react';

export const Sidebar = () => {
  const { usuario } = useAuth();

  if (!usuario) return null;

  const links = usuario.perfil === 'solicitante' 
    ? [
        { to: '/solicitante/minhas', icon: <List size={20} />, label: 'Minhas Solicitações' },
      ]
    : [
        { to: '/logistica/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
        { to: '/logistica/bi', icon: <BarChart3 size={20} />, label: 'Métricas' },
        { to: '/logistica/pendentes', icon: <Clock size={20} />, label: 'Fila de Aprovação', badge: 2 },
        { to: '/logistica/frota', icon: <Truck size={20} />, label: 'Gestão de Frota' },
        { to: '/logistica/monitoramento', icon: <MapIcon size={20} />, label: 'Telemetria & Mapa' },
        { to: '/logistica/monitor-tv', icon: <MonitorPlay size={20} />, label: 'Monitor TV' },
      ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col relative z-50 shrink-0 h-full border-r border-slate-800/80 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      
      {/* Brand Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800/80 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 shadow-sm">
            <Leaf className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-widest text-emerald-500/80 uppercase">AgroTech</span>
            <h1 className="text-sm font-black tracking-tight text-white leading-none">
              FAZENDA<span className="text-emerald-400">PROGRESSO</span>
            </h1>
          </div>
        </div>
      </div>

      <nav className="p-4 flex-1 space-y-1.5 overflow-y-auto mt-2">
        <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Menu Principal</p>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group ${
                isActive 
                  ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20' 
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-transparent'
              }`
            }
          >
            <div className="flex items-center space-x-3">
              <span className={`transition-colors ${
                window.location.pathname === link.to ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
              }`}>
                {link.icon}
              </span>
              <span className="text-sm">{link.label}</span>
            </div>
            {link.badge && (
              <span className="bg-rose-500/20 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-500/20">
                {link.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800/80 bg-slate-900/50">
        <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-slate-300">Sistema Online</p>
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          </div>
          <p className="text-[10px] text-slate-500">v2.4.0-stable</p>
        </div>
      </div>
    </aside>
  );
};
