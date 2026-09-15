-- =============================================================================
-- Pedido do Cássio: poder editar a query REAL que roda nas telas direto pela
-- tela de Configurações Gerais > Treinamento de IA, sem precisar mexer em
-- código. Reaproveita dbo.ConfiguracaoIA (mesma tabela do treinamento de IA) —
-- entradas com Tipo='query' guardam SQL executável de verdade, identificadas
-- por uma chave estável (ChaveQuery) que o backend usa pra saber qual query
-- substituir.
--
-- IMPORTANTE — isso é código executado em produção, não documentação pra IA:
-- só SELECT/WITH é aceito (o backend recusa qualquer outro comando e volta pra
-- query padrão do sistema), mas ainda assim um erro de sintaxe ou de lógica
-- aqui quebra a tela na hora, sem passar por build/PR/revisão. Trate como
-- deploy direto em produção.
--
-- Rode como statement isolado no DBeaver (selecione o texto e Ctrl+Enter).
-- =============================================================================

ALTER TABLE dbo.ConfiguracaoIA ADD ChaveQuery NVARCHAR(80) NULL;
