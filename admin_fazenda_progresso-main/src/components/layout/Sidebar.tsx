import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  ShoppingCart,
  Home,
  Wallet,
  Handshake,
  Calculator,
  Users,
  HardHat,
  ClipboardList,
  Receipt,
  X,
  BrainCircuit,
  Sparkles,
  PieChart,
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
type SelecaoModulo = 'todos' | ModuloSistema;

// Ao entrar por um link direto (ex.: card da tela Início), o menu foca só naquele
// módulo — os demais somem da sidebar até o usuário escolher "Todos os módulos" de novo.
const moduloFromPath = (pathname: string): ModuloSistema | null => {
  if (pathname.startsWith('/logistica/estoque')) return 'estoque';
  if (pathname.startsWith('/logistica')) return 'logistica_frota';
  if (pathname.startsWith('/producao')) return 'producao_batata';
  if (pathname.startsWith('/manutencao')) return 'manutencao';
  if (pathname.startsWith('/compras')) return 'compras';
  if (pathname.startsWith('/financeiro')) return 'financeiro';
  if (pathname.startsWith('/comercial')) return 'comercial';
  if (pathname.startsWith('/custos')) return 'custos';
  if (pathname.startsWith('/rh')) return 'rh';
  if (pathname.startsWith('/seguranca-trabalho')) return 'seguranca_trabalho';
  if (pathname.startsWith('/controladoria')) return 'controladoria';
  if (pathname.startsWith('/fiscal')) return 'fiscal';
  return null;
};

interface SidebarProps {
  mobileAberto?: boolean;
  onFechar?: () => void;
}

