import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Boxes, RefreshCw, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cabecalhoPerfil } from '../../utils/apiAuth';
import { hojeISO, primeiroDiaMesISO } from '../../components/common/vizTokens';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export type Linha = Record<string, unknown>;
export type DadosEstoque = {
  ruptura: Linha[];
  semMovimentacao: Linha[];
  valor: Linha[];
  curvaAbc: Linha[];
  fornecedores: Linha[];
  cotacoes: Linha[];
  giroProdutos: Linha[];
  kpis: Linha;
  erros: Record<string, string>;
};

export const moeda = (valor: unknown) => Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const numero = (valor: unknown, casas = 0) => Number(valor ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: casas });
// O gateway do Sankhya (DbExplorerSP) não normaliza data: já veio como epoch em ms, como
// "/Date(169...)/ " (formato clássico ASP.NET) e — confirmado direto no banco (TGFCAB.DTNEG) —
// como "DDMMAAAA HH:mm:ss" SEM separador nenhum ("20062018 15:28:42" = 20/06/2018). Nenhum
// desses é interpretado por um new Date(texto) ingênuo.
export const data = (valor: unknown) => {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'number') {
    const d = new Date(valor);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
  }
  const texto = String(valor);
  const aspNet = texto.match(/\/Date\((-?\d+)/);
  if (aspNet) {
    const d = new Date(Number(aspNet[1]));
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
  }
  const ddmmaaaa = texto.match(/^(\d{2})(\d{2})(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/);
  if (ddmmaaaa) {
    const [, dia, mes, ano, hora = '0', min = '0', seg = '0'] = ddmmaaaa;
    const d = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(min), Number(seg));
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
  }
  const d = new Date(texto.includes(' ') && !texto.includes('T') ? texto.replace(' ', 'T') : texto);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
};

export const ROTULOS_COLUNAS: Record<string, string> = {
  CODPROD: 'Código', DESCRPROD: 'Descrição', REFERENCIA: 'Referência', LOCAL: 'Local', LOTE: 'Lote',
  ESTOQUE: 'Estoque', MINIMO: 'Mínimo', MAXIMO: 'Máximo', MINIMOSUGERIDO: 'Mínimo sugerido', DIASRUPTURA: 'Dias p/ ruptura',
  PRODFALTA: 'Em falta', PONTOPEDIDO: 'Ponto de pedido', GIRODIARIO: 'Giro diário', DIASSEMVENDA: 'Dias sem venda',
  VALORESTOQUE: 'Valor em estoque', CUSTO: 'Custo', VALORTOTAL: 'Valor total', CLASSEABC: 'ABC', FORNECEDOR: 'Fornecedor',
  PRAZOMEDIO: 'Prazo médio (dias)', TOTALCOTACOES: 'Total de cotações', TOTALVENCIDAS: 'Cotações vencidas', TAXAVITORIA: 'Taxa de vitória',
  PRODUTOSDISTINTOS: 'Produtos distintos', NUMCOTACAO: 'Nº cotação',
  DHINIC: 'Início', DHFINAL: 'Prazo final', COMPRADOR: 'Comprador', TOTALITENS: 'Total de itens', ITENSEMABERTO: 'Itens em aberto',
  QTD_COMPRA: 'Qtd. compra', QTD_DEV_COMPRA: 'Qtd. devolução', COMPRA_LIQUIDA: 'Compra líquida',
  CONSUMO: 'Consumo', ESTOQUE_ATUAL: 'Estoque atual', ESTMIN: 'Estoque mínimo', ESTMAX: 'Estoque máximo',
  GIRO_ESTOQUE: 'Giro de estoque', DIAS_COBERTURA: 'Dias de cobertura',
  MARCA: 'Marca', ATIVO: 'Ativo', CODLOCAL: 'Cód. local', NUNOTA: 'Nº nota (interno)', NUMNOTA: 'Nota fiscal',
  DTNEG: 'Data', TIPMOV: 'Tipo mov.', TIPO: 'Tipo', PARCEIRO: 'Parceiro', QTDNEG: 'Quantidade',
  CUSTOUNITARIO: 'Custo unitário', SITUACAO: 'Situação', PRAZOENTREGA: 'Prazo entrega (dias)', MELHORPRECO: 'Melhor preço',
};
export const rotuloColuna = (chave: string) => ROTULOS_COLUNAS[chave]
  ?? chave.replace(/_/g, ' ').toLowerCase().replace(/^\p{L}/u, (letra) => letra.toUpperCase());

