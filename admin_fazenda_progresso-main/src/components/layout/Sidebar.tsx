import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  List,
  Clock,
  LayoutDashboard,
  Truck,
  Map as MapIcon,
  MonitorPlay,
  Trophy,
  ClipboardCheck,
  Link2,
  Settings,
  ChevronDown,
  LogOut,
  BarChart3,
  Boxes,
  Factory,
  Wrench,
} from 'lucide-react';
import logoFp from '../../assets/logo.png';
import type { ModuloSistema } from '../../types';

interface LinkItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  pendente?: boolean;
}

interface GrupoItem {
  label: string;
  icon: React.ReactNode;
  children: LinkItem[];
}

const isGrupo = (item: LinkItem | GrupoItem): item is GrupoItem => 'children' in item;

export const Sidebar = () => {
  const { usuario, logout } = useAuth();
  const [grupoAberto, setGrupoAberto] = useState(true);
  const [seletorAberto, setSeletorAberto] = useState(false);
  const modulosDisponiveis = usuario?.tipoUsuario === 'admin'
    ? ['logistica_frota', 'estoque', 'producao_batata', 'manutencao'] as const
    : (usuario?.modulos?.length ? usuario.modulos : ['logistica_frota'] as const);
  const [moduloAtual, setModuloAtual] = useState<typeof modulosDisponiveis[number]>(modulosDisponiveis[0]);

  if (!usuario) return null;

  const itensLogistica: (LinkItem | GrupoItem)[] =
    usuario.perfil === 'solicitante'
      ? [{ to: '/solicitante/minhas', icon: <List size={18} />, label: 'Minhas Solicitações' }]
      : [
          { to: '/logistica/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
          { to: '/logistica/bi', icon: <BarChart3 size={18} />, label: 'Métricas' },
          { to: '/logistica/pendentes', icon: <Clock size={18} />, label: 'Fila de Aprovação', badge: 2 },
          { to: '/logistica/metas', icon: <Trophy size={18} />, label: 'Metas & Ranking' },
          { to: '/logistica/avaliacao-conducao', icon: <ClipboardCheck size={18} />, label: 'Avaliação de Condução' },
          { to: '/logistica/monitoramento', icon: <MapIcon size={18} />, label: 'Telemetria & Mapa' },
          { to: '/logistica/monitor-tv', icon: <MonitorPlay size={18} />, label: 'Monitor TV' },
          { to: '/logistica/frota', icon: <Truck size={18} />, label: 'Gestão de Frota' },
          { to: '/logistica/metas-orfas', icon: <Link2 size={18} />, label: 'Metas Órfãs' },
        ];
  const itensPorModulo: Record<ModuloSistema, (LinkItem | GrupoItem)[]> = {
    logistica_frota: itensLogistica,
    estoque: [{ to: '/logistica/estoque/dashboard', icon: <BarChart3 size={18} />, label: 'Dashboard' }, { to: '/logistica/estoque', icon: <Boxes size={18} />, label: 'Painel de Estoque' }],
    producao_batata: [
      { to: '/producao/batata', icon: <LayoutDashboard size={18} />, label: 'Painel de Produção' },
      { to: '/producao/batata/safras', icon: <Trophy size={18} />, label: 'Safras' },
      { to: '/producao/batata/lancamentos', icon: <Truck size={18} />, label: 'Colheita e Transporte' },
      { to: '/producao/batata/comparativo', icon: <BarChart3 size={18} />, label: 'Comparativo por Safra' },
    ],
    manutencao: [
      { to: '#', icon: <LayoutDashboard size={18} />, label: 'Painel de Manutenção', pendente: true },
      { to: '#', icon: <Truck size={18} />, label: 'Ativos e Equipamentos', pendente: true },
      { to: '#', icon: <ClipboardCheck size={18} />, label: 'Ordens de Serviço', pendente: true },
      { to: '#', icon: <Clock size={18} />, label: 'Preventivas', pendente: true },
      { to: '#', icon: <List size={18} />, label: 'Histórico por Equipamento', pendente: true },
    ],
  };
  const itensAdministracao: GrupoItem[] = usuario.tipoUsuario === 'admin' ? [{
    label: 'Administração', icon: <Settings size={18} />,
    children: [{ to: '/administracao/usuarios', icon: <Settings size={16} />, label: 'Usuários' }],
  }] : [];
  const items = [...(itensPorModulo[moduloAtual] ?? itensLogistica), ...itensAdministracao];
  const nomesModulos: Record<ModuloSistema, { nome: string; icone: React.ReactNode }> = {
    logistica_frota: { nome: 'Logística / Frota', icone: <Truck size={16} /> },
    estoque: { nome: 'Estoque', icone: <Boxes size={16} /> },
    producao_batata: { nome: 'Produção / Batata', icone: <Factory size={16} /> },
    manutencao: { nome: 'Manutenção', icone: <Wrench size={16} /> },
  };

  const linkClasses = (isActive: boolean) =>
    `flex items-center justify-between text-xs tracking-tight transition-colors duration-150 group ${
      isActive
        ? 'bg-[#1a3328] text-white font-semibold border-l-[3px] border-emerald-500 rounded-r-md pl-2.5 pr-3 py-2'
        : 'text-slate-400 hover:text-slate-200 hover:bg-[#15271f] rounded-md px-3 py-2 font-medium'
    }`;

  return (
    <aside className="w-64 bg-[#0d1a14] text-slate-300 flex flex-col relative z-50 shrink-0 h-full border-r border-[#192c23] select-none">
      {/* 1. Branding Header */}
      <div className="h-16 flex items-center px-4 border-b border-[#182b22] bg-[#0b1611]/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#162920] border border-[#233d30] flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
            <img src={logoFp} alt="Logo FP" className="w-7 h-7 object-contain" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/90 leading-tight">
              AgroTech Enterprise
            </span>
            <h1 className="text-xs font-bold text-white tracking-tight leading-snug truncate">
              FAZENDA <span className="text-emerald-400">PROGRESSO</span>
            </h1>
          </div>
        </div>
      </div>

      {/* 2. Menu Navigation */}
      <nav className="p-3 flex-1 space-y-1 overflow-y-auto">
        <div className="mb-4 relative">
          <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Módulo atual</p>
          <button onClick={() => setSeletorAberto((atual) => !atual)} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md bg-[#162920] border border-[#294535] text-white text-xs font-semibold">
            <span className="flex items-center gap-2 min-w-0"><span className="text-emerald-400">{nomesModulos[moduloAtual].icone}</span><span className="truncate">{nomesModulos[moduloAtual].nome}</span></span><ChevronDown size={14} className={seletorAberto ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
          {seletorAberto && <div className="absolute z-50 mt-1 w-full bg-[#162920] border border-[#294535] rounded-md p-1 shadow-xl">{modulosDisponiveis.map((modulo) => <button key={modulo} onClick={() => { setModuloAtual(modulo); setSeletorAberto(false); }} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-left text-xs ${moduloAtual === modulo ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-[#223a2d]'}`}><span>{nomesModulos[modulo].icone}</span>{nomesModulos[modulo].nome}</button>)}</div>}
        </div>
        <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider my-2.5">
          {nomesModulos[moduloAtual].nome}
        </p>

        {items.length === 0 ? <p className="px-3 py-4 text-xs leading-relaxed text-slate-500">As telas deste módulo serão disponibilizadas em breve.</p> : items.map((item) => {
          if (isGrupo(item)) {
            return (
              <div key={item.label} className="pt-2">
                <button
                  onClick={() => setGrupoAberto((atual) => !atual)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#15271f] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-slate-400">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform duration-200 ${
                      grupoAberto ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {grupoAberto && (
                  <div className="mt-1 ml-3.5 pl-2.5 border-l border-[#1f382c] space-y-1">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                            isActive
                              ? 'text-white bg-[#1a3328] font-semibold'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-[#15271f]'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>
                              {child.icon}
                            </span>
                            <span>{child.label}</span>
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          if (item.pendente) {
            return <div key={item.label} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-slate-600 cursor-not-allowed"><span>{item.icon}</span><span>{item.label}</span><span className="ml-auto text-[9px] uppercase">em breve</span></div>;
          }

          return (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => linkClasses(isActive)}>
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-300'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="bg-rose-950/80 text-rose-300 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-rose-800/50">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* 3. User & Session Footer */}
      <div className="p-3 border-t border-[#182b22] bg-[#0b1611]/80">
        <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-[#13241b] border border-[#1d3629]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-emerald-800/60 border border-emerald-600/40 flex items-center justify-center text-emerald-200 font-semibold text-xs shrink-0">
              {usuario?.nome.charAt(0)}
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{usuario?.nome}</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] text-slate-400 truncate capitalize">
                  {usuario?.perfil === 'logistica' ? 'Gestor' : usuario?.perfil}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Encerrar Sessão"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};
