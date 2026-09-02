import { useEffect, useState, useCallback } from 'react';
import {
  Truck,
  Clock,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Activity,
  WifiOff,
  MapPin,
  User,
  Radio,
  Eye,
  EyeOff
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const POLL_INTERVAL_MS = 15000;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 75, 100, 'todos'] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

// vw_UltimaPosicao enriquecida — ver api/frota/posicoes.ts
interface PosicaoEquipamento {
  EquipamentoId: number;
  CodigoEquipamento: string;
  Nome: string;
  GrupoFrente: string | null;
  Fazenda: string | null;
  VelocidadeKmh: number | null;
  Estado: string | null;
  OperacaoDescricao: string | null;
  Operador: string | null;
  CodigoTalhao: string | null;
  DataHoraOperacao: string | null;
  ColetadoEm: string | null;
  MinutosSemComunicacao: number | null;
  TipoEquipamento: string | null;
}

type StatusComunicacao = 'online' | 'atencao' | 'offline' | 'sem_dados';

const getStatusComunicacao = (minutos: number | null): StatusComunicacao => {
  if (minutos === null || minutos === undefined) return 'sem_dados';
  if (minutos <= 30) return 'online';
  if (minutos <= 1440) return 'atencao';
  return 'offline';
};

const formatUltimoRastreio = (minutos: number | null) => {
  if (minutos === null || minutos === undefined) return 'sem dados';
  if (minutos < 1) return 'agora mesmo';
  if (minutos < 60) return `há ${Math.round(minutos)} min`;
  const horas = minutos / 60;
  if (horas < 24) return `há ${horas.toFixed(1)}h`;
  return `há ${Math.round(horas / 24)}d`;
};