export const valorCelula = (chave: string, valor: unknown) => {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (/^TAXAVITORIA$/i.test(chave)) return `${numero(valor, 1)}%`;
  // PRAZOMEDIO/PONTOPEDIDO são contagem (dias/quantidade), não dinheiro — só VALOR/CUSTO/
  // CONFIAB/QUALIDADE são de fato monetários ou percentuais tratados como moeda aqui.
  if (/VALOR|CUSTO|CONFIAB|QUALIDADE/i.test(chave)) return moeda(valor);
  if (/DATA|DHINIC|DHFINAL/i.test(chave)) return data(valor);
  if (/PRAZO/i.test(chave)) return numero(valor, 1);
  if (typeof valor === 'number') return numero(valor, /GIRO/i.test(chave) ? 3 : 0);
  return String(valor);
};

export function useEstoquePainel() {
  const { usuario } = useAuth();
  const [dataDe, setDataDe] = useState(primeiroDiaMesISO());
  const [dataAte, setDataAte] = useState(hojeISO());
  const [dados, setDados] = useState<DadosEstoque | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [insights, setInsights] = useState<Record<string, string>>({});
  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try {
      const qs = new URLSearchParams({ dataInicio: dataDe, dataFim: dataAte });
      const resposta = await fetch(`${API_URL}/api/estoque/painel?${qs}`, { headers: cabecalhoPerfil(usuario?.perfil) });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.error ?? 'Falha ao consultar o estoque.');
      setDados(corpo);
    } catch (falha) { setErro(falha instanceof Error ? falha.message : 'Falha ao carregar o estoque.'); }
    finally { setCarregando(false); }
  }, [usuario?.perfil, dataDe, dataAte]);
  useEffect(() => { carregar(); }, [carregar]);

  // Um insight por seção, gerado numa chamada só depois que o painel carrega — não bloqueia a
  // tela (falha em silêncio, sem "insight" nenhum é melhor que travar a tela por causa disso).
  useEffect(() => {
    if (!dados) return;
    setInsights({});
    const secoes = {
      ruptura: dados.ruptura, semMovimentacao: dados.semMovimentacao, valor: dados.valor, curvaAbc: dados.curvaAbc,
      fornecedores: dados.fornecedores, cotacoes: dados.cotacoes, giroProdutos: dados.giroProdutos,
    };
    fetch(`${API_URL}/api/estoque/insight`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...cabecalhoPerfil(usuario?.perfil) }, body: JSON.stringify({ secoes }) })
      .then((resp) => resp.ok ? resp.json() : null)
      .then((corpo) => { if (corpo?.insights) setInsights(corpo.insights); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados]);

  return { dados, erro, carregando, carregar, dataDe, setDataDe, dataAte, setDataAte, insights };
}

export function FiltroDataEstoque({ dataDe, setDataDe, dataAte, setDataAte, carregando, carregar }: {
  dataDe: string; setDataDe: (v: string) => void;
  dataAte: string; setDataAte: (v: string) => void;
  carregando: boolean; carregar: () => void;
}) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">De</span>
        <input type="date" value={dataDe} max={dataAte} onChange={(e) => setDataDe(e.target.value)}
          className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700" />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Até</span>
        <input type="date" value={dataAte} min={dataDe} onChange={(e) => setDataAte(e.target.value)}
          className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700" />
      </div>
      <p className="text-[11px] text-slate-400">Filtra o consumo/giro por requisição. Ruptura, Curva ABC, cotações e fornecedores mostram sempre o cadastro atual.</p>
      <button onClick={carregar} disabled={carregando}
        className="ml-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-60">
        <RefreshCw size={16} className={carregando ? 'animate-spin' : ''} /> Atualizar
      </button>
    </div>
  );
}

export function KpiCardsEstoque({ kpis }: { kpis: Linha }) {
  const cards: { rotulo: string; valor: string; Icon: typeof Boxes }[] = [
    { rotulo: 'Valor total em estoque', valor: moeda(kpis.VALORTOTALESTOQUE), Icon: Boxes },
    { rotulo: 'Itens em ruptura', valor: numero(kpis.TOTALRUPTURA), Icon: AlertTriangle },
    { rotulo: 'Sem venda há 90+ dias', valor: numero(kpis.TOTALSEMMOVIMENTACAO), Icon: AlertTriangle },
    { rotulo: 'Cotações em aberto', valor: numero(kpis.TOTALCOTACOES), Icon: Boxes },
    { rotulo: 'Giro de estoque (período)', valor: kpis.giroEstoque == null ? '—' : `${numero(kpis.giroEstoque, 2)}x`, Icon: TrendingUp },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
      {cards.map(({ rotulo, valor, Icon }) => (
        <div key={rotulo} className="bg-white border rounded-2xl p-4">
          <Icon size={17} className="text-emerald-600 mb-3" />
          <p className="text-[11px] uppercase font-bold text-slate-400">{rotulo}</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{valor}</p>
        </div>
      ))}
    </div>
  );
}
