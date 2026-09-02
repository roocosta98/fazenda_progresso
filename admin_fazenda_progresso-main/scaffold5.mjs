import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const writeFile = (file, content) => {
  const fullPath = path.join(__dirname, file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('Created ' + file);
};

const dashboardStr = `import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  ChevronLeft, 
  ChevronRight,
  Filter
} from 'lucide-react';
import type { SolicitacaoTransporte } from '../../types';

export const Dashboard = () => {
  const { solicitacoes, projetos, veiculos } = useAppContext();
  
  const [visao, setVisao] = useState<'hoje' | 'semana'>('hoje');
  const [dataFiltro, setDataFiltro] = useState<string>(new Date().toISOString().split('T')[0]);
  const [projetoFiltro, setProjetoFiltro] = useState<string>('todos');

  // KPIs
  const dataHojeStr = new Date().toISOString().split('T')[0];
  const agendamentosHoje = solicitacoes.filter(s => s.status === 'agendada' && s.dataProgramada === dataHojeStr).length;
  const emExecucaoAgora = solicitacoes.filter(s => s.status === 'em_execucao').length;
  const concluidasHoje = solicitacoes.filter(s => s.status === 'concluida' && s.dataProgramada === dataHojeStr).length;
  
  const veiculosEmUso = veiculos.filter(v => v.status === 'em_uso').length;
  const veiculosDisponiveis = veiculos.filter(v => v.status === 'disponivel').length;

  // Filtragem base (aplicada às duas visões)
  let solicitacoesFiltradas = solicitacoes.filter(s => s.status !== 'pendente' && s.status !== 'cancelada');
  if (projetoFiltro !== 'todos') {
    solicitacoesFiltradas = solicitacoesFiltradas.filter(s => s.projeto.id === projetoFiltro);
  }

  // Lógica Visão Hoje
  const solHoje = solicitacoesFiltradas.filter(s => s.dataProgramada === dataFiltro);
  
  // Agrupar por horário
  const blocosHorario = solHoje.reduce((acc, sol) => {
    const hora = sol.horarioProgramado || 'Sem Horário Definido';
    if (!acc[hora]) acc[hora] = [];
    acc[hora].push(sol);
    return acc;
  }, {} as Record<string, SolicitacaoTransporte[]>);
  
  // Ordenar horários (string sorting works for HH:mm)
  const horariosOrdenados = Object.keys(blocosHorario).sort();

  // Lógica Visão Semana (7 dias a partir da data base)
  const getDiasSemana = (dataBaseStr: string) => {
    const dias = [];
    const baseDate = new Date(dataBaseStr + 'T12:00:00Z');
    
    // Find Monday of that week
    const day = baseDate.getDay(); // 0 is Sunday, 1 is Monday
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard de Agendamentos</h2>
        <p className="text-gray-500 mt-1">Acompanhe as execuções de transporte de hoje e o planejamento da semana.</p>
      </div>

      {/* KPIs Rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-blue-500">
          <p className="text-sm font-medium text-gray-500">Agendamentos Hoje</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-bold text-gray-900">{agendamentosHoje}</span>
            <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">planejadas</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-purple-500">
          <p className="text-sm font-medium text-gray-500">Em Execução Agora</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-bold text-gray-900">{emExecucaoAgora}</span>
            <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">em trânsito</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-green-500">
          <p className="text-sm font-medium text-gray-500">Concluídas Hoje</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-bold text-gray-900">{concluidasHoje}</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-gray-800">
          <p className="text-sm font-medium text-gray-500">Veículos (Uso vs Livres)</p>
          <div className="flex items-baseline mt-1">
            <span className="text-2xl font-bold text-gray-900">{veiculosEmUso}</span>
            <span className="text-lg text-gray-400 mx-1">/</span>
            <span className="text-xl font-semibold text-gray-600">{veiculosDisponiveis}</span>
          </div>
        </div>
      </div>

      {/* Toolbar - Controles de Visão */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setVisao('hoje')}
            className={\`px-4 py-2 text-sm font-medium rounded-md transition-colors \${visao === 'hoje' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}\`}
          >
            Visão do Dia
          </button>
          <button
            onClick={() => setVisao('semana')}
            className={\`px-4 py-2 text-sm font-medium rounded-md transition-colors \${visao === 'semana' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}\`}
          >
            Visão da Semana
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button onClick={() => alterarDia(visao === 'semana' ? -7 : -1)} className="p-1 text-gray-500 hover:text-brand-primary hover:bg-gray-100 rounded-full">
              <ChevronLeft size={20} />
            </button>
            <input 
              type="date" 
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
              className="border-none bg-transparent font-medium text-gray-900 focus:ring-0 cursor-pointer"
            />
            <button onClick={() => alterarDia(visao === 'semana' ? 7 : 1)} className="p-1 text-gray-500 hover:text-brand-primary hover:bg-gray-100 rounded-full">
              <ChevronRight size={20} />
            </button>
          </div>
          
          <div className="h-6 border-l border-gray-300 hidden md:block"></div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <Filter size={14} className="text-gray-400" />
            </div>
            <select
              value={projetoFiltro}
              onChange={(e) => setProjetoFiltro(e.target.value)}
              className="block w-full pl-8 pr-8 py-1.5 text-sm border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary bg-gray-50"
            >
              <option value="todos">Todos os Projetos</option>
              {projetos.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {visao === 'hoje' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
          {horariosOrdenados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <CalendarIcon size={48} className="text-gray-300 mb-3" />
              <p className="text-lg font-medium text-gray-900">Sem atividades para esta data.</p>
              <p>Não há solicitações agendadas ou em execução para este dia.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {horariosOrdenados.map(hora => (
                <div key={hora} className="flex flex-col md:flex-row gap-4">
                  {/* Marcador de Hora */}
                  <div className="md:w-32 flex-shrink-0 pt-1">
                    <div className="flex items-center space-x-2">
                      <Clock size={16} className="text-brand-primary" />
                      <span className="font-bold text-gray-900 text-lg">{hora}</span>
                    </div>
                  </div>
                  
                  {/* Grid de OSs */}
                  <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {blocosHorario[hora].map(sol => (
                      <div key={sol.id} className="border border-gray-200 rounded-lg p-4 hover:border-brand-primary/50 hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-gray-900">{sol.numeroOS}</span>
                              <Badge status={sol.status} />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{sol.projeto.nome}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                          <div className="col-span-2 flex items-center text-gray-700">
                            <MapPin size={14} className="text-gray-400 mr-2 flex-shrink-0" />
                            <span className="truncate">{sol.origem} &rarr; {sol.destino}</span>
                          </div>
                          
                          {sol.veiculoAlocado && (
                            <div className="flex items-center text-gray-700">
                              <Truck size={14} className="text-gray-400 mr-2" />
                              <span className="truncate">{sol.veiculoAlocado.modelo}</span>
                              <span className="ml-1 text-xs bg-gray-100 px-1 rounded font-mono">{sol.veiculoAlocado.placa}</span>
                            </div>
                          )}
                          
                          {sol.motoristaAlocado && (
                            <div className="flex items-center text-gray-700">
                              <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center mr-2 text-[8px] font-bold text-gray-500">M</div>
                              <span className="truncate">{sol.motoristaAlocado.nome}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              {/* Header Tabela Semana */}
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                {semanaDias.map(dia => {
                  const isToday = dia.dataStr === dataHojeStr;
                  return (
                    <div key={dia.dataStr} className={\`p-4 text-center border-r border-gray-200 last:border-r-0 \${isToday ? 'bg-brand-primary/5' : ''}\`}>
                      <p className={\`text-xs font-bold uppercase \${isToday ? 'text-brand-primary' : 'text-gray-500'}\`}>{dia.diaSemana}</p>
                      <p className={\`text-2xl font-light \${isToday ? 'text-brand-primary' : 'text-gray-900'}\`}>{dia.diaMes}</p>
                    </div>
                  );
                })}
              </div>
              
              {/* Corpo Tabela Semana */}
              <div className="grid grid-cols-7 min-h-[400px]">
                {semanaDias.map(dia => {
                  const solDia = solicitacoesFiltradas.filter(s => s.dataProgramada === dia.dataStr);
                  const isToday = dia.dataStr === dataHojeStr;
                  
                  return (
                    <div key={dia.dataStr} className={\`p-2 border-r border-gray-200 last:border-r-0 flex flex-col gap-2 \${isToday ? 'bg-brand-primary/5' : 'bg-white'}\`}>
                      {solDia.length === 0 ? (
                        <div className="text-center text-xs text-gray-400 mt-4 opacity-50">-</div>
                      ) : (
                        solDia.map(sol => (
                          <div key={sol.id} className="bg-white border border-gray-200 p-2 rounded text-xs shadow-sm cursor-pointer hover:border-brand-primary group">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-gray-700">{sol.horarioProgramado || '--:--'}</span>
                              <div className={\`w-2 h-2 rounded-full \${
                                sol.status === 'agendada' ? 'bg-blue-500' : 
                                sol.status === 'em_execucao' ? 'bg-purple-500' : 'bg-green-500'
                              }\`}></div>
                            </div>
                            <p className="font-medium text-gray-900 truncate">{sol.numeroOS}</p>
                            <p className="text-gray-500 truncate" title={sol.destino}>{sol.destino}</p>
                            {sol.veiculoAlocado && (
                              <p className="text-gray-400 truncate mt-1 text-[10px]">{sol.veiculoAlocado.modelo}</p>
                            )}
                          </div>
                        ))
                      )}
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
`;

const frotaStr = `import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Search, Plus, MapPin } from 'lucide-react';
import { Modal } from '../../components/common/Modal';

export const GestaoFrota = () => {
  const { veiculos, motoristas, solicitacoes } = useAppContext();
  const [activeTab, setActiveTab] = useState<'veiculos' | 'motoristas'>('veiculos');
  const [busca, setBusca] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Helper para motoristas em rota: achar OS ativa
  const getOSAtual = (motoristaId: string) => {
    const os = solicitacoes.find(s => 
      s.motoristaAlocado?.id === motoristaId && 
      (s.status === 'em_execucao' || s.status === 'agendada')
    );
    return os ? os.numeroOS : null;
  };

  const filteredVeiculos = veiculos.filter(v => 
    v.placa.toLowerCase().includes(busca.toLowerCase()) || 
    v.modelo.toLowerCase().includes(busca.toLowerCase())
  );

  const filteredMotoristas = motoristas.filter(m => 
    m.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Frota e Motoristas</h2>
          <p className="text-gray-500 mt-1">Controle o cadastro e a disponibilidade de veículos e equipe.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-brand-primary text-white rounded-md font-medium hover:bg-brand-secondary transition-colors"
        >
          <Plus size={18} className="mr-2" />
          {activeTab === 'veiculos' ? 'Cadastrar Veículo' : 'Cadastrar Motorista'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[600px]">
        {/* Tabs e Busca */}
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50">
          <div className="flex space-x-1 bg-white p-1 rounded-lg border border-gray-200 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('veiculos')}
              className={\`flex-1 md:flex-none px-6 py-2 text-sm font-medium rounded-md transition-colors \${activeTab === 'veiculos' ? 'bg-brand-primary text-white shadow' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}\`}
            >
              Veículos ({veiculos.length})
            </button>
            <button
              onClick={() => setActiveTab('motoristas')}
              className={\`flex-1 md:flex-none px-6 py-2 text-sm font-medium rounded-md transition-colors \${activeTab === 'motoristas' ? 'bg-brand-primary text-white shadow' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}\`}
            >
              Motoristas ({motoristas.length})
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={activeTab === 'veiculos' ? "Buscar placa ou modelo..." : "Buscar nome do motorista..."}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary text-sm"
            />
          </div>
        </div>

        {/* Tabela de Conteúdo */}
        <div className="flex-1 overflow-x-auto">
          {activeTab === 'veiculos' ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Identificação</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoria / Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Projeto / Base</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredVeiculos.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-bold text-gray-900">{v.modelo}</p>
                      <p className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded mt-1 inline-block border border-gray-200">{v.placa}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {v.tipo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center mt-2">
                      <MapPin size={14} className="mr-1 text-gray-400" /> Sedes
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={\`px-2.5 py-0.5 rounded-full text-xs font-medium border \${
                        v.status === 'disponivel' ? 'bg-green-100 text-green-800 border-green-200' :
                        v.status === 'em_uso' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }\`}>
                        {v.status === 'disponivel' ? 'Disponível' : v.status === 'em_uso' ? 'Em Uso' : 'Manutenção'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-brand-secondary hover:text-brand-primary">Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Motorista</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contato</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status Atual</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vínculo (OS Ativa)</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredMotoristas.map(m => {
                  const osAtual = getOSAtual(m.id);
                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold mr-3">
                            {m.nome.charAt(0)}
                          </div>
                          <p className="font-bold text-gray-900">{m.nome}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {m.telefone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={\`px-2.5 py-0.5 rounded-full text-xs font-medium border \${
                          m.status === 'disponivel' ? 'bg-green-100 text-green-800 border-green-200' :
                          m.status === 'em_rota' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                          'bg-gray-100 text-gray-800 border-gray-200'
                        }\`}>
                          {m.status === 'disponivel' ? 'Disponível' : m.status === 'em_rota' ? 'Em Rota' : 'Folga'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {osAtual ? (
                          <span className="font-mono font-medium text-brand-primary bg-brand-primary/10 px-2 py-1 rounded">{osAtual}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-brand-secondary hover:text-brand-primary">Editar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={\`Cadastrar \${activeTab === 'veiculos' ? 'Veículo' : 'Motorista'}\`}>
        <div className="p-4 text-center text-gray-500">
          <p>Formulário de cadastro em construção para a próxima versão.</p>
          <button 
            onClick={() => setModalOpen(false)}
            className="mt-4 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>
      </Modal>
    </div>
  );
};
`;

writeFile('src/pages/logistica/Dashboard.tsx', dashboardStr);
writeFile('src/pages/logistica/GestaoFrota.tsx', frotaStr);

console.log("Scaffold step 5 complete");
