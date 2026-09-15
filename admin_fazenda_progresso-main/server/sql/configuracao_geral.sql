-- =============================================================================
-- Configurações Gerais do sistema — chave/valor simples, mesmo espírito de
-- dbo.ConfiguracaoIA (uma tabela genérica em vez de uma coluna nova por opção).
-- Primeira chave: 'prazoPadraoDias' — período relativo (últimos N dias) usado
-- como padrão inicial nos filtros de data de Estoque e Logística, em vez de um
-- "de-até" fixo. Sem linha cadastrada, a API responde com o padrão 30.
--
-- Rode como statement isolado no DBeaver (selecione o texto e Ctrl+Enter).
-- =============================================================================

CREATE TABLE dbo.ConfiguracaoSistema (
    Chave       NVARCHAR(60) NOT NULL PRIMARY KEY,
    Valor       NVARCHAR(400) NOT NULL,
    AtualizadoEm DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
