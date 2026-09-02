import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [joao, carlos, antonio] = await Promise.all([
    prisma.usuario.create({ data: { idSankhya: 'S-1001', nome: 'João - Técnico de Campo', perfil: 'solicitante', departamento: 'Agrícola' } }),
    prisma.usuario.create({ data: { idSankhya: 'S-1002', nome: 'Carlos - Gestor de Frota', perfil: 'logistica', departamento: 'Logística' } }),
    prisma.usuario.create({ data: { idSankhya: 'S-1003', nome: 'Antônio - Motorista', perfil: 'motorista', departamento: 'Frota' } }),
  ]);

  const [projBatata, projSoja, projInfra] = await Promise.all([
    prisma.projeto.create({ data: { nome: 'PRODUÇÃO DE BATATA FCB 2026', centroCusto: 'CC-BATATA-26' } }),
    prisma.projeto.create({ data: { nome: 'SAFRA SOJA LESTE 2026', centroCusto: 'CC-SOJA-L-26' } }),
    prisma.projeto.create({ data: { nome: 'INFRAESTRUTURA E MANUTENÇÃO', centroCusto: 'CC-INFRA' } }),
  ]);

  const veiculos = await Promise.all([
    prisma.veiculo.create({ data: { placa: 'BXE-7320', modelo: 'ONIBUS M.BENZ 1318', tipo: 'Ônibus', status: 'disponivel', odometro: 142500 } }),
    prisma.veiculo.create({ data: { placa: 'CXU-6289', modelo: 'CAÇAMBA M.BENZ 1513', tipo: 'Caçamba', status: 'disponivel', odometro: 218900 } }),
    prisma.veiculo.create({ data: { placa: 'ICM-1818', modelo: 'ONIBUS M.BENZ 1620', tipo: 'Ônibus', status: 'disponivel', odometro: 98400 } }),
    prisma.veiculo.create({ data: { placa: 'IEU-7100', modelo: 'CAMINHAO M.BENZ 1313', tipo: 'Caminhão', status: 'disponivel', odometro: 310200 } }),
    prisma.veiculo.create({ data: { placa: 'ICY-0877', modelo: 'CAVALO MECANICO M.BENZ LS 1935', tipo: 'Prancha', status: 'disponivel', odometro: 450100 } }),
    prisma.veiculo.create({ data: { placa: 'JKL-9012', modelo: 'PICK-UP TOYOTA HILUX 4X4', tipo: 'Pick-up', status: 'disponivel', odometro: 65400 } }),
    prisma.veiculo.create({ data: { placa: 'MNO-3456', modelo: 'TRATOR JOHN DEERE 8335R', tipo: 'Trator', status: 'disponivel', odometro: 4200 } }),
    prisma.veiculo.create({ data: { placa: 'PQR-7890', modelo: 'COMBOIO MERCEDES BENZ 2726', tipo: 'Comboio', status: 'disponivel', odometro: 184300 } }),
    prisma.veiculo.create({ data: { placa: 'ABC-1234', modelo: 'PRANCHA 3 EIXOS HEAVY DUTY', tipo: 'Prancha', status: 'disponivel', odometro: 125000 } }),
  ]);

  const motoristas = await Promise.all([
    prisma.motorista.create({ data: { nome: 'Antônio Silva', telefone: '(61) 99999-1111', status: 'disponivel' } }),
    prisma.motorista.create({ data: { nome: 'Pedro Santos', telefone: '(61) 99999-2222', status: 'disponivel' } }),
    prisma.motorista.create({ data: { nome: 'José Oliveira', telefone: '(61) 99999-3333', status: 'disponivel' } }),
    prisma.motorista.create({ data: { nome: 'Marcos Costa', telefone: '(61) 99999-4444', status: 'disponivel' } }),
    prisma.motorista.create({ data: { nome: 'Raimundo Nonato', telefone: '(61) 99999-5555', status: 'disponivel' } }),
  ]);

  await prisma.solicitacaoTransporte.create({
    data: {
      numeroOS: 'OS-2026-0001',
      solicitanteId: joao.id,
      tipoServico: 'Carro Passeio',
      origem: 'Sedes',
      destino: 'Lote 12',
      dataSolicitacao: new Date('2026-07-28T08:00:00Z'),
      dataProgramada: new Date('2026-07-30'),
      horarioProgramado: '09:00',
      projetoId: projBatata.id,
      observacoes: 'Visita técnica ao lote 12',
      status: 'concluida',
      veiculoId: veiculos[2].id,
      motoristaId: motoristas[0].id,
      kmInicial: 12500,
      kmFinal: 12540,
      dataHoraSaida: new Date('2026-07-30T09:05:00Z'),
      dataHoraChegada: new Date('2026-07-30T14:30:00Z'),
    },
  });

  await prisma.solicitacaoTransporte.create({
    data: {
      numeroOS: 'OS-2026-0002',
      solicitanteId: joao.id,
      tipoServico: 'Prancha',
      origem: 'Galpão de Insumos',
      destino: 'Campo de Batata',
      dataSolicitacao: new Date('2026-07-29T10:15:00Z'),
      dataProgramada: new Date('2026-07-31'),
      horarioProgramado: '14:00',
      projetoId: projBatata.id,
      observacoes: 'Transporte de colheitadeira',
      status: 'agendada',
      veiculoId: veiculos[0].id,
      motoristaId: motoristas[3].id,
    },
  });

  await prisma.solicitacaoTransporte.create({
    data: {
      numeroOS: 'OS-2026-0003',
      solicitanteId: joao.id,
      tipoServico: 'Comboio',
      origem: 'Sedes',
      destino: 'Safra Leste',
      dataSolicitacao: new Date('2026-07-30T07:30:00Z'),
      dataProgramada: new Date('2026-07-30'),
      horarioProgramado: '10:00',
      projetoId: projSoja.id,
      observacoes: 'Abastecimento das máquinas no campo',
      status: 'em_execucao',
      veiculoId: veiculos[1].id,
      motoristaId: motoristas[1].id,
      kmInicial: 45200,
      dataHoraSaida: new Date('2026-07-30T10:10:00Z'),
    },
  });

  await prisma.solicitacaoTransporte.create({
    data: {
      numeroOS: 'OS-2026-0004',
      solicitanteId: joao.id,
      tipoServico: 'Trator',
      origem: 'Oficina Central',
      destino: 'Lote 15',
      dataSolicitacao: new Date('2026-07-30T11:45:00Z'),
      dataProgramada: new Date('2026-08-01'),
      horarioProgramado: '07:00',
      projetoId: projInfra.id,
      status: 'pendente',
    },
  });

  await prisma.solicitacaoTransporte.create({
    data: {
      numeroOS: 'OS-2026-0005',
      solicitanteId: joao.id,
      tipoServico: 'Ônibus',
      origem: 'Sedes',
      destino: 'Lote 12',
      dataSolicitacao: new Date('2026-07-25T16:20:00Z'),
      dataProgramada: new Date('2026-07-26'),
      horarioProgramado: '06:00',
      projetoId: projBatata.id,
      status: 'cancelada',
      motivoCancelamento: 'Chuva forte, impossível acessar o lote',
    },
  });

  await prisma.solicitacaoTransporte.create({
    data: {
      numeroOS: 'OS-2026-0006',
      solicitanteId: joao.id,
      tipoServico: 'Caçamba',
      origem: 'Pedreira',
      destino: 'Estrada Sul',
      dataSolicitacao: new Date('2026-07-30T12:00:00Z'),
      dataProgramada: new Date('2026-08-02'),
      horarioProgramado: '08:00',
      projetoId: projInfra.id,
      status: 'pendente',
    },
  });

  await prisma.notificacao.createMany({
    data: [
      { tipo: 'sistema', mensagem: 'A viagem OS-2026-0002 foi agendada.', lida: false },
      { tipo: 'whatsapp', mensagem: 'Motorista Antônio Silva confirmou a OS-2026-0001.', lida: true },
    ],
  });

  console.log('Seed concluído.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
