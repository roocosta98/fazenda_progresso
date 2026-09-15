-- =============================================================================
-- Configurações Gerais do sistema — chave/valor simples, mesmo espírito de
-- dbo.ConfiguracaoIA (uma tabela genérica em vez de uma coluna nova por opção).
-- Primeira chave: 'periodoPadrao' — guarda um JSON tipo {"tipo":"dias","dias":30}
-- ou {"tipo":"mes_atual"} (também "trimestre_atual"/"ano_atual") com o período
-- usado como valor INICIAL dos filtros "De"/"Até" de Estoque e Logística (a
-- tela sempre mostra e deixa editar as duas datas livremente). Sem linha
-- cadastrada, a API responde com o padrão {"tipo":"dias","dias":30}.
--
-- Rode como statement isolado no DBeaver (selecione o texto e Ctrl+Enter).
-- =============================================================================

CREATE TABLE dbo.ConfiguracaoSistema (
    Chave       NVARCHAR(60) NOT NULL PRIMARY KEY,
    Valor       NVARCHAR(400) NOT NULL,
    AtualizadoEm DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
