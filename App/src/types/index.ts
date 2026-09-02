// Dado real de vw_PainelMotoristaVeiculo (PRD seção 8.1), filtrado pelo nome do motorista
// logado — ver api/metas/minha-meta.ts. Só os campos que o motorista pode ver (nunca
// remuneração/custo de outro motorista, regra de privacidade do PRD 4.3).
export interface MetaMotorista {
  EquipamentoId: number;
  NomeEquipamento: string;
  Atividade: string | null;
  CompetenciaMeta: string;
  KmLHistorico: number | null;
  MetaKmL: number | null;
  KmLFuturo: number | null;
  CpkHistorico: number | null;
  MetaCpk: number | null;
  CpkFuturo: number | null;
  ReconhecimentoMensal: number | null;
  KmLRealizado: number | null;
  CpkRealizado: number | null;
  PercentualMetaKmL: number | null;
  PercentualMetaCpk: number | null;
  PosicaoRanking: number | null;
  TotalMotoristasAtividade: number | null;
}

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
  type: 'UPDATE_VIAGEM' | 'FINISH_VIAGEM' | 'START_VIAGEM' | 'CRIAR_CHECKLIST';
  payload: any;
  timestamp: string;
}

// Checklist de Atividade (ICO, PRD 4.5) — guardado localmente pro motorista ver o que já
// preencheu mesmo offline; `sincronizado` vira true quando o syncQueue confirma o envio real
// pro banco (App/api/checklist/criar.ts -> ChecklistAtividade/ChecklistAtividadeItem no SQL Server).
export interface ChecklistAtividadeLocal {
  id?: number;
  viagemId: string;
  motorista: string;
  respondidoPor: string;
  itens: { item: string; conforme: boolean; observacao?: string }[];
  observacao?: string;
  timestamp: string;
  sincronizado: boolean;
}
