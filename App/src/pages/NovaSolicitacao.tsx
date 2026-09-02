import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, 
  MapPin, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  ArrowLeft, 
  X, 
  Search, 
  ChevronRight, 
  User, 
  FolderKanban,
  Wrench,
  Edit3
} from 'lucide-react';
import { db } from '../db/offlineDB';

// 1. CATEGORIAS DE SERVIÇO (Camada 1)
const CATEGORIAS_SERVICO = [
  { id: 'CAT-VIAGEM', codigo: 'CAT-VIAGEM', nome: 'VIAGEM', descricao: 'Deslocamentos intermunicipais e rotas estaduais', icone: MapPin },
  { id: 'CAT-TRANSPORTE', codigo: 'CAT-TRANSPORTE', nome: 'TRANSPORTE', descricao: 'Transporte de produtos, insumos, pessoal e materiais', icone: Truck },
  { id: 'CAT-COLHEITA', codigo: 'CAT-COLHEITA', nome: 'COLHEITA', descricao: 'Operações e apoio logístico de colheita', icone: Wrench },
  { id: 'CAT-OUTROS', codigo: 'CAT-OUTROS', nome: 'OUTROS', descricao: 'Outros serviços e atendimentos diversos', icone: FileText },
];

// 2. SERVIÇOS SANKHYA POR CATEGORIA (Camada 2)
const SERVICOS_SANKHYA = [
  // VIAGEM
  { id: 'SRV-V01', codigo: 'VIAGEM-01', categoriaId: 'CAT-VIAGEM', descricao: 'VIAGEM BARRA DA ESTIVA' },
  { id: 'SRV-V02', codigo: 'VIAGEM-02', categoriaId: 'CAT-VIAGEM', descricao: 'VIAGEM CASCAVEL' },
  { id: 'SRV-V03', codigo: 'VIAGEM-03', categoriaId: 'CAT-VIAGEM', descricao: 'VIAGEM MUCUGE' },
  { id: 'SRV-V04', codigo: 'VIAGEM-04', categoriaId: 'CAT-VIAGEM', descricao: 'VIAGEM RANCHO X' },
  { id: 'SRV-V05', codigo: 'VIAGEM-05', categoriaId: 'CAT-VIAGEM', descricao: 'VIAGEM VITORIA DA CONQUISTA' },
  { id: 'SRV-V06', codigo: 'VIAGEM-06', categoriaId: 'CAT-VIAGEM', descricao: 'VIAGEM' },

  // TRANSPORTE
  { id: 'SRV-T01', codigo: 'TR-01', categoriaId: 'CAT-TRANSPORTE', descricao: 'COLETA DE MERCADORIAS' },
  { id: 'SRV-T02', codigo: 'TR-02', categoriaId: 'CAT-TRANSPORTE', descricao: 'ENTREGA DE PRODUTOS VENDIDOS' },
  { id: 'SRV-T03', codigo: 'TR-03', categoriaId: 'CAT-TRANSPORTE', descricao: 'TRANSPORTE DE PESSOAL' },
  { id: 'SRV-T04', codigo: 'TR-04', categoriaId: 'CAT-TRANSPORTE', descricao: 'BENEFICIAMENTO DE BATATA' },
  { id: 'SRV-T05', codigo: 'TR-05', categoriaId: 'CAT-TRANSPORTE', descricao: 'CARREGAMENTO DE CAFÉ' },
  { id: 'SRV-T06', codigo: 'TR-06', categoriaId: 'CAT-TRANSPORTE', descricao: 'TRANSPORTE BATATA SEMENTE' },
  { id: 'SRV-T07', codigo: 'TR-07', categoriaId: 'CAT-TRANSPORTE', descricao: 'TRANSPORTE DE ÁGUA' },
  { id: 'SRV-T08', codigo: 'TR-08', categoriaId: 'CAT-TRANSPORTE', descricao: 'TRANSPORTE DE ÁGUA ESCOLA' },
  { id: 'SRV-T09', codigo: 'TR-09', categoriaId: 'CAT-TRANSPORTE', descricao: 'TRANSPORTE DE BATATA' },
  { id: 'SRV-T10', codigo: 'TR-10', categoriaId: 'CAT-TRANSPORTE', descricao: 'TRANSPORTE DE CAFÉ' },
  { id: 'SRV-T11', codigo: 'TR-11', categoriaId: 'CAT-TRANSPORTE', descricao: 'TRANSPORTE DE CANOS E ADUTORAS' },
  { id: 'SRV-T12', codigo: 'TR-12', categoriaId: 'CAT-TRANSPORTE', descricao: 'TRANSPORTE DE CAPIM' },
  { id: 'SRV-T13', codigo: 'TR-13', categoriaId: 'CAT-TRANSPORTE', descricao: 'TRANSPORTE DE COMBUSTÍVEL' },
  { id: 'SRV-T14', codigo: 'TR-14', categoriaId: 'CAT-TRANSPORTE', descricao: 'TRANSPORTE DE FUNCIONÁRIOS' },
  { id: 'SRV-T15', codigo: 'TR-15', categoriaId: 'CAT-TRANSPORTE', descricao: 'TRANSPORTE DE INSUMOS' },
  { id: 'SRV-T16', codigo: 'TR-16', categoriaId: 'CAT-TRANSPORTE', descricao: 'TRANSPORTE DE LAMA-CASCALHO-AREIA' },
  { id: 'SRV-T17', codigo: 'TR-17', categoriaId: 'CAT-TRANSPORTE', descricao: 'TRANSPORTE DE MÁQUINAS E EQUIPAMENTOS' },
  { id: 'SRV-T18', codigo: 'TR-18', categoriaId: 'CAT-TRANSPORTE', descricao: 'TRANSPORTE DIVERSOS' },

  // COLHEITA
  { id: 'SRV-C01', codigo: 'COL-01', categoriaId: 'CAT-COLHEITA', descricao: 'COLHEITA MANUAL BATATA CONSUMO' },
  { id: 'SRV-C02', codigo: 'COL-02', categoriaId: 'CAT-COLHEITA', descricao: 'COLHEITA MANUAL BATATA SEMENTE' },

  // OUTROS
  { id: 'SRV-O01', codigo: 'OUT-01', categoriaId: 'CAT-OUTROS', descricao: 'TRANSPORTE DIVERSOS' },
];

