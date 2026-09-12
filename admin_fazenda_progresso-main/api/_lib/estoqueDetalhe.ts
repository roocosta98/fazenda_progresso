import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exigirAcessoCustos } from './custosAuth.js';
import { consultarSankhya } from './estoquePainel.js';

// A API do Sankhya (DbExplorerSP.executeQuery) não aceita parâmetros — todo valor que entra
// na string de SQL precisa ser validado antes, nunca interpolado cru (mesmo risco documentado
// em estoquePainel.ts). Aqui os únicos valores vindos do cliente são IDs numéricos ou o nome de
// um parceiro já visto na tela (ranking de fornecedores), então cada um tem seu próprio validador.
function inteiroValido(valor: unknown): number | null {
  const bruto = Array.isArray(valor) ? valor[0] : valor;
  const numero = Number(bruto);
  return Number.isInteger(numero) ? numero : null;
}

// Só permite letras/números/espaço/pontuação comum de razão social — bloqueia aspas e
// qualquer caractere que poderia fechar a string SQL e injetar comando.
function nomeParceiroValido(valor: unknown): string | null {
  const bruto = Array.isArray(valor) ? valor[0] : valor;
  if (typeof bruto !== 'string') return null;
  const texto = bruto.trim();
  if (!texto || texto.length > 100 || !/^[\p{L}0-9 .,&/()-]+$/u.test(texto)) return null;
  return texto.replace(/'/g, "''");
}

async function detalheProduto(codprod: number) {
  const [produtoRows, estoquePorLocal, custoRows, giroRows, movimentos] = await Promise.all([
    consultarSankhya(`SELECT CODPROD, DESCRPROD, REFERENCIA, MARCA, ATIVO, ESTMIN, ESTMAX FROM TGFPRO WHERE CODPROD=${codprod}`),
    consultarSankhya(`SELECT E.CODLOCAL, L.DESCRLOCAL AS LOCAL, E.ESTOQUE, E.CONTROLE AS LOTE FROM TGFEST E LEFT JOIN TGFLOC L ON L.CODLOCAL=E.CODLOCAL WHERE E.CODPROD=${codprod} AND E.CODEMP=1 AND E.ESTOQUE<>0 ORDER BY E.ESTOQUE DESC`),
    consultarSankhya(`SELECT TOP 1 COALESCE(CUSMEDICM,CUSSEMICM) AS CUSTO, DTATUAL FROM TGFCUS WHERE CODPROD=${codprod} AND CODEMP=1 ORDER BY DTATUAL DESC, NUNOTA DESC`),
    consultarSankhya(`SELECT GIRODIARIO, DIASSEMVENDA, PRODFALTA, PONTOPED AS PONTOPEDIDO, ESTMINGIR AS MINIMOSUGERIDO, ESTCUSTGER AS VALORESTOQUE FROM TGFGIR WHERE CODPROD=${codprod} AND CODEMP=1`),
    // TIPMOV: C/F = compra (entrada), E = devolução de compra (saída), Q = requisição (saída/
    // consumo) — mesma classificação usada em giroProdutos, pra ficar consistente com o resto do painel.
    consultarSankhya(`SELECT TOP 50 CAB.NUNOTA, CAB.NUMNOTA, CAB.DTNEG, CAB.TIPMOV,
        CASE WHEN CAB.TIPMOV IN ('C','F') THEN 'Entrada (compra)' WHEN CAB.TIPMOV='E' THEN 'Saída (devolução)' WHEN CAB.TIPMOV='Q' THEN 'Saída (requisição)' ELSE CAB.TIPMOV END AS TIPO,
        PAR.NOMEPARC AS PARCEIRO, ITE.QTDNEG, ITE.CUSTO AS CUSTOUNITARIO, ITE.QTDNEG*ITE.CUSTO AS VALORTOTAL
      FROM TGFCAB CAB INNER JOIN TGFITE ITE ON ITE.NUNOTA=CAB.NUNOTA LEFT JOIN TGFPAR PAR ON PAR.CODPARC=CAB.CODPARC
      WHERE ITE.CODPROD=${codprod} AND CAB.CODEMP=1 AND CAB.STATUSNOTA='L' AND CAB.TIPMOV IN ('C','Q','E','F')
      ORDER BY CAB.DTNEG DESC`),
  ]);
  return { produto: produtoRows[0] ?? null, estoquePorLocal, custo: custoRows[0] ?? null, giro: giroRows[0] ?? null, movimentos };
}

// A "situação" que o usuário vê no Sankhya (tela Cotação, coluna "Situação do produto") é
// TGFITC.STATUSPRODCOT, não TGFITC.SITUACAO (outro campo, ligado a envio/coleta de preço) —
// confirmado com o Eder comparando a contagem por STATUSPRODCOT direto no Sankhya com o painel.
const SITUACAO_PRODUTO = `CASE ITC.STATUSPRODCOT WHEN 'O' THEN 'Aberta' WHEN 'A' THEN 'Aprovada' WHEN 'C' THEN 'Cancelada' WHEN 'E' THEN 'Enviada' WHEN 'F' THEN 'Fechada' WHEN 'P' THEN 'Precificada' ELSE ITC.STATUSPRODCOT END`;

async function detalheCotacao(numcotacao: number) {
  const itens = await consultarSankhya(`SELECT ITC.CODPROD, PRO.DESCRPROD, PAR.NOMEPARC AS FORNECEDOR, ${SITUACAO_PRODUTO} AS SITUACAO, ITC.PRAZOENTREGA,
      CASE WHEN ITC.MELHOR='S' THEN 'Sim' ELSE 'Não' END AS MELHORPRECO
    FROM TGFITC ITC LEFT JOIN TGFPRO PRO ON PRO.CODPROD=ITC.CODPROD LEFT JOIN TGFPAR PAR ON PAR.CODPARC=ITC.CODPARC
    WHERE ITC.NUMCOTACAO=${numcotacao} AND ITC.CODPARC<>0
    ORDER BY PRO.DESCRPROD`);
  return { itens };
}

async function detalheFornecedor(nomeparc: string) {
  const cotacoes = await consultarSankhya(`SELECT TOP 50 ITC.NUMCOTACAO, PRO.DESCRPROD, ${SITUACAO_PRODUTO} AS SITUACAO, ITC.PRAZOENTREGA,
      CASE WHEN ITC.MELHOR='S' THEN 'Sim' ELSE 'Não' END AS MELHORPRECO
    FROM TGFITC ITC LEFT JOIN TGFPAR PAR ON PAR.CODPARC=ITC.CODPARC LEFT JOIN TGFPRO PRO ON PRO.CODPROD=ITC.CODPROD
    WHERE PAR.NOMEPARC='${nomeparc}' AND ITC.STATUSPRODCOT <> 'C'
    ORDER BY ITC.NUMCOTACAO DESC`);
  return { cotacoes };
}

export async function detalheEstoque(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (!exigirAcessoCustos(req, res)) return;
  const tipo = Array.isArray(req.query.tipo) ? req.query.tipo[0] : req.query.tipo;
  try {
    if (tipo === 'produto') {
      const codprod = inteiroValido(req.query.codprod);
      if (codprod === null) return res.status(400).json({ error: 'codprod inválido.' });
      return res.status(200).json(await detalheProduto(codprod));
    }
    if (tipo === 'cotacao') {
      const numcotacao = inteiroValido(req.query.numcotacao);
      if (numcotacao === null) return res.status(400).json({ error: 'numcotacao inválido.' });
      return res.status(200).json(await detalheCotacao(numcotacao));
    }
    if (tipo === 'fornecedor') {
      const nomeparc = nomeParceiroValido(req.query.nomeparc);
      if (nomeparc === null) return res.status(400).json({ error: 'nomeparc inválido.' });
      return res.status(200).json(await detalheFornecedor(nomeparc));
    }
    return res.status(400).json({ error: 'Parâmetro tipo é obrigatório: produto, cotacao ou fornecedor.' });
  } catch (error) {
    console.error('Detalhe de estoque:', error);
    res.status(502).json({ error: error instanceof Error ? error.message : 'Falha ao consultar detalhe do estoque.' });
  }
}
