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

// 1. Update AppContext to export projetos
let appContext = fs.readFileSync(path.join(__dirname, 'src/context/AppContext.tsx'), 'utf8');
if (!appContext.includes('projetos: Projeto[];')) {
  appContext = appContext.replace(/import \{ MOCK_SOLICITACOES, MOCK_VEICULOS, MOCK_MOTORISTAS \}/, "import { MOCK_SOLICITACOES, MOCK_VEICULOS, MOCK_MOTORISTAS, MOCK_PROJETOS }");
  appContext = appContext.replace(/StatusSolicitacao, \n  NotificacaoSimulada/, "StatusSolicitacao, \n  NotificacaoSimulada,\n  Projeto");
  appContext = appContext.replace(/notificacoes: NotificacaoSimulada\[\];/, "notificacoes: NotificacaoSimulada[];\n  projetos: Projeto[];");
  appContext = appContext.replace(/const \[notificacoes, setNotificacoes\] = useState<NotificacaoSimulada\[\]>\(\[\]\);/, "const [notificacoes, setNotificacoes] = useState<NotificacaoSimulada[]>([]);\n  const [projetos] = useState<Projeto[]>(MOCK_PROJETOS);");
  appContext = appContext.replace(/solicitacoes,\n      notificacoes,/, "solicitacoes,\n      notificacoes,\n      projetos,");
  writeFile('src/context/AppContext.tsx', appContext);
}

// 2. Create Badge component
writeFile('src/components/common/Badge.tsx', `import type { StatusSolicitacao } from '../../types';

interface BadgeProps {
  status: StatusSolicitacao;
}

const statusConfig: Record<StatusSolicitacao, { label: string; colors: string }> = {
  pendente: { label: 'Pendente', colors: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  agendada: { label: 'Agendada', colors: 'bg-blue-100 text-blue-800 border-blue-200' },
  em_execucao: { label: 'Em Execução', colors: 'bg-purple-100 text-purple-800 border-purple-200' },
  concluida: { label: 'Concluída', colors: 'bg-green-100 text-green-800 border-green-200' },
  cancelada: { label: 'Cancelada', colors: 'bg-red-100 text-red-800 border-red-200' },
};

export const Badge = ({ status }: BadgeProps) => {
  const config = statusConfig[status];
  return (
    <span className={\`px-2.5 py-0.5 rounded-full text-xs font-medium border \${config.colors}\`}>
      {config.label}
    </span>
  );
};
`);

// 3. Create Modal component
writeFile('src/components/common/Modal.tsx', `import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className={\`bg-white rounded-xl shadow-2xl w-full \${maxWidth} max-h-[90vh] flex flex-col overflow-hidden\`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};
`);

