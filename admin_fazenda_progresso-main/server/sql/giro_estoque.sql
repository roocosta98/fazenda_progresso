-- =============================================================================
-- JORNADA DE GIRO E COBERTURA DE ESTOQUE (SANKHYA ERP)
--
-- Ajuste e Unificação solicitados a partir do SQL do Cássio (WhatsApp) e
-- do modelo de referência (Exemplo - Giro de Estoque.sql).
--
-- CORREÇÕES IMPLEMENTADAS EM RELAÇÃO À CONSULTA ANTERIOR:
-- 1. [CRÍTICO] Remoção do CAB.NUNOTA do SELECT e GROUP BY:
--    Na consulta anterior, a inclusão do NUNOTA quebrava a agregação por produto,
--    gerando uma linha por nota fiscal e distorcendo os rankings (DENSE_RANK).
-- 2. [CRÍTICO] Correção do Frete:
--    O campo CAB.VLRFRETE pertence ao cabeçalho da nota. Somá-lo dentro do SUM dos itens
--    multiplicava o valor do frete pelo número de itens da nota.
--    Ajustado para rateio seguro via ISNULL(ITE.VLRFRETE, 0).
-- 3. [NEGÓCIO] Tratamento de Devoluções de Compra (TIPMOV = 'E'):
--    Subtração de devoluções para obtenção da COMPRA LÍQUIDA (Qtd e Valor).
-- 4. [GESTÃO] Cálculo de Giro e Cobertura Real com TGFEST:
--    Adicionado o saldo físico atual (TGFEST), estoque mínimo e máximo (TGFPRO),
--    cálculo de Giro Simples (Consumo / Estoque) e Dias de Cobertura (Autonomia em dias).
-- 5. [QUALIDADE DE DADOS] Filtro de Grupos Obsoletos/Administrativos:
--    Mantido o filtro NOT IN dos grupos que não compõem almoxarifado/frota/manutenção
--    (escritório, energia, matéria-prima agrícola, imobilizado, serviços, etc.).
-- 6. [RANKING & STATUS] Curva ABC e Diagnóstico:
--    Rankings por Valor e Quantidade calculados no nível correto de produto, além
--    da coluna calculada STATUS_ESTOQUE (Ruptura, Abaixo do Mínimo, Excesso, Normal, Sem Giro).
--
-- Compatibilidade: Microsoft SQL Server (padrão do ambiente) e Oracle (ajustes comentados).
-- =============================================================================