export const TelaTVMonitor = () => {
  const [posicoes, setPosicoes] = useState<PosicaoEquipamento[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  // Tema Claro (Branco) por padrão com opção de alternar para Escuro
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [time, setTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showOffline, setShowOffline] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState<PageSize>(10);

  const carregarPosicoes = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/frota/posicoes`);
      if (!response.ok) throw new Error(`API respondeu ${response.status}`);
      const data: PosicaoEquipamento[] = await response.json();
      setPosicoes(data);
      setErro(null);
    } catch (error) {
      console.error('Erro ao buscar vw_UltimaPosicao:', error);
      setErro('Sem conexão com o banco de dados da fazenda (SQL Server).');
    }
  }, []);

  useEffect(() => {
    carregarPosicoes();
    const interval = setInterval(carregarPosicoes, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [carregarPosicoes]);

  const onlineCount = posicoes.filter((p) => getStatusComunicacao(p.MinutosSemComunicacao) === 'online').length;
  const atencaoCount = posicoes.filter((p) => getStatusComunicacao(p.MinutosSemComunicacao) === 'atencao').length;
  const offlineCount = posicoes.filter((p) => getStatusComunicacao(p.MinutosSemComunicacao) === 'offline').length;

  const allItems = showOffline ? posicoes : posicoes.filter((p) => getStatusComunicacao(p.MinutosSemComunicacao) !== 'offline');

  const totalPages = itemsPerPage === 'todos' ? 1 : Math.max(1, Math.ceil(allItems.length / itemsPerPage));

  const handleChangeItemsPerPage = (novoTamanho: PageSize) => {
    setItemsPerPage(novoTamanho);
    setCurrentPage(0);
  };

  // Relógio ao vivo com segundos
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Rotação automática de página
  useEffect(() => {
    if (!autoScroll || totalPages <= 1) return;
    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, 8000);
    return () => clearInterval(interval);
  }, [autoScroll, totalPages]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const paginatedItems = itemsPerPage === 'todos'
    ? allItems
    : allItems.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans select-none flex flex-col ${
      themeMode === 'light' ? 'bg-[#F8FAFC] text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>

      {/* BARRA SUPERIOR PREMIUM COM A MARCA AGROTECH FAZENDA PROGRESSO */}
      <header className="px-8 py-4 border-b flex items-center justify-between shadow-md transition-colors bg-slate-900 text-white border-slate-800">

        {/* LOGO DA FAZENDA PROGRESSO */}
        <div className="flex items-center space-x-4">
          <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
            <Leaf className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">AgroTech Logística</span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-none">
              FAZENDA<span className="text-emerald-400">PROGRESSO</span>
            </h1>
          </div>
        </div>

        {/* CARDS DE KPIS EM TEMPO REAL (baseados em MinutosSemComunicacao de vw_UltimaPosicao) */}
        <div className="hidden lg:flex items-center space-x-4">
          <div className="bg-slate-800/90 border border-slate-700/80 px-4 py-2 rounded-2xl flex items-center space-x-3 shadow-inner">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Online</p>
              <p className="text-lg font-black text-emerald-400 leading-none">{onlineCount} equip.</p>
            </div>
          </div>

          <div className="bg-slate-800/90 border border-slate-700/80 px-4 py-2 rounded-2xl flex items-center space-x-3 shadow-inner">
            <Clock className="w-4 h-4 text-amber-400" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sem sinal recente</p>
              <p className="text-lg font-black text-amber-400 leading-none">{atencaoCount} equip.</p>
            </div>
          </div>

          <div className="bg-slate-800/90 border border-slate-700/80 px-4 py-2 rounded-2xl flex items-center space-x-3 shadow-inner">
            <WifiOff className="w-4 h-4 text-rose-400" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Offline</p>
              <p className="text-lg font-black text-rose-400 leading-none">{offlineCount} equip.</p>
            </div>
          </div>
        </div>

        {/* RELÓGIO & CONTROLES DE TEMA (CLARO BRANCO VS ESCURO) */}
        <div className="flex items-center space-x-5">

          {/* Relógio Digital */}
          <div className="text-right">
            <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
              {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center justify-end">
              <Activity size={10} className="mr-1 animate-pulse" /> Ao Vivo TV
            </p>
          </div>

          <div className="h-8 w-px bg-slate-800"></div>

          {/* Botões de Ação */}
          <div className="flex items-center space-x-2">

            {/* Opção de Esconder / Exibir Offline */}
            <button
              onClick={() => {
                setShowOffline(!showOffline);
                setCurrentPage(0);
              }}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                showOffline
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/40'
              }`}
              title={showOffline ? 'Clique para esconder equipamentos offline' : 'Clique para exibir equipamentos offline'}
            >
              {showOffline ? (
                <>
                  <EyeOff size={15} />
                  <span className="hidden sm:inline">Esconder Offline</span>
                </>
              ) : (
                <>
                  <Eye size={15} />
                  <span className="hidden sm:inline">Exibir Offline</span>
                </>
              )}
            </button>

            {/* Alternar entre Modo Claro (Branco) e Escuro */}
            <button
              onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all border border-slate-700 shadow-sm"
              title="Alternar entre Visual Claro (Branco) e Escuro"
            >
              {themeMode === 'light' ? (
                <>
                  <Moon size={15} className="text-amber-300" />
                  <span className="hidden sm:inline">Modo Escuro</span>
                </>
              ) : (
                <>
                  <Sun size={15} className="text-amber-400" />
                  <span className="hidden sm:inline">Modo Claro (Branco)</span>
                </>
              )}
            </button>

            {/* Auto-scroll */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`p-2 rounded-xl text-xs font-bold transition-all border ${
                autoScroll ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title={autoScroll ? 'Pausar rotação' : 'Iniciar rotação'}
            >
              {autoScroll ? <Pause size={16} /> : <Play size={16} />}
            </button>

            {/* Tela Cheia */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all border border-slate-700"
              title="Modo TV Tela Cheia"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
      </header>

      {erro && (
        <div className="px-8 py-2 bg-rose-950/80 text-rose-200 text-sm font-bold text-center">{erro}</div>
      )}

      {/* CONTEÚDO DA TV: TABELA PREMIUM ESTILO AGROTECH EM UMA SÓ LINHA */}
      <main className="flex-1 p-6 flex flex-col justify-between max-w-[1920px] w-full mx-auto overflow-hidden">

        <div className={`rounded-3xl shadow-xl border overflow-hidden flex-1 flex flex-col transition-colors ${
          themeMode === 'light'
            ? 'bg-white border-slate-200/80 shadow-slate-200/50'
            : 'bg-slate-900 border-slate-800/80 shadow-black/40'
        }`}>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">

              {/* CABEÇALHO DA TABELA NO PADRÃO DA PLATAFORMA */}
              <thead>
                <tr className={`text-xs sm:text-sm font-black uppercase tracking-wider border-b ${
                  themeMode === 'light'
                    ? 'bg-slate-900 text-slate-200 border-slate-800'
                    : 'bg-slate-950 text-slate-300 border-slate-800'
                }`}>
                  <th className="py-3.5 px-4 w-32 font-mono text-center">Código</th>
                  <th className="py-3.5 px-4 w-40">Status</th>
                  <th className="py-3.5 px-5 font-extrabold">Equipamento</th>
                  <th className="py-3.5 px-5">Operação &amp; Talhão</th>
                  <th className="py-3.5 px-4">Operador</th>
                  <th className="py-3.5 px-4">Último Rastreio</th>
                  <th className="py-3.5 px-4 w-28 text-center">Velocidade</th>
                </tr>
              </thead>

              {/* LINHAS DA TABELA EM UMA SÓ LINHA (SINGLE LINE PER ROW) */}
              <tbody className="divide-y divide-slate-200/60">
                {paginatedItems.map((item, index) => {
                  const isEven = index % 2 === 0;
                  const status = getStatusComunicacao(item.MinutosSemComunicacao);

                  let badgeStatus = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  let dotStatus = 'bg-emerald-500';
                  let statusTexto = 'Online';

                  if (status === 'atencao') {
                    badgeStatus = 'bg-amber-50 text-amber-700 border-amber-200';
                    dotStatus = 'bg-amber-500';
                    statusTexto = 'Sem sinal recente';
                  } else if (status === 'offline') {
                    badgeStatus = 'bg-rose-50 text-rose-700 border-rose-200';
                    dotStatus = 'bg-rose-500';
                    statusTexto = 'Offline';
                  } else if (status === 'sem_dados') {
                    badgeStatus = 'bg-slate-100 text-slate-600 border-slate-200';
                    dotStatus = 'bg-slate-400';
                    statusTexto = 'Sem dados';
                  }

                  return (
                    <tr
                      key={item.EquipamentoId}
                      className={`transition-colors duration-150 whitespace-nowrap ${
                        themeMode === 'light'
                          ? (isEven ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/60')
                          : (isEven ? 'bg-slate-900 hover:bg-slate-800/60' : 'bg-slate-950/40 hover:bg-slate-800/60')
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 text-xs sm:text-sm text-center whitespace-nowrap">
                        <span className="bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-xs text-slate-800">
                          {item.CodigoEquipamento}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeStatus}`}>
                          <span className={`w-2 h-2 rounded-full ${dotStatus} mr-1.5 ${status === 'online' ? 'animate-pulse' : ''}`}></span>
                          {statusTexto}
                        </span>
                      </td>

                      <td className="py-3 px-5 whitespace-nowrap">
                        <span className="inline-flex items-center text-xs font-bold text-slate-800">
                          <Truck size={14} className="mr-1.5 text-emerald-700 shrink-0" />
                          {item.Nome}
                        </span>
                        {item.TipoEquipamento && (
                          <span className="ml-2 text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {item.TipoEquipamento}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-5 whitespace-nowrap">
                        <span className="font-bold text-slate-800 text-xs sm:text-sm">
                          {item.OperacaoDescricao ?? item.Estado ?? '—'}
                        </span>
                        {item.CodigoTalhao && (
                          <>
                            <span className="text-xs font-semibold text-slate-400 mx-2">•</span>
                            <span className="text-xs font-semibold text-emerald-700 inline-flex items-center">
                              <MapPin size={12} className="mr-1 text-emerald-600 shrink-0 inline" />
                              Talhão {item.CodigoTalhao}
                            </span>
                          </>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-xs font-bold text-slate-800 inline-flex items-center">
                          <User size={13} className="mr-1.5 text-slate-400 shrink-0" />
                          {item.Operador ?? 'Sem operador'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-xs font-mono font-semibold text-slate-600 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border ${
                          status === 'online' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-50 border-slate-200'
                        }`}>
                          <Radio size={12} className={`mr-1.5 ${status === 'online' ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
                          {formatUltimoRastreio(item.MinutosSemComunicacao)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-block px-3 py-0.5 rounded-lg text-xs font-bold border bg-blue-50 text-blue-700 border-blue-200">
                          {item.VelocidadeKmh ?? 0} km/h
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* RODAPÉ DA TABELA NO ESTILO AGROTECH */}
          <div className={`px-6 py-3 border-t flex items-center justify-between text-xs font-bold ${
            themeMode === 'light' ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
          }`}>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>
                Exibindo {allItems.length === 0 ? 0 : currentPage * (itemsPerPage === 'todos' ? allItems.length : itemsPerPage) + 1} a{' '}
                {itemsPerPage === 'todos' ? allItems.length : Math.min((currentPage + 1) * itemsPerPage, allItems.length)} de {allItems.length} equipamentos (vw_UltimaPosicao)
              </span>
            </div>

            {/* CONTROLES DE PÁGINA */}
            <div className="flex items-center space-x-4">
              {/* Seletor de quantidade por página */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">Exibir:</span>
                <div className={`flex p-0.5 rounded-lg border ${themeMode === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
                  {PAGE_SIZE_OPTIONS.map((opcao) => (
                    <button
                      key={opcao}
                      onClick={() => handleChangeItemsPerPage(opcao)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                        itemsPerPage === opcao
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : themeMode === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      {opcao === 'todos' ? 'Todos' : opcao}
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-[11px] uppercase tracking-wider text-slate-400">Página {currentPage + 1} de {totalPages}</span>

              <div className="flex space-x-1">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
                  disabled={currentPage === 0}
                  className="p-1.5 rounded-lg border border-slate-300 hover:bg-white disabled:opacity-30 transition-colors shadow-xs"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-slate-300 hover:bg-white disabled:opacity-30 transition-colors shadow-xs"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
