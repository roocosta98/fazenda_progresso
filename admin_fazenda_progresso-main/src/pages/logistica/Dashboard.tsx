import { useState } from 'react';
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
  Play
} from 'lucide-react';
import type { SolicitacaoTransporte } from '../../types';

export const Dashboard = () => {
  const { solicitacoes, projetos, veiculos } = useAppContext();
  
  const [visao, setVisao] = useState<'hoje' | 'semana'>('hoje');
  const [dataFiltro, setDataFiltro] = useState<string>(new Date().toISOString().split('T')[0]);
  const [projetoFiltro, setProjetoFiltro] = useState<string>('todos');

  const dataHojeStr = new Date().toISOString().split('T')[0];
  const agendamentosHoje = solicitacoes.filter(s => s.status === 'agendada' && s.dataProgramada === dataHojeStr).length;
  const emExecucaoAgora = solicitacoes.filter(s => s.status === 'em_execucao').length;
  const concluidasHoje = solicitacoes.filter(s => s.status === 'concluida' && s.dataProgramada === dataHojeStr).length;
  const veiculosEmUso = veiculos.filter(v => v.status === 'em_uso').length;
  const veiculosDisponiveis = veiculos.filter(v => v.status === 'disponivel').length;

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

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Painel de Operações</h2>
        <p className="text-slate-500 mt-1">Acompanhe as execuções de transporte de hoje e o planejamento da semana.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Agendamentos Hoje" value={agendamentosHoje} subtitle="planejadas" icon={<CalendarIcon size={22} />} colorClass="text-sky-600" />
        <StatCard title="Em Execução Agora" value={emExecucaoAgora} subtitle="em trânsito" icon={<Play size={22} />} colorClass="text-violet-600" />
        <StatCard title="Concluídas Hoje" value={concluidasHoje} icon={<CheckCircle2 size={22} />} colorClass="text-emerald-600" />
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
            <button onClick={() => alterarDia(visao === 'semana' ? -7 : -1)} className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
              <ChevronLeft size={18} />
            </button>
            <input 
              type="date" 
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
              className="border-none bg-transparent font-bold text-slate-700 focus:ring-0 cursor-pointer text-sm py-1"
            />
            <button onClick={() => alterarDia(visao === 'semana' ? 7 : 1)} className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
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
              className="block w-full pl-9 pr-8 py-2 text-sm font-medium border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50"
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
              {/* Gantt / Timeline Grid */}
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
                        <div key={sol.id} className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-emerald-400/50 transition-all cursor-pointer group/card flex flex-col md:flex-row items-start md:items-center gap-4">
                          
                          <div className="flex-1 min-w-0 w-full">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-mono font-bold text-slate-800 text-sm">{sol.numeroOS}</span>
                              <StatusBadge status={sol.status} />
                            </div>
                            <div className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
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
                              <MapPin size={14} className="text-emerald-500 shrink-0" />
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
                    <div key={dia.dataStr} className={`rounded-2xl border ${isToday ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 bg-slate-50/50'} flex flex-col min-h-[500px]`}>
                      <div className={`p-4 text-center border-b ${isToday ? 'border-emerald-100' : 'border-slate-100'}`}>
                        <p className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-emerald-600' : 'text-slate-500'}`}>{dia.diaSemana}</p>
                        <p className={`text-3xl font-light mt-1 ${isToday ? 'text-emerald-700' : 'text-slate-800'}`}>{dia.diaMes}</p>
                      </div>
                      
                      <div className="p-2 flex flex-col gap-2 flex-1">
                        {solDia.length === 0 ? (
                          <div className="text-center text-xs text-slate-400 mt-4 opacity-50 font-medium">Livre</div>
                        ) : (
                          solDia.map(sol => (
                            <div key={sol.id} className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm hover:border-emerald-400 transition-colors group cursor-pointer relative overflow-hidden">
                              <div className={`absolute top-0 left-0 w-1 h-full ${
                                sol.status === 'agendada' ? 'bg-blue-500' : 
                                sol.status === 'em_execucao' ? 'bg-violet-500' : 'bg-emerald-500'
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
  );
};
