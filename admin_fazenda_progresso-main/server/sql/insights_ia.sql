-- =============================================================================
-- Painel de Insights (IA) — sugestão feita pelo Cássio (WhatsApp): "trazer uma IA
-- pra fazer a leitura dos dados e trazer alguma sugestão pra gente".
--
-- Uma tabela só, sem header+item — cada insight gerado pela IA vira uma linha,
-- com marcação de lido/resolvido pro Admin acompanhar o que já foi tratado.
--
-- IMPORTANTE (lição da entrega anterior): rode este CREATE TABLE como statement
-- ISOLADO no DBeaver (selecione o texto e Ctrl+Enter), não colado junto com
-- outros scripts — foi assim que um erro de dependência apareceu da última vez.
-- =============================================================================

CREATE TABLE dbo.InsightIA (
    InsightId          INT IDENTITY(1,1) PRIMARY KEY,
    GeradoEm           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Categoria          NVARCHAR(20) NOT NULL,       -- 'Metas' | 'Gastos' | 'Alarmes'
    Severidade         NVARCHAR(10) NOT NULL,       -- 'baixa' | 'media' | 'alta'
    Titulo             NVARCHAR(200) NOT NULL,
    Descricao          NVARCHAR(1000) NOT NULL,
    EntidadeReferencia NVARCHAR(200) NULL,          -- nome do motorista ou equipamento citado
    Lido               BIT NOT NULL DEFAULT 0,
    Resolvido          BIT NOT NULL DEFAULT 0,
    ResolvidoPor       NVARCHAR(200) NULL,
    ResolvidoEm        DATETIME2 NULL
);