// 4. Create NovaSolicitacao page
writeFile('src/pages/solicitante/NovaSolicitacao.tsx', `import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { 
  Car, Bus, Truck, Tractor, 
  MapPin, Calendar, Clock, CheckCircle, Package
} from 'lucide-react';

const TIPOS_SERVICO = [
  { id: 'Carro Passeio', icon: Car, label: 'Carro Passeio' },
  { id: 'Utilitário', icon: Truck, label: 'Utilitário' },
  { id: 'Ônibus', icon: Bus, label: 'Ônibus' },
  { id: 'Caçamba', icon: Truck, label: 'Caçamba' },
  { id: 'Prancha', icon: Truck, label: 'Prancha' },
  { id: 'Comboio', icon: Truck, label: 'Comboio' },
  { id: 'Trator', icon: Tractor, label: 'Trator' },
];

const LOCAIS_SUGERIDOS = [
  'Sedes', 'Galpão de Insumos', 'Lote 12', 'Pátio de Máquinas', 'Campo de Batata', 'Safra Leste', 'Pedreira'
];

export const NovaSolicitacao = () => {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { projetos, criarSolicitacao, solicitacoes } = useAppContext();

  const [tipoServico, setTipoServico] = useState('');
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [dataProgramada, setDataProgramada] = useState('');
  const [horarioProgramado, setHorarioProgramado] = useState('');
  const [projetoId, setProjetoId] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [modalSucesso, setModalSucesso] = useState(false);
  const [ultimaOS, setUltimaOS] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario) return;
    
    const projetoSelecionado = projetos.find(p => p.id === projetoId);
    if (!projetoSelecionado || !tipoServico || !origem || !destino || !dataProgramada) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const previousLength = solicitacoes.length;
    
    criarSolicitacao({
      solicitante: usuario,
      tipoServico,
      origem,
      destino,
      dataProgramada,
      horarioProgramado,
      projeto: projetoSelecionado,
      observacoes
    });
    
    // We can predict the next OS, or better, we know AppContext creates it sequentially.
    // A quick hack for the prototype is just to calculate it here since we know the logic:
    const ano = new Date().getFullYear();
    const count = previousLength + 1;
    const osGerada = \`OS-\${ano}-\${count.toString().padStart(4, '0')}\`;
    
    setUltimaOS(osGerada);
    setModalSucesso(true);
  };

  const handleReset = () => {
    setTipoServico('');
    setOrigem('');
    setDestino('');
    setDataProgramada('');
    setHorarioProgramado('');
    setProjetoId('');
    setObservacoes('');
    setModalSucesso(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Nova Solicitação de Transporte</h2>
        <p className="text-gray-500 mt-1">Preencha os dados abaixo para solicitar um veículo ou equipamento.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 space-y-8">
          
          {/* Tipo de Serviço */}
          <section>
            <label className="block text-sm font-semibold text-gray-700 mb-3">1. O que você precisa?</label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {TIPOS_SERVICO.map(tipo => {
                const isSelected = tipoServico === tipo.id;
                const Icon = tipo.icon;
                return (
                  <button
                    key={tipo.id}
                    type="button"
                    onClick={() => setTipoServico(tipo.id)}
                    className={\`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all \${
                      isSelected 
                        ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' 
                        : 'border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                    }\`}
                  >
                    <Icon size={24} className="mb-2" />
                    <span className="text-xs font-medium text-center">{tipo.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Rota */}
          <section className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">2. Origem</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={origem}
                  onChange={(e) => setOrigem(e.target.value)}
                  placeholder="Ex: Galpão de Insumos"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary"
                  list="locais-origem"
                  required
                />
                <datalist id="locais-origem">
                  {LOCAIS_SUGERIDOS.map(loc => <option key={loc} value={loc} />)}
                </datalist>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">3. Destino</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  placeholder="Ex: Lote 12"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary"
                  list="locais-destino"
                  required
                />
                <datalist id="locais-destino">
                  {LOCAIS_SUGERIDOS.map(loc => <option key={loc} value={loc} />)}
                </datalist>
              </div>
            </div>
          </section>

          {/* Agendamento */}
          <section className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">4. Data Desejada</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar size={18} className="text-gray-400" />
                </div>
                <input
                  type="date"
                  value={dataProgramada}
                  onChange={(e) => setDataProgramada(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Horário Desejado</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock size={18} className="text-gray-400" />
                </div>
                <input
                  type="time"
                  value={horarioProgramado}
                  onChange={(e) => setHorarioProgramado(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary"
                />
              </div>
            </div>
          </section>

          {/* Contexto Administrativo */}
          <section className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">5. Projeto / Centro de Custo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Package size={18} className="text-gray-400" />
                </div>
                <select
                  value={projetoId}
                  onChange={(e) => setProjetoId(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary"
                  required
                >
                  <option value="" disabled>Selecione um projeto...</option>
                  {projetos.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} ({p.centroCusto})</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">6. Observações Adicionais</label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
                placeholder="Detalhes da carga, necessidade especial, etc..."
                className="block w-full p-3 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary resize-none"
              ></textarea>
            </div>
          </section>
        </div>

        <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            className="bg-brand-primary text-white px-6 py-2.5 rounded-md font-medium hover:bg-brand-secondary transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
          >
            Enviar Solicitação
          </button>
        </div>
      </form>

      {/* Modal de Sucesso */}
      <Modal isOpen={modalSucesso} onClose={() => setModalSucesso(false)} title="Solicitação Enviada!">
        <div className="text-center py-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Tudo Certo!</h3>
          <p className="text-gray-600 mb-6">
            Sua solicitação foi registrada na fila da logística e gerou o chamado:
            <br />
            <span className="inline-block mt-2 font-mono text-xl font-bold text-brand-primary bg-brand-primary/10 px-4 py-2 rounded-lg">
              {ultimaOS}
            </span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
            >
              Criar Outra
            </button>
            <button
              onClick={() => navigate('/minhas-solicitacoes')}
              className="px-4 py-2 bg-brand-primary text-white rounded-md font-medium hover:bg-brand-secondary transition-colors"
            >
              Ver Minhas Solicitações
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
`);