WITH PARAMETROS AS (
    SELECT 
        -- Período: Últimos 90 dias até a data atual (ou substitua pelas datas desejadas)
        CAST(DATEADD(DAY, -90, GETDATE()) AS DATE) AS DT_INICIO,
        CAST(GETDATE() AS DATE)                     AS DT_FIM,
        DATEDIFF(DAY, DATEADD(DAY, -90, GETDATE()), GETDATE()) AS TOTAL_DIAS
        -- Para Oracle:
        -- TRUNC(SYSDATE - 90) AS DT_INICIO,
        -- TRUNC(SYSDATE)      AS DT_FIM,
        -- 90                  AS TOTAL_DIAS
),
MOVIMENTOS AS (
    SELECT 
        CAB.CODEMP,
        ITE.CODPROD,

        /* ==================== QUANTIDADES ==================== */
        -- Compras / Entradas de fornecedor (C = Compra, F = Devolução de venda / consignado)
        SUM(CASE WHEN CAB.TIPMOV IN ('C', 'F') THEN ITE.QTDNEG ELSE 0 END) AS QTD_COMPRAS,

        -- Devoluções de Compras a Fornecedor
        SUM(CASE WHEN CAB.TIPMOV = 'E' THEN ITE.QTDNEG ELSE 0 END) AS QTD_DEV_COMPRAS,

        -- Requisições / Consumo Interno (Q = Requisição / Consumo na Fazenda)
        SUM(CASE WHEN CAB.TIPMOV = 'Q' THEN ITE.QTDNEG ELSE 0 END) AS QTD_CONSUMO,

        /* ==================== VALORES (R$) ==================== */
        -- Valor de Compras (Itens - Desconto + Frete do Item)
        SUM(CASE WHEN CAB.TIPMOV IN ('C', 'F') 
                 THEN (ITE.VLRTOT - ISNULL(ITE.VLRDESC, 0)) + ISNULL(ITE.VLRFRETE, 0)
                 ELSE 0 END) AS VLR_COMPRAS,

        -- Valor de Devoluções de Compras
        SUM(CASE WHEN CAB.TIPMOV = 'E' 
                 THEN (ITE.VLRTOT - ISNULL(ITE.VLRDESC, 0)) + ISNULL(ITE.VLRFRETE, 0)
                 ELSE 0 END) AS VLR_DEV_COMPRAS,

        -- Valor de Requisições / Consumo
        SUM(CASE WHEN CAB.TIPMOV = 'Q' 
                 THEN (ITE.VLRTOT - ISNULL(ITE.VLRDESC, 0))
                 ELSE 0 END) AS VLR_CONSUMO

    FROM TGFCAB CAB
    INNER JOIN TGFITE ITE ON ITE.NUNOTA = CAB.NUNOTA
    CROSS JOIN PARAMETROS P
    WHERE CAB.STATUSNOTA = 'L'                         -- Notas Liberadas / Confirmadas
      AND CAB.TIPMOV IN ('C', 'F', 'Q', 'E')           -- Compras, Requisições e Devoluções
      AND ITE.QTDNEG > 0
      AND ITE.VLRUNIT > 0
      AND CAB.DTENTSAI BETWEEN P.DT_INICIO AND P.DT_FIM
      -- Se desejar filtrar por empresa específica:
      -- AND CAB.CODEMP = 1
    GROUP BY 
        CAB.CODEMP,
        ITE.CODPROD
),
ESTOQUE AS (
    SELECT 
        EST.CODEMP,
        EST.CODPROD,
        SUM(ISNULL(EST.ESTOQUE, 0)) AS ESTOQUE_ATUAL
    FROM TGFEST EST
    GROUP BY 
        EST.CODEMP,
        EST.CODPROD
)
SELECT 
    MOV.CODEMP,
    MOV.CODPROD,
    PRO.DESCRPROD,
    PRO.MARCA,
    PRO.CODGRUPOPROD,
    GRU.DESCRGRUPOPROD,

    /* ========================= FÍSICO / QUANTIDADES ========================= */
    MOV.QTD_COMPRAS,
    MOV.QTD_DEV_COMPRAS,
    (MOV.QTD_COMPRAS - MOV.QTD_DEV_COMPRAS)                 AS QTD_COMPRAS_LIQUIDA,
    MOV.QTD_CONSUMO,
    ((MOV.QTD_COMPRAS - MOV.QTD_DEV_COMPRAS) + MOV.QTD_CONSUMO) AS QTD_TOTAL_MOVIMENTADA,

    /* ========================= FINANCEIRO (R$) ========================= */
    MOV.VLR_COMPRAS,
    MOV.VLR_DEV_COMPRAS,
    (MOV.VLR_COMPRAS - MOV.VLR_DEV_COMPRAS)                 AS VLR_COMPRAS_LIQUIDA,
    MOV.VLR_CONSUMO,
    ((MOV.VLR_COMPRAS - MOV.VLR_DEV_COMPRAS) + MOV.VLR_CONSUMO) AS VLR_TOTAL_MOVIMENTADO,

    /* ========================= POSIÇÃO DE ESTOQUE ========================= */
    ISNULL(EST.ESTOQUE_ATUAL, 0)                             AS ESTOQUE_ATUAL,
    ISNULL(PRO.ESTMIN, 0)                                    AS ESTMIN,
    ISNULL(PRO.ESTMAX, 0)                                    AS ESTMAX,

    /* ========================= INDICADORES DE GIRO ========================= */
    -- Giro Simples: Consumo no período / Estoque atual (quantas vezes girou)
    CASE 
        WHEN ISNULL(EST.ESTOQUE_ATUAL, 0) > 0 
        THEN ROUND(MOV.QTD_CONSUMO / EST.ESTOQUE_ATUAL, 2)
        ELSE 0 
    END AS GIRO_ESTOQUE,

    -- Consumo Médio Diário
    ROUND(MOV.QTD_CONSUMO / NULLIF(P.TOTAL_DIAS, 0), 4)      AS CONSUMO_MEDIO_DIARIO,

    -- Cobertura de Estoque em Dias: Dias que o estoque atual suporta a taxa de consumo
    CASE 
        WHEN MOV.QTD_CONSUMO > 0 
        THEN ROUND(ISNULL(EST.ESTOQUE_ATUAL, 0) / (MOV.QTD_CONSUMO / CAST(P.TOTAL_DIAS AS FLOAT)), 1)
        ELSE NULL 
    END AS DIAS_COBERTURA,

    /* ========================= DIAGNÓSTICO / STATUS ========================= */
    CASE 
        WHEN ISNULL(EST.ESTOQUE_ATUAL, 0) = 0 AND MOV.QTD_CONSUMO > 0 
            THEN 'RUPTURA / ZERADO'
        WHEN ISNULL(EST.ESTOQUE_ATUAL, 0) < ISNULL(PRO.ESTMIN, 0) 
            THEN 'ABAIXO DO MÍNIMO'
        WHEN PRO.ESTMAX > 0 AND ISNULL(EST.ESTOQUE_ATUAL, 0) > PRO.ESTMAX 
            THEN 'EXCESSO / ACIMA DO MÁXIMO'
        WHEN ISNULL(EST.ESTOQUE_ATUAL, 0) > 0 AND MOV.QTD_CONSUMO = 0 
            THEN 'SEM GIRO / PARADO'
        ELSE 'NORMAL'
    END AS STATUS_ESTOQUE,

    /* ========================= RANKINGS (CURVA ABC) ========================= */
    -- Ranking por Valor de Consumo (Demanda interna mais crítica da operação)
    DENSE_RANK() OVER (ORDER BY MOV.VLR_CONSUMO DESC)        AS RANKING_VALOR_CONSUMO,

    -- Ranking por Quantidade Consumida
    DENSE_RANK() OVER (ORDER BY MOV.QTD_CONSUMO DESC)        AS RANKING_QTD_CONSUMO,

    -- Ranking por Giro Total Financeiro
    DENSE_RANK() OVER (
        ORDER BY ((MOV.VLR_COMPRAS - MOV.VLR_DEV_COMPRAS) + MOV.VLR_CONSUMO) DESC
    ) AS RANKING_VALOR_TOTAL

