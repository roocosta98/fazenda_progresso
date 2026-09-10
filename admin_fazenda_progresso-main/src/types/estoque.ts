export type StatusEstoque =
  | 'RUPTURA / ZERADO'
  | 'ABAIXO DO MÍNIMO'
  | 'EXCESSO / ACIMA DO MÁXIMO'
  | 'SEM GIRO / PARADO'
  | 'NORMAL';

export interface ItemGiroEstoque {
  CODEMP: number;
  CODPROD: number;
  DESCRPROD: string;
  MARCA: string;
  CODGRUPOPROD: number;
  DESCRGRUPOPROD: string;
  UNIDADE?: string;

  /* Quantidades */
  QTD_COMPRAS: number;
  QTD_DEV_COMPRAS: number;
  QTD_COMPRAS_LIQUIDA: number;
  QTD_CONSUMO: number;
  QTD_TOTAL_MOVIMENTADA: number;

  /* Valores Financeiros (R$) */
  VLR_COMPRAS: number;
  VLR_DEV_COMPRAS: number;
  VLR_COMPRAS_LIQUIDA: number;
  VLR_CONSUMO: number;
  VLR_TOTAL_MOVIMENTADO: number;

  /* Posição de Estoque */
  ESTOQUE_ATUAL: number;
  ESTMIN: number;
  ESTMAX: number;
  CUSTO_MEDIO?: number;

  /* Indicadores */
  GIRO_ESTOQUE: number;
  CONSUMO_MEDIO_DIARIO: number;
  DIAS_COBERTURA: number | null;

  /* Diagnóstico e Rankings */
  STATUS_ESTOQUE: StatusEstoque;
  RANKING_VALOR_CONSUMO: number;
  RANKING_QTD_CONSUMO: number;
  RANKING_VALOR_TOTAL: number;
}

export interface KpisGiroEstoque {
  totalItens: number;
  valorConsumoTotal: number;
  valorComprasTotal: number;
  valorEstoqueAtual: number;
  giroMedio: number;
  coberturaMediaDias: number;
  itensRuptura: number;
  itensAbaixoMinimo: number;
  itensExcesso: number;
  itensSemGiro: number;
  capitalParado: number;
}
