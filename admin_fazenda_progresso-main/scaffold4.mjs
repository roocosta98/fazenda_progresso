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

const appContextStr = `import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { 
  SolicitacaoTransporte, 
  StatusSolicitacao, 
  NotificacaoSimulada,
  Projeto,
  Veiculo,
  Motorista
} from '../types';
import { MOCK_SOLICITACOES, MOCK_VEICULOS, MOCK_MOTORISTAS, MOCK_PROJETOS } from '../mock/data';

interface AppContextType {
  solicitacoes: SolicitacaoTransporte[];
  notificacoes: NotificacaoSimulada[];
  projetos: Projeto[];
  veiculos: Veiculo[];
  motoristas: Motorista[];
  criarSolicitacao: (dados: Omit<SolicitacaoTransporte, 'id' | 'numeroOS' | 'status' | 'dataSolicitacao'>) => void;
  aprovarEAgendarSolicitacao: (idOS: string, veiculoId: string, motoristaId: string, horarioConfirmado?: string) => void;
  reagendarSolicitacao: (idOS: string, novaData: string, novoHorario: string, observacaoLogistica: string) => void;
  cancelarSolicitacao: (idOS: string, motivo: string) => void;
  filtrarSolicitacoes: (filtros: { status?: StatusSolicitacao, projetoId?: string, busca?: string }) => SolicitacaoTransporte[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoTransporte[]>(MOCK_SOLICITACOES);
  const [notificacoes, setNotificacoes] = useState<NotificacaoSimulada[]>([]);
  const [projetos] = useState<Projeto[]>(MOCK_PROJETOS);
  const [veiculos] = useState<Veiculo[]>(MOCK_VEICULOS);
  const [motoristas] = useState<Motorista[]>(MOCK_MOTORISTAS);

  const gerarNumeroOS = useCallback(() => {
    const ano = new Date().getFullYear();
    const count = solicitacoes.length + 1;
    return \`OS-\${ano}-\${count.toString().padStart(4, '0')}\`;
  }, [solicitacoes]);

  const criarSolicitacao = (dados: Omit<SolicitacaoTransporte, 'id' | 'numeroOS' | 'status' | 'dataSolicitacao'>) => {
    const novaSolicitacao: SolicitacaoTransporte = {
      ...dados,
      id: \`SOL-\${Date.now()}\`,
      numeroOS: gerarNumeroOS(),
      status: 'pendente',
      dataSolicitacao: new Date().toISOString()
    };
    setSolicitacoes(prev => [novaSolicitacao, ...prev]);
  };

  const aprovarEAgendarSolicitacao = (idOS: string, veiculoId: string, motoristaId: string, horarioConfirmado?: string) => {
    const veiculo = veiculos.find(v => v.id === veiculoId);
    const motorista = motoristas.find(m => m.id === motoristaId);
    
    if (!veiculo || !motorista) return;

    setSolicitacoes(prev => prev.map(sol => {
      if (sol.numeroOS === idOS) {
        return {
          ...sol,
          status: 'agendada',
          veiculoAlocado: veiculo,
          motoristaAlocado: motorista,
          ...(horarioConfirmado && { horarioProgramado: horarioConfirmado })
        };
      }
      return sol;
    }));

    const novaNotif: NotificacaoSimulada = {
      id: \`NOT-\${Date.now()}\`,
      mensagem: \`A OS \${idOS} foi agendada. Motorista \${motorista.nome} e veículo \${veiculo.placa} alocados.\`,
      data: new Date().toISOString(),
      lida: false,
      tipo: 'whatsapp'
    };
    setNotificacoes(prev => [novaNotif, ...prev]);
  };

  const reagendarSolicitacao = (idOS: string, novaData: string, novoHorario: string, observacaoLogistica: string) => {
    setSolicitacoes(prev => prev.map(sol => {
      if (sol.numeroOS === idOS) {
        return {
          ...sol,
          dataProgramada: novaData,
          horarioProgramado: novoHorario,
          observacaoLogistica: sol.observacaoLogistica 
            ? \`\${sol.observacaoLogistica}\\n\${observacaoLogistica}\`
            : observacaoLogistica
        };
      }
      return sol;
    }));
  };

  const cancelarSolicitacao = (idOS: string, motivo: string) => {
    setSolicitacoes(prev => prev.map(sol => {
      if (sol.numeroOS === idOS) {
        return {
          ...sol,
          status: 'cancelada',
          motivoCancelamento: motivo
        };
      }
      return sol;
    }));
  };

  const filtrarSolicitacoes = (filtros: { status?: StatusSolicitacao, projetoId?: string, busca?: string }) => {
    return solicitacoes.filter(sol => {
      let matches = true;
      if (filtros.status && sol.status !== filtros.status) matches = false;
      if (filtros.projetoId && sol.projeto.id !== filtros.projetoId) matches = false;
      if (filtros.busca) {
        const query = filtros.busca.toLowerCase();
        if (!sol.numeroOS.toLowerCase().includes(query) && 
            !sol.tipoServico.toLowerCase().includes(query) &&
            !sol.destino.toLowerCase().includes(query)) {
          matches = false;
        }
      }
      return matches;
    });
  };

  return (
    <AppContext.Provider value={{
      solicitacoes,
      notificacoes,
      projetos,
      veiculos,
      motoristas,
      criarSolicitacao,
      aprovarEAgendarSolicitacao,
      reagendarSolicitacao,
      cancelarSolicitacao,
      filtrarSolicitacoes
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
`;