// 3. PROJETOS SANKHYA
const PROJETOS_SANKHYA = [
  { id: '4110100', codigo: '4110100', descricao: '4110100 - BENEFICIAMENTO BATATA 2024', nome: 'BENEFICIAMENTO BATATA 2024' },
  { id: '6010100', codigo: '6010100', descricao: '6010100 - FP1P01 - BATATA SEMENTE 2026', nome: 'FP1P01 - BATATA SEMENTE 2026' },
  { id: '6010500', codigo: '6010500', descricao: '6010500 - FP1P05 - BATATA 2026', nome: 'FP1P05 - BATATA 2026' },
  { id: '6010501', codigo: '6010501', descricao: '6010501 - FP1P05 - LOTE 01 BATATA 2026', nome: 'FP1P05 - LOTE 01 BATATA 2026' },
  { id: '6010502', codigo: '6010502', descricao: '6010502 - FP1P05 - LOTE 02 BATATA 2026', nome: 'FP1P05 - LOTE 02 BATATA 2026' },
  { id: '6010600', codigo: '6010600', descricao: '6010600 - SAFRA SOJA LESTE 2026', nome: 'SAFRA SOJA LESTE 2026' },
  { id: '6010700', codigo: '6010700', descricao: '6010700 - INFRAESTRUTURA E MANUTENÇÃO SEDE', nome: 'INFRAESTRUTURA E MANUTENÇÃO SEDE' },
];

// 4. SOLICITANTES SANKHYA (EU PRÓPRIO primeiro)
const SOLICITANTES_SANKHYA = [
  { id: 'eu', codigo: '9021', descricao: 'EU (PRÓPRIO)', nome: 'Carlos Silva (Solicitante)' },
  { id: '1001', codigo: '1001', descricao: '1001 - JOÃO - TÉCNICO DE CAMPO', nome: 'João - Técnico de Campo' },
  { id: '1002', codigo: '1002', descricao: '1002 - CARLOS - GESTOR DE FROTA', nome: 'Carlos - Gestor de Frota' },
  { id: '1003', codigo: '1003', descricao: '1003 - ANTÔNIO - OPERADOR LOGÍSTICO', nome: 'Antônio - Operador Logístico' },
  { id: '1004', codigo: '1004', descricao: '1004 - MARIA SILVA - ENGENHEIRA AGRÔNOMA', nome: 'Maria Silva - Engenheira Agrônoma' },
  { id: '1005', codigo: '1005', descricao: '1005 - ROBERTO SOUZA - SUPERVISOR DE OPERAÇÕES', nome: 'Roberto Souza - Supervisor de Operações' },
  { id: '1006', codigo: '1006', descricao: '1006 - FERNANDO ALVES - GERENTE AGRÍCOLA', nome: 'Fernando Alves - Gerente Agrícola' },
];

