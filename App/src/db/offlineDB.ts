import Dexie, { type Table } from 'dexie';
import type { ViagemMotorista, SyncAction, GpsPing, Notificacao, ChecklistAtividadeLocal } from '../types';

export class LogisticaAppDB extends Dexie {
  viagens!: Table<ViagemMotorista, string>; // string = idOS is the primary key
  syncQueue!: Table<SyncAction, number>; // number = auto-increment id
  gpsPings!: Table<GpsPing, number>;
  notificacoes!: Table<Notificacao, number>;
  checklists!: Table<ChecklistAtividadeLocal, number>;

  constructor() {
    super('LogisticaAppDB');
    this.version(1).stores({
      viagens: 'idOS, status, sequencia, sincronizadoOffline',
      syncQueue: '++id, type, timestamp',
    });
    this.version(2).stores({
      viagens: 'idOS, status, sequencia, sincronizadoOffline',
      syncQueue: '++id, type, timestamp',
      gpsPings: '++id, idOS, timestamp, synced',
      notificacoes: '++id, tipo, lida, timestamp',
    });
    this.version(3).stores({
      viagens: 'idOS, status, sequencia, sincronizadoOffline',
      syncQueue: '++id, type, timestamp',
      gpsPings: '++id, idOS, timestamp, synced',
      notificacoes: '++id, tipo, lida, timestamp',
      checklists: '++id, viagemId, sincronizado, timestamp',
    });
  }
}

export const db = new LogisticaAppDB();

// Populate initial mock data if empty
export const populateInitialData = async () => {
  const count = await db.viagens.count();
  if (count === 0) {
    const mockViagens: ViagemMotorista[] = [
      {
        idOS: 'OS-2026-0042',
        status: 'agendada',
        sequencia: 1,
        veiculoPlaca: 'ABC-1234',
        veiculoNome: 'Prancha Volvo',
        solicitanteNome: 'Carlos Silva',
        solicitanteDepartamento: 'Logística',
        origem: 'Sede (Mucugê)',
        origemCoords: { lat: -13.0051, lng: -41.3722 },
        destino: 'Lote 12 (Campo de Batata)',
        destinoCoords: { lat: -13.0230, lng: -41.3540 },
        projeto: 'PRODUÇÃO DE BATATA FCB 2026',
        tipoCarga: 'Trator Massey Ferguson 6713',
        observacoes: 'Atenção ao desnível no Lote 12',
        dataHoraProgramada: new Date().toISOString(),
        kmRegistrado: 125000,
        kmInicial: 125000,
        sincronizadoOffline: true,
      },
      {
        idOS: 'OS-2026-0043',
        status: 'agendada',
        sequencia: 2,
        veiculoPlaca: 'ABC-1234',
        veiculoNome: 'Prancha Volvo',
        solicitanteNome: 'Mariana Costa',
        solicitanteDepartamento: 'Insumos',
        origem: 'Lote 12 (Campo de Batata)',
        origemCoords: { lat: -13.0230, lng: -41.3540 },
        destino: 'Galpão de Insumos',
        destinoCoords: { lat: -13.0110, lng: -41.3800 },
        projeto: 'PRODUÇÃO DE BATATA FCB 2026',
        tipoCarga: 'Recolhimento de Bag de Adubo',
        observacoes: 'Bags podem estar molhados.',
        dataHoraProgramada: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
        kmRegistrado: 125200,
        kmInicial: 125200,
        sincronizadoOffline: true,
      },
      {
        idOS: 'OS-2026-0039',
        status: 'concluida',
        sequencia: 3,
        veiculoPlaca: 'XYZ-9876',
        veiculoNome: 'Caminhão Pipa',
        solicitanteNome: 'Roberto Almeida',
        solicitanteDepartamento: 'Irrigação',
        origem: 'Posto Central',
        origemCoords: { lat: -13.0080, lng: -41.3650 },
        destino: 'Sede (Mucugê)',
        destinoCoords: { lat: -13.0051, lng: -41.3722 },
        projeto: 'MANUTENÇÃO GERAL',
        tipoCarga: 'Água',
        dataHoraProgramada: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        kmRegistrado: 201000,
        kmInicial: 201000,
        kmFinal: 201050,
        sincronizadoOffline: true,
      },
    ];
    
    // add kmRegistrado to first mock
    mockViagens[0].kmRegistrado = 125000;
    mockViagens[1].kmRegistrado = 125200;

    await db.viagens.bulkAdd(mockViagens);
    console.log('Mock data populated!');
  }

  const notificacoesCount = await db.notificacoes.count();
  if (notificacoesCount === 0) {
    await db.notificacoes.bulkAdd([
      {
        tipo: 'viagem_reagendada',
        mensagem: 'A viagem OS-2026-0043 foi reagendada para as 15:00.',
        lida: false,
        timestamp: new Date().toISOString()
      },
      {
        tipo: 'substituicao_motorista',
        mensagem: 'Você foi alocado para a viagem OS-2026-0042 no lugar de João Santos.',
        lida: true,
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString()
      }
    ]);
  }
};
