import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cabecalhoPerfil } from '../../utils/apiAuth';
import { useAppContext } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StatCard } from '../../components/common/StatCard';
import {
  Calendar as CalendarIcon,
  Truck,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Play,
  Wallet,
  ShieldCheck,
  AlertTriangle,
  LayoutGrid,
  Trophy,
  CircleDollarSign,
  Sparkles,
} from 'lucide-react';
import type { SolicitacaoTransporte } from '../../types';
import { PainelMetasDiario } from './PainelMetasDiario';
import { Gastos } from './Gastos';
import { InsightsIA } from './InsightsIA';
import { hojeISO, primeiroDiaMesISO } from '../../components/common/vizTokens';

const API_URL = import.meta.env.VITE_API_URL ?? '';

import { Award, Scale } from 'lucide-react';
import { DashboardDriveAval } from './DashboardDriveAval';
import { LucroPrejuizo } from './LucroPrejuizo';

// Dashboard unificado: junta Dashboard DriveAval (Avaliação & Desenvolvimento de Condutores) +
// Visão geral de solicitações + Metas/Diário + Dashboard Executivo + Gastos&Custos + Insights IA numa tela só.
type Aba = 'metas' | 'lucro-prejuizo' | 'driveaval' | 'visao-geral' | 'gastos' | 'insights';

interface KpiExecutivo {
  tendenciaMensal: { CustoOperacionalTotalMes: number }[];
  pontoEquilibrio: { TotalMotoristas: number; DentroDoPontoDeEquilibrio: number };
  alarmes24h: number;
}

