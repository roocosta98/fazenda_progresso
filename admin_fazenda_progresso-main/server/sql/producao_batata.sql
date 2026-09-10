/* Produção/Batata — dados próprios do portal enquanto a origem automática
   Frota/Sankhya não estiver homologada. Não altera dados operacionais atuais. */
IF OBJECT_ID(N'dbo.SafraBatata', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.SafraBatata (
    SafraId INT IDENTITY(1,1) PRIMARY KEY,
    Nome NVARCHAR(120) NOT NULL,
    Inicio DATE NOT NULL,
    Fim DATE NULL,
    Ativa BIT NOT NULL DEFAULT 1,
    CriadoEm DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID(N'dbo.LancamentoProducaoBatata', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.LancamentoProducaoBatata (
    LancamentoId INT IDENTITY(1,1) PRIMARY KEY,
    SafraId INT NOT NULL REFERENCES dbo.SafraBatata(SafraId),
    Dia DATE NOT NULL,
    Toneladas DECIMAL(18,3) NOT NULL CHECK (Toneladas > 0),
    CustoOperacional DECIMAL(18,2) NOT NULL CHECK (CustoOperacional >= 0),
    EquipamentoId INT NULL,
    Origem NVARCHAR(20) NOT NULL DEFAULT N'manual' CHECK (Origem IN (N'manual', N'frota')),
    Observacao NVARCHAR(500) NULL,
    CriadoEm DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  CREATE INDEX IX_LancamentoProducaoBatata_SafraDia ON dbo.LancamentoProducaoBatata(SafraId, Dia);
END;
