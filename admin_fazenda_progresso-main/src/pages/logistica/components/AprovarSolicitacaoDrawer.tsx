import { useState, useEffect } from 'react';
import { SlideOverDrawer } from '../../../components/common/SlideOverDrawer';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { Modal } from '../../../components/common/Modal';
import { useAppContext } from '../../../context/AppContext';
import { MapPin, Calendar, Truck, User as UserIcon, AlignLeft, Clock, FileText, Zap, Ban, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { SolicitacaoTransporte } from '../../../types';

interface AprovarSolicitacaoDrawerProps {
  solicitacao: SolicitacaoTransporte | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const AprovarSolicitacaoDrawer = ({ solicitacao, isOpen, onClose, onSuccess }: AprovarSolicitacaoDrawerProps) => {
  const { veiculos, motoristas, aprovarEAgendarSolicitacao, reagendarSolicitacao, cancelarSolicitacao } = useAppContext();
  const [activeTab, setActiveTab] = useState<'alocar' | 'reagendar' | 'cancelar'>('alocar');

  const [veiculoId, setVeiculoId] = useState('');
  const [motoristaId, setMotoristaId] = useState('');
  const [horarioConfirmado, setHorarioConfirmado] = useState('');

  const [novaData, setNovaData] = useState('');
  const [novoHorario, setNovoHorario] = useState('');
  const [observacaoLogistica, setObservacaoLogistica] = useState('');

  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [manutencaoModalOpen, setManutencaoModalOpen] = useState(false);

  const [observacaoAprovacao, setObservacaoAprovacao] = useState('');

  useEffect(() => {
    if (solicitacao) {
      setHorarioConfirmado(solicitacao.horarioProgramado || '');
      setNovaData(solicitacao.dataProgramada || '');
      setNovoHorario(solicitacao.horarioProgramado || '');
      setObservacaoAprovacao('');
      setActiveTab('alocar');
    }
  }, [solicitacao, isOpen]);

  const handleAlocar = () => {
    if (!solicitacao || !veiculoId || !motoristaId || !horarioConfirmado.trim()) return;
    setIsLoading(true);
    setTimeout(() => {
      aprovarEAgendarSolicitacao(
        solicitacao.numeroOS, 
        veiculoId, 
        motoristaId, 
        horarioConfirmado, 
        observacaoAprovacao
      );
      setIsLoading(false);
      onSuccess(`${solicitacao.numeroOS} Aprovada! Notificações automáticas enviadas ao solicitante e motorista.`);
      onClose();
    }, 800);
  };

  const handleVeiculoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedVeiculo = veiculos.find(v => v.id === selectedId);
    
    if (selectedVeiculo && selectedVeiculo.status === 'manutencao') {
      setManutencaoModalOpen(true);
      setVeiculoId('');
    } else {
      setVeiculoId(selectedId);
    }
  };

  const handleReagendar = () => {
    if (!solicitacao || !novaData || !observacaoLogistica) return;
    setIsLoading(true);
    setTimeout(() => {
      reagendarSolicitacao(solicitacao.numeroOS, novaData, novoHorario || horarioConfirmado, observacaoLogistica);
      setIsLoading(false);
      onSuccess(`${solicitacao.numeroOS} Reagendada! Notificação enviada ao solicitante.`);
      onClose();
    }, 800);
  };

  const handleCancelar = () => {
    if (!solicitacao || !motivoCancelamento) return;
    setIsLoading(true);
    setTimeout(() => {
      cancelarSolicitacao(solicitacao.numeroOS, motivoCancelamento);
      setIsLoading(false);
      onSuccess(`${solicitacao.numeroOS} Cancelada com sucesso.`);
      onClose();
    }, 800);
  };

  if (!solicitacao) return null;

  // Frota completa de veículos ordenada (excluindo tratores e ordenada pelos mais compatíveis no topo)
  const veiculosOpcoes = veiculos
    .filter(v => v.tipo.toLowerCase() !== 'trator')
    .sort((a, b) => {
      if (!solicitacao?.tipoServico) return 0;
      const servico = solicitacao.tipoServico.toLowerCase();
      const matchA = servico.includes(a.tipo.toLowerCase()) || servico.includes(a.modelo.toLowerCase());
      const matchB = servico.includes(b.tipo.toLowerCase()) || servico.includes(b.modelo.toLowerCase());
      if (matchA && !matchB) return -1;
      if (!matchA && matchB) return 1;
      return 0;
    });

  return (
    <SlideOverDrawer isOpen={isOpen} onClose={onClose} title="Análise Logística" width="max-w-md">
      <div className="flex flex-col h-full">
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4 mb-6 shadow-sm">
          <div className="flex justify-between items-start">
            <h4 className="font-mono font-bold text-slate-800 text-lg bg-white px-3 py-1 rounded-lg border border-slate-200">{solicitacao.numeroOS}</h4>
            <StatusBadge status={solicitacao.status} />
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Solicitante</p>
              <p className="text-sm font-semibold text-slate-800">{solicitacao.solicitante.nome}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Serviço</p>
              <p className="text-sm font-semibold text-slate-800 flex items-center">
                <Truck size={14} className="mr-1.5 text-emerald-600" /> {solicitacao.tipoServico}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Rota / Destino</p>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="bg-white text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 flex items-center"><MapPin size={12} className="mr-1 text-emerald-500"/> {solicitacao.origem}</span>
                <span className="text-slate-300">&rarr;</span>
                <span className="bg-white text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 flex items-center"><MapPin size={12} className="mr-1 text-rose-500"/> {solicitacao.destino}</span>
              </div>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Data Desejada</p>
              <p className="text-sm font-semibold text-slate-800 flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 w-fit">
                <Calendar size={14} className="mr-2 text-slate-400" />
                {solicitacao.dataProgramada ? new Date(solicitacao.dataProgramada).toLocaleDateString('pt-BR') : 'Sem data definida'}
                {solicitacao.horarioProgramado && <><span className="mx-2 text-slate-300">|</span><Clock size={14} className="mr-1.5 text-slate-400" /> {solicitacao.horarioProgramado}</>}
              </p>
            </div>
          </div>

          {solicitacao.observacoes && (
            <div className="pt-4 border-t border-slate-200/80">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center"><AlignLeft size={12} className="mr-1.5"/> Observações do Solicitante</p>
              <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-100 italic">"{solicitacao.observacoes}"</p>
            </div>
          )}
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-xl mb-6 shadow-inner">
          <button
            onClick={() => setActiveTab('alocar')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex justify-center items-center gap-1.5 ${activeTab === 'alocar' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
          >
            <CheckCircle2 size={14} /> Aprovar & Alocar
          </button>
          <button
            onClick={() => setActiveTab('reagendar')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex justify-center items-center gap-1.5 ${activeTab === 'reagendar' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            title="Alterar Data da Viagem"
          >
            <RefreshCw size={14} /> Reagendar Data
          </button>
          <button
            onClick={() => setActiveTab('cancelar')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex justify-center items-center gap-1.5 ${activeTab === 'cancelar' ? 'bg-white text-rose-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
          >
            <Ban size={14} /> Cancelar
          </button>
        </div>

        <div className="flex-1 flex flex-col">
          {activeTab === 'alocar' && (
            <div className="space-y-5 flex-1 flex flex-col animate-fade-in">
              <div className="group/input">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide flex items-center"><Truck size={14} className="mr-1.5" /> Veículo Compatível</label>
                <select
                  value={veiculoId}
                  onChange={handleVeiculoChange}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all bg-white text-sm shadow-sm font-medium appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1.2em] bg-[right_1rem_center] bg-no-repeat"
                >
                  <option value="">Selecione o veículo...</option>
                  {veiculosOpcoes.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.placa} - {v.modelo} ({v.tipo})
                    </option>
                  ))}
                </select>
                {veiculoId && (
                  <div className="mt-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase">Odômetro Sankhya</span>
                    <span className="text-sm font-mono font-bold text-emerald-800">{veiculos.find(v => v.id === veiculoId)?.odometro || '154.320'} km</span>
                  </div>
                )}
              </div>

              <div className="group/input">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide flex items-center"><UserIcon size={14} className="mr-1.5" /> Motorista Disponível</label>
                <select
                  value={motoristaId}
                  onChange={(e) => setMotoristaId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all bg-white text-sm shadow-sm font-medium appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1.2em] bg-[right_1rem_center] bg-no-repeat"
                >
                  <option value="">Selecione o motorista...</option>
                  {motoristas.map(m => (
                    <option key={m.id} value={m.id} disabled={m.status !== 'disponivel'}>
                      {m.nome} ({m.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="group/input">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide flex items-center">
                  <Clock size={14} className="mr-1.5 text-emerald-600" /> Horário Obrigatório da Aprovação <span className="text-red-500 font-bold ml-1">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={horarioConfirmado}
                  onChange={(e) => setHorarioConfirmado(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all bg-white text-sm shadow-sm font-medium"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Ajustes de horário no mesmo dia são realizados diretamente aqui, sem necessidade de formalizar reagendamento.
                </p>
              </div>

              {/* Campo de Observação Livre da Logística (OPCIONAL) */}
              <div className="group/input">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide flex items-center">
                  <FileText size={14} className="mr-1.5 text-slate-500" /> Observações da Aprovação <span className="text-slate-400 font-normal lowercase ml-1">(opcional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Motorista irá aguardar no galpão 02. Chegar 15 minutos antes do horário..."
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all bg-white shadow-sm font-medium text-slate-800 resize-none"
                  value={observacaoAprovacao}
                  onChange={(e) => setObservacaoAprovacao(e.target.value)}
                ></textarea>
              </div>

              {/* Banner Informativo sobre Notificação Automática */}
              <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-3.5 flex items-start space-x-3">
                <Zap className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700">
                  <span className="font-bold text-emerald-900 block mb-0.5">Notificação Automática e Obrigatória</span>
                  Ao confirmar a aprovação, as confirmações serão enviadas automaticamente para o WhatsApp do solicitante e para o App do motorista alocado.
                </div>
              </div>

              <div className="mt-auto pt-6 pb-2">
                <button
                  onClick={handleAlocar}
                  disabled={!veiculoId || !motoristaId || !horarioConfirmado.trim() || isLoading}
                  className="relative w-full overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-3.5 rounded-xl font-bold hover:from-emerald-500 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processando...
                    </div>
                  ) : (
                    <>
                      Confirmar Aprovação <Zap size={18} className="ml-2 group-hover:animate-pulse" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'reagendar' && (
            <div className="space-y-5 flex-1 flex flex-col animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="group/input">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide flex items-center"><Calendar size={14} className="mr-1.5" /> Nova Data</label>
                  <input
                    type="date"
                    value={novaData}
                    onChange={(e) => setNovaData(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white text-sm shadow-sm font-medium"
                  />
                </div>
                <div className="group/input">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide flex items-center"><Clock size={14} className="mr-1.5" /> Novo Horário</label>
                  <input
                    type="time"
                    value={novoHorario}
                    onChange={(e) => setNovoHorario(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white text-sm shadow-sm font-medium"
                  />
                </div>
              </div>

              <div className="group/input">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide flex items-center"><FileText size={14} className="mr-1.5" /> Justificativa (Obrigatória)</label>
                <textarea
                  required
                  value={observacaoLogistica}
                  onChange={(e) => setObservacaoLogistica(e.target.value)}
                  placeholder="Explique o motivo para o solicitante..."
                  rows={4}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white text-sm resize-none shadow-sm"
                ></textarea>
              </div>

              <div className="mt-auto pt-6 pb-2">
                <button
                  onClick={handleReagendar}
                  disabled={!novaData || !observacaoLogistica || isLoading}
                  className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-500/20 focus:ring-4 focus:ring-blue-500/30 flex items-center justify-center hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isLoading ? 'Processando...' : 'Salvar Reagendamento'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'cancelar' && (
            <div className="space-y-5 flex-1 flex flex-col animate-fade-in">
              <div className="group/input">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide flex items-center"><FileText size={14} className="mr-1.5" /> Motivo do Cancelamento (Obrigatório)</label>
                <textarea
                  required
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  placeholder="Justificativa oficial e final (não poderá ser desfeito)..."
                  rows={6}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all bg-white text-sm resize-none shadow-sm"
                ></textarea>
              </div>

              <div className="mt-auto pt-6 pb-2">
                <button
                  onClick={handleCancelar}
                  disabled={!motivoCancelamento || isLoading}
                  className="w-full bg-rose-600 text-white py-3.5 rounded-xl font-bold hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-rose-500/20 focus:ring-4 focus:ring-rose-500/30 flex items-center justify-center hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isLoading ? 'Processando...' : 'Cancelar Operação Definitivamente'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={manutencaoModalOpen} onClose={() => setManutencaoModalOpen(false)} title="Bloqueio de Seleção">
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 relative">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Seleção Indisponível</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Veículo em manutenção. A seleção está bloqueada até que o status seja normalizado pela oficina.
          </p>
          <button
            onClick={() => setManutencaoModalOpen(false)}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            Entendi
          </button>
        </div>
      </Modal>
    </SlideOverDrawer>
  );
};
