-- Estruturas que o Éder deve alimentar a partir do Sankhya antes da homologação.
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

CREATE TABLE dbo.CustoHoraMaquina (
  CustoHoraMaquinaId INT IDENTITY PRIMARY KEY,
  EquipamentoId INT NOT NULL,
  VigenciaInicio DATE NOT NULL,
  VigenciaFim DATE NULL,
  ValorHora DECIMAL(18,4) NOT NULL,
  Homologado BIT NOT NULL DEFAULT 0,
  CONSTRAINT CK_CustoHoraMaquina_Valor CHECK (ValorHora >= 0)
);

ALTER TABLE dbo.InsightIA ADD
  EquipamentoId INT NULL,
  PeriodoInicio DATE NULL,
  PeriodoFim DATE NULL,
  FatoCalculado NVARCHAR(1000) NULL,
  RecomendacaoIA NVARCHAR(1000) NULL;

CREATE INDEX IX_JornadaMotorista_Dia ON dbo.JornadaMotorista (Dia, MotoristaNomeFicha);
CREATE INDEX IX_CustoHoraMaquina_Vigencia ON dbo.CustoHoraMaquina (EquipamentoId, VigenciaInicio, VigenciaFim);
CREATE INDEX IX_InsightIA_EquipamentoPeriodo ON dbo.InsightIA (EquipamentoId, PeriodoInicio, PeriodoFim);
