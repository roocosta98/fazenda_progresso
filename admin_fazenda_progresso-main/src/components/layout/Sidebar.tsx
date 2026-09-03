import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { List, Clock, LayoutDashboard, Truck, Map as MapIcon, Leaf, MonitorPlay, BarChart3, Trophy, ClipboardCheck, Link2, Settings, ChevronDown } from 'lucide-react';

interface LinkItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

interface GrupoItem {
  label: string;
  icon: React.ReactNode;
  children: LinkItem[];
}

const isGrupo = (item: LinkItem | GrupoItem): item is GrupoItem => 'children' in item;

export const Sidebar = () => {
  const { usuario } = useAuth();
  const [grupoAberto, setGrupoAberto] = useState(false);

  if (!usuario) return null;

  // Grupo "Admin" (Fase 4, pedido do Rodrigo): agrupa telas de manutenção/cadastro que não são
  // do dia a dia da logística — acesso igual pra todo mundo, é só organização visual.
  const items: (LinkItem | GrupoItem)[] = usuario.perfil === 'solicitante'
    ? [
        { to: '/solicitante/minhas', icon: <List size={20} />, label: 'Minhas Solicitações' },
      ]
    : [
        { to: '/logistica/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
        { to: '/logistica/bi', icon: <BarChart3 size={20} />, label: 'Métricas' },
        { to: '/logistica/pendentes', icon: <Clock size={20} />, label: 'Fila de Aprovação', badge: 2 },
        { to: '/logistica/metas', icon: <Trophy size={20} />, label: 'Metas & Ranking' },
        { to: '/logistica/avaliacao-conducao', icon: <ClipboardCheck size={20} />, label: 'Avaliação de Condução' },
        { to: '/logistica/monitoramento', icon: <MapIcon size={20} />, label: 'Telemetria & Mapa' },
        { to: '/logistica/monitor-tv', icon: <MonitorPlay size={20} />, label: 'Monitor TV' },
        {
          label: 'Admin',
          icon: <Settings size={20} />,
          children: [
            { to: '/logistica/frota', icon: <Truck size={18} />, label: 'Gestão de Frota' },
            { to: '/logistica/metas-orfas', icon: <Link2 size={18} />, label: 'Metas Órfãs' },
          ],
        },
      ];

  const linkClasses = (isActive: boolean) =>
    `flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group ${
      isActive
        ? 'bg-green-500/10 text-green-400 font-semibold border border-green-500/20'
        : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-transparent'
    }`;

  return (
    <aside className="w-64 bg-fp-brown-900 text-slate-300 flex flex-col relative z-50 shrink-0 h-full border-r border-fp-brown-800 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">

      {/* Brand Logo */}
      <div className="h-16 flex items-center px-6 border-b border-fp-brown-800 bg-fp-brown-900/50">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-green-500/10 rounded-lg border border-green-500/20 shadow-sm">
            <Leaf className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-widest text-green-500/80 uppercase">AgroTech</span>
            <h1 className="text-sm font-black tracking-tight text-white leading-none">
              FAZENDA<span className="text-green-400">PROGRESSO</span>
            </h1>
          </div>
        </div>
      </div>

      <nav className="p-4 flex-1 space-y-1.5 overflow-y-auto mt-2">
        <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Menu Principal</p>
        {items.map((item) => {
          if (isGrupo(item)) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => setGrupoAberto((atual) => !atual)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-slate-500">{item.icon}</span>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <ChevronDown size={16} className={`text-slate-500 transition-transform ${grupoAberto ? 'rotate-180' : ''}`} />
                </button>
                {grupoAberto && (
                  <div className="mt-1 ml-4 pl-3 border-l border-slate-800 space-y-1">
                    {item.children.map((child) => (
                      <NavLink key={child.to} to={child.to} className={({ isActive }) => linkClasses(isActive)}>
                        {({ isActive }) => (
                          <div className="flex items-center space-x-3">
                            <span className={isActive ? 'text-green-400' : 'text-slate-500 group-hover:text-slate-300'}>{child.icon}</span>
                            <span className="text-sm">{child.label}</span>
                          </div>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => linkClasses(isActive)}>
              {({ isActive }) => (
                <>
                  <div className="flex items-center space-x-3">
                    <span className={isActive ? 'text-green-400' : 'text-slate-500 group-hover:text-slate-300'}>{item.icon}</span>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="bg-rose-500/20 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-500/20">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-fp-brown-800 bg-fp-brown-900/50">
        <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-slate-300">Sistema Online</p>
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          </div>
          <p className="text-[10px] text-slate-500">v2.4.0-stable</p>
        </div>
      </div>
    </aside>
  );
};
