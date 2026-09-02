import type { Usuario, Projeto, Veiculo, Motorista, SolicitacaoTransporte } from '../types';

export const MOCK_USUARIOS: Usuario[] = [
  { id: '1', idSankhya: 'S-1001', nome: 'João - Técnico de Campo', perfil: 'solicitante', departamento: 'Agrícola' },
  { id: '2', idSankhya: 'S-1002', nome: 'Carlos - Gestor de Frota', perfil: 'logistica', departamento: 'Logística' },
  { id: '3', idSankhya: 'S-1003', nome: 'Antônio - Motorista', perfil: 'motorista', departamento: 'Frota' },
];

export const MOCK_PROJETOS: Projeto[] = [
  { id: 'P-001', nome: 'PRODUÇÃO DE BATATA FCB 2026', centroCusto: 'CC-BATATA-26' },
  { id: 'P-002', nome: 'SAFRA SOJA LESTE 2026', centroCusto: 'CC-SOJA-L-26' },
  { id: 'P-003', nome: 'INFRAESTRUTURA E MANUTENÇÃO', centroCusto: 'CC-INFRA' },
];

export const MOCK_VEICULOS: Veiculo[] = [
  { id: 'V-025', placa: 'BXE-7320', modelo: 'ONIBUS M.BENZ 1318', tipo: 'Ônibus', status: 'disponivel', odometro: 142500 },
  { id: 'V-029', placa: 'CXU-6289', modelo: 'CAÇAMBA M.BENZ 1513', tipo: 'Caçamba', status: 'disponivel', odometro: 218900 },
  { id: 'V-032', placa: 'ICM-1818', modelo: 'ONIBUS M.BENZ 1620', tipo: 'Ônibus', status: 'disponivel', odometro: 98400 },
  { id: 'V-035', placa: 'IEU-7100', modelo: 'CAMINHAO M.BENZ 1313', tipo: 'Caminhão', status: 'disponivel', odometro: 310200 },
  { id: 'V-036', placa: 'ICY-0877', modelo: 'CAVALO MECANICO M.BENZ LS 1935', tipo: 'Prancha', status: 'disponivel', odometro: 450100 },
  { id: 'V-040', placa: 'JKL-9012', modelo: 'PICK-UP TOYOTA HILUX 4X4', tipo: 'Pick-up', status: 'disponivel', odometro: 65400 },
  { id: 'V-042', placa: 'MNO-3456', modelo: 'TRATOR JOHN DEERE 8335R', tipo: 'Trator', status: 'disponivel', odometro: 4200 },
  { id: 'V-045', placa: 'PQR-7890', modelo: 'COMBOIO MERCEDES BENZ 2726', tipo: 'Comboio', status: 'disponivel', odometro: 184300 },
  { id: 'V-048', placa: 'ABC-1234', modelo: 'PRANCHA 3 EIXOS HEAVY DUTY', tipo: 'Prancha', status: 'disponivel', odometro: 125000 },
];

export const MOCK_MOTORISTAS: Motorista[] = [
  { id: 'M-001', nome: 'Antônio Silva', telefone: '(61) 99999-1111', status: 'disponivel' },
  { id: 'M-002', nome: 'Pedro Santos', telefone: '(61) 99999-2222', status: 'disponivel' },
  { id: 'M-003', nome: 'José Oliveira', telefone: '(61) 99999-3333', status: 'disponivel' },
  { id: 'M-004', nome: 'Marcos Costa', telefone: '(61) 99999-4444', status: 'disponivel' },
  { id: 'M-005', nome: 'Raimundo Nonato', telefone: '(61) 99999-5555', status: 'disponivel' },
];

export const MOCK_SOLICITACOES: SolicitacaoTransporte[] = [
  {
    id: 'SOL-001',
    numeroOS: 'OS-2026-0001',
    solicitante: MOCK_USUARIOS[0],
    tipoServico: 'Carro Passeio',
    origem: 'Sedes',
    destino: 'Lote 12',
    dataSolicitacao: '2026-07-28T08:00:00Z',
    dataProgramada: '2026-07-30',
    horarioProgramado: '09:00',
    projeto: MOCK_PROJETOS[0],
    observacoes: 'Visita técnica ao lote 12',
    status: 'concluida',
    veiculoAlocado: MOCK_VEICULOS[2],
    motoristaAlocado: MOCK_MOTORISTAS[0],
    dadosExecucao: {
      kmInicial: 12500,
      kmFinal: 12540,
      dataHoraSaida: '2026-07-30T09:05:00Z',
      dataHoraChegada: '2026-07-30T14:30:00Z'
    }
  },
  {
    id: 'SOL-002',
    numeroOS: 'OS-2026-0002',
    solicitante: MOCK_USUARIOS[0],
    tipoServico: 'Prancha',
    origem: 'Galpão de Insumos',
    destino: 'Campo de Batata',
    dataSolicitacao: '2026-07-29T10:15:00Z',
    dataProgramada: '2026-07-31',
    horarioProgramado: '14:00',
    projeto: MOCK_PROJETOS[0],
    observacoes: 'Transporte de colheitadeira',
    status: 'agendada',
    veiculoAlocado: MOCK_VEICULOS[0],
    motoristaAlocado: MOCK_MOTORISTAS[3]
  },
  {
    id: 'SOL-003',
    numeroOS: 'OS-2026-0003',
    solicitante: MOCK_USUARIOS[0],
    tipoServico: 'Comboio',
    origem: 'Sedes',
    destino: 'Safra Leste',
    dataSolicitacao: '2026-07-30T07:30:00Z',
    dataProgramada: '2026-07-30',
    horarioProgramado: '10:00',
    projeto: MOCK_PROJETOS[1],
    observacoes: 'Abastecimento das máquinas no campo',
    status: 'em_execucao',
    veiculoAlocado: MOCK_VEICULOS[1],
    motoristaAlocado: MOCK_MOTORISTAS[1],
    dadosExecucao: {
      kmInicial: 45200,
      dataHoraSaida: '2026-07-30T10:10:00Z'
    }
  },
  {
    id: 'SOL-004',
    numeroOS: 'OS-2026-0004',
    solicitante: MOCK_USUARIOS[0],
    tipoServico: 'Trator',
    origem: 'Oficina Central',
    destino: 'Lote 15',
    dataSolicitacao: '2026-07-30T11:45:00Z',
    dataProgramada: '2026-08-01',
    horarioProgramado: '07:00',
    projeto: MOCK_PROJETOS[2],
    status: 'pendente'
  },
  {
    id: 'SOL-005',
    numeroOS: 'OS-2026-0005',
    solicitante: MOCK_USUARIOS[0],
    tipoServico: 'Ônibus',
    origem: 'Sedes',
    destino: 'Lote 12',
    dataSolicitacao: '2026-07-25T16:20:00Z',
    dataProgramada: '2026-07-26',
    horarioProgramado: '06:00',
    projeto: MOCK_PROJETOS[0],
    status: 'cancelada',
    motivoCancelamento: 'Chuva forte, impossível acessar o lote'
  },
  {
    id: 'SOL-006',
    numeroOS: 'OS-2026-0006',
    solicitante: MOCK_USUARIOS[0],
    tipoServico: 'Caçamba',
    origem: 'Pedreira',
    destino: 'Estrada Sul',
    dataSolicitacao: '2026-07-30T12:00:00Z',
    dataProgramada: '2026-08-02',
    horarioProgramado: '08:00',
    projeto: MOCK_PROJETOS[2],
    status: 'pendente'
  }
];