const formatMoeda = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? '—' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const Dashboard = () => {
  const { usuario } = useAuth();
  const { solicitacoes, projetos, veiculos } = useAppContext();

  const [aba, setAba] = useState<Aba>('metas');
  const [kpi, setKpi] = useState<KpiExecutivo | null>(null);

  // Filtro de data compartilhado por Painel Operacional, Lucro x Prejuízo e Gastos & Custos —
  // antes cada aba tinha seu próprio "De/Até" independente, então trocar de aba mudava o
  // período sem avisar (parecia que os relatórios "não respeitavam a data selecionada em cima").
  const [dataDe, setDataDe] = useState(primeiroDiaMesISO());
  const [dataAte, setDataAte] = useState(hojeISO());
  const abasComFiltroData: Aba[] = ['metas', 'lucro-prejuizo', 'gastos'];

  const [visao, setVisao] = useState<'hoje' | 'semana'>('hoje');
  const [dataFiltro, setDataFiltro] = useState<string>(new Date().toISOString().split('T')[0]);
  const [projetoFiltro, setProjetoFiltro] = useState<string>('todos');

  useEffect(() => {
    fetch(`${API_URL}/api/metas/diario?modo=executivo`, { headers: cabecalhoPerfil(usuario?.perfil) })
      .then((r) => r.json())
      .then(setKpi)
      .catch(() => setKpi(null));
  }, [usuario?.perfil]);

  const dataHojeStr = new Date().toISOString().split('T')[0];
  const agendamentosHoje = solicitacoes.filter(s => s.status === 'agendada' && s.dataProgramada === dataHojeStr).length;
  const emExecucaoAgora = solicitacoes.filter(s => s.status === 'em_execucao').length;
  const concluidasHoje = solicitacoes.filter(s => s.status === 'concluida' && s.dataProgramada === dataHojeStr).length;
  const veiculosEmUso = veiculos.filter(v => v.status === 'em_uso').length;
  const veiculosDisponiveis = veiculos.filter(v => v.status === 'disponivel').length;

  const custoMesAtual = kpi?.tendenciaMensal[kpi.tendenciaMensal.length - 1]?.CustoOperacionalTotalMes;

  let solicitacoesFiltradas = solicitacoes.filter(s => s.status !== 'pendente' && s.status !== 'cancelada');
  if (projetoFiltro !== 'todos') {
    solicitacoesFiltradas = solicitacoesFiltradas.filter(s => s.projeto.id === projetoFiltro);
  }

  const solHoje = solicitacoesFiltradas.filter(s => s.dataProgramada === dataFiltro);

  const blocosHorario = solHoje.reduce((acc, sol) => {
    const hora = sol.horarioProgramado || 'Sem Horário Definido';
    if (!acc[hora]) acc[hora] = [];
    acc[hora].push(sol);
    return acc;
  }, {} as Record<string, SolicitacaoTransporte[]>);

  const horariosOrdenados = Object.keys(blocosHorario).sort();

  const getDiasSemana = (dataBaseStr: string) => {
    const dias = [];
    const baseDate = new Date(dataBaseStr + 'T12:00:00Z');
    const day = baseDate.getDay();
    const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(baseDate.setDate(diff));

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dias.push({
        dataStr: d.toISOString().split('T')[0],
        diaSemana: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase(),
        diaMes: d.getDate()
      });
    }
    return dias;
  };

  const semanaDias = getDiasSemana(dataFiltro);

  const alterarDia = (dias: number) => {
    const d = new Date(dataFiltro + 'T12:00:00Z');
    d.setDate(d.getDate() + dias);
    setDataFiltro(d.toISOString().split('T')[0]);
  };

  const abas: { id: Aba; label: string; icon: React.ReactNode }[] = [
    { id: 'metas', label: 'Painel Operacional (Metas & Diário)', icon: <Trophy size={15} /> },
    { id: 'lucro-prejuizo', label: 'Lucro x Prejuízo', icon: <Scale size={15} /> },
    { id: 'driveaval', label: 'DriveAval (Condutores)', icon: <Award size={15} /> },
    { id: 'visao-geral', label: 'Solicitações & Frota', icon: <LayoutGrid size={15} /> },
    { id: 'gastos', label: 'Gastos & Custos', icon: <CircleDollarSign size={15} /> },
    { id: 'insights', label: 'Insights (IA)', icon: <Sparkles size={15} /> },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/60 shadow-2xs">
          {abas.map((a) => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                aba === a.id ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {a.icon} {a.label}
            </button>
          ))}
        </div>
        <Link to="/logistica/pesquisa-ia" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950 text-white text-xs font-bold hover:bg-emerald-900 transition-colors">
          <Sparkles size={15} className="text-emerald-300" /> Pergunte à IA
        </Link>
      </div>

      {abasComFiltroData.includes(aba) && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">De</span>
            <input type="date" value={dataDe} max={dataAte} onChange={(e) => setDataDe(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Até</span>
            <input type="date" value={dataAte} min={dataDe} onChange={(e) => setDataAte(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700" />
          </div>
          <p className="text-[11px] text-slate-400">Vale para as 3 abas de dados diários (Painel Operacional, Lucro x Prejuízo e Gastos & Custos).</p>
        </div>
      )}

      {aba === 'lucro-prejuizo' && <LucroPrejuizo dataDe={dataDe} setDataDe={setDataDe} dataAte={dataAte} setDataAte={setDataAte} />}

      {aba === 'driveaval' && <DashboardDriveAval />}

      {aba === 'visao-geral' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard title="Agendamentos Hoje" value={agendamentosHoje} subtitle="planejadas" icon={<CalendarIcon size={22} />} colorClass="text-sky-600" />
            <StatCard title="Em Execução Agora" value={emExecucaoAgora} subtitle="em trânsito" icon={<Play size={22} />} colorClass="text-violet-600" />
            <StatCard title="Custo Operacional (mês)" value={formatMoeda(custoMesAtual)} icon={<Wallet size={22} />} colorClass="text-green-600" />
            <StatCard
              title="Ponto de Equilíbrio"
              value={kpi ? `${kpi.pontoEquilibrio.DentroDoPontoDeEquilibrio}/${kpi.pontoEquilibrio.TotalMotoristas}` : '—'}
              subtitle="motoristas"
              icon={<ShieldCheck size={22} />}
              colorClass="text-green-600"
            />
            <StatCard title="Alarmes (24h)" value={kpi?.alarmes24h ?? '—'} icon={<AlertTriangle size={22} />} colorClass="text-amber-600" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Concluídas Hoje" value={concluidasHoje} icon={<CheckCircle2 size={22} />} colorClass="text-green-600" />
            <StatCard title="Veículos (Uso / Livres)" value={`${veiculosEmUso} / ${veiculosDisponiveis}`} icon={<Truck size={22} />} colorClass="text-slate-600" />
          </div>

          <div className="bg-white p-2 rounded-2xl shadow-soft border border-slate-200/80 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
              <button
                onClick={() => setVisao('hoje')}
                className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg transition-all ${visao === 'hoje' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Visão do Dia
              </button>
              <button
                onClick={() => setVisao('semana')}
                className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg transition-all ${visao === 'semana' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Visão da Semana
              </button>
            </div>

            <div className="flex items-center space-x-6 px-4">
              <div className="flex items-center space-x-2 bg-slate-50 rounded-xl p-1 border border-slate-200">
                <button onClick={() => alterarDia(visao === 'semana' ? -7 : -1)} className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                  <ChevronLeft size={18} />
                </button>
                <input
                  type="date"
                  value={dataFiltro}
                  onChange={(e) => setDataFiltro(e.target.value)}
                  className="border-none bg-transparent font-bold text-slate-700 focus:ring-0 cursor-pointer text-sm py-1"
                />
                <button onClick={() => alterarDia(visao === 'semana' ? 7 : 1)} className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="relative hidden md:block">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter size={16} className="text-slate-400" />
                </div>
                <select
                  value={projetoFiltro}
                  onChange={(e) => setProjetoFiltro(e.target.value)}
                  className="block w-full pl-9 pr-8 py-2 text-sm font-medium border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-slate-50"
                >
                  <option value="todos">Todos os Projetos</option>
                  {projetos.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {visao === 'hoje' ? (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/80 p-8 min-h-[400px]">
              {horariosOrdenados.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <CalendarIcon size={48} className="text-slate-300 mb-4" />
                  <p className="text-lg font-bold text-slate-800">Sem atividades para esta data.</p>
                  <p className="mt-1 text-sm text-slate-500">Não há solicitações agendadas ou em execução para este dia.</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="hidden md:flex border-b border-slate-200 pb-2 mb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <div className="w-24 shrink-0">Horário</div>
                    <div className="flex-1 grid grid-cols-3 gap-4 px-4">
                      <div>Operação & OS</div>
                      <div>Veículo & Motorista</div>
                      <div>Origem & Destino</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {horariosOrdenados.map(hora => (
                      <div key={hora} className="flex flex-col md:flex-row relative group">
                        <div className="w-24 shrink-0 flex items-start pt-3 md:pt-4">
                          <span className="font-bold text-slate-800 text-lg">{hora}</span>
                        </div>

                        <div className="flex-1 space-y-3">
                          {blocosHorario[hora].map(sol => (
                            <div key={sol.id} className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-green-400/50 transition-all cursor-pointer group/card flex flex-col md:flex-row items-start md:items-center gap-4">

                              <div className="flex-1 min-w-0 w-full">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-mono font-bold text-slate-800 text-sm">{sol.numeroOS}</span>
                                  <StatusBadge status={sol.status} />
                                </div>
                                <div className="inline-flex items-center space-x-1.5 bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                  <span>{sol.projeto.nome}</span>
                                </div>
                              </div>

                              <div className="flex-1 min-w-0 w-full flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                  <Truck size={18} className="text-slate-500" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-800 truncate">
                                    {sol.veiculoAlocado ? sol.veiculoAlocado.modelo : 'Veículo não alocado'}
                                  </p>
                                  {sol.veiculoAlocado && (
                                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">{sol.veiculoAlocado.placa}</p>
                                  )}
                                </div>
                              </div>

                              <div className="flex-1 min-w-0 w-full">
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin size={14} className="text-green-500 shrink-0" />
                                  <span className="text-slate-700 font-medium truncate">{sol.origem}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm mt-1">
                                  <MapPin size={14} className="text-rose-500 shrink-0" />
                                  <span className="text-slate-700 font-medium truncate">{sol.destino}</span>
                                </div>
                              </div>

                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-soft border border-slate-200/80 overflow-hidden">
              <div className="overflow-x-auto p-2">
                <div className="min-w-[1000px]">
                  <div className="grid grid-cols-7 gap-2">
                    {semanaDias.map(dia => {
                      const isToday = dia.dataStr === dataHojeStr;
                      const solDia = solicitacoesFiltradas.filter(s => s.dataProgramada === dia.dataStr);

                      return (
                        <div key={dia.dataStr} className={`rounded-2xl border ${isToday ? 'border-green-200 bg-green-50/30' : 'border-slate-100 bg-slate-50/50'} flex flex-col min-h-[500px]`}>
                          <div className={`p-4 text-center border-b ${isToday ? 'border-green-100' : 'border-slate-100'}`}>
                            <p className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-green-600' : 'text-slate-500'}`}>{dia.diaSemana}</p>
                            <p className={`text-3xl font-light mt-1 ${isToday ? 'text-green-700' : 'text-slate-800'}`}>{dia.diaMes}</p>
                          </div>

                          <div className="p-2 flex flex-col gap-2 flex-1">
                            {solDia.length === 0 ? (
                              <div className="text-center text-xs text-slate-400 mt-4 opacity-50 font-medium">Livre</div>
                            ) : (
                              solDia.map(sol => (
                                <div key={sol.id} className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm hover:border-green-400 transition-colors group cursor-pointer relative overflow-hidden">
                                  <div className={`absolute top-0 left-0 w-1 h-full ${
                                    sol.status === 'agendada' ? 'bg-blue-500' :
                                    sol.status === 'em_execucao' ? 'bg-violet-500' : 'bg-green-500'
                                  }`}></div>
                                  <div className="pl-1">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="font-bold text-slate-800 text-xs">{sol.horarioProgramado || '--:--'}</span>
                                      <span className="text-[9px] font-bold uppercase text-slate-400">{sol.numeroOS}</span>
                                    </div>
                                    <p className="text-slate-600 text-xs truncate mt-1" title={sol.destino}>{sol.destino}</p>
                                    {sol.veiculoAlocado && (
                                      <p className="text-slate-400 truncate mt-1 text-[10px] font-medium">{sol.veiculoAlocado.modelo}</p>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {aba === 'metas' && <PainelMetasDiario dataDe={dataDe} setDataDe={setDataDe} dataAte={dataAte} setDataAte={setDataAte} />}

      {aba === 'gastos' && (
        <div className="space-y-8">
          <Gastos dataDe={dataDe} dataAte={dataAte} />
        </div>
      )}

      {aba === 'insights' && <InsightsIA />}
    </div>
  );
};