// 5. LOCAIS SANKHYA (Origem / Destino)
const LOCAIS_SANKHYA = [
  '101 - FAZENDA PROGRESSO - SEDE',
  '102 - SILO PRINCIPAL / ARMAZÉM',
  '103 - OFICINA CENTRAL & ABASTECIMENTO',
  '104 - GALPÃO DE INSUMOS E DEFENSIVOS',
  '105 - LOTE 01 - CAMPO DE BATATA SEMENTE',
  '106 - LOTE 04 - CAMPO DE SILAGEM',
  '107 - LOTE 12 - SAFRA SOJA LESTE',
  '108 - LOTE 15 - CAMPO DE MILHO',
  '109 - PEDREIRA / USINA DE BRITAGEM',
  '110 - BALANÇA ROVIARA',
  '111 - LAVA JATO / GARAGEM CENTRAL',
  '112 - PONTO DE TRANSBORDO PORTO'
];

export const NovaSolicitacao: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Seleções
  const [origemSel, setOrigemSel] = useState<string | null>(null);
  const [destinoSel, setDestinoSel] = useState<string | null>(null);
  const [categoriaSel, setCategoriaSel] = useState<typeof CATEGORIAS_SERVICO[0] | null>(null);
  const [servicoSel, setServicoSel] = useState<typeof SERVICOS_SANKHYA[0] | null>(null);
  const [projetoSel, setProjetoSel] = useState<typeof PROJETOS_SANKHYA[0] | null>(null);
  const [solicitanteSel, setSolicitanteSel] = useState<typeof SOLICITANTES_SANKHYA[0] | null>(SOLICITANTES_SANKHYA[0]);

  // Campos finais (Etapa 7)
  const [dataProgramada, setDataProgramada] = useState(new Date().toISOString().split('T')[0]);
  const [horarioSaida, setHorarioSaida] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [createdOsId, setCreatedOsId] = useState('');

  const handleBackStep = () => {
    setSearchTerm('');
    if (currentStep > 1) {
      setCurrentStep(prev => (prev - 1) as any);
    } else {
      navigate('/viagens');
    }
  };

  const handleCloseAll = () => {
    navigate('/viagens');
  };

  const handleSelectOrigem = (loc: string) => {
    setOrigemSel(loc);
    setSearchTerm('');
    setCurrentStep(2);
  };

  const handleSelectDestino = (loc: string) => {
    setDestinoSel(loc);
    setSearchTerm('');
    setCurrentStep(3);
  };

  const handleSelectCategoria = (cat: typeof CATEGORIAS_SERVICO[0]) => {
    setCategoriaSel(cat);
    setServicoSel(null);
    setSearchTerm('');
    setCurrentStep(4);
  };

  const handleSelectServico = (item: typeof SERVICOS_SANKHYA[0]) => {
    setServicoSel(item);
    setSearchTerm('');
    setCurrentStep(5);
  };

  const handleSelectProjeto = (item: typeof PROJETOS_SANKHYA[0]) => {
    setProjetoSel(item);
    setSearchTerm('');
    setCurrentStep(6);
  };

  const handleSelectSolicitante = (item: typeof SOLICITANTES_SANKHYA[0]) => {
    setSolicitanteSel(item);
    setSearchTerm('');
    setCurrentStep(7);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origemSel || !destinoSel || !categoriaSel || !servicoSel || !projetoSel || !solicitanteSel || !observacoes.trim()) {
      return;
    }

    setIsLoading(true);

    try {
      const generatedNumber = Math.floor(1000 + Math.random() * 9000);
      const newOsId = `OS-2026-${generatedNumber}`;
      setCreatedOsId(newOsId);

      const totalExisting = await db.viagens.count();
      const nomeSolicitanteFinal = solicitanteSel.id === 'eu' ? 'Carlos Silva (Solicitante)' : solicitanteSel.nome;

      let horarioFormatado = '';
      if (horarioSaida) {
        horarioFormatado = `Saída: ${horarioSaida}`;
      }

      await db.viagens.add({
        idOS: newOsId,
        status: 'agendada',
        sequencia: totalExisting + 1,
        veiculoPlaca: 'A DEFINIR',
        veiculoNome: 'Veículo a Alocar (Logística)',
        solicitanteNome: nomeSolicitanteFinal,
        solicitanteDepartamento: 'Operações App',
        origem: origemSel,
        destino: destinoSel,
        projeto: projetoSel.nome,
        tipoCarga: servicoSel.descricao,
        observacoes: `${horarioFormatado ? `[${horarioFormatado}] ` : ''}${observacoes.trim()}`,
        dataHoraProgramada: new Date(dataProgramada).toISOString(),
        kmRegistrado: 0,
        sincronizadoOffline: true,
      });

      await db.notificacoes.add({
        tipo: 'viagem_reagendada',
        mensagem: `Sua solicitação ${newOsId} (${servicoSel.descricao}) foi criada com sucesso!`,
        lida: false,
        timestamp: new Date().toISOString()
      });

      await db.syncQueue.add({
        type: 'START_VIAGEM',
        payload: { idOS: newOsId, timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString()
      });

      setIsLoading(false);
      setSuccessModalOpen(true);
    } catch (err) {
      console.error('Erro ao criar solicitação:', err);
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    setSuccessModalOpen(false);
    navigate('/viagens');
  };

  const getHeaderTitle = () => {
    switch (currentStep) {
      case 1: return 'SELEÇÃO DA ORIGEM';
      case 2: return 'SELEÇÃO DO DESTINO';
      case 3: return 'CATEGORIA DE SERVIÇO';
      case 4: return 'TIPO DE SERVIÇO';
      case 5: return 'SELEÇÃO DO PROJETO';
      case 6: return 'SELEÇÃO DO SOLICITANTE';
      case 7: return 'CONFIRMAÇÃO DA SOLICITAÇÃO';
    }
  };

  const filteredLocaisOrigem = LOCAIS_SANKHYA.filter(loc =>
    loc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLocaisDestino = LOCAIS_SANKHYA.filter(loc =>
    loc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCategorias = CATEGORIAS_SERVICO.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredServicos = SERVICOS_SANKHYA.filter(s =>
    (!categoriaSel || s.categoriaId === categoriaSel.id) &&
    s.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProjetos = PROJETOS_SANKHYA.filter(p =>
    p.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSolicitantes = SOLICITANTES_SANKHYA.filter(s =>
    s.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full overflow-x-hidden">
      
      {/* Header Verde Premium da Tela */}
      <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-800 text-white px-4 pt-10 pb-4 sticky top-0 z-30 shadow-md">
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
            <h2 className="text-lg font-extrabold tracking-wider uppercase">
              {getHeaderTitle()}
            </h2>
            <div className="text-[11px] font-medium text-emerald-100/90 tracking-wide mt-0.5">
              Etapa {currentStep} de 7
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
        <div className="w-full bg-emerald-950/40 h-1.5 rounded-full mt-3 overflow-hidden">
          <div 
            className="bg-emerald-300 h-full transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / 7) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Campo de Pesquisa no Topo (Passos 1 a 6) */}
      {currentStep >= 1 && currentStep <= 6 && (
        <div className="p-4 bg-white border-b border-slate-200 shadow-sm sticky top-[88px] z-20">
          <div className="relative flex items-center bg-slate-50 rounded-2xl border border-slate-200 px-3 py-2.5 focus-within:bg-white focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mr-3 shrink-0">
              <Search size={18} />
            </div>
            <input 
              type="text"
              className="w-full bg-transparent text-sm outline-none font-medium text-slate-800 placeholder-slate-400"
              placeholder={`Pesquisar ${getHeaderTitle().toLowerCase()}...`}
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

      {/* Conteúdo Principal */}
      <div className="flex-1 bg-white">
        
        {/* ETAPA 1: SELEÇÃO DA ORIGEM */}
        {currentStep === 1 && (
          <div className="divide-y divide-slate-100">
            {filteredLocaisOrigem.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium">Nenhum local de origem encontrado</div>
            ) : (
              filteredLocaisOrigem.map((loc) => (
                <div 
                  key={loc}
                  onClick={() => handleSelectOrigem(loc)}
                  className="flex items-center justify-between px-5 py-4 hover:bg-emerald-50/70 cursor-pointer transition-all duration-150 group border-b border-slate-100"
                >
                  <div className="flex items-center space-x-3 pr-4">
                    <MapPin size={18} className="text-emerald-600 shrink-0" />
                    <span className="text-sm font-semibold text-slate-800 uppercase tracking-wide group-hover:text-emerald-900 leading-snug">
                      {loc}
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              ))
            )}
          </div>
        )}

        {/* ETAPA 2: SELEÇÃO DO DESTINO */}
        {currentStep === 2 && (
          <div className="divide-y divide-slate-100">
            {filteredLocaisDestino.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium">Nenhum local de destino encontrado</div>
            ) : (
              filteredLocaisDestino.map((loc) => (
                <div 
                  key={loc}
                  onClick={() => handleSelectDestino(loc)}
                  className="flex items-center justify-between px-5 py-4 hover:bg-emerald-50/70 cursor-pointer transition-all duration-150 group border-b border-slate-100"
                >
                  <div className="flex items-center space-x-3 pr-4">
                    <MapPin size={18} className="text-red-500 shrink-0" />
                    <span className="text-sm font-semibold text-slate-800 uppercase tracking-wide group-hover:text-emerald-900 leading-snug">
                      {loc}
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              ))
            )}
          </div>
        )}

        {/* ETAPA 3: CATEGORIA DE SERVIÇO (CAMADA 1) */}
        {currentStep === 3 && (
          <div className="divide-y divide-slate-100 p-3 space-y-3">
            {filteredCategorias.map((cat) => {
              const IconeCat = cat.icone;
              return (
                <div 
                  key={cat.id}
                  onClick={() => handleSelectCategoria(cat)}
                  className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 cursor-pointer transition-all shadow-sm group bg-white"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <IconeCat size={22} />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-800 group-hover:text-emerald-900">
                        {cat.nome}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {cat.descricao}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              );
            })}
          </div>
        )}

        {/* ETAPA 4: TIPO DE SERVIÇO (CAMADA 2) */}
        {currentStep === 4 && (
          <div className="divide-y divide-slate-100">
            <div className="bg-emerald-50 px-5 py-2.5 text-xs font-bold text-emerald-800 uppercase tracking-wide border-b border-emerald-100">
              Categoria: {categoriaSel?.nome}
            </div>
            {filteredServicos.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium">Nenhum tipo de serviço encontrado para esta categoria</div>
            ) : (
              filteredServicos.map((s) => (
                <div 
                  key={s.id}
                  onClick={() => handleSelectServico(s)}
                  className="flex items-center justify-between px-5 py-4 hover:bg-emerald-50/70 cursor-pointer transition-all duration-150 group border-b border-slate-100"
                >
                  <div className="flex items-center space-x-3 pr-4">
                    <Wrench size={18} className="text-slate-400 group-hover:text-emerald-600 shrink-0" />
                    <span className="text-sm font-semibold text-slate-800 uppercase tracking-wide group-hover:text-emerald-900 leading-snug">
                      {s.descricao}
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              ))
            )}
          </div>
        )}

        {/* ETAPA 5: SELEÇÃO DO PROJETO (ÚNICO) */}
        {currentStep === 5 && (
          <div className="divide-y divide-slate-100">
            {filteredProjetos.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium">Nenhum projeto encontrado</div>
            ) : (
              filteredProjetos.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => handleSelectProjeto(p)}
                  className="flex items-center justify-between px-5 py-4 hover:bg-emerald-50/70 cursor-pointer transition-all duration-150 group border-b border-slate-100"
                >
                  <div className="flex items-center space-x-3 pr-4">
                    <FolderKanban size={18} className="text-slate-400 group-hover:text-emerald-600 shrink-0" />
                    <span className="text-sm font-semibold text-slate-800 uppercase tracking-wide group-hover:text-emerald-900 leading-snug">
                      {p.descricao}
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              ))
            )}
          </div>
        )}

        {/* ETAPA 6: SELEÇÃO DO SOLICITANTE */}
        {currentStep === 6 && (
          <div className="divide-y divide-slate-100">
            {filteredSolicitantes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium">Nenhum solicitante encontrado</div>
            ) : (
              filteredSolicitantes.map((sol) => {
                const isEu = sol.id === 'eu';
                return (
                  <div 
                    key={sol.id}
                    onClick={() => handleSelectSolicitante(sol)}
                    className={`flex items-center justify-between px-5 py-4 hover:bg-emerald-50/70 cursor-pointer transition-all duration-150 group border-b border-slate-100 ${
                      isEu ? 'bg-emerald-50/60 font-bold' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3 pr-4">
                      <User size={18} className={`${isEu ? 'text-emerald-700 font-bold' : 'text-slate-400'} group-hover:text-emerald-600 shrink-0`} />
                      <span className={`text-sm tracking-wide uppercase group-hover:text-emerald-900 leading-snug ${
                        isEu ? 'font-black text-emerald-950' : 'font-semibold text-slate-800'
                      }`}>
                        {sol.descricao}
                      </span>
                    </div>
                    <ChevronRight size={18} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ETAPA 7: CONFIRMAÇÃO DA SOLICITAÇÃO & PROGRAMAÇÃO */}
        {currentStep === 7 && (
          <div className="p-5 bg-slate-50 min-h-full space-y-5 pb-12">
            
            {/* Resumo dos itens selecionados */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resumo da Solicitação</span>
                <span className="text-[11px] text-emerald-600 font-bold">6 de 6 Definidos</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-slate-600 flex items-center"><MapPin size={14} className="mr-2 text-emerald-600" /> Origem:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-800 truncate max-w-[170px]">{origemSel}</span>
                    <button onClick={() => setCurrentStep(1)} className="text-emerald-600 hover:text-emerald-800 p-1" title="Alterar">
                      <Edit3 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-slate-600 flex items-center"><MapPin size={14} className="mr-2 text-red-500" /> Destino:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-800 truncate max-w-[170px]">{destinoSel}</span>
                    <button onClick={() => setCurrentStep(2)} className="text-emerald-600 hover:text-emerald-800 p-1" title="Alterar">
                      <Edit3 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-slate-600 flex items-center"><Wrench size={14} className="mr-2 text-emerald-600" /> Serviço:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-800 truncate max-w-[170px]">{servicoSel?.descricao}</span>
                    <button onClick={() => setCurrentStep(3)} className="text-emerald-600 hover:text-emerald-800 p-1" title="Alterar">
                      <Edit3 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-slate-600 flex items-center"><FolderKanban size={14} className="mr-2 text-emerald-600" /> Projeto:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-800 truncate max-w-[170px]">{projetoSel?.descricao}</span>
                    <button onClick={() => setCurrentStep(5)} className="text-emerald-600 hover:text-emerald-800 p-1" title="Alterar">
                      <Edit3 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-slate-600 flex items-center"><User size={14} className="mr-2 text-emerald-600" /> Solicitante:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-800 truncate max-w-[170px]">{solicitanteSel?.descricao}</span>
                    <button onClick={() => setCurrentStep(6)} className="text-emerald-600 hover:text-emerald-800 p-1" title="Alterar">
                      <Edit3 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulário de Programação e Observações Mandatory */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Programação */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center border-b border-slate-100 pb-2">
                  <Calendar size={16} className="mr-2 text-emerald-600" /> Programação
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                      Data Programada <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="date" 
                      required
                      className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm focus:ring-2 focus:ring-emerald-500"
                      value={dataProgramada}
                      onChange={(e) => setDataProgramada(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                      Horário de Saída <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                    </label>
                    <input 
                      type="time" 
                      className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm focus:ring-2 focus:ring-emerald-500"
                      value={horarioSaida}
                      onChange={(e) => setHorarioSaida(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Observações Adicionais (Obrigatório) */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                  <span className="flex items-center">
                    <FileText size={16} className="mr-2 text-emerald-600" /> Observações Adicionais <span className="text-red-500 ml-1">*</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Obrigatório</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Informe detalhes importantes sobre a carga, urgência, especificações ou pontos de atenção..."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 resize-none shadow-sm font-medium"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                ></textarea>
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseAll}
                  className="px-4 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200/60 transition-colors text-sm"
                >
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  disabled={isLoading || !observacoes.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-700/20 flex items-center text-sm disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Enviando Solicitação...
                    </div>
                  ) : (
                    <>
                      Confirmar Solicitação <CheckCircle2 size={16} className="ml-2" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Modal de Sucesso */}
      {successModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-25"></div>
              <CheckCircle2 size={36} className="relative z-10" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-1">{createdOsId} Criada com Sucesso!</h3>
            <p className="text-slate-500 mb-6 text-xs leading-relaxed">
              Sua solicitação foi registrada no sistema e encaminhada para a equipe de Logística!
            </p>
            <button
              onClick={handleFinish}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg text-sm flex items-center justify-center"
            >
              Ver Minhas Viagens
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
