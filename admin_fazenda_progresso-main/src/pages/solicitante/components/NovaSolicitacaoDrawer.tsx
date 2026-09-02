import { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { 
  MapPin, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  ArrowLeft, 
  X, 
  Search, 
  ChevronRight, 
  User, 
  Zap,
  FolderKanban,
  Wrench,
  Edit3,
  Layers
} from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { SlideOverDrawer } from '../../../components/common/SlideOverDrawer';

interface NovaSolicitacaoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// 1. LOCAIS SANKHYA (Origem / Destino - Passos 1 e 2)
const LOCAIS_SANKHYA = [
  { id: 'LOC-101', codigo: '101', descricao: '101 - FAZENDA PROGRESSO - SEDE CENTRAL', nome: 'Fazenda Progresso - Sede' },
  { id: 'LOC-102', codigo: '102', descricao: '102 - SILO PRINCIPAL / ARMAZÉM DE GRÃOS', nome: 'Silo Principal / Armazém' },
  { id: 'LOC-103', codigo: '103', descricao: '103 - OFICINA CENTRAL & POSTO ABASTECIMENTO', nome: 'Oficina Central & Posto' },
  { id: 'LOC-104', codigo: '104', descricao: '104 - GALPÃO DE INSUMOS E DEFENSIVOS', nome: 'Galpão de Insumos' },
  { id: 'LOC-105', codigo: '105', descricao: '105 - PIVÔ 01 - CAMPO DE BATATA SEMENTE', nome: 'Pivô 01 - Batata Semente' },
  { id: 'LOC-106', codigo: '106', descricao: '106 - PIVÔ 04 - CAMPO DE SILAGEM', nome: 'Pivô 04 - Silagem' },
  { id: 'LOC-107', codigo: '107', descricao: '107 - TALHÃO 12 - SAFRA SOJA LESTE', nome: 'Talhão 12 - Soja Leste' },
  { id: 'LOC-108', codigo: '108', descricao: '108 - TALHÃO 15 - CAMPO DE MILHO', nome: 'Talhão 15 - Campo de Milho' },
  { id: 'LOC-109', codigo: '109', descricao: '109 - PEDREIRA / USINA DE BRITAGEM', nome: 'Pedreira / Usina' },
  { id: 'LOC-110', codigo: '110', descricao: '110 - BALANÇA ROVIARA ENTRADA', nome: 'Balança Roviara' },
  { id: 'LOC-111', codigo: '111', descricao: '111 - LAVA JATO & GARAGEM CENTRAL', nome: 'Lava Jato / Garagem' },
  { id: 'LOC-112', codigo: '112', descricao: '112 - PONTO DE TRANSBORDO PORTO', nome: 'Ponto Transbordo Porto' }
];

// 2. CATEGORIAS DE SERVIÇO (Passo 3 - Camada 1)
const CATEGORIAS_SERVICO_SANKHYA = [
  { id: 'CAT-VIAGEM', codigo: 'CAT-VIAGEM', nome: 'VIAGEM', descricao: 'Deslocamentos intermunicipais e rotas estaduais' },
  { id: 'CAT-TRANSPORTE', codigo: 'CAT-TRANSPORTE', nome: 'TRANSPORTE', descricao: 'Transporte de produtos, insumos, pessoal e materiais' },
  { id: 'CAT-COLHEITA', codigo: 'CAT-COLHEITA', nome: 'COLHEITA', descricao: 'Operações e apoio logístico de colheita' },
  { id: 'CAT-OUTROS', codigo: 'CAT-OUTROS', nome: 'OUTROS', descricao: 'Outros serviços e atendimentos diversos' }
];

// SERVIÇOS DETALHADOS (Passo 4 - Camada 2)
const SERVICOS_POR_CATEGORIA: Record<string, Array<{ id: string; codigo: string; descricao: string }>> = {
  'CAT-VIAGEM': [
    { id: 'SRV-V01', codigo: 'VIAGEM-01', descricao: 'VIAGEM BARRA DA ESTIVA' },
    { id: 'SRV-V02', codigo: 'VIAGEM-02', descricao: 'VIAGEM CASCAVEL' },
    { id: 'SRV-V03', codigo: 'VIAGEM-03', descricao: 'VIAGEM MUCUGE' },
    { id: 'SRV-V04', codigo: 'VIAGEM-04', descricao: 'VIAGEM RANCHO X' },
    { id: 'SRV-V05', codigo: 'VIAGEM-05', descricao: 'VIAGEM VITORIA DA CONQUISTA' },
    { id: 'SRV-V06', codigo: 'VIAGEM-06', descricao: 'VIAGEM' }
  ],
  'CAT-TRANSPORTE': [
    { id: 'SRV-T01', codigo: 'TR-01', descricao: 'COLETA DE MERCADORIAS' },
    { id: 'SRV-T02', codigo: 'TR-02', descricao: 'ENTREGA DE PRODUTOS VENDIDOS' },
    { id: 'SRV-T03', codigo: 'TR-03', descricao: 'TRANSPORTE DE PESSOAL' },
    { id: 'SRV-T04', codigo: 'TR-04', descricao: 'BENEFICIAMENTO DE BATATA' },
    { id: 'SRV-T05', codigo: 'TR-05', descricao: 'CARREGAMENTO DE CAFÉ' },
    { id: 'SRV-T06', codigo: 'TR-06', descricao: 'TRANSPORTE BATATA SEMENTE' },
    { id: 'SRV-T07', codigo: 'TR-07', descricao: 'TRANSPORTE DE ÁGUA' },
    { id: 'SRV-T08', codigo: 'TR-08', descricao: 'TRANSPORTE DE ÁGUA ESCOLA' },
    { id: 'SRV-T09', codigo: 'TR-09', descricao: 'TRANSPORTE DE BATATA' },
    { id: 'SRV-T10', codigo: 'TR-10', descricao: 'TRANSPORTE DE CAFÉ' },
    { id: 'SRV-T11', codigo: 'TR-11', descricao: 'TRANSPORTE DE CANOS E ADUTORAS' },
    { id: 'SRV-T12', codigo: 'TR-12', descricao: 'TRANSPORTE DE CAPIM' },
    { id: 'SRV-T13', codigo: 'TR-13', descricao: 'TRANSPORTE DE COMBUSTÍVEL' },
    { id: 'SRV-T14', codigo: 'TR-14', descricao: 'TRANSPORTE DE FUNCIONÁRIOS' },
    { id: 'SRV-T15', codigo: 'TR-15', descricao: 'TRANSPORTE DE INSUMOS' },
    { id: 'SRV-T16', codigo: 'TR-16', descricao: 'TRANSPORTE DE LAMA-CASCALHO-AREIA' },
    { id: 'SRV-T17', codigo: 'TR-17', descricao: 'TRANSPORTE DE MÁQUINAS E EQUIPAMENTOS' },
    { id: 'SRV-T18', codigo: 'TR-18', descricao: 'TRANSPORTE DIVERSOS' }
  ],
  'CAT-COLHEITA': [
    { id: 'SRV-C01', codigo: 'COL-01', descricao: 'COLHEITA MANUAL BATATA CONSUMO' },
    { id: 'SRV-C02', codigo: 'COL-02', descricao: 'COLHEITA MANUAL BATATA SEMENTE' }
  ],
  'CAT-OUTROS': [
    { id: 'SRV-O01', codigo: 'OUT-01', descricao: 'TRANSPORTE DIVERSOS' }
  ]
};

// 3. PROJETOS (Passo 5 - Única seleção de Projeto)
const PROJETOS_SANKHYA = [
  { id: '4110100', codigo: '4110100', descricao: '4110100 - BENEFICIAMENTO BATATA 2024', nome: 'BENEFICIAMENTO BATATA 2024', centroCusto: 'CC-4110100' },
  { id: '6010100', codigo: '6010100', descricao: '6010100 - FP1P01 - BATATA SEMENTE 2026', nome: 'FP1P01 - BATATA SEMENTE 2026', centroCusto: 'CC-6010100' },
  { id: '6010500', codigo: '6010500', descricao: '6010500 - FP1P05 - BATATA 2026', nome: 'FP1P05 - BATATA 2026', centroCusto: 'CC-6010500' },
  { id: '6010501', codigo: '6010501', descricao: '6010501 - FP1P05 - LOTE 01 BATATA 2026', nome: 'FP1P05 - LOTE 01 BATATA 2026', centroCusto: 'CC-6010501' },
  { id: '6010502', codigo: '6010502', descricao: '6010502 - FP1P05 - LOTE 02 BATATA 2026', nome: 'FP1P05 - LOTE 02 BATATA 2026', centroCusto: 'CC-6010502' },
  { id: '6010600', codigo: '6010600', descricao: '6010600 - SAFRA SOJA LESTE 2026', nome: 'SAFRA SOJA LESTE 2026', centroCusto: 'CC-6010600' },
  { id: '6010700', codigo: '6010700', descricao: '6010700 - INFRAESTRUTURA E MANUTENÇÃO SEDE', nome: 'INFRAESTRUTURA E MANUTENÇÃO SEDE', centroCusto: 'CC-6010700' },
];

// 4. SOLICITANTES (Passo 6 - Com opção EU (PRÓPRIO))
const SOLICITANTES_SANKHYA = [
  { id: 'eu', codigo: '1000', descricao: 'EU (PRÓPRIO)', nome: 'Eu (Próprio)' },
  { id: '1001', codigo: '1001', descricao: '1001 - JOÃO - TÉCNICO DE CAMPO', nome: 'João - Técnico de Campo' },
  { id: '1002', codigo: '1002', descricao: '1002 - CARLOS - GESTOR DE FROTA', nome: 'Carlos - Gestor de Frota' },
  { id: '1003', codigo: '1003', descricao: '1003 - ANTÔNIO - OPERADOR LOGÍSTICO', nome: 'Antônio - Operador Logístico' },
  { id: '1004', codigo: '1004', descricao: '1004 - MARIA SILVA - ENGENHEIRA AGRÔNOMA', nome: 'Maria Silva - Engenheira Agrônoma' },
  { id: '1005', codigo: '1005', descricao: '1005 - ROBERTO SOUZA - SUPERVISOR DE OPERAÇÕES', nome: 'Roberto Souza - Supervisor de Operações' },
  { id: '1006', codigo: '1006', descricao: '1006 - FERNANDO ALVES - GERENTE AGRÍCOLA', nome: 'Fernando Alves - Gerente Agrícola' },
];

export const NovaSolicitacaoDrawer = ({ isOpen, onClose, onSuccess }: NovaSolicitacaoDrawerProps) => {
  const { criarSolicitacao } = useAppContext();
  const { usuario } = useAuth();
  
  // Nova ordem de Passos: 
  // 1: Seleção da ORIGEM (Primeira coisa)
  // 2: Seleção do DESTINO (Segunda coisa)
  // 3: Categoria de Serviço (Camada 1)
  // 4: Tipo de Serviço (Camada 2)
  // 5: Seleção de Projeto (Único)
  // 6: Seleção do Solicitante
  // 7: Confirmação, Programação de Data/Hora e Observações
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Seleções sequenciais
  const [origemSel, setOrigemSel] = useState<typeof LOCAIS_SANKHYA[0] | null>(null);
  const [destinoSel, setDestinoSel] = useState<typeof LOCAIS_SANKHYA[0] | null>(null);
  const [categoriaSel, setCategoriaSel] = useState<typeof CATEGORIAS_SERVICO_SANKHYA[0] | null>(null);
  const [servicoSel, setServicoSel] = useState<{ id: string; codigo: string; descricao: string } | null>(null);
  const [projetoSel, setProjetoSel] = useState<typeof PROJETOS_SANKHYA[0] | null>(null);
  const [solicitanteSel, setSolicitanteSel] = useState<typeof SOLICITANTES_SANKHYA[0] | null>(SOLICITANTES_SANKHYA[0]);

  // Campos finais (Passo 7)
  const [dataProgramada, setDataProgramada] = useState(new Date().toISOString().split('T')[0]);
  const [horarioSaida, setHorarioSaida] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const handleReset = () => {
    setCurrentStep(1);
    setSearchTerm('');
    setOrigemSel(null);
    setDestinoSel(null);
    setCategoriaSel(null);
    setServicoSel(null);
    setProjetoSel(null);
    setSolicitanteSel(SOLICITANTES_SANKHYA[0]);
    setDataProgramada(new Date().toISOString().split('T')[0]);
    setHorarioSaida('');
    setObservacoes('');
  };

  const handleCloseAll = () => {
    handleReset();
    onClose();
  };

  const handleBackStep = () => {
    setSearchTerm('');
    if (currentStep > 1) {
      setCurrentStep(prev => (prev - 1) as any);
    } else {
      handleCloseAll();
    }
  };

  // Handlers das Etapas
  const handleSelectOrigem = (item: typeof LOCAIS_SANKHYA[0]) => {
    setOrigemSel(item);
    setSearchTerm('');
    setCurrentStep(2); // Avança para DESTINO (2º Passo)
  };

  const handleSelectDestino = (item: typeof LOCAIS_SANKHYA[0]) => {
    setDestinoSel(item);
    setSearchTerm('');
    setCurrentStep(3); // Avança para Categoria de Serviço (3º Passo)
  };

  const handleSelectCategoria = (cat: typeof CATEGORIAS_SERVICO_SANKHYA[0]) => {
    setCategoriaSel(cat);
    setServicoSel(null);
    setSearchTerm('');
    setCurrentStep(4); // Avança para Tipos de Serviço (4º Passo)
  };

  const handleSelectServico = (item: { id: string; codigo: string; descricao: string }) => {
    setServicoSel(item);
    setSearchTerm('');
    setCurrentStep(5); // Avança para Projeto (5º Passo)
  };

  const handleSelectProjeto = (item: typeof PROJETOS_SANKHYA[0]) => {
    setProjetoSel(item);
    setSearchTerm('');
    setCurrentStep(6); // Avança para Solicitante (6º Passo)
  };

  const handleSelectSolicitante = (item: typeof SOLICITANTES_SANKHYA[0]) => {
    setSolicitanteSel(item);
    setSearchTerm('');
    setCurrentStep(7); // Avança para Programação de Data/Hora e Confirmação (7º Passo)
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origemSel || !destinoSel || !servicoSel || !projetoSel || !solicitanteSel) return;

    setIsLoading(true);

    setTimeout(() => {
      let horarioFormatado = '';
      if (horarioSaida) {
        horarioFormatado = `Saída: ${horarioSaida}`;
      }

      const nomeSolicitanteFinal = solicitanteSel.id === 'eu' 
        ? (usuario?.nome || 'Eu (Próprio)') 
        : solicitanteSel.nome;

      criarSolicitacao({
        solicitante: {
          id: solicitanteSel.id === 'eu' ? (usuario?.id || 'eu') : solicitanteSel.id,
          nome: nomeSolicitanteFinal,
          perfil: 'solicitante',
          departamento: 'Operações'
        },
        tipoServico: servicoSel.descricao,
        origem: origemSel.descricao,
        destino: destinoSel.descricao,
        dataProgramada,
        horarioProgramado: horarioFormatado || undefined,
        projeto: {
          id: projetoSel.id,
          nome: projetoSel.nome,
          centroCusto: projetoSel.centroCusto
        },
        observacoes: observacoes 
          ? `[Categoria: ${categoriaSel?.nome || 'Serviço'}] - ${observacoes}`
          : undefined
      });

      setIsLoading(false);
      setSuccessModalOpen(true);
    }, 700);
  };

  const handleFinish = () => {
    setSuccessModalOpen(false);
    handleReset();
    onSuccess();
    onClose();
  };

  // Título do Header por passo
  const getHeaderTitle = () => {
    switch (currentStep) {
      case 1: return 'SELECIONAR ORIGEM';
      case 2: return 'SELECIONAR DESTINO';
      case 3: return 'CATEGORIA DE SERVIÇO';
      case 4: return `SERVIÇOS (${categoriaSel?.nome || ''})`;
      case 5: return 'SELECIONAR PROJETO';
      case 6: return 'SOLICITANTE';
      case 7: return 'CONFIRMAÇÃO & PROGRAMAÇÃO';
    }
  };

  // Filtros de busca para cada etapa
  const filteredLocaisOrigem = LOCAIS_SANKHYA.filter(l => 
    l.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLocaisDestino = LOCAIS_SANKHYA.filter(l => 
    l.descricao.toLowerCase().includes(searchTerm.toLowerCase()) && l.id !== origemSel?.id
  );

  const filteredCategorias = CATEGORIAS_SERVICO_SANKHYA.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const servicosDaCategoria = categoriaSel ? (SERVICOS_POR_CATEGORIA[categoriaSel.id] || []) : [];
  const filteredServicos = servicosDaCategoria.filter(s => 
    s.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProjetos = PROJETOS_SANKHYA.filter(p => 
    p.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSolicitantes = SOLICITANTES_SANKHYA.filter(s => 
    s.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.id === 'eu' && usuario?.nome && usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <SlideOverDrawer 
        isOpen={isOpen} 
        onClose={handleCloseAll} 
        title="" 
        width="max-w-xl"
        hideDefaultHeader={true}
        noPadding={true}
      >
        <div className="flex flex-col h-full bg-slate-50 min-h-screen">
          
          {/* Header Premium */}
          <div className="bg-slate-900 text-white px-4 py-4 sticky top-0 z-30 shadow-md border-b border-slate-800">
            <div className="flex items-center justify-between">
              <button 
                type="button" 
                onClick={handleBackStep}
                className="p-2 rounded-full hover:bg-white/15 text-white transition-colors flex items-center justify-center"
                title="Voltar"
              >
                <ArrowLeft size={22} />
              </button>
              
              <div className="text-center flex-1 mx-2">
                <h2 className="text-base font-extrabold tracking-wider uppercase truncate">
                  {getHeaderTitle()}
                </h2>
                <div className="text-[11px] font-medium text-slate-400 tracking-wide mt-0.5">
                  Etapa {currentStep} de 7 — Seleção Sequencial
                </div>
              </div>

              <button 
                type="button" 
                onClick={handleCloseAll}
                className="p-2 rounded-full hover:bg-white/15 text-white transition-colors flex items-center justify-center"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Barra de Progresso Superior */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-emerald-400 h-full transition-all duration-300 ease-out"
                style={{ width: `${(currentStep / 7) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Campo de Pesquisa em Cima (Passos 1 a 6) */}
          {currentStep >= 1 && currentStep <= 6 && (
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm sticky top-[76px] z-20">
              <div className="relative flex items-center bg-slate-50 rounded-2xl border border-slate-200/80 px-3 py-2.5 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mr-3 shrink-0">
                  <Search size={18} />
                </div>
                <input 
                  type="text"
                  className="w-full bg-transparent text-sm outline-none font-medium text-slate-800 placeholder-slate-400"
                  placeholder={
                    currentStep === 1 ? "Pesquisar local de origem..." :
                    currentStep === 2 ? "Pesquisar local de destino..." :
                    "Pesquisar..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Lista em Baixo (Passos 1 a 6) */}
          <div className="flex-1 bg-white">
            
            {/* ETAPA 1: ORIGEM (Primeira coisa a ser selecionada) */}
            {currentStep === 1 && (
              <div className="divide-y divide-slate-100">
                {filteredLocaisOrigem.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-medium">Nenhum local de origem encontrado</div>
                ) : (
                  filteredLocaisOrigem.map((loc) => (
                    <div 
                      key={loc.id}
                      onClick={() => handleSelectOrigem(loc)}
                      className="flex items-center justify-between px-5 py-4 hover:bg-emerald-50/70 cursor-pointer transition-all duration-150 group border-b border-slate-100"
                    >
                      <div className="flex items-center space-x-3 pr-4">
                        <MapPin size={18} className="text-emerald-600 group-hover:text-emerald-700 shrink-0" />
                        <span className="text-sm font-semibold text-slate-800 uppercase tracking-wide group-hover:text-emerald-900 leading-snug">
                          {loc.descricao}
                        </span>
                      </div>
                      <ChevronRight size={18} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ETAPA 2: DESTINO (Segunda coisa a ser selecionada) */}
            {currentStep === 2 && (
              <div className="divide-y divide-slate-100">
                {filteredLocaisDestino.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-medium">Nenhum local de destino encontrado</div>
                ) : (
                  filteredLocaisDestino.map((loc) => (
                    <div 
                      key={loc.id}
                      onClick={() => handleSelectDestino(loc)}
                      className="flex items-center justify-between px-5 py-4 hover:bg-rose-50/70 cursor-pointer transition-all duration-150 group border-b border-slate-100"
                    >
                      <div className="flex items-center space-x-3 pr-4">
                        <MapPin size={18} className="text-rose-600 group-hover:text-rose-700 shrink-0" />
                        <span className="text-sm font-semibold text-slate-800 uppercase tracking-wide group-hover:text-rose-900 leading-snug">
                          {loc.descricao}
                        </span>
                      </div>
                      <ChevronRight size={18} className="text-slate-400 group-hover:text-rose-600 group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ETAPA 3: CATEGORIA DE SERVIÇO (Camada 1) */}
            {currentStep === 3 && (
              <div className="divide-y divide-slate-100">
                {filteredCategorias.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-medium">Nenhuma categoria encontrada</div>
                ) : (
                  filteredCategorias.map((cat) => (
                    <div 
                      key={cat.id}
                      onClick={() => handleSelectCategoria(cat)}
                      className="flex items-center justify-between px-5 py-4 hover:bg-blue-50/70 cursor-pointer transition-all duration-150 group border-b border-slate-100"
                    >
                      <div className="flex items-center space-x-3 pr-4">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 group-hover:bg-blue-600 group-hover:text-white text-blue-600 flex items-center justify-center shrink-0 transition-colors">
                          <Layers size={18} />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-800 uppercase tracking-wide group-hover:text-blue-900 block">
                            {cat.nome}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {cat.descricao}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ETAPA 4: TIPO DE SERVIÇO (Camada 2) */}
            {currentStep === 4 && (
              <div className="divide-y divide-slate-100">
                {filteredServicos.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-medium">Nenhum serviço encontrado nesta categoria</div>
                ) : (
                  filteredServicos.map((s) => (
                    <div 
                      key={s.id}
                      onClick={() => handleSelectServico(s)}
                      className="flex items-center justify-between px-5 py-4 hover:bg-blue-50/70 cursor-pointer transition-all duration-150 group border-b border-slate-100"
                    >
                      <div className="flex items-center space-x-3 pr-4">
                        <Wrench size={18} className="text-slate-400 group-hover:text-blue-600 shrink-0" />
                        <span className="text-sm font-semibold text-slate-800 uppercase tracking-wide group-hover:text-blue-900 leading-snug">
                          {s.descricao}
                        </span>
                      </div>
                      <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ETAPA 5: PROJETO */}
            {currentStep === 5 && (
              <div className="divide-y divide-slate-100">
                {filteredProjetos.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-medium">Nenhum projeto encontrado</div>
                ) : (
                  filteredProjetos.map((p) => (
                    <div 
                      key={p.id}
                      onClick={() => handleSelectProjeto(p)}
                      className="flex items-center justify-between px-5 py-4 hover:bg-blue-50/70 cursor-pointer transition-all duration-150 group border-b border-slate-100"
                    >
                      <div className="flex items-center space-x-3 pr-4">
                        <FolderKanban size={18} className="text-slate-400 group-hover:text-blue-600 shrink-0" />
                        <span className="text-sm font-semibold text-slate-800 uppercase tracking-wide group-hover:text-blue-900 leading-snug">
                          {p.descricao}
                        </span>
                      </div>
                      <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ETAPA 6: SOLICITANTE */}
            {currentStep === 6 && (
              <div className="divide-y divide-slate-100">
                {filteredSolicitantes.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-medium">Nenhum solicitante encontrado</div>
                ) : (
                  filteredSolicitantes.map((sol) => {
                    const isEu = sol.id === 'eu';
                    const textoExibicao = isEu 
                      ? `EU (${usuario?.nome ? usuario.nome.toUpperCase() : 'PRÓPRIO SOLICITANTE'})` 
                      : sol.descricao;

                    return (
                      <div 
                        key={sol.id}
                        onClick={() => handleSelectSolicitante(sol)}
                        className={`flex items-center justify-between px-5 py-4 hover:bg-blue-50/70 cursor-pointer transition-all duration-150 group border-b border-slate-100 ${
                          isEu ? 'bg-blue-50/40 font-bold' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3 pr-4">
                          <User size={18} className={`${isEu ? 'text-blue-600' : 'text-slate-400'} group-hover:text-blue-600 shrink-0`} />
                          <span className={`text-sm tracking-wide uppercase group-hover:text-blue-900 leading-snug ${
                            isEu ? 'font-black text-blue-900' : 'font-semibold text-slate-800'
                          }`}>
                            {textoExibicao}
                          </span>
                        </div>
                        <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0" />
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ETAPA 7: CONFIRMAÇÃO & PROGRAMAÇÃO */}
            {currentStep === 7 && (
              <div className="p-6 bg-slate-50 min-h-full space-y-6">
                
                {/* Resumo com botão de edição rápida */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dados Selecionados</span>
                    <span className="text-[11px] text-emerald-600 font-bold">Pronto para Enviar</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                      <span className="font-semibold text-emerald-800 flex items-center"><MapPin size={14} className="mr-2 text-emerald-600" /> Origem:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-emerald-900">{origemSel?.descricao}</span>
                        <button onClick={() => setCurrentStep(1)} className="text-emerald-700 hover:text-emerald-900 p-1" title="Alterar">
                          <Edit3 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50/60 border border-rose-100">
                      <span className="font-semibold text-rose-800 flex items-center"><MapPin size={14} className="mr-2 text-rose-600" /> Destino:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-rose-900">{destinoSel?.descricao}</span>
                        <button onClick={() => setCurrentStep(2)} className="text-rose-700 hover:text-rose-900 p-1" title="Alterar">
                          <Edit3 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="font-semibold text-slate-600 flex items-center"><Layers size={14} className="mr-2 text-blue-600" /> Categoria & Serviço:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800">{servicoSel?.descricao}</span>
                        <button onClick={() => setCurrentStep(3)} className="text-blue-600 hover:text-blue-800 p-1" title="Alterar">
                          <Edit3 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="font-semibold text-slate-600 flex items-center"><FolderKanban size={14} className="mr-2 text-blue-600" /> Projeto:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800">{projetoSel?.descricao}</span>
                        <button onClick={() => setCurrentStep(5)} className="text-blue-600 hover:text-blue-800 p-1" title="Alterar">
                          <Edit3 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="font-semibold text-slate-600 flex items-center"><User size={14} className="mr-2 text-blue-600" /> Solicitante:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800">
                          {solicitanteSel?.id === 'eu' ? `EU (${usuario?.nome?.toUpperCase() || 'PRÓPRIO SOLICITANTE'})` : solicitanteSel?.descricao}
                        </span>
                        <button onClick={() => setCurrentStep(6)} className="text-blue-600 hover:text-blue-800 p-1" title="Alterar">
                          <Edit3 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Formulário Final de Data/Hora & Observações */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Agendamento de Data e Hora Saída */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center border-b border-slate-100 pb-2">
                      <Calendar size={16} className="mr-2 text-blue-600" /> Programação de Data e Horário
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                          Data Programada <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="date" 
                          required
                          className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 shadow-sm"
                          value={dataProgramada}
                          onChange={(e) => setDataProgramada(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                          Hora Saída <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                        </label>
                        <input 
                          type="time" 
                          className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 shadow-sm"
                          value={horarioSaida}
                          onChange={(e) => setHorarioSaida(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Observações Adicionais (Obrigatório) */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center">
                      <FileText size={16} className="mr-2 text-blue-600" /> Observações Adicionais <span className="text-red-500 ml-1">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Descreva detalhes importantes sobre a carga, horário limite ou instruções de rota..."
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 resize-none shadow-sm font-medium text-slate-800"
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                    ></textarea>
                  </div>

                  {/* Botões do Rodapé */}
                  <div className="pt-4 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCloseAll}
                      className="px-5 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200/60 transition-colors text-sm"
                    >
                      Cancelar
                    </button>
                    
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-7 py-3 rounded-xl font-bold transition-all shadow-lg shadow-slate-900/20 flex items-center text-sm disabled:opacity-70"
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processando...
                        </div>
                      ) : (
                        <>
                          Salvar <Zap size={16} className="ml-2 text-emerald-400" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </SlideOverDrawer>

      {/* Modal de Sucesso */}
      <Modal isOpen={successModalOpen} onClose={handleFinish} title="Integração Concluída!">
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-slate-100 text-slate-900 rounded-full flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 bg-slate-900 rounded-full animate-ping opacity-20"></div>
            <CheckCircle2 size={42} className="relative z-10 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">OS Gerada com Sucesso!</h3>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed text-sm">
            Sua solicitação foi registrada e enviada para a fila de planejamento da logística (Integrado via Sankhya).
          </p>
          <button
            onClick={handleFinish}
            className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg text-sm flex items-center justify-center"
          >
            Acompanhar Pedidos
          </button>
        </div>
      </Modal>
    </>
  );
};