export const Sidebar = ({ mobileAberto = false, onFechar }: SidebarProps) => {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [grupoAberto, setGrupoAberto] = useState(true);
  const [seletorAberto, setSeletorAberto] = useState(false);
  const modulosPermitidos: ModuloSistema[] = usuario?.tipoUsuario === 'admin'
    ? ['logistica_frota', 'estoque', 'producao_batata', 'manutencao', 'compras', 'financeiro', 'comercial', 'custos', 'rh', 'seguranca_trabalho', 'controladoria', 'fiscal']
    : (usuario?.modulos?.length ? usuario.modulos : ['logistica_frota']);
  const modulosDisponiveis: SelecaoModulo[] = ['todos', ...modulosPermitidos];
  const [moduloAtual, setModuloAtual] = useState<SelecaoModulo>(() => moduloFromPath(location.pathname) ?? 'todos');
  const [focoManual, setFocoManual] = useState(false);

  useEffect(() => {
    if (focoManual) return;
    const moduloDaRota = moduloFromPath(location.pathname);
    if (moduloDaRota && modulosPermitidos.includes(moduloDaRota)) setModuloAtual(moduloDaRota);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

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
          { to: '/logistica/pesquisa-ia', icon: <Sparkles size={18} />, label: 'Pergunte à IA' },
          { to: '/logistica/monitor-tv', icon: <MonitorPlay size={18} />, label: 'Monitor TV' },
        ];
  // Atalho pro painel geral (BI) em todo módulo — pedido explícito do Marcos, pra não precisar
  // voltar pra "Início" toda vez que quiser ver a visão consolidada.
  const itemVisaoGeral: LinkItem = { to: '/visao-geral', icon: <PieChart size={18} />, label: 'Visão Geral (BI)' };
  const itensPorModuloBase: Record<ModuloSistema, (LinkItem | GrupoItem)[]> = {
    logistica_frota: itensLogistica,
    // "Painel de Estoque" (lista antiga por seção) saiu do menu — o Dashboard agora é a porta
    // de entrada única, com clique-pra-expandir em cada card/gráfico levando ao detalhe
    // completo (a rota /logistica/estoque continua ativa só pelo link direto do "Pergunte à IA").
    estoque: [{ to: '/logistica/estoque/dashboard', icon: <BarChart3 size={18} />, label: 'Dashboard' }, { to: '/logistica/estoque#pesquisa-ia', icon: <Sparkles size={18} />, label: 'Pergunte à IA' }],
    producao_batata: [
      { to: '/producao/batata', icon: <LayoutDashboard size={18} />, label: 'Painel de Produção' },
      { to: '/producao/batata/safras', icon: <Trophy size={18} />, label: 'Safras' },
      { to: '/producao/batata/lancamentos', icon: <Truck size={18} />, label: 'Colheita e Transporte' },
      { to: '/producao/batata/comparativo', icon: <BarChart3 size={18} />, label: 'Comparativo por Safra' },
    ],
    manutencao: [
      { to: '/manutencao', icon: <LayoutDashboard size={18} />, label: 'Painel de Manutenção' },
      { to: '/manutencao/ativos', icon: <Truck size={18} />, label: 'Ativos e Equipamentos' },
      { to: '/manutencao/ordens', icon: <ClipboardCheck size={18} />, label: 'Ordens de Serviço' },
      { to: '/manutencao/preventivas', icon: <Clock size={18} />, label: 'Preventivas' },
      { to: '/manutencao/historico', icon: <List size={18} />, label: 'Histórico por Equipamento' },
    ],
    compras: [
      { to: '/compras', icon: <ShoppingCart size={18} />, label: 'Painel de Compras' },
    ],
    financeiro: [{ to: '/financeiro', icon: <Wallet size={18} />, label: 'Painel Financeiro' }],
    comercial: [{ to: '/comercial', icon: <Handshake size={18} />, label: 'Painel Comercial' }],
    custos: [{ to: '/custos', icon: <Calculator size={18} />, label: 'Painel de Custos' }],
    rh: [{ to: '/rh', icon: <Users size={18} />, label: 'Painel de DP / RH' }],
    seguranca_trabalho: [{ to: '/seguranca-trabalho', icon: <HardHat size={18} />, label: 'Painel de Segurança' }],
    controladoria: [{ to: '/controladoria', icon: <ClipboardList size={18} />, label: 'Painel de Controladoria' }],
    fiscal: [{ to: '/fiscal', icon: <Receipt size={18} />, label: 'Painel Fiscal' }],
  };
  const itensPorModulo = Object.fromEntries(
    Object.entries(itensPorModuloBase).map(([modulo, itens]) => [modulo, [...itens, itemVisaoGeral]]),
  ) as Record<ModuloSistema, (LinkItem | GrupoItem)[]>;
  const itensAdministracao: GrupoItem[] = usuario.tipoUsuario === 'admin' ? [{
    label: 'Administração', icon: <Settings size={18} />,
    children: [
      { to: '/administracao/usuarios', icon: <Settings size={16} />, label: 'Usuários' },
      { to: '/administracao/ia', icon: <BrainCircuit size={16} />, label: 'Configuração de IA' },
      { to: '/logistica/frota', icon: <Truck size={16} />, label: 'Gestão de Frota' },
      { to: '/logistica/metas-orfas', icon: <Link2 size={16} />, label: 'Metas Órfãs' },
    ],
  }] : [];
  const nomesModulos: Record<SelecaoModulo, { nome: string; icone: React.ReactNode }> = {
    todos: { nome: 'Todos os módulos', icone: <LayoutDashboard size={16} /> },
    logistica_frota: { nome: 'Logística / Frota', icone: <Truck size={16} /> },
    estoque: { nome: 'Estoque', icone: <Boxes size={16} /> },
    producao_batata: { nome: 'Produção', icone: <Factory size={16} /> },
    manutencao: { nome: 'Manutenção', icone: <Wrench size={16} /> },
    compras: { nome: 'Compras', icone: <ShoppingCart size={16} /> },
    financeiro: { nome: 'Financeiro', icone: <Wallet size={16} /> },
    comercial: { nome: 'Comercial', icone: <Handshake size={16} /> },
    custos: { nome: 'Custos', icone: <Calculator size={16} /> },
    rh: { nome: 'DP / RH', icone: <Users size={16} /> },
    seguranca_trabalho: { nome: 'Segurança do Trabalho', icone: <HardHat size={16} /> },
    controladoria: { nome: 'Controladoria', icone: <ClipboardList size={16} /> },
    fiscal: { nome: 'Fiscal', icone: <Receipt size={16} /> },
  };
  const items: (LinkItem | GrupoItem)[] = [
    ...(moduloAtual === 'todos'
      ? modulosPermitidos.map((modulo) => ({ label: nomesModulos[modulo as ModuloSistema].nome, icon: nomesModulos[modulo as ModuloSistema].icone, children: itensPorModulo[modulo as ModuloSistema] as LinkItem[] }))
      : itensPorModulo[moduloAtual]),
    ...itensAdministracao,
  ];
  const dashboardModulo: Record<SelecaoModulo, string> = {
    todos: '/logistica/dashboard',
    logistica_frota: '/logistica/dashboard',
    estoque: '/logistica/estoque/dashboard',
    producao_batata: '/producao/batata',
    manutencao: '/manutencao',
    compras: '/compras',
    financeiro: '/financeiro',
    comercial: '/comercial',
    custos: '/custos',
    rh: '/rh',
    seguranca_trabalho: '/seguranca-trabalho',
    controladoria: '/controladoria',
    fiscal: '/fiscal',
  };

  const linkClasses = (isActive: boolean) =>
    `flex items-center justify-between text-xs tracking-tight transition-colors duration-150 group ${
      isActive
        ? 'bg-[#1a3328] text-white font-semibold border-l-[3px] border-emerald-500 rounded-r-md pl-2.5 pr-3 py-2'
        : 'text-slate-400 hover:text-slate-200 hover:bg-[#15271f] rounded-md px-3 py-2 font-medium'
    }`;

  return (
    <>
      {/* Backdrop do menu mobile */}
      {mobileAberto && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onFechar}
        />
      )}
      <aside
        className={`w-72 sm:w-64 bg-[#0d1a14] text-slate-300 flex flex-col z-50 shrink-0 h-full border-r border-[#192c23] select-none fixed inset-y-0 left-0 transition-all duration-200 overflow-hidden md:relative md:translate-x-0 ${
          mobileAberto ? 'translate-x-0 md:w-64' : '-translate-x-full md:w-0 md:border-r-0'
        }`}
      >
      {/* 1. Branding Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#182b22] bg-[#0b1611]/80 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
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
        <button
          onClick={onFechar}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#15271f] rounded-md shrink-0"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* 2. Menu Navigation */}
      <nav className="p-3 flex-1 space-y-1 overflow-y-auto" onClick={(e) => {
        // No desktop o menu fica persistente entre telas do módulo; só fecha sozinho
        // no mobile, onde é um drawer que deve sumir depois de escolher um link.
        const target = e.target as HTMLElement;
        if (target.closest('a') && window.matchMedia('(max-width: 767px)').matches) onFechar?.();
      }}>
        {usuario.perfil !== 'solicitante' && (
          <NavLink
            to="/inicio"
            className="flex items-center gap-2.5 px-3 py-2 mb-3 rounded-md text-xs font-semibold text-slate-300 border border-[#233d30] hover:bg-[#15271f] hover:text-white transition-colors"
          >
            <Home size={16} className="text-emerald-400" />
            Início
          </NavLink>
        )}
        <div className="mb-4 relative">
          <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Módulo atual</p>
          <button onClick={() => setSeletorAberto((atual) => !atual)} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md bg-[#162920] border border-[#294535] text-white text-xs font-semibold">
            <span className="flex items-center gap-2 min-w-0"><span className="text-emerald-400">{nomesModulos[moduloAtual].icone}</span><span className="truncate">{nomesModulos[moduloAtual].nome}</span></span><ChevronDown size={14} className={seletorAberto ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
          {seletorAberto && <div className="absolute z-50 mt-1 w-full bg-[#162920] border border-[#294535] rounded-md p-1 shadow-xl">{modulosDisponiveis.map((modulo) => <button key={modulo} onClick={() => { setModuloAtual(modulo); setFocoManual(modulo === 'todos'); setSeletorAberto(false); navigate(dashboardModulo[modulo]); }} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-left text-xs ${moduloAtual === modulo ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-[#223a2d]'}`}><span>{nomesModulos[modulo].icone}</span>{nomesModulos[modulo].nome}</button>)}</div>}
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
                        end
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
            <NavLink key={item.to} to={item.to} end className={({ isActive }) => linkClasses(isActive)}>
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
    </>
  );
};