const aprovarModalStr = `import { useState, useEffect } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Badge } from '../../../components/common/Badge';
import { useAppContext } from '../../../context/AppContext';
import { MapPin, Calendar, Clock, Truck, User as UserIcon, MessageSquare } from 'lucide-react';
import type { SolicitacaoTransporte } from '../../../types';

interface AprovarSolicitacaoModalProps {
  solicitacao: SolicitacaoTransporte | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const AprovarSolicitacaoModal = ({ solicitacao, isOpen, onClose, onSuccess }: AprovarSolicitacaoModalProps) => {
  const { veiculos, motoristas, aprovarEAgendarSolicitacao, reagendarSolicitacao, cancelarSolicitacao } = useAppContext();
  const [activeTab, setActiveTab] = useState<'alocar' | 'reagendar' | 'cancelar'>('alocar');

  // Alocação form
  const [veiculoId, setVeiculoId] = useState('');
  const [motoristaId, setMotoristaId] = useState('');
  const [horarioConfirmado, setHorarioConfirmado] = useState('');

  // Reagendar form
  const [novaData, setNovaData] = useState('');
  const [novoHorario, setNovoHorario] = useState('');
  const [observacaoLogistica, setObservacaoLogistica] = useState('');

  // Cancelar form
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  useEffect(() => {
    if (solicitacao) {
      setHorarioConfirmado(solicitacao.horarioProgramado || '');
      setNovaData(solicitacao.dataProgramada || '');
      setNovoHorario(solicitacao.horarioProgramado || '');
    }
  }, [solicitacao]);

  const handleAlocar = () => {
    if (!solicitacao || !veiculoId || !motoristaId) return;
    aprovarEAgendarSolicitacao(solicitacao.numeroOS, veiculoId, motoristaId, horarioConfirmado);
    onSuccess(\`\${solicitacao.numeroOS} Aprovada! Integrada ao Sankhya e notificação enviada ao motorista via WhatsApp.\`);
    onClose();
  };

  const handleReagendar = () => {
    if (!solicitacao || !novaData || !observacaoLogistica) return;
    reagendarSolicitacao(solicitacao.numeroOS, novaData, novoHorario, observacaoLogistica);
    onSuccess(\`\${solicitacao.numeroOS} Reagendada! Notificação enviada ao solicitante.\`);
    onClose();
  };

  const handleCancelar = () => {
    if (!solicitacao || !motivoCancelamento) return;
    cancelarSolicitacao(solicitacao.numeroOS, motivoCancelamento);
    onSuccess(\`\${solicitacao.numeroOS} Cancelada com sucesso.\`);
    onClose();
  };

  if (!solicitacao) return null;

  // Filtrar veículos pelo tipo da solicitação
  const veiculosCompativeis = veiculos.filter(v => v.tipo === solicitacao.tipoServico);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Análise Logística" maxWidth="max-w-4xl">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Coluna Esquerda: Resumo do Pedido */}
        <div className="md:w-1/3 bg-gray-50 p-4 rounded-lg border border-gray-100 flex flex-col space-y-4">
          <div className="flex justify-between items-start">
            <h4 className="font-bold text-gray-900">{solicitacao.numeroOS}</h4>
            <Badge status={solicitacao.status} />
          </div>
          
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Solicitante</p>
            <p className="text-sm font-medium text-gray-900">{solicitacao.solicitante.nome}</p>
            <p className="text-xs text-gray-500">{solicitacao.solicitante.departamento}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Serviço</p>
            <p className="text-sm font-medium text-gray-900 flex items-center">
              <Truck size={14} className="mr-1" /> {solicitacao.tipoServico}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Rota</p>
            <p className="text-sm font-medium text-gray-900 flex items-center">
              <MapPin size={14} className="mr-1" /> {solicitacao.origem} &rarr; {solicitacao.destino}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Data/Hora Desejada</p>
            <p className="text-sm font-medium text-gray-900 flex items-center">
              <Calendar size={14} className="mr-1" />
              {solicitacao.dataProgramada ? new Date(solicitacao.dataProgramada).toLocaleDateString('pt-BR') : '-'}
              {solicitacao.horarioProgramado && \` às \${solicitacao.horarioProgramado}\`}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Projeto</p>
            <p className="text-sm font-medium text-gray-900">{solicitacao.projeto.nome}</p>
            <p className="text-xs text-gray-500">{solicitacao.projeto.centroCusto}</p>
          </div>

          {solicitacao.observacoes && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Observações</p>
              <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200 mt-1">
                {solicitacao.observacoes}
              </p>
            </div>
          )}
        </div>

        {/* Coluna Direita: Ações */}
        <div className="md:w-2/3 flex flex-col">
          <div className="flex border-b border-gray-200 mb-4">
            <button
              onClick={() => setActiveTab('alocar')}
              className={\`px-4 py-2 text-sm font-medium border-b-2 transition-colors \${activeTab === 'alocar' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}\`}
            >
              Alocar & Confirmar
            </button>
            <button
              onClick={() => setActiveTab('reagendar')}
              className={\`px-4 py-2 text-sm font-medium border-b-2 transition-colors \${activeTab === 'reagendar' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}\`}
            >
              Reagendar
            </button>
            <button
              onClick={() => setActiveTab('cancelar')}
              className={\`px-4 py-2 text-sm font-medium border-b-2 transition-colors \${activeTab === 'cancelar' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}\`}
            >
              Recusar / Cancelar
            </button>
          </div>

          {activeTab === 'alocar' && (
            <div className="flex-1 flex flex-col space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Veículo</label>
                <select
                  value={veiculoId}
                  onChange={(e) => setVeiculoId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                >
                  <option value="">Selecione um veículo compatível...</option>
                  {veiculosCompativeis.map(v => (
                    <option key={v.id} value={v.id} disabled={v.status === 'manutencao'}>
                      {v.placa} - {v.modelo} ({v.status})
                    </option>
                  ))}
                </select>
                {veiculosCompativeis.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Nenhum veículo compatível encontrado para {solicitacao.tipoServico}.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Motorista</label>
                <select
                  value={motoristaId}
                  onChange={(e) => setMotoristaId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                >
                  <option value="">Selecione um motorista...</option>
                  {motoristas.map(m => (
                    <option key={m.id} value={m.id} disabled={m.status === 'folga'}>
                      {m.nome} ({m.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Horário de Chegada/Saída</label>
                <input
                  type="time"
                  value={horarioConfirmado}
                  onChange={(e) => setHorarioConfirmado(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                />
              </div>

              <div className="mt-auto pt-4 flex justify-end">
                <button
                  onClick={handleAlocar}
                  disabled={!veiculoId || !motoristaId}
                  className="bg-brand-primary text-white px-6 py-2 rounded-md font-medium hover:bg-brand-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Aprovar e Disparar Sankhya / WhatsApp
                </button>
              </div>
            </div>
          )}

          {activeTab === 'reagendar' && (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nova Data</label>
                  <input
                    type="date"
                    value={novaData}
                    onChange={(e) => setNovaData(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Novo Horário</label>
                  <input
                    type="time"
                    value={novoHorario}
                    onChange={(e) => setNovoHorario(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Justificativa para o Solicitante</label>
                <textarea
                  value={observacaoLogistica}
                  onChange={(e) => setObservacaoLogistica(e.target.value)}
                  placeholder="Por que a data/horário precisou ser alterada?"
                  rows={4}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary resize-none"
                ></textarea>
              </div>

              <div className="mt-auto pt-4 flex justify-end">
                <button
                  onClick={handleReagendar}
                  disabled={!novaData || !observacaoLogistica}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar Reagendamento
                </button>
              </div>
            </div>
          )}

          {activeTab === 'cancelar' && (
            <div className="flex-1 flex flex-col space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo do Cancelamento</label>
                <textarea
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  placeholder="Justificativa oficial para o cancelamento da OS..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary resize-none"
                ></textarea>
              </div>

              <div className="mt-auto pt-4 flex justify-end">
                <button
                  onClick={handleCancelar}
                  disabled={!motivoCancelamento}
                  className="bg-red-600 text-white px-6 py-2 rounded-md font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar OS
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
`;

