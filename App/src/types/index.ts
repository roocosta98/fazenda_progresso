export type StatusViagem = 'agendada' | 'em_execucao' | 'concluida';

export interface ViagemMotorista {
  idOS: string;
  status: StatusViagem;
  sequencia: number;
  veiculoPlaca: string;
  veiculoNome: string;
  solicitanteNome: string;
  solicitanteDepartamento?: string;
  origem: string;
  origemCoords?: { lat: number; lng: number };
  destino: string;
  destinoCoords?: { lat: number; lng: number };
  projeto: string;
  tipoCarga: string;
  observacoes?: string;
  dataHoraProgramada?: string;
  kmRegistrado?: number;
  kmInicial?: number;
  divergenciaKm?: string;
  kmFinal?: number;
  dataHoraSaida?: string;
  dataHoraChegada?: string;
  assinaturaRecebedor?: string;
  nomeRecebedor?: string;
  fotoComprovante?: string;
  sincronizadoOffline: boolean;
}

export interface GpsPing {
  id?: number;
  idOS: string;
  lat: number;
  lng: number;
  timestamp: string;
  synced: boolean;
}

export interface Notificacao {
  id?: number;
  tipo: 'viagem_reagendada' | 'viagem_cancelada' | 'substituicao_motorista';
  mensagem: string;
  lida: boolean;
  timestamp: string;
}

export interface SyncAction {
  id?: number; // auto-increment from Dexie
  type: 'UPDATE_VIAGEM' | 'FINISH_VIAGEM' | 'START_VIAGEM';
  payload: any;
  timestamp: string;
}
