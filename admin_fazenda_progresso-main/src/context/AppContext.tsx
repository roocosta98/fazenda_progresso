import { createContext, useContext, useState, useCallback } from 'react';
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
  aprovarEAgendarSolicitacao: (idOS: string, veiculoId: string, motoristaId: string, horarioConfirmado?: string, observacaoLogistica?: string) => void;
  reagendarSolicitacao: (idOS: string, novaData: string, novoHorario: string, observacaoLogistica: string) => void;
  cancelarSolicitacao: (idOS: string, motivo: string) => void;
  substituirMotorista: (idOS: string, novoMotorista: Motorista, justificativa?: string) => void;
  substituirVeiculo: (idOS: string, novoVeiculo: Veiculo, justificativa: string) => void;
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
    return `OS-${ano}-${count.toString().padStart(4, '0')}`;
  }, [solicitacoes]);

  const criarSolicitacao = (dados: Omit<SolicitacaoTransporte, 'id' | 'numeroOS' | 'status' | 'dataSolicitacao'>) => {
    const novaSolicitacao: SolicitacaoTransporte = {
      ...dados,
      id: `SOL-${Date.now()}`,
      numeroOS: gerarNumeroOS(),
      status: 'pendente',
      dataSolicitacao: new Date().toISOString()
    };
    setSolicitacoes(prev => [novaSolicitacao, ...prev]);
  };

  const aprovarEAgendarSolicitacao = (
    idOS: string, 
    veiculoId: string, 
    motoristaId: string, 
    horarioConfirmado?: string,
    observacaoLogistica?: string
  ) => {
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
          ...(horarioConfirmado && { horarioProgramado: horarioConfirmado }),
          ...(observacaoLogistica && { observacaoLogistica })
        };
      }
      return sol;
    }));

    // Disparo automático e obrigatório de notificações para Solicitante e Motorista
    const notifSolicitante: NotificacaoSimulada = {
      id: `NOT-SOL-${Date.now()}`,
      mensagem: `[WhatsApp Automático] Solicitante notificado: OS ${idOS} APROVADA para ${horarioConfirmado || 'horário agendado'}. Veículo: ${veiculo.modelo} (${veiculo.placa}) | Motorista: ${motorista.nome}.`,
      data: new Date().toISOString(),
      lida: false,
      tipo: 'whatsapp'
    };

    const notifMotorista: NotificacaoSimulada = {
      id: `NOT-MOT-${Date.now() + 1}`,
      mensagem: `[App/Push Motorista] Motorista ${motorista.nome} alocado na OS ${idOS} (${veiculo.modelo} - ${veiculo.placa}). Horário: ${horarioConfirmado || 'Definido'}.`,
      data: new Date().toISOString(),
      lida: false,
      tipo: 'sistema'
    };

    setNotificacoes(prev => [notifSolicitante, notifMotorista, ...prev]);
  };

  const reagendarSolicitacao = (idOS: string, novaData: string, novoHorario: string, observacaoLogistica: string) => {
    setSolicitacoes(prev => prev.map(sol => {
      if (sol.numeroOS === idOS) {
        return {
          ...sol,
          dataProgramada: novaData,
          horarioProgramado: novoHorario,
          reagendada: true,
          observacaoLogistica: sol.observacaoLogistica 
            ? `${sol.observacaoLogistica}\n[Reagendamento]: ${observacaoLogistica}`
            : `[Reagendamento]: ${observacaoLogistica}`
        };
      }
      return sol;
    }));

    const notifReagendamento: NotificacaoSimulada = {
      id: `NOT-REAG-${Date.now()}`,
      mensagem: `[WhatsApp Automático] OS ${idOS} foi REAGENDADA para ${novaData} às ${novoHorario}. Motivo: "${observacaoLogistica}". Solicitante e motorista notificados.`,
      data: new Date().toISOString(),
      lida: false,
      tipo: 'whatsapp'
    };
    setNotificacoes(prev => [notifReagendamento, ...prev]);
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

    const notifCancelamento: NotificacaoSimulada = {
      id: `NOT-CANCEL-${Date.now()}`,
      mensagem: `[WhatsApp Automático] OS ${idOS} CANCELADA pela logística. Motivo: "${motivo}". Solicitante e equipe notificados.`,
      data: new Date().toISOString(),
      lida: false,
      tipo: 'whatsapp'
    };
    setNotificacoes(prev => [notifCancelamento, ...prev]);
  };

  const substituirMotorista = (idOS: string, motorista: Motorista, justificativa?: string) => {
    setSolicitacoes(prev => prev.map(sol => {
      if (sol.numeroOS === idOS) {
        return { ...sol, motoristaAlocado: motorista };
      }
      return sol;
    }));

    const novaNotif: NotificacaoSimulada = {
      id: `NOT-SUBMOT-${Date.now()}`,
      mensagem: `[WhatsApp Automático] Motorista da OS ${idOS} alterado para ${motorista.nome}.${justificativa ? ` Motivo: "${justificativa}".` : ''} Novo motorista e solicitante notificados.`,
      data: new Date().toISOString(),
      lida: false,
      tipo: 'whatsapp'
    };
    setNotificacoes(prev => [novaNotif, ...prev]);
  };

  const substituirVeiculo = (idOS: string, veiculo: Veiculo, justificativa: string) => {
    setSolicitacoes(prev => prev.map(sol => {
      if (sol.numeroOS === idOS) {
        const veiculoAntigoNome = sol.veiculoAlocado ? `${sol.veiculoAlocado.modelo} (${sol.veiculoAlocado.placa})` : 'Nenhum';
        const novoHistorico = [
          ...(sol.historicoTrocaVeiculo || []),
          {
            data: new Date().toISOString(),
            veiculoAnterior: veiculoAntigoNome,
            veiculoNovo: `${veiculo.modelo} (${veiculo.placa})`,
            justificativa
          }
        ];
        return {
          ...sol,
          veiculoAlocado: veiculo,
          historicoTrocaVeiculo: novoHistorico
        };
      }
      return sol;
    }));

    const novaNotif: NotificacaoSimulada = {
      id: `NOT-SUBVEIC-${Date.now()}`,
      mensagem: `[WhatsApp Automático] Veículo da OS ${idOS} alterado para ${veiculo.modelo} (${veiculo.placa}). Motivo: "${justificativa}". Solicitante e motorista notificados.`,
      data: new Date().toISOString(),
      lida: false,
      tipo: 'whatsapp'
    };
    setNotificacoes(prev => [novaNotif, ...prev]);
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
      substituirMotorista,
      substituirVeiculo,
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