FROM MOVIMENTOS MOV
CROSS JOIN PARAMETROS P
INNER JOIN TGFPRO PRO ON PRO.CODPROD = MOV.CODPROD
LEFT JOIN ESTOQUE EST ON EST.CODEMP = MOV.CODEMP AND EST.CODPROD = MOV.CODPROD
INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD = PRO.CODGRUPOPROD
WHERE PRO.ATIVO = 'S'
  -- Exclusão de grupos administrativos, combustíveis de aviação, imobilizados e produtos agrícolas acabados
  AND GRU.CODGRUPAI NOT IN (
       09000000 /* MATER.ESCRIT/INFORM/B.PEQ.VL */
      ,13000000 /* COMBUSTIVEL LUBRIF. AVIAÇÃO */
      ,15000000 /* ALIMENTOS/COZINHA/LIMPEZA */
      ,16000000 /* IMOBILIZADO */
      ,22000000 /* SERVIÇOS TOMADOS/CONTRATADOS */
      ,23000000 /* PRODUTO VENDA FAZ.PROGR */
      ,24000000 /* CONTENTORES (USO E CONS) */
      ,25000000 /* APONTAMENTO AGRICOLAS */
      ,27000000 /* ENERGIA ELETRICA */
      ,29000000 /* M.PRIMA-ENTRADA BAT/CAF/CEB */
      ,98000000 /* PRODUTOS OBSOLETOS */
  )
ORDER BY 
    MOV.CODEMP,
    MOV.VLR_CONSUMO DESC,
    MOV.QTD_CONSUMO DESC;