// 5. Create MinhasSolicitacoes page
writeFile('src/pages/solicitante/MinhasSolicitacoes.tsx', `import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Search, Filter, Calendar, MapPin, Truck, Clock, User as UserIcon } from 'lucide-react';
import type { SolicitacaoTransporte } from '../../types';

export const MinhasSolicitacoes = () => {
  const { usuario } = useAuth();
  const { solicitacoes } = useAppContext();
  
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<SolicitacaoTransporte | null>(null);

  // Filtrar apenas do usuário atual, mais busca e status
  const minhasSolicitacoes = solicitacoes.filter(sol => {
    if (sol.solicitante.id !== usuario?.id) return false;
    
    if (filtroStatus !== 'todos' && sol.status !== filtroStatus) return false;
    
    if (busca) {
      const q = busca.toLowerCase();
      return (
        sol.numeroOS.toLowerCase().includes(q) ||
        sol.destino.toLowerCase().includes(q) ||
        sol.projeto.nome.toLowerCase().includes(q)
      );
    }
    
    return true;
  });

  const handleVerDetalhes = (solicitacao: SolicitacaoTransporte) => {
    setSolicitacaoSelecionada(solicitacao);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Minhas Solicitações</h2>
          <p className="text-gray-500 mt-1">Acompanhe o status dos seus pedidos de transporte.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por OS, destino ou projeto..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary"
          />
        </div>
        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter size={18} className="text-gray-400" />
          </div>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-brand-primary focus:border-brand-primary"
          >
            <option value="todos">Todos os Status</option>
            <option value="pendente">Pendentes</option>
            <option value="agendada">Agendadas</option>
            <option value="em_execucao">Em Execução</option>
            <option value="concluida">Concluídas</option>
            <option value="cancelada">Canceladas</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OS</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serviço & Rota</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Desejada</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {minhasSolicitacoes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma solicitação encontrada.
                  </td>
                </tr>
              ) : (
                minhasSolicitacoes.map((sol) => (
                  <tr key={sol.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-medium text-gray-900">{sol.numeroOS}</span>
                      <div className="text-xs text-gray-500 mt-1 truncate max-w-[150px]" title={sol.projeto.nome}>
                        {sol.projeto.centroCusto}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{sol.tipoServico}</div>
                      <div className="text-sm text-gray-500 mt-1 flex items-center">
                        <MapPin size={12} className="mr-1 inline" />
                        {sol.origem} &rarr; {sol.destino}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {sol.dataProgramada ? new Date(sol.dataProgramada).toLocaleDateString('pt-BR') : '-'}
                      </div>
                      {sol.horarioProgramado && (
                        <div className="text-xs text-gray-500 mt-1 flex items-center">
                          <Clock size={12} className="mr-1 inline" />
                          {sol.horarioProgramado}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge status={sol.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => handleVerDetalhes(sol)}
                        className="text-brand-secondary hover:text-brand-primary hover:underline"
                      >
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {solicitacaoSelecionada && (
        <Modal 
          isOpen={!!solicitacaoSelecionada} 
          onClose={() => setSolicitacaoSelecionada(null)}
          title={\`Detalhes da OS: \${solicitacaoSelecionada.numeroOS}\`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-lg font-bold text-gray-900">{solicitacaoSelecionada.projeto.nome}</h4>
                <p className="text-sm text-gray-500">{solicitacaoSelecionada.projeto.centroCusto}</p>
              </div>
              <Badge status={solicitacaoSelecionada.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Rota</p>
                <div className="flex items-center text-sm font-medium text-gray-900">
                  <MapPin size={16} className="text-gray-400 mr-2" />
                  {solicitacaoSelecionada.origem} &rarr; {solicitacaoSelecionada.destino}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Data/Hora Desejada</p>
                <div className="flex items-center text-sm font-medium text-gray-900">
                  <Calendar size={16} className="text-gray-400 mr-2" />
                  {solicitacaoSelecionada.dataProgramada ? new Date(solicitacaoSelecionada.dataProgramada).toLocaleDateString('pt-BR') : '-'}
                  {solicitacaoSelecionada.horarioProgramado && \` às \${solicitacaoSelecionada.horarioProgramado}\`}
                </div>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Serviço/Equipamento</p>
                <div className="flex items-center text-sm font-medium text-gray-900">
                  <Truck size={16} className="text-gray-400 mr-2" />
                  {solicitacaoSelecionada.tipoServico}
                </div>
              </div>
              {solicitacaoSelecionada.observacoes && (
                <div className="col-span-2 mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Observações do Solicitante</p>
                  <p className="text-sm text-gray-700">{solicitacaoSelecionada.observacoes}</p>
                </div>
              )}
            </div>

            {(solicitacaoSelecionada.status === 'agendada' || solicitacaoSelecionada.status === 'em_execucao' || solicitacaoSelecionada.status === 'concluida') && solicitacaoSelecionada.veiculoAlocado && solicitacaoSelecionada.motoristaAlocado && (
              <div className="border border-brand-primary/20 bg-brand-primary/5 rounded-lg p-4">
                <h4 className="text-sm font-bold text-brand-primary mb-3">Dados da Alocação (Logística)</h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-white p-2 rounded-md shadow-sm border border-gray-100">
                      <Truck size={20} className="text-brand-secondary" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Veículo Alocado</p>
                      <p className="text-sm font-semibold text-gray-900">{solicitacaoSelecionada.veiculoAlocado.modelo}</p>
                      <p className="text-xs font-mono bg-gray-200 px-1.5 py-0.5 rounded mt-1 inline-block">{solicitacaoSelecionada.veiculoAlocado.placa}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="bg-white p-2 rounded-md shadow-sm border border-gray-100">
                      <UserIcon size={20} className="text-brand-secondary" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Motorista</p>
                      <p className="text-sm font-semibold text-gray-900">{solicitacaoSelecionada.motoristaAlocado.nome}</p>
                      <p className="text-xs text-gray-600 mt-1">{solicitacaoSelecionada.motoristaAlocado.telefone}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {solicitacaoSelecionada.status === 'cancelada' && solicitacaoSelecionada.motivoCancelamento && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                <h4 className="text-sm font-bold text-red-800 mb-1">Motivo do Cancelamento</h4>
                <p className="text-sm text-red-700">{solicitacaoSelecionada.motivoCancelamento}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
`);

console.log("Scaffold step 3 complete");
