-- Aplicar no SQL Server da Fazenda Progresso antes de habilitar os cálculos de
-- ociosidade. O script é idempotente e não preenche jornadas: essa carga vem do
-- Sankhya, sob responsabilidade do Éder, e deve ser homologada antes do uso.
IF OBJECT_ID(N'dbo.JornadaMotorista', N'U') IS NULL
CREATE TABLE dbo.JornadaMotorista (
  JornadaId INT IDENTITY PRIMARY KEY,
  MotoristaNomeFicha NVARCHAR(200) NOT NULL,
  Dia DATE NOT NULL,
  Entrada DATETIME2 NOT NULL,
  Saida DATETIME2 NOT NULL,
  Origem NVARCHAR(50) NOT NULL DEFAULT 'Sankhya',
  Homologada BIT NOT NULL DEFAULT 0,
  CONSTRAINT CK_JornadaMotorista_Periodo CHECK (Saida > Entrada),
  CONSTRAINT UQ_JornadaMotorista UNIQUE (MotoristaNomeFicha, Dia, Entrada)
);

IF OBJECT_ID(N'dbo.CustoHoraMaquina', N'U') IS NULL
CREATE TABLE dbo.CustoHoraMaquina (
  CustoHoraMaquinaId INT IDENTITY PRIMARY KEY,
  EquipamentoId INT NOT NULL,
  VigenciaInicio DATE NOT NULL,
  VigenciaFim DATE NULL,
  ValorHora DECIMAL(18,4) NOT NULL,
  Homologado BIT NOT NULL DEFAULT 0,
  CONSTRAINT CK_CustoHoraMaquina_Valor CHECK (ValorHora >= 0)
);

IF COL_LENGTH(N'dbo.InsightIA', N'EquipamentoId') IS NULL
  ALTER TABLE dbo.InsightIA ADD EquipamentoId INT NULL;
IF COL_LENGTH(N'dbo.InsightIA', N'PeriodoInicio') IS NULL
  ALTER TABLE dbo.InsightIA ADD PeriodoInicio DATE NULL;
IF COL_LENGTH(N'dbo.InsightIA', N'PeriodoFim') IS NULL
  ALTER TABLE dbo.InsightIA ADD PeriodoFim DATE NULL;
IF COL_LENGTH(N'dbo.InsightIA', N'FatoCalculado') IS NULL
  ALTER TABLE dbo.InsightIA ADD FatoCalculado NVARCHAR(1000) NULL;
IF COL_LENGTH(N'dbo.InsightIA', N'RecomendacaoIA') IS NULL
  ALTER TABLE dbo.InsightIA ADD RecomendacaoIA NVARCHAR(1000) NULL;
IF COL_LENGTH(N'dbo.InsightIA', N'ValorBaseDiaria') IS NULL
  ALTER TABLE dbo.InsightIA ADD ValorBaseDiaria DECIMAL(18,2) NULL;
IF COL_LENGTH(N'dbo.InsightIA', N'CustoRealDiario') IS NULL
  ALTER TABLE dbo.InsightIA ADD CustoRealDiario DECIMAL(18,2) NULL;
IF COL_LENGTH(N'dbo.InsightIA', N'DiferencaPercentual') IS NULL
  ALTER TABLE dbo.InsightIA ADD DiferencaPercentual DECIMAL(9,2) NULL;
IF COL_LENGTH(N'dbo.InsightIA', N'FonteReferenciaTitulo') IS NULL
  ALTER TABLE dbo.InsightIA ADD FonteReferenciaTitulo NVARCHAR(300) NULL;
IF COL_LENGTH(N'dbo.InsightIA', N'FonteReferenciaUrl') IS NULL
  ALTER TABLE dbo.InsightIA ADD FonteReferenciaUrl NVARCHAR(1000) NULL;
IF COL_LENGTH(N'dbo.InsightIA', N'FonteReferenciaData') IS NULL
  ALTER TABLE dbo.InsightIA ADD FonteReferenciaData DATE NULL;
IF COL_LENGTH(N'dbo.InsightIA', N'EscopoReferencia') IS NULL
  ALTER TABLE dbo.InsightIA ADD EscopoReferencia NVARCHAR(500) NULL;

IF OBJECT_ID(N'dbo.CustoReferenciaOperacional', N'U') IS NULL
CREATE TABLE dbo.CustoReferenciaOperacional (
  ReferenciaId INT IDENTITY PRIMARY KEY,
  ChaveModelo NVARCHAR(100) NOT NULL,
  Regiao NVARCHAR(100) NOT NULL,
  Segmento NVARCHAR(300) NOT NULL,
  DiariaBase DECIMAL(18,2) NOT NULL,
  FonteTitulo NVARCHAR(300) NOT NULL,
  FonteUrl NVARCHAR(1000) NOT NULL,
  FonteData DATE NULL,
  Homologada BIT NOT NULL DEFAULT 0,
  Ativa BIT NOT NULL DEFAULT 1
);

-- Referência pública de Bahia, não específica para batata nem para este veículo.
-- Mantenha Homologada=0 até obter cotação comparável do cliente/fornecedor.
IF NOT EXISTS (SELECT 1 FROM dbo.CustoReferenciaOperacional WHERE ChaveModelo=N'31.330' AND FonteUrl=N'https://municipiodigital.com.br/consorcio/ba/diamantina/publicacao/a5c9ec2eccff543d3735f5fc2d43868d.pdf')
INSERT INTO dbo.CustoReferenciaOperacional (ChaveModelo, Regiao, Segmento, DiariaBase, FonteTitulo, FonteUrl, FonteData, Homologada, Ativa)
VALUES (N'31.330', N'Nordeste — Bahia', N'Caminhão basculante 6x4 de 12 t; escopo de inclusões não detalhado no documento', 400.00, N'Consórcio Público de Desenvolvimento Sustentável do Território da Diamantina — proposta de preços', N'https://municipiodigital.com.br/consorcio/ba/diamantina/publicacao/a5c9ec2eccff543d3735f5fc2d43868d.pdf', NULL, 0, 1);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_JornadaMotorista_Dia' AND object_id = OBJECT_ID(N'dbo.JornadaMotorista'))
  CREATE INDEX IX_JornadaMotorista_Dia ON dbo.JornadaMotorista (Dia, MotoristaNomeFicha);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CustoHoraMaquina_Vigencia' AND object_id = OBJECT_ID(N'dbo.CustoHoraMaquina'))
  CREATE INDEX IX_CustoHoraMaquina_Vigencia ON dbo.CustoHoraMaquina (EquipamentoId, VigenciaInicio, VigenciaFim);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_InsightIA_EquipamentoPeriodo' AND object_id = OBJECT_ID(N'dbo.InsightIA'))
  CREATE INDEX IX_InsightIA_EquipamentoPeriodo ON dbo.InsightIA (EquipamentoId, PeriodoInicio, PeriodoFim);
