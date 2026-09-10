-- =============================================================================
-- PRD "Metas, Leituras, Gastos e Consumos" — seção 4.5
-- Tabelas novas pra Checklist de Atividade (ICO) e Avaliação de Condução (IEC),
-- que passam a ser coletadas dentro do app/portal da Keltech em vez do aplicativo
-- separado do cliente / avaliação em papel.
--
-- IMPORTANTE: script pra rodar no SQL Server da Solinftec (mesmo banco de
-- Equipamentos/MetasMotoristas/etc.), NÃO é uma migration Prisma (aquele projeto
-- é Postgres, banco separado). Precisa de alguém com acesso de escrita nesse SQL
-- Server pra executar — este ambiente de desenvolvimento não tem essa credencial.
--
-- Modelo header + item (permite guardar cada item do checklist / cada critério de
-- avaliação como uma linha, sem precisar mexer no schema quando a lista mudar):
-- os NOMES dos itens/critérios ficam como texto livre (NVARCHAR), alimentados por
-- uma lista padrão configurável no código do app (ver App/src/config/checklist.ts) —
-- a lista de exemplo do PRD (checklist do veículo, amarração de carga / frenagem,
-- aceleração, cinto, sinalização) é usada até o Cristiano confirmar a lista oficial.
-- =============================================================================

IF OBJECT_ID('dbo.ChecklistAtividade', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ChecklistAtividade (
        ChecklistAtividadeId INT IDENTITY(1,1) PRIMARY KEY,
        MotoristaId           INT NULL,                    -- FK lógica p/ Motoristas.MotoristaId, aceita nulo igual MetasMotoristas.MotoristaId
        MotoristaNomeFicha    NVARCHAR(200) NULL,           -- fallback de exibição quando MotoristaId não está vinculado
        EquipamentoId         INT NULL,                     -- FK lógica p/ Equipamentos.EquipamentoId — nulo quando o App não
                                                              -- consegue resolver a placa da viagem (cadastro Postgres) pro
                                                              -- CodigoEquipamento do SQL Server; ver App/api/checklist/criar.ts
        VeiculoPlacaOrigem    NVARCHAR(20) NULL,             -- placa como veio do App, pra investigar manualmente os casos sem vínculo
        DataHora              DATETIME2 NOT NULL DEFAULT DATEADD(HOUR, -3, SYSUTCDATETIME()),  -- mesmo padrão de fuso já usado no banco (UTC-3)
        RespondidoPor         NVARCHAR(200) NOT NULL,       -- nome de quem preencheu (motorista)
        Observacao            NVARCHAR(500) NULL,
        CriadoEm              DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID('dbo.ChecklistAtividadeItem', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ChecklistAtividadeItem (
        ChecklistAtividadeItemId INT IDENTITY(1,1) PRIMARY KEY,
        ChecklistAtividadeId      INT NOT NULL REFERENCES dbo.ChecklistAtividade(ChecklistAtividadeId),
        Item                      NVARCHAR(200) NOT NULL,   -- ex.: "Checklist do veículo", "Amarração de carga"
        Conforme                  BIT NOT NULL,
        Observacao                NVARCHAR(500) NULL
    );
END
GO

IF OBJECT_ID('dbo.AvaliacaoConducao', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AvaliacaoConducao (
        AvaliacaoConducaoId INT IDENTITY(1,1) PRIMARY KEY,
        MotoristaId          INT NULL,
        MotoristaNomeFicha   NVARCHAR(200) NULL,
        EquipamentoId        INT NULL,
        Avaliador            NVARCHAR(200) NOT NULL,        -- encarregado / motorista educador
        DataHora             DATETIME2 NOT NULL DEFAULT DATEADD(HOUR, -3, SYSUTCDATETIME()),
        NotaFinal            DECIMAL(5,2) NOT NULL,         -- 0–100, compõe o IEC (PRD 4.1)
        Observacao           NVARCHAR(500) NULL,
        CriadoEm             DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID('dbo.AvaliacaoConducaoItem', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AvaliacaoConducaoItem (
        AvaliacaoConducaoItemId INT IDENTITY(1,1) PRIMARY KEY,
        AvaliacaoConducaoId      INT NOT NULL REFERENCES dbo.AvaliacaoConducao(AvaliacaoConducaoId),
        Criterio                 NVARCHAR(200) NOT NULL,    -- ex.: "Frenagem brusca", "Aceleração", "Uso de cinto", "Sinalização"
        Nota                     DECIMAL(5,2) NOT NULL      -- 0–100 por critério
    );
END
GO

-- Índices de apoio pra consulta por motorista/competência (painel de metas cruza por mês)
CREATE INDEX IX_ChecklistAtividade_Motorista_Data ON dbo.ChecklistAtividade (MotoristaId, DataHora);
CREATE INDEX IX_AvaliacaoConducao_Motorista_Data ON dbo.AvaliacaoConducao (MotoristaId, DataHora);
