-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('solicitante', 'logistica', 'motorista');

-- CreateEnum
CREATE TYPE "StatusVeiculo" AS ENUM ('disponivel', 'em_uso', 'manutencao');

-- CreateEnum
CREATE TYPE "StatusMotorista" AS ENUM ('disponivel', 'em_rota', 'folga');

-- CreateEnum
CREATE TYPE "StatusSolicitacao" AS ENUM ('pendente', 'agendada', 'em_execucao', 'concluida', 'cancelada');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "idSankhya" TEXT,
    "nome" TEXT NOT NULL,
    "perfil" "PerfilUsuario" NOT NULL,
    "departamento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Projeto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "centroCusto" TEXT NOT NULL,

    CONSTRAINT "Projeto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Veiculo" (
    "id" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" "StatusVeiculo" NOT NULL DEFAULT 'disponivel',
    "odometro" INTEGER,

    CONSTRAINT "Veiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Motorista" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "status" "StatusMotorista" NOT NULL DEFAULT 'disponivel',

    CONSTRAINT "Motorista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitacaoTransporte" (
    "id" TEXT NOT NULL,
    "numeroOS" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "tipoServico" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "origemLat" DOUBLE PRECISION,
    "origemLng" DOUBLE PRECISION,
    "destino" TEXT NOT NULL,
    "destinoLat" DOUBLE PRECISION,
    "destinoLng" DOUBLE PRECISION,
    "dataSolicitacao" TIMESTAMP(3) NOT NULL,
    "dataProgramada" TIMESTAMP(3),
    "horarioProgramado" TEXT,
    "projetoId" TEXT NOT NULL,
    "observacoes" TEXT,
    "status" "StatusSolicitacao" NOT NULL DEFAULT 'pendente',
    "veiculoId" TEXT,
    "motoristaId" TEXT,
    "kmInicial" INTEGER,
    "kmFinal" INTEGER,
    "dataHoraSaida" TIMESTAMP(3),
    "dataHoraChegada" TIMESTAMP(3),
    "observacaoLogistica" TEXT,
    "motivoCancelamento" TEXT,
    "reagendada" BOOLEAN NOT NULL DEFAULT false,
    "emAtraso" BOOLEAN NOT NULL DEFAULT false,
    "assinaturaRecebedor" TEXT,
    "nomeRecebedor" TEXT,
    "fotoComprovante" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitacaoTransporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoTrocaVeiculo" (
    "id" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "veiculoAnterior" TEXT NOT NULL,
    "veiculoNovo" TEXT NOT NULL,
    "justificativa" TEXT NOT NULL,

    CONSTRAINT "HistoricoTrocaVeiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GpsPing" (
    "id" SERIAL NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GpsPing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Veiculo_placa_key" ON "Veiculo"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitacaoTransporte_numeroOS_key" ON "SolicitacaoTransporte"("numeroOS");

-- AddForeignKey
ALTER TABLE "SolicitacaoTransporte" ADD CONSTRAINT "SolicitacaoTransporte_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoTransporte" ADD CONSTRAINT "SolicitacaoTransporte_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoTransporte" ADD CONSTRAINT "SolicitacaoTransporte_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Veiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoTransporte" ADD CONSTRAINT "SolicitacaoTransporte_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "Motorista"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoTrocaVeiculo" ADD CONSTRAINT "HistoricoTrocaVeiculo_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "SolicitacaoTransporte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpsPing" ADD CONSTRAINT "GpsPing_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "SolicitacaoTransporte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
