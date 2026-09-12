import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Boxes, ChevronLeft, ChevronRight, RefreshCw, Search, TrendingUp, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cabecalhoPerfil } from '../../utils/apiAuth';
import { hojeISO, primeiroDiaMesISO } from '../../components/common/vizTokens';
import { DetalheDrawer, type TipoDetalhe } from './DetalheDrawer';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export type Linha = Record<string, unknown>;
export type DadosEstoque = {
  ruptura: Linha[];
  semMovimentacao: Linha[];
  valor: Linha[];
  curvaAbc: Linha[];
  fornecedores: Linha[];
  cotacoes: Linha[];
  cotacoesPorSituacao: Linha[];
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
  PRODFALTA: 'Em falta', PONTOPEDIDO: 'Ponto de pedido', GIRODIARIO: 'Giro diário', DIASSEMVENDA: 'Dias sem saída',
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
  QTD_COMPRAR: 'Qtd. sugerida p/ compra', CODLOCALPADRAO: 'Estoque local padrão', DESCRLOCAL_PADRAO: 'Local padrão (detalhe)',
  OUTROS_LOCAIS: 'Estoque outros locais', DESC_OUTROS_LOCAIS: 'Outros locais (detalhe)', TOTAL: 'Valor total',
  UTILIZADO: 'Último ano utilizado', DIAS_SEM_USO: 'Dias sem uso', ULTIMA_MOV: 'Última movimentação',
};
export const rotuloColuna = (chave: string) => ROTULOS_COLUNAS[chave]
  ?? chave.replace(/_/g, ' ').toLowerCase().replace(/^\p{L}/u, (letra) => letra.toUpperCase());

