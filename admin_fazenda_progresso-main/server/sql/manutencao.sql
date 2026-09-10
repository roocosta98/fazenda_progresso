/* Manutenção — proposta operacional inicial configurável.
   Dados próprios do portal, sem escrever diretamente no Sankhya. */
IF OBJECT_ID(N'dbo.AtivoManutencao', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.AtivoManutencao (
    AtivoId INT IDENTITY(1,1) PRIMARY KEY,
    CodigoEquipamento NVARCHAR(50) NULL,
    Nome NVARCHAR(150) NOT NULL,
    Tipo NVARCHAR(60) NOT NULL,
    Localizacao NVARCHAR(120) NULL,
    Ativo BIT NOT NULL DEFAULT 1,
    CriadoEm DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID(N'dbo.OrdemServicoManutencao', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.OrdemServicoManutencao (
    OrdemServicoId INT IDENTITY(1,1) PRIMARY KEY,
    AtivoId INT NOT NULL REFERENCES dbo.AtivoManutencao(AtivoId),
    Tipo NVARCHAR(15) NOT NULL CHECK (Tipo IN (N'preventiva', N'corretiva')),
    Status NVARCHAR(15) NOT NULL DEFAULT N'aberta' CHECK (Status IN (N'aberta', N'em_execucao', N'concluida')),
    Descricao NVARCHAR(500) NOT NULL,
    Responsavel NVARCHAR(120) NULL,
    Abertura DATE NOT NULL,
    Conclusao DATE NULL,
    CustoPecas DECIMAL(18,2) NOT NULL DEFAULT 0,
    CustoMaoObra DECIMAL(18,2) NOT NULL DEFAULT 0,
    CriadoEm DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  CREATE INDEX IX_OrdemServicoManutencao_AtivoStatus ON dbo.OrdemServicoManutencao(AtivoId, Status, Abertura);
END;

IF OBJECT_ID(N'dbo.PreventivaManutencao', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PreventivaManutencao (
    PreventivaId INT IDENTITY(1,1) PRIMARY KEY,
    AtivoId INT NOT NULL REFERENCES dbo.AtivoManutencao(AtivoId),
    Descricao NVARCHAR(250) NOT NULL,
    Regra NVARCHAR(15) NOT NULL CHECK (Regra IN (N'data', N'km', N'horimetro')),
    ProximaData DATE NULL,
    ProximoValor DECIMAL(18,2) NULL,
    Ativa BIT NOT NULL DEFAULT 1,
    CriadoEm DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  CREATE INDEX IX_PreventivaManutencao_Ativo ON dbo.PreventivaManutencao(AtivoId, Ativa, ProximaData);
END;
