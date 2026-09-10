export type PerfilUsuario = 'solicitante' | 'logistica' | 'motorista';

export interface Usuario {
  id: string;
  idSankhya?: string;
  nome: string;
  perfil: PerfilUsuario;
  departamento?: string;
}

export type StatusVeiculo = 'disponivel' | 'em_uso' | 'manutencao';

export interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  tipo: string;
  status: StatusVeiculo;
  odometro?: number;
}

export type StatusMotorista = 'disponivel' | 'em_rota' | 'folga';

export interface Motorista {
  id: string;
  nome: string;
  telefone: string;
  status: StatusMotorista;
}

export interface Projeto {
  id: string;
  nome: string;
  centroCusto: string;
}

export type StatusSolicitacao = 'pendente' | 'agendada' | 'em_execucao' | 'concluida' | 'cancelada';

export interface SolicitacaoTransporte {
  id: string;
  numeroOS: string;
  solicitante: Usuario;
  tipoServico: string;
  origem: string;
  destino: string;
  dataSolicitacao: string;
  dataProgramada?: string;
  horarioProgramado?: string;
  projeto: Projeto;
  observacoes?: string;
  status: StatusSolicitacao;
  veiculoAlocado?: Veiculo;
  motoristaAlocado?: Motorista;
  dadosExecucao?: {
    kmInicial?: number;
    kmFinal?: number;
    dataHoraSaida?: string;
    dataHoraChegada?: string;
  };
  observacaoLogistica?: string;
  motivoCancelamento?: string;
  reagendada?: boolean;
  emAtraso?: boolean;
  historicoTrocaVeiculo?: Array<{
    data: string;
    veiculoAnterior: string;
    veiculoNovo: string;
    justificativa: string;
  }>;
  indicadorComunicacao?: { status: 'online' | 'offline' | 'alerta'; ultimaComunicacao: string; mensagem?: string };
}

export interface NotificacaoSimulada {
  id: string;
  mensagem: string;
  data: string;
  lida: boolean;
  tipo: 'sankhya' | 'whatsapp' | 'sistema';
}
