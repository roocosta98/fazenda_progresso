/* Controle de acesso do portal. Aditivo e idempotente: não altera tabelas
   existentes de Frota, Logística ou Estoque. Senhas são gravadas somente como
   PBKDF2-SHA512 (hash + salt), calculados pela API; nunca em texto puro. */

IF OBJECT_ID(N'dbo.UsuariosSistema', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.UsuariosSistema (
    UsuarioId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_UsuariosSistema PRIMARY KEY,
    Nome NVARCHAR(150) NOT NULL,
    Email NVARCHAR(254) NOT NULL,
    TipoUsuario NVARCHAR(20) NOT NULL CONSTRAINT CK_UsuariosSistema_Tipo CHECK (TipoUsuario IN (N'admin', N'comum')),
    SenhaHash VARBINARY(64) NOT NULL,
    SenhaSalt VARBINARY(32) NOT NULL,
    IteracoesSenha INT NOT NULL CONSTRAINT DF_UsuariosSistema_Iteracoes DEFAULT 210000,
    Ativo BIT NOT NULL CONSTRAINT DF_UsuariosSistema_Ativo DEFAULT 1,
    CriadoEm DATETIME2 NOT NULL CONSTRAINT DF_UsuariosSistema_CriadoEm DEFAULT SYSUTCDATETIME(),
    AtualizadoEm DATETIME2 NOT NULL CONSTRAINT DF_UsuariosSistema_AtualizadoEm DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_UsuariosSistema_Email UNIQUE (Email)
  );
END
GO

IF OBJECT_ID(N'dbo.UsuarioModulo', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.UsuarioModulo (
    UsuarioId INT NOT NULL,
    Modulo NVARCHAR(30) NOT NULL CONSTRAINT CK_UsuarioModulo_Modulo CHECK (Modulo IN (N'logistica_frota', N'estoque', N'producao_batata', N'manutencao')),
    CriadoEm DATETIME2 NOT NULL CONSTRAINT DF_UsuarioModulo_CriadoEm DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_UsuarioModulo PRIMARY KEY (UsuarioId, Modulo),
    CONSTRAINT FK_UsuarioModulo_Usuario FOREIGN KEY (UsuarioId) REFERENCES dbo.UsuariosSistema(UsuarioId) ON DELETE CASCADE
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_UsuarioModulo_Modulo' AND object_id=OBJECT_ID(N'dbo.UsuarioModulo'))
  CREATE INDEX IX_UsuarioModulo_Modulo ON dbo.UsuarioModulo(Modulo);
GO