const filaPendentesStr = `import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import { AprovarSolicitacaoModal } from './components/AprovarSolicitacaoModal';
import { Clock, CheckCircle2, Truck, User as UserIcon, Calendar, Search } from 'lucide-react';
import type { SolicitacaoTransporte } from '../../types';

export const FilaPendentes = () => {
  const { solicitacoes, veiculos, motoristas } = useAppContext();
  
  const pendentes = solicitacoes.filter(s => s.status === 'pendente');
  const agendadasHoje = solicitacoes.filter(s => s.status === 'agendada' && s.dataProgramada === new Date().toISOString().split('T')[0]);
  const veiculosLivres = veiculos.filter(v => v.status === 'disponivel').length;
  const motoristasLivres = motoristas.filter(m => m.status === 'disponivel').length;

  const [busca, setBusca] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [solicitacaoEmAnalise, setSolicitacaoEmAnalise] = useState<SolicitacaoTransporte | null>(null);
  
  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleAnalise = (solicitacao: SolicitacaoTransporte) => {
    setSolicitacaoEmAnalise(solicitacao);
    setModalOpen(true);
  };

  const handleSuccess = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 5000); // hide after 5s
  };

  const filteredPendentes = pendentes.filter(s => 
    s.numeroOS.toLowerCase().includes(busca.toLowerCase()) || 
    s.tipoServico.toLowerCase().includes(busca.toLowerCase()) ||
    s.projeto.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-3 animate-fade-in-up">
          <CheckCircle2 className="text-green-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-900">Fila de Solicitações</h2>
        <p className="text-gray-500 mt-1">Gerencie, aprove e aloque recursos para os chamados pendentes.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center space-x-4">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Pendentes</p>
            <p className="text-2xl font-bold text-gray-900">{pendentes.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Agendadas (Hoje)</p>
            <p className="text-2xl font-bold text-gray-900">{agendadasHoje.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center space-x-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg">
            <Truck size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Veículos Livres</p>
            <p className="text-2xl font-bold text-gray-900">{veiculosLivres}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center space-x-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
            <UserIcon size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Motoristas Livres</p>
            <p className="text-2xl font-bold text-gray-900">{motoristasLivres}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por OS, serviço ou projeto..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary"
          />
        </div>
      </div>

      {/* Tabela de Pendentes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OS</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitante</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serviço & Rota</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projeto / C. Custo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data / Hora</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPendentes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <CheckCircle2 size={48} className="text-green-200 mb-2" />
                      <p className="text-lg font-medium text-gray-900">Fila Limpa!</p>
                      <p>Não há solicitações pendentes de aprovação no momento.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPendentes.map(sol => (
                  <tr key={sol.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-medium text-gray-900">{sol.numeroOS}</span>
                      <div className="mt-1"><Badge status={sol.status} /></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{sol.solicitante.nome}</div>
                      <div className="text-xs text-gray-500">{sol.solicitante.departamento}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 flex items-center">
                        <Truck size={14} className="mr-1 text-brand-secondary" /> {sol.tipoServico}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {sol.origem} &rarr; {sol.destino}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{sol.projeto.nome}</div>
                      <div className="text-xs text-gray-500 mt-1">{sol.projeto.centroCusto}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">
                        {sol.dataProgramada ? new Date(sol.dataProgramada).toLocaleDateString('pt-BR') : '-'}
                      </div>
                      {sol.horarioProgramado && (
                        <div className="text-xs text-gray-500 mt-1 flex items-center">
                          <Clock size={12} className="mr-1" /> {sol.horarioProgramado}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleAnalise(sol)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
                      >
                        Analisar / Agendar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AprovarSolicitacaoModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        solicitacao={solicitacaoEmAnalise} 
        onSuccess={handleSuccess}
      />
    </div>
  );
};
`;

writeFile('src/context/AppContext.tsx', appContextStr);
writeFile('src/pages/logistica/components/AprovarSolicitacaoModal.tsx', aprovarModalStr);
writeFile('src/pages/logistica/FilaPendentes.tsx', filaPendentesStr);

// Let's add the basic animation css to index.css
let indexCss = fs.readFileSync(path.join(__dirname, 'src/index.css'), 'utf8');
if (!indexCss.includes('@keyframes fade-in-up')) {
  indexCss += `\n@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
  animation: fade-in-up 0.3s ease-out forwards;
}
`;
  writeFile('src/index.css', indexCss);
}

console.log("Scaffold step 4 complete");
