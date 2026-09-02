import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SlideOverDrawer } from '../../components/common/SlideOverDrawer';
import { DataTable } from '../../components/common/DataTable';
import { NovaSolicitacaoDrawer } from './components/NovaSolicitacaoDrawer';
import { Search, MapPin, Calendar, Truck, User as UserIcon, Plus } from 'lucide-react';
import type { SolicitacaoTransporte } from '../../types';

export const MinhasSolicitacoes = () => {
  const { solicitacoes } = useAppContext();
  const { usuario } = useAuth();
  
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todas' | 'pendente' | 'agendada' | 'em_execucao' | 'concluida' | 'cancelada'>('todas');
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [novaSolOpen, setNovaSolOpen] = useState(false);
  const [selectedOS, setSelectedOS] = useState<SolicitacaoTransporte | null>(null);

  const minhasOS = solicitacoes.filter(s => s.solicitante.id === usuario?.id);
  
  const filteredOS = minhasOS.filter(s => {
    const matchesBusca = s.numeroOS.toLowerCase().includes(busca.toLowerCase()) || s.tipoServico.toLowerCase().includes(busca.toLowerCase());
    const matchesStatus = statusFiltro === 'todas' || s.status === statusFiltro;
    return matchesBusca && matchesStatus;
  });

  const handleVerDetalhes = (os: SolicitacaoTransporte) => {
    setSelectedOS(os);
    setDetalhesOpen(true);
  };

  const columns = [
    {
      header: 'OS',
      accessor: 'numeroOS' as keyof SolicitacaoTransporte,
      render: (row: SolicitacaoTransporte) => (
        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">{row.numeroOS}</span>
      )
    },
    {
      header: 'Serviço',
      accessor: 'tipoServico' as keyof SolicitacaoTransporte,
      render: (row: SolicitacaoTransporte) => (
        <span className="flex items-center text-slate-700 font-semibold text-sm">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mr-3 border border-blue-100">
            <Truck size={14} />
          </div>
          {row.tipoServico}
        </span>
      )
    },
    {
      header: 'Rota',
      render: (row: SolicitacaoTransporte) => (
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100/50 flex items-center"><MapPin size={12} className="mr-1"/> {row.origem}</span>
          <span className="text-slate-300">&rarr;</span>
          <span className="bg-rose-50 text-rose-700 px-2 py-1 rounded-md border border-rose-100/50 flex items-center"><MapPin size={12} className="mr-1"/> {row.destino}</span>
        </div>
      )
    },
    {
      header: 'Data / Hora',
      render: (row: SolicitacaoTransporte) => (
        <div className="text-slate-600">
          <div className="text-sm font-bold text-slate-700">{row.dataProgramada ? new Date(row.dataProgramada).toLocaleDateString('pt-BR') : 'Não agendado'}</div>
          {row.horarioProgramado && <div className="text-xs text-slate-400 mt-0.5 flex items-center"><Calendar size={12} className="mr-1"/> {row.horarioProgramado}</div>}
        </div>
      )
    },
    {
      header: 'Status',
      align: 'center' as const,
      render: (row: SolicitacaoTransporte) => <StatusBadge status={row.status} />
    },
    {
      header: '',
      align: 'right' as const,
      render: () => (
        <button className="text-blue-600 hover:text-blue-700 font-bold text-sm bg-blue-50 hover:bg-blue-100 px-4 py-1.5 rounded-lg transition-colors border border-blue-200">
          Detalhes
        </button>
      )
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Minhas Solicitações</h2>
            <p className="text-slate-500 mt-1 font-medium">Acompanhe o status dos seus pedidos de transporte e recursos.</p>
          </div>
          
          <button 
            onClick={() => setNovaSolOpen(true)}
            className="inline-flex justify-center items-center px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-sm hover:shadow-slate-900/20 shadow-slate-900/10 w-full sm:w-auto whitespace-nowrap"
          >
            <Plus size={18} className="mr-2" /> Nova Solicitação
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col lg:flex-row justify-between items-center gap-4">
          
          <div className="flex overflow-x-auto w-full lg:w-auto bg-slate-100/80 p-1 rounded-xl">
            {[
              { id: 'todas', label: 'Todas' },
              { id: 'pendente', label: 'Pendentes' },
              { id: 'agendada', label: 'Agendadas' },
              { id: 'em_execucao', label: 'Em Trânsito' },
              { id: 'concluida', label: 'Concluídas' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFiltro(tab.id as any)}
                className={`flex-1 lg:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${statusFiltro === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por OS, serviço..."
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 shadow-sm transition-all text-sm font-medium"
            />
          </div>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={filteredOS} 
        keyExtractor={(row) => row.id}
        onRowClick={handleVerDetalhes}
        emptyMessage="Nenhuma solicitação encontrada."
      />

      {/* Modal / Drawer para criar Nova Solicitação */}
      <NovaSolicitacaoDrawer 
        isOpen={novaSolOpen}
        onClose={() => setNovaSolOpen(false)}
        onSuccess={() => setNovaSolOpen(false)}
      />

      {/* Drawer para Detalhes */}
      <SlideOverDrawer 
        isOpen={detalhesOpen} 
        onClose={() => setDetalhesOpen(false)} 
        title={`Detalhes da OS: ${selectedOS?.numeroOS}`}
      >
        {selectedOS && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="text-slate-500 font-medium text-sm">Status Atual</span>
              <StatusBadge status={selectedOS.status} />
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 uppercase tracking-wide text-xs">Informações da Solicitação</h4>
              
              <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                <div className="flex items-start">
                  <Truck className="w-4 h-4 text-slate-400 mt-0.5 mr-3" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Serviço Solicitado</p>
                    <p className="text-slate-800 font-medium text-sm">{selectedOS.tipoServico}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 mr-3" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Rota Desejada</p>
                    <p className="text-slate-800 font-medium text-sm">{selectedOS.origem} &rarr; {selectedOS.destino}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5 mr-3" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Agendamento Solicitado</p>
                    <p className="text-slate-800 font-medium text-sm">
                      {selectedOS.dataProgramada ? new Date(selectedOS.dataProgramada).toLocaleDateString('pt-BR') : '-'} 
                      {selectedOS.horarioProgramado && ` às ${selectedOS.horarioProgramado}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {selectedOS.status !== 'pendente' && selectedOS.status !== 'cancelada' && (
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 uppercase tracking-wide text-xs">Alocação da Logística</h4>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 space-y-3">
                  <div className="flex items-start">
                    <Truck className="w-4 h-4 text-emerald-600 mt-0.5 mr-3" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 uppercase">Veículo Alocado</p>
                      <p className="text-slate-800 font-bold text-sm">{selectedOS.veiculoAlocado?.modelo} <span className="font-mono font-normal text-slate-500 text-sm bg-white px-1.5 py-0.5 rounded ml-1 border border-emerald-200">{selectedOS.veiculoAlocado?.placa}</span></p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <UserIcon className="w-4 h-4 text-emerald-600 mt-0.5 mr-3" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 uppercase">Motorista Designado</p>
                      <p className="text-slate-800 font-medium text-sm">{selectedOS.motoristaAlocado?.nome}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedOS.observacaoLogistica && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h4 className="font-bold text-blue-800 uppercase tracking-wide text-xs mb-2">Mensagem da Logística</h4>
                <p className="text-slate-700 text-sm whitespace-pre-line">{selectedOS.observacaoLogistica}</p>
              </div>
            )}
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
};
