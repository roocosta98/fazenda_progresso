import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMssqlPool } from '../_lib/mssql.js';
import sql from 'mssql';

const QUERY_GIRO = `
WITH PARAMETROS AS (
    SELECT 
        CAST(DATEADD(DAY, -@dias, GETDATE()) AS DATE) AS DT_INICIO,
        CAST(GETDATE() AS DATE)                         AS DT_FIM,
        @dias                                           AS TOTAL_DIAS
),
MOVIMENTOS AS (
    SELECT 
        CAB.CODEMP,
        ITE.CODPROD,
        SUM(CASE WHEN CAB.TIPMOV IN ('C', 'F') THEN ITE.QTDNEG ELSE 0 END) AS QTD_COMPRAS,
        SUM(CASE WHEN CAB.TIPMOV = 'E' THEN ITE.QTDNEG ELSE 0 END)         AS QTD_DEV_COMPRAS,
        SUM(CASE WHEN CAB.TIPMOV = 'Q' THEN ITE.QTDNEG ELSE 0 END)         AS QTD_CONSUMO,
        SUM(CASE WHEN CAB.TIPMOV IN ('C', 'F') 
                 THEN (ITE.VLRTOT - ISNULL(ITE.VLRDESC, 0)) + ISNULL(ITE.VLRFRETE, 0)
                 ELSE 0 END) AS VLR_COMPRAS,
        SUM(CASE WHEN CAB.TIPMOV = 'E' 
                 THEN (ITE.VLRTOT - ISNULL(ITE.VLRDESC, 0)) + ISNULL(ITE.VLRFRETE, 0)
                 ELSE 0 END) AS VLR_DEV_COMPRAS,
        SUM(CASE WHEN CAB.TIPMOV = 'Q' 
                 THEN (ITE.VLRTOT - ISNULL(ITE.VLRDESC, 0))
                 ELSE 0 END) AS VLR_CONSUMO
    FROM TGFCAB CAB
    INNER JOIN TGFITE ITE ON ITE.NUNOTA = CAB.NUNOTA
    CROSS JOIN PARAMETROS P
    WHERE CAB.STATUSNOTA = 'L'
      AND CAB.TIPMOV IN ('C', 'F', 'Q', 'E')
      AND ITE.QTDNEG > 0
      AND ITE.VLRUNIT > 0
      AND CAB.DTENTSAI BETWEEN P.DT_INICIO AND P.DT_FIM
      AND (@codEmp IS NULL OR CAB.CODEMP = @codEmp)
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
    MOV.QTD_COMPRAS,
    MOV.QTD_DEV_COMPRAS,
    (MOV.QTD_COMPRAS - MOV.QTD_DEV_COMPRAS)                      AS QTD_COMPRAS_LIQUIDA,
    MOV.QTD_CONSUMO,
    ((MOV.QTD_COMPRAS - MOV.QTD_DEV_COMPRAS) + MOV.QTD_CONSUMO)  AS QTD_TOTAL_MOVIMENTADA,
    MOV.VLR_COMPRAS,
    MOV.VLR_DEV_COMPRAS,
    (MOV.VLR_COMPRAS - MOV.VLR_DEV_COMPRAS)                      AS VLR_COMPRAS_LIQUIDA,
    MOV.VLR_CONSUMO,
    ((MOV.VLR_COMPRAS - MOV.VLR_DEV_COMPRAS) + MOV.VLR_CONSUMO)  AS VLR_TOTAL_MOVIMENTADO,
    ISNULL(EST.ESTOQUE_ATUAL, 0)                                 AS ESTOQUE_ATUAL,
    ISNULL(PRO.ESTMIN, 0)                                        AS ESTMIN,
    ISNULL(PRO.ESTMAX, 0)                                        AS ESTMAX,
    CASE 
        WHEN ISNULL(EST.ESTOQUE_ATUAL, 0) > 0 
        THEN ROUND(MOV.QTD_CONSUMO / EST.ESTOQUE_ATUAL, 2)
        ELSE 0 
    END AS GIRO_ESTOQUE,
    ROUND(MOV.QTD_CONSUMO / NULLIF(P.TOTAL_DIAS, 0), 4)          AS CONSUMO_MEDIO_DIARIO,
    CASE 
        WHEN MOV.QTD_CONSUMO > 0 
        THEN ROUND(ISNULL(EST.ESTOQUE_ATUAL, 0) / (MOV.QTD_CONSUMO / CAST(P.TOTAL_DIAS AS FLOAT)), 1)
        ELSE NULL 
    END AS DIAS_COBERTURA,
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
    DENSE_RANK() OVER (ORDER BY MOV.VLR_CONSUMO DESC)            AS RANKING_VALOR_CONSUMO,
    DENSE_RANK() OVER (ORDER BY MOV.QTD_CONSUMO DESC)            AS RANKING_QTD_CONSUMO,
    DENSE_RANK() OVER (
        ORDER BY ((MOV.VLR_COMPRAS - MOV.VLR_DEV_COMPRAS) + MOV.VLR_CONSUMO) DESC
    ) AS RANKING_VALOR_TOTAL
FROM MOVIMENTOS MOV
CROSS JOIN PARAMETROS P
INNER JOIN TGFPRO PRO ON PRO.CODPROD = MOV.CODPROD
LEFT JOIN ESTOQUE EST ON EST.CODEMP = MOV.CODEMP AND EST.CODPROD = MOV.CODPROD
INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD = PRO.CODGRUPOPROD
WHERE PRO.ATIVO = 'S'
  AND GRU.CODGRUPAI NOT IN (
       09000000, 13000000, 15000000, 16000000, 22000000, 
       23000000, 24000000, 25000000, 27000000, 29000000, 98000000
  )
ORDER BY 
    MOV.CODEMP,
    MOV.VLR_CONSUMO DESC,
    MOV.QTD_CONSUMO DESC;
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const dias = Number(req.query.dias) || 90;
    const codEmp = req.query.codEmp ? Number(req.query.codEmp) : null;

    const pool = await getMssqlPool();
    const result = await pool
      .request()
      .input('dias', sql.Int, dias)
      .input('codEmp', sql.Int, codEmp)
      .query(QUERY_GIRO);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.warn('SQL Server indisponível para Giro de Estoque, retornando erro ou mock:', error);
    res.status(502).json({
      error: 'Falha ao conectar no SQL Server do Sankhya',
      fallbackDisponivel: true,
    });
  }
}