export const valorCelula = (chave: string, valor: unknown) => {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (/^TAXAVITORIA$/i.test(chave)) return `${numero(valor, 1)}%`;
  // PRAZOMEDIO/PONTOPEDIDO são contagem (dias/quantidade), não dinheiro — só VALOR/CUSTO/
  // CONFIAB/QUALIDADE são de fato monetários ou percentuais tratados como moeda aqui.
  // TOTAL isolado (estoque parado x custo) também é dinheiro — mas TOTALCOTACOES/TOTALVENCIDAS/
  // TOTALITENS/TOTALRUPTURA são contagem, então só o nome exato "TOTAL" entra aqui, não o prefixo.
  if (/VALOR|CUSTO|CONFIAB|QUALIDADE/i.test(chave) || /^TOTAL$/i.test(chave)) return moeda(valor);
  if (/DATA|DHINIC|DHFINAL|DTNEG|ULTIMA_MOV/i.test(chave)) return data(valor);
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

export function KpiCardsEstoque({ kpis, cotacoesPorSituacao, aoClicarCard }: { kpis: Linha; cotacoesPorSituacao?: Linha[]; aoClicarCard?: (chave: string) => void }) {
  const [mostrarQuebra, setMostrarQuebra] = useState(false);
  const cards: { chave: string; rotulo: string; valor: string; Icon: typeof Boxes }[] = [
    { chave: 'valor', rotulo: 'Valor total em estoque', valor: moeda(kpis.VALORTOTALESTOQUE), Icon: Boxes },
    { chave: 'ruptura', rotulo: 'Itens em ruptura', valor: numero(kpis.TOTALRUPTURA), Icon: AlertTriangle },
    { chave: 'semMovimentacao', rotulo: 'Sem saída há 90+ dias', valor: numero(kpis.TOTALSEMMOVIMENTACAO), Icon: AlertTriangle },
    { chave: 'cotacoes', rotulo: 'Cotações em aberto', valor: numero(kpis.TOTALCOTACOES), Icon: Boxes },
    { chave: 'giro', rotulo: 'Giro de estoque (período)', valor: kpis.giroEstoque == null ? '—' : `${numero(kpis.giroEstoque, 2)}x`, Icon: TrendingUp },
  ];
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {cards.map(({ chave, rotulo, valor, Icon }) => {
          // No Dashboard (aoClicarCard definido) todo card expande numa tela dedicada; no Painel
          // de Estoque (sem aoClicarCard) só "Cotações em aberto" mantém o comportamento antigo
          // de abrir a quebra por situação embutida.
          const onClick = aoClicarCard
            ? () => aoClicarCard(chave)
            : (chave === 'cotacoes' && cotacoesPorSituacao?.length ? () => setMostrarQuebra((atual) => !atual) : undefined);
          return (
            <div key={rotulo} onClick={onClick} className={`bg-white border rounded-2xl p-4 ${onClick ? 'cursor-pointer hover:border-emerald-300' : ''}`}>
              <Icon size={17} className="text-emerald-600 mb-3" />
              <p className="text-[11px] uppercase font-bold text-slate-400">{rotulo}{onClick && ' · clique p/ detalhar'}</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{valor}</p>
            </div>
          );
        })}
      </div>
      {/* Sugestão do Eder: quebra por situação (itens, não cotações) ao clicar no card — só no Painel de Estoque. */}
      {!aoClicarCard && mostrarQuebra && cotacoesPorSituacao?.length && (
        <div className="mt-3 bg-white border rounded-2xl p-4 flex flex-wrap gap-4">
          {cotacoesPorSituacao.map((linha) => (
            <div key={String(linha.SITUACAO)}>
              <p className="text-[11px] uppercase font-bold text-slate-400">{String(linha.SITUACAO)}</p>
              <p className="text-lg font-bold text-slate-800">{numero(linha.TOTALITENS)} <span className="text-xs font-normal text-slate-400">itens</span></p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Toda linha que tenha um desses campos pode ser clicada pra abrir o drawer de detalhe —
// a ordem decide a prioridade quando mais de um campo aparecer na mesma linha.
export function tipoDetalheDaLinha(linha: Linha): TipoDetalhe | null {
  if (linha.CODPROD !== undefined) return 'produto';
  if (linha.NUMCOTACAO !== undefined) return 'cotacao';
  if (linha.FORNECEDOR !== undefined) return 'fornecedor';
  return null;
}

export interface FiltroSituacaoTabela { coluna: string; rotuloSim: string; rotuloNao: string }

const ITENS_POR_PAGINA = 25;

// Tabela de busca + ordenação + paginação + drawer de detalhe, reutilizada tanto no Painel de
// Estoque (dentro da seção colapsável) quanto nas telas expandidas do Dashboard.
export function TabelaInterativa({ linhas, filtroSituacao }: { linhas: Linha[]; filtroSituacao?: FiltroSituacaoTabela }) {
  const [busca, setBusca] = useState('');
  const [situacaoFiltro, setSituacaoFiltro] = useState<'todos' | 'S' | 'N'>('todos');
  const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
  const [ordemDesc, setOrdemDesc] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [detalheAberto, setDetalheAberto] = useState<{ tipo: TipoDetalhe; linha: Linha } | null>(null);
  const colunas = useMemo(() => linhas.length ? Object.keys(linhas[0]) : [], [linhas]);

  const porSituacao = useMemo(() => {
    if (!filtroSituacao || situacaoFiltro === 'todos') return linhas;
    return linhas.filter((linha) => String(linha[filtroSituacao.coluna]) === situacaoFiltro);
  }, [linhas, filtroSituacao, situacaoFiltro]);

  const filtradas = useMemo(() => porSituacao.filter((linha) => Object.values(linha).some((valor) => String(valor ?? '').toLocaleLowerCase().includes(busca.toLocaleLowerCase()))), [porSituacao, busca]);

  const ordenadas = useMemo(() => {
    if (!ordenarPor) return filtradas;
    const copia = [...filtradas];
    copia.sort((a, b) => {
      const va = a[ordenarPor];
      const vb = b[ordenarPor];
      const na = Number(va);
      const nb = Number(vb);
      const cmp = !isNaN(na) && !isNaN(nb) && va !== null && vb !== null
        ? na - nb
        : String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR');
      return ordemDesc ? -cmp : cmp;
    });
    return copia;
  }, [filtradas, ordenarPor, ordemDesc]);

  const totalPaginas = Math.max(Math.ceil(ordenadas.length / ITENS_POR_PAGINA), 1);
  const paginaAtual = Math.min(pagina, totalPaginas);
  const pagina0 = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const visiveis = ordenadas.slice(pagina0, pagina0 + ITENS_POR_PAGINA);

  const alternarOrdenacao = (coluna: string) => {
    setPagina(1);
    if (ordenarPor !== coluna) { setOrdenarPor(coluna); setOrdemDesc(false); return; }
    if (!ordemDesc) { setOrdemDesc(true); return; }
    setOrdenarPor(null);
  };

  const clicavel = linhas.length > 0 && tipoDetalheDaLinha(linhas[0]) !== null;

  if (linhas.length === 0) return <p className="text-sm text-slate-400 border border-dashed rounded-xl p-6 text-center">Nenhum dado encontrado.</p>;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 border rounded-xl px-3 py-2 max-w-sm text-slate-500 flex-1 min-w-[200px]">
          <Search size={14}/><input value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} placeholder="Buscar nesta lista" className="w-full outline-none text-xs" />
        </label>
        {filtroSituacao && (
          <div className="flex items-center gap-1 border rounded-xl p-1 text-xs">
            {([['todos', 'Todos'], ['S', filtroSituacao.rotuloSim], ['N', filtroSituacao.rotuloNao]] as const).map(([valor, rotulo]) => (
              <button key={valor} onClick={() => { setSituacaoFiltro(valor); setPagina(1); }}
                className={`px-2.5 py-1 rounded-lg font-semibold ${situacaoFiltro === valor ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                {rotulo}
              </button>
            ))}
          </div>
        )}
        {clicavel && <p className="text-[11px] text-slate-400">Clique numa linha pra ver o detalhe</p>}
      </div>
      <div className="overflow-auto max-h-[420px] border rounded-xl">
        <table className="w-full text-xs text-left">
          <thead className="sticky top-0 bg-slate-50 text-slate-500">
            <tr>{colunas.map((coluna) => (
              <th key={coluna} className="p-3 font-semibold whitespace-nowrap select-none">
                <button onClick={() => alternarOrdenacao(coluna)} className="flex items-center gap-1 hover:text-slate-700">
                  {rotuloColuna(coluna)}
                  {ordenarPor === coluna ? (ordemDesc ? <ArrowDown size={12} /> : <ArrowUp size={12} />) : <ArrowUpDown size={11} className="text-slate-300" />}
                </button>
              </th>
            ))}</tr>
          </thead>
          <tbody className="divide-y">
            {visiveis.map((linha, indice) => {
              const tipo = tipoDetalheDaLinha(linha);
              return (
                <tr key={indice} onClick={() => tipo && setDetalheAberto({ tipo, linha })} className={`hover:bg-slate-50 ${tipo ? 'cursor-pointer' : ''}`}>
                  {colunas.map((coluna) => <td key={coluna} className="p-3 whitespace-nowrap text-slate-700">{valorCelula(coluna, linha[coluna])}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
        <p className="text-[11px] text-slate-400">Exibindo {visiveis.length} de {ordenadas.length} registro(s) — página {paginaAtual} de {totalPaginas}</p>
        <div className="flex items-center gap-1">
          <button onClick={() => setPagina((p) => Math.max(p - 1, 1))} disabled={paginaAtual <= 1} className="p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50"><ChevronLeft size={14} /></button>
          <button onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas))} disabled={paginaAtual >= totalPaginas} className="p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50"><ChevronRight size={14} /></button>
        </div>
      </div>
      {detalheAberto && <DetalheDrawer aberto onFechar={() => setDetalheAberto(null)} tipo={detalheAberto.tipo} linha={detalheAberto.linha} />}
    </>
  );
}

// Tela cheia sobreposta pra "expandir" um card do Dashboard (gráfico + tabela completa).
export function ModalExpandido({ aberto, titulo, subtitulo, onFechar, children }: {
  aberto: boolean; titulo: string; subtitulo?: string; onFechar: () => void; children: React.ReactNode;
}) {
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-3 sm:p-6" onClick={onFechar}>
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-100 p-4 sm:p-5 flex items-start justify-between gap-3 z-10 rounded-t-2xl">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">{titulo}</h2>
            {subtitulo && <p className="text-xs text-slate-500 mt-1">{subtitulo}</p>}
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 shrink-0" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
