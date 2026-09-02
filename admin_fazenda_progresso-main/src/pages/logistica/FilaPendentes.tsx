import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { AprovarSolicitacaoDrawer } from './components/AprovarSolicitacaoDrawer';
import { SlideOverDrawer } from '../../components/common/SlideOverDrawer';
import { Clock, Truck, User as UserIcon, Search, CheckCircle2, AlertTriangle, RefreshCw, Eye, MapPin, Calendar, FileText } from 'lucide-react';
import type { SolicitacaoTransporte, Veiculo, Motorista } from '../../types';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export const FilaPendentes = () => {
  const { solicitacoes, substituirMotorista, substituirVeiculo } = useAppContext();

  const [activeTab, setActiveTab] = useState<'pendentes' | 'aprovados'>('pendentes');
  const [busca, setBusca] = useState('');

  // Veículos e operadores cadastrados de verdade no banco da fazenda (Equipamentos/Operadores),
  // usados pra escolher quem alocar/trocar — não existe "disponível" real nesse schema, então
  // status aqui é só um placeholder pro tipo bater; quem decide a disponibilidade é o usuário.
  const [equipamentosReais, setEquipamentosReais] = useState<Veiculo[]>([]);
  const [operadoresReais, setOperadoresReais] = useState<Motorista[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/frota/equipamentos`)
      .then((r) => r.json())
      .then((data: Array<{ EquipamentoId: number; CodigoEquipamento: string; Nome: string; TipoEquipamento: string | null }>) => {
        setEquipamentosReais(data.map((eq) => ({
          id: String(eq.EquipamentoId),
          placa: eq.CodigoEquipamento,
          modelo: eq.Nome,
          tipo: eq.TipoEquipamento ?? '—',
          status: 'disponivel',
        })));
      })
      .catch((error) => console.error('Erro ao buscar Equipamentos:', error));

    fetch(`${API_URL}/api/frota/operadores`)
      .then((r) => r.json())
      .then((data: Array<{ OperadorId: number; Nome: string }>) => {
        setOperadoresReais(data.map((op) => ({
          id: String(op.OperadorId),
          nome: op.Nome,
          telefone: '',
          status: 'disponivel',
        })));
      })
      .catch((error) => console.error('Erro ao buscar Operadores:', error));
  }, []);

  const pendentes = solicitacoes.filter(s => s.status === 'pendente');
  const aprovados = solicitacoes.filter(s => s.status === 'agendada' || s.status === 'em_execucao' || s.status === 'concluida');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [solicitacaoEmAnalise, setSolicitacaoEmAnalise] = useState<SolicitacaoTransporte | null>(null);
  const [solicitacaoVisualizar, setSolicitacaoVisualizar] = useState<SolicitacaoTransporte | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal para Trocar Motorista de OS Aprovada com Justificativa
  const [substituirModal, setSubstituirModal] = useState<{ open: boolean; os: SolicitacaoTransporte | null }>({ open: false, os: null });
  const [novoMotoristaId, setNovoMotoristaId] = useState('');
  const [justificativaTroca, setJustificativaTroca] = useState('');

  // Modal para Trocar Veículo de OS Agendada / Em Execução com Justificativa Obrigatoria
  const [substituirVeiculoModal, setSubstituirVeiculoModal] = useState<{ open: boolean; os: SolicitacaoTransporte | null }>({ open: false, os: null });
  const [novoVeiculoId, setNovoVeiculoId] = useState('');
  const [justificativaTrocaVeiculo, setJustificativaTrocaVeiculo] = useState('');

  const handleAnalise = (solicitacao: SolicitacaoTransporte) => {
    setSolicitacaoEmAnalise(solicitacao);
    setDrawerOpen(true);
  };

  const handleVerDetalhes = (solicitacao: SolicitacaoTransporte) => {
    setSolicitacaoVisualizar(solicitacao);
    setDetalhesOpen(true);
  };

  const handleSuccess = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 5000); 
  };

  const handleConfirmarTrocaMotorista = () => {
    const motorista = operadoresReais.find((op) => op.id === novoMotoristaId);
    if (substituirModal.os && motorista && justificativaTroca.trim()) {
      substituirMotorista(substituirModal.os.numeroOS, motorista, justificativaTroca.trim());
      setSubstituirModal({ open: false, os: null });
      setNovoMotoristaId('');
      setJustificativaTroca('');
      handleSuccess(`Motorista da OS ${substituirModal.os.numeroOS} trocado com sucesso! Notificações enviadas.`);
    }
  };

  const handleConfirmarTrocaVeiculo = () => {
    const veiculo = equipamentosReais.find((eq) => eq.id === novoVeiculoId);
    if (substituirVeiculoModal.os && veiculo && justificativaTrocaVeiculo.trim()) {
      substituirVeiculo(substituirVeiculoModal.os.numeroOS, veiculo, justificativaTrocaVeiculo.trim());
      setSubstituirVeiculoModal({ open: false, os: null });
      setNovoVeiculoId('');
      setJustificativaTrocaVeiculo('');
      handleSuccess(`Veículo da OS ${substituirVeiculoModal.os.numeroOS} substituído com sucesso! Notificação enviada.`);
    }
  };

  const listData = activeTab === 'pendentes' ? pendentes : aprovados;

  const filteredData = listData.filter(s => 
    s.numeroOS.toLowerCase().includes(busca.toLowerCase()) || 
    s.tipoServico.toLowerCase().includes(busca.toLowerCase()) ||
    s.projeto.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (s.motoristaAlocado && s.motoristaAlocado.nome.toLowerCase().includes(busca.toLowerCase()))
  );

  const columnsPendentes = [
    {
      header: 'OS',
      accessor: 'numeroOS' as keyof SolicitacaoTransporte,
      render: (row: SolicitacaoTransporte) => (
        <div>
          <span className="font-bold text-slate-800">{row.numeroOS}</span>
          <div className="mt-1"><StatusBadge status={row.status} /></div>
        </div>
      )
    },
    {
      header: 'Solicitante',
      render: (row: SolicitacaoTransporte) => (
        <div>
          <div className="font-bold text-slate-800">{row.solicitante.nome}</div>
          <div className="text-xs text-slate-500">{row.solicitante.departamento}</div>
        </div>
      )
    },
    {
      header: 'Serviço & Rota',
      render: (row: SolicitacaoTransporte) => (
        <div>
          <div className="font-medium text-slate-800 flex items-center">
            <Truck size={14} className="mr-1 text-emerald-600" /> {row.tipoServico}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {row.origem} &rarr; {row.destino}
          </div>
        </div>
      )
    },
    {
      header: 'Projeto',
      render: (row: SolicitacaoTransporte) => (
        <div>
          <div className="text-sm font-medium text-slate-800">{row.projeto.nome}</div>
          <div className="text-xs text-slate-500 mt-0.5">{row.projeto.centroCusto}</div>
        </div>
      )
    },
    {
      header: 'Data / Hora',
      render: (row: SolicitacaoTransporte) => (
        <div>
          <div className="text-sm text-slate-800 font-medium">
            {row.dataProgramada ? new Date(row.dataProgramada).toLocaleDateString('pt-BR') : '-'}
          </div>
          {row.horarioProgramado && (
            <div className="text-xs text-slate-500 mt-0.5 flex items-center">
              <Clock size={12} className="mr-1" /> {row.horarioProgramado}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Ação',
      align: 'right' as const,
      render: (row: SolicitacaoTransporte) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleAnalise(row); }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-lg shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
        >
          Analisar
        </button>
      )
    }
  ];

  const columnsAprovados = [
    {
      header: 'OS',
      accessor: 'numeroOS' as keyof SolicitacaoTransporte,
      render: (row: SolicitacaoTransporte) => (
        <div>
          <span className="font-bold text-slate-800">{row.numeroOS}</span>
          <div className="mt-1"><StatusBadge status={row.status} /></div>
        </div>
      )
    },
    {
      header: 'Serviço & Rota',
      render: (row: SolicitacaoTransporte) => (
        <div>
          <div className="font-medium text-slate-800 flex items-center">
            <Truck size={14} className="mr-1 text-emerald-600" /> {row.tipoServico}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {row.origem} &rarr; {row.destino}
          </div>
        </div>
      )
    },
    {
      header: 'Veículo Alocado',
      render: (row: SolicitacaoTransporte) => row.veiculoAlocado ? (
        <div>
          <div className="font-bold text-slate-800">{row.veiculoAlocado.modelo}</div>
          <div className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 w-fit mt-0.5">{row.veiculoAlocado.placa}</div>
        </div>
      ) : <span className="text-slate-400 font-medium">-</span>
    },
    {
      header: 'Motorista Alocado',
      render: (row: SolicitacaoTransporte) => (
        <div className="flex items-center justify-between group/mot pr-2">
          <div>
            <div className="font-bold text-slate-800 flex items-center text-xs">
              <UserIcon size={13} className="mr-1.5 text-blue-600 shrink-0" /> {row.motoristaAlocado?.nome || 'Não atribuído'}
            </div>
            {row.motoristaAlocado?.telefone && (
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">{row.motoristaAlocado.telefone}</div>
            )}
          </div>
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              setSubstituirModal({ open: true, os: row });
            }}
            title="Trocar Motorista"
            className="p-1.5 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all border border-blue-200/60 flex items-center shrink-0 ml-2"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      )
    },
    {
      header: 'Data Programada',
      render: (row: SolicitacaoTransporte) => (
        <div>
          <div className="text-xs text-slate-800 font-bold">
            {row.dataProgramada ? new Date(row.dataProgramada).toLocaleDateString('pt-BR') : '-'}
          </div>
          {row.horarioProgramado && (
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center">
              <Clock size={11} className="mr-1 text-slate-400" /> {row.horarioProgramado}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Ações',
      align: 'right' as const,
      render: (row: SolicitacaoTransporte) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleVerDetalhes(row);
          }}
          className="inline-flex items-center px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
        >
          <Eye size={13} className="mr-1.5 text-slate-300" /> Ver Detalhes
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 animate-fade-in-up border border-slate-700">
          <CheckCircle2 className="text-emerald-400" />
          <span className="font-medium tracking-wide">{toastMessage}</span>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Fila de Aprovação Operacional</h2>
        <p className="text-slate-500 mt-1">Gerencie, aprove, aloque recursos e acompanhe os chamados aprovados.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pendentes" value={pendentes.length} icon={<Clock size={24} />} colorClass="text-amber-600 bg-amber-500" />
        <StatCard title="Aprovados / Agendados" value={aprovados.length} icon={<CheckCircle2 size={24} />} colorClass="text-emerald-600 bg-emerald-500" />
        <StatCard title="Veículos Cadastrados" value={equipamentosReais.length} icon={<Truck size={24} />} colorClass="text-blue-600 bg-blue-500" />
        <StatCard title="Operadores Cadastrados" value={operadoresReais.length} icon={<UserIcon size={24} />} colorClass="text-indigo-600 bg-indigo-500" />
      </div>

      {/* Seletor de Abas: Pendentes x Aprovados */}
      <div className="bg-white p-2 rounded-2xl shadow-soft border border-slate-200/80 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab('pendentes')}
            className={`flex-1 md:flex-none px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === 'pendentes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Pendentes de Análise ({pendentes.length})
          </button>
          <button
            onClick={() => setActiveTab('aprovados')}
            className={`flex-1 md:flex-none px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === 'aprovados' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Aprovados & Agendados ({aprovados.length})
          </button>
        </div>

        {/* Campo de Pesquisa */}
        <div className="relative w-full md:w-80 px-2">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400" />
          </div>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por OS, serviço ou projeto..."
            className="block w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50 text-xs font-medium transition-all"
          />
        </div>
      </div>

      {activeTab === 'pendentes' ? (
        <DataTable 
          columns={columnsPendentes} 
          data={filteredData} 
          keyExtractor={(row) => row.id}
          onRowClick={handleAnalise}
          emptyMessage="Fila Limpa! Não há solicitações pendentes no momento."
        />
      ) : (
        <DataTable 
          columns={columnsAprovados} 
          data={filteredData} 
          keyExtractor={(row) => row.id}
          onRowClick={handleVerDetalhes}
          emptyMessage="Nenhuma solicitação aprovada encontrada."
        />
      )}

      {/* Drawer de Visualização de Detalhes da OS Aprovada */}
      <SlideOverDrawer 
        isOpen={detalhesOpen} 
        onClose={() => setDetalhesOpen(false)} 
        title={`Detalhes da OS: ${solicitacaoVisualizar?.numeroOS}`}
      >
        {solicitacaoVisualizar && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="text-slate-500 font-medium text-sm">Status Atual</span>
              <StatusBadge status={solicitacaoVisualizar.status} />
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 uppercase tracking-wide text-xs">Informações Gerais</h4>
              
              <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                <div className="flex items-start">
                  <UserIcon className="w-4 h-4 text-slate-400 mt-0.5 mr-3" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Solicitante</p>
                    <p className="text-slate-800 font-bold text-sm">{solicitacaoVisualizar.solicitante.nome} <span className="text-slate-400 font-normal">({solicitacaoVisualizar.solicitante.departamento})</span></p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Truck className="w-4 h-4 text-slate-400 mt-0.5 mr-3" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Serviço Solicitado</p>
                    <p className="text-slate-800 font-medium text-sm">{solicitacaoVisualizar.tipoServico}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 mr-3" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Rota Desejada</p>
                    <p className="text-slate-800 font-medium text-sm">{solicitacaoVisualizar.origem} &rarr; {solicitacaoVisualizar.destino}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5 mr-3" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Agendamento Solicitado</p>
                    <p className="text-slate-800 font-medium text-sm">
                      {solicitacaoVisualizar.dataProgramada ? new Date(solicitacaoVisualizar.dataProgramada).toLocaleDateString('pt-BR') : '-'} 
                      {solicitacaoVisualizar.horarioProgramado && ` às ${solicitacaoVisualizar.horarioProgramado}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 uppercase tracking-wide text-xs">Alocação da Logística</h4>
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <Truck className="w-4 h-4 text-emerald-600 mt-0.5 mr-3" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 uppercase">Veículo Alocado</p>
                      <p className="text-slate-800 font-bold text-sm">
                        {solicitacaoVisualizar.veiculoAlocado?.modelo || 'N/A'} 
                        {solicitacaoVisualizar.veiculoAlocado?.placa && (
                          <span className="font-mono font-normal text-slate-500 text-sm bg-white px-1.5 py-0.5 rounded ml-1.5 border border-emerald-200">
                            {solicitacaoVisualizar.veiculoAlocado.placa}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setDetalhesOpen(false);
                      setSubstituirVeiculoModal({ open: true, os: solicitacaoVisualizar });
                    }}
                    className="text-xs font-bold text-emerald-700 hover:underline flex items-center bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-sm"
                  >
                    <RefreshCw size={12} className="mr-1" /> Trocar Veículo
                  </button>
                </div>
                <div className="flex items-start justify-between pt-2 border-t border-emerald-100">
                  <div className="flex items-start">
                    <UserIcon className="w-4 h-4 text-emerald-600 mt-0.5 mr-3" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 uppercase">Motorista Designado</p>
                      <p className="text-slate-800 font-medium text-sm">{solicitacaoVisualizar.motoristaAlocado?.nome || 'Não atribuído'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setDetalhesOpen(false);
                      setSubstituirModal({ open: true, os: solicitacaoVisualizar });
                    }}
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-sm"
                  >
                    <RefreshCw size={12} className="mr-1" /> Trocar Motorista
                  </button>
                </div>
              </div>
            </div>

            {solicitacaoVisualizar.observacoes && (
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-4">
                <h4 className="font-bold text-slate-700 uppercase tracking-wide text-xs mb-1 flex items-center">
                  <FileText size={13} className="mr-1.5" /> Observações do Solicitante
                </h4>
                <p className="text-slate-700 text-sm italic">"{solicitacaoVisualizar.observacoes}"</p>
              </div>
            )}

            {solicitacaoVisualizar.observacaoLogistica && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h4 className="font-bold text-blue-800 uppercase tracking-wide text-xs mb-1">Mensagem da Logística</h4>
                <p className="text-slate-700 text-sm whitespace-pre-line">{solicitacaoVisualizar.observacaoLogistica}</p>
              </div>
            )}
          </div>
        )}
      </SlideOverDrawer>

      {/* Drawer de Aprovação de Pendentes */}
      <AprovarSolicitacaoDrawer 
        isOpen={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        solicitacao={solicitacaoEmAnalise} 
        onSuccess={handleSuccess}
      />

      {/* Modal de Troca de Motorista com Justificativa Obrigatoria */}
      <Modal 
        isOpen={substituirModal.open} 
        onClose={() => { setSubstituirModal({ open: false, os: null }); setNovoMotoristaId(''); setJustificativaTroca(''); }} 
        title="Trocar Motorista de OS Aprovada"
      >
        <div className="p-6 space-y-5">
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-start space-x-3">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-bold text-slate-800">Troca de Motorista em OS Aprovada</p>
              <p className="text-xs text-slate-600 mt-1">
                Substituição do motorista na <strong>{substituirModal.os?.numeroOS}</strong> ({substituirModal.os?.tipoServico}). 
                É necessário informar o motivo da alteração.
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Novo Operador (cadastrado na fazenda) <span className="text-red-500">*</span>
            </label>
            <select
              value={novoMotoristaId}
              onChange={(e) => setNovoMotoristaId(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all bg-white text-sm shadow-sm font-medium appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1.2em] bg-[right_1rem_center] bg-no-repeat"
            >
              <option value="">Selecione o novo operador...</option>
              {operadoresReais
                .filter(op => op.id !== substituirModal.os?.motoristaAlocado?.id)
                .map(op => (
                  <option key={op.id} value={op.id}>{op.nome}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Justificativa da Troca <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Ex: Motorista anterior em atestado médico / Remanejamento emergencial de escala..."
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 resize-none shadow-sm font-medium text-slate-800"
              value={justificativaTroca}
              onChange={(e) => setJustificativaTroca(e.target.value)}
            ></textarea>
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button 
              type="button"
              onClick={() => { setSubstituirModal({ open: false, os: null }); setNovoMotoristaId(''); setJustificativaTroca(''); }}
              className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmarTrocaMotorista}
              disabled={!novoMotoristaId || !justificativaTroca.trim()}
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center"
            >
              <RefreshCw size={15} className="mr-2" /> Confirmar Troca
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Troca de Veículo com Justificativa Obrigatoria */}
      <Modal 
        isOpen={substituirVeiculoModal.open} 
        onClose={() => { setSubstituirVeiculoModal({ open: false, os: null }); setNovoVeiculoId(''); setJustificativaTrocaVeiculo(''); }} 
        title="Trocar Veículo de OS Agendada"
      >
        <div className="p-6 space-y-5">
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 flex items-start space-x-3">
            <Truck className="text-emerald-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-bold text-slate-800">Troca de Veículo na Operação</p>
              <p className="text-xs text-slate-600 mt-1">
                Substituição do veículo alocado na <strong>{substituirVeiculoModal.os?.numeroOS}</strong> ({substituirVeiculoModal.os?.tipoServico}). 
                É necessário registrar a justificativa operacional.
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Novo Veículo (cadastrado na fazenda) <span className="text-red-500">*</span>
            </label>
            <select
              value={novoVeiculoId}
              onChange={(e) => setNovoVeiculoId(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all bg-white text-sm shadow-sm font-medium appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1.2em] bg-[right_1rem_center] bg-no-repeat"
            >
              <option value="">Selecione o novo veículo...</option>
              {equipamentosReais
                .filter(v => v.id !== substituirVeiculoModal.os?.veiculoAlocado?.id)
                .map(v => (
                  <option key={v.id} value={v.id}>
                    {v.placa} - {v.modelo} ({v.tipo})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Justificativa Obrigatória da Troca <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Ex: Veículo anterior apresentou falha mecânica / Remanejamento por prioridade de carga..."
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 resize-none shadow-sm font-medium text-slate-800"
              value={justificativaTrocaVeiculo}
              onChange={(e) => setJustificativaTrocaVeiculo(e.target.value)}
            ></textarea>
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button 
              type="button"
              onClick={() => { setSubstituirVeiculoModal({ open: false, os: null }); setNovoVeiculoId(''); setJustificativaTrocaVeiculo(''); }}
              className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmarTrocaVeiculo}
              disabled={!novoVeiculoId || !justificativaTrocaVeiculo.trim()}
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center"
            >
              <RefreshCw size={15} className="mr-2" /> Confirmar Troca de Veículo
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
