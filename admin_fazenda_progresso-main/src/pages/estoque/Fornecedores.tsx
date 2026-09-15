import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, BarChart3, Boxes, ChevronLeft, ChevronRight, Clock3, Database, Layers, Scale, Search, Sparkles, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { FiltroDataEstoque, ModalExpandido, TabelaInterativa, moeda, numero, useEstoquePainel, type Linha } from './estoqueShared';
import { SugestoesAutomaticas } from './SugestoesAutomaticas';
import { Carregando, SemDado } from '../../components/common/viz';

// Cores por faixa do Supplier Score (paleta categórica validada + um tom extra pra "Atenção",
// já que aqui são 4 níveis de status, não 3 séries categóricas).
const FAIXA_COR: Record<string, string> = {
  'Excelente': '#1baf7a',
  'Bom': '#2a78d6',
  'Regular': '#eb6834',
  'Atencao': '#e11d48',
};
const FAIXA_ROTULO: Record<string, string> = { Excelente: 'Excelente', Bom: 'Bom', Regular: 'Regular', Atencao: 'Atenção' };
const FAIXA_FAIXA_TEXTO: Record<string, string> = { Excelente: 'Score ≥ 85', Bom: '70 – 84', Regular: '50 – 69', Atencao: '< 50' };
const FAIXA_ESTILO: Record<string, string> = {
  'Excelente': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Bom': 'bg-blue-50 text-blue-700 border-blue-200',
  'Regular': 'bg-amber-50 text-amber-700 border-amber-200',
  'Atencao': 'bg-rose-50 text-rose-700 border-rose-200',
};

type ChaveKpi = 'ativos' | 'prazo' | 'taxa' | 'categorias' | 'economia';
const MODAL_CONFIG: Record<ChaveKpi, { titulo: string; subtitulo: string; ordenarPor: keyof Linha; desc: boolean }> = {
  ativos: { titulo: 'Fornecedores ativos no período', subtitulo: 'Todos os fornecedores com pelo menos uma cotação respondida no período filtrado, por ranking geral (Supplier Score).', ordenarPor: 'RANKING_GERAL', desc: false },
  prazo: { titulo: 'Melhor prazo médio', subtitulo: 'Fornecedores ordenados pelo menor prazo médio de entrega cotado.', ordenarPor: 'PRAZO_MEDIO_DIAS', desc: false },
  taxa: { titulo: 'Maior taxa de vitória', subtitulo: 'Fornecedores ordenados pela taxa de vitória (itens vencidos ÷ itens cotados).', ordenarPor: 'TAXA_VITORIA_PCT', desc: true },
  categorias: { titulo: 'Categorias atendidas por fornecedor', subtitulo: 'Fornecedores ordenados pelo número de categorias de produto distintas atendidas no período.', ordenarPor: 'CATEGORIAS_DISTINTAS', desc: true },
  economia: { titulo: 'Economia por fornecedor', subtitulo: 'Fornecedores ordenados pela economia gerada: cotações vencidas com preço abaixo da média dos concorrentes.', ordenarPor: 'ECONOMIA_POSITIVA_VS_MEDIA', desc: true },
};

// Ordena colocando valores nulos sempre por último, na direção pedida pro resto.
function ordenarComNulosPorUltimo(linhas: Linha[], chave: string, desc: boolean): Linha[] {
  return [...linhas].sort((a, b) => {
    const va = a[chave]; const vb = b[chave];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    const cmp = Number(va) - Number(vb);
    return desc ? -cmp : cmp;
  });
}

function CardFornecedores({ Icon, cor, rotulo, valor, apoio, onClick }: { Icon: typeof Boxes; cor: string; rotulo: string; valor: string; apoio?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`bg-white border rounded-2xl p-4 ${onClick ? 'cursor-pointer hover:border-emerald-300 transition-colors' : ''}`}>
      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3 ${cor}`}><Icon size={17} /></span>
      <p className="text-[11px] uppercase font-bold text-slate-400">{rotulo}</p>
      <p className="text-xl font-bold text-slate-800 mt-1">{valor}</p>
      {apoio && <p className="text-[11px] text-slate-400 mt-0.5">{apoio}</p>}
    </div>
  );
}

type LinhaRanking = {
  RANKING_GERAL: unknown; FORNECEDOR: unknown; SUPPLIER_SCORE: unknown; FAIXA_SUPPLIER_SCORE: unknown;
  TAXA_VITORIA_PCT: unknown; PRAZO_MEDIO_DIAS: unknown; COMPETITIVIDADE_PRECO_PCT: unknown;
  STATUS_COMPETITIVIDADE: unknown; CATEGORIAS_DISTINTAS: unknown; ECONOMIA_POSITIVA_VS_MEDIA: unknown;
  TOTAL_COTACOES: unknown; PRODUTOS_DISTINTOS: unknown;
};

const ITENS_POR_PAGINA_RANKING = 8;
type ColunaOrdenavel = 'SUPPLIER_SCORE' | 'TOTAL_COTACOES' | 'TAXA_VITORIA_PCT' | 'PRAZO_MEDIO_DIAS' | 'COMPETITIVIDADE_PRECO_PCT' | 'PRODUTOS_DISTINTOS';

function BadgeScorePill({ score }: { score: number }) {
  const cor = score >= 85 ? 'bg-emerald-100 text-emerald-700' : score >= 70 ? 'bg-blue-100 text-blue-700' : score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
  return <span className={`inline-flex items-center justify-center min-w-[2.25rem] px-2 py-0.5 rounded-lg text-xs font-bold ${cor}`}>{numero(score, 0)}</span>;
}

// Tabela de ranking dedicada (em vez do TabelaInterativa genérico) pra comportar busca, seleção
// pra comparação e as colunas exatas do Supplier Score — tudo a partir dos mesmos dados reais já
// carregados no período filtrado (nenhuma linha nova é buscada aqui).
function TabelaRanking({ linhas }: { linhas: LinhaRanking[] }) {
  const [busca, setBusca] = useState('');
  const [ordenarPor, setOrdenarPor] = useState<ColunaOrdenavel | null>(null);
  const [ordemDesc, setOrdemDesc] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [comparando, setComparando] = useState(false);

  const filtradas = useMemo(
    () => linhas.filter((l) => String(l.FORNECEDOR ?? '').toLocaleLowerCase().includes(busca.toLocaleLowerCase())),
    [linhas, busca],
  );

  const ordenadas = useMemo(() => {
    if (!ordenarPor) return filtradas;
    return ordenarComNulosPorUltimo(filtradas as unknown as Linha[], ordenarPor, ordemDesc) as unknown as LinhaRanking[];
  }, [filtradas, ordenarPor, ordemDesc]);

  const totalPaginas = Math.max(Math.ceil(ordenadas.length / ITENS_POR_PAGINA_RANKING), 1);
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA_RANKING;
  const visiveis = ordenadas.slice(inicio, inicio + ITENS_POR_PAGINA_RANKING);

  const alternarOrdenacao = (coluna: ColunaOrdenavel) => {
    setPagina(1);
    if (ordenarPor !== coluna) { setOrdenarPor(coluna); setOrdemDesc(true); return; }
    if (ordemDesc) { setOrdemDesc(false); return; }
    setOrdenarPor(null);
  };

  const alternarSelecao = (nome: string) => {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      novo.has(nome) ? novo.delete(nome) : novo.add(nome);
      return novo;
    });
  };

  const linhasSelecionadas = useMemo(() => linhas.filter((l) => selecionados.has(String(l.FORNECEDOR ?? ''))), [linhas, selecionados]);

  const CabecalhoOrdenavel = ({ coluna, children }: { coluna: ColunaOrdenavel; children: React.ReactNode }) => (
    <th className="p-3 font-semibold whitespace-nowrap select-none">
      <button onClick={() => alternarOrdenacao(coluna)} className="flex items-center gap-1 hover:text-slate-700">
        {children}
        {ordenarPor === coluna ? (ordemDesc ? <ArrowDown size={12} /> : <ArrowUp size={12} />) : <ArrowUpDown size={11} className="text-slate-300" />}
      </button>
    </th>
  );

  if (linhas.length === 0) return <SemDado mensagem="Nenhum fornecedor com cotação respondida no período filtrado." />;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <label className="flex items-center gap-2 border rounded-xl px-3 py-2 max-w-sm flex-1 min-w-[220px] text-slate-500">
          <Search size={14} /><input value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} placeholder="Buscar por fornecedor" className="w-full outline-none text-xs" />
        </label>
        <button onClick={() => setComparando(true)} disabled={selecionados.size < 2}
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed">
          <Scale size={14} /> Comparar selecionados{selecionados.size > 0 ? ` (${selecionados.size})` : ''}
        </button>
      </div>
      <div className="overflow-auto border rounded-xl">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="p-3 w-8" />
              <th className="p-3 font-semibold">#</th>
              <th className="p-3 font-semibold">Fornecedor</th>
              <CabecalhoOrdenavel coluna="SUPPLIER_SCORE">Supplier Score</CabecalhoOrdenavel>
              <CabecalhoOrdenavel coluna="TOTAL_COTACOES">Total de cotações</CabecalhoOrdenavel>
              <CabecalhoOrdenavel coluna="TAXA_VITORIA_PCT">Taxa de vitória</CabecalhoOrdenavel>
              <CabecalhoOrdenavel coluna="PRAZO_MEDIO_DIAS">Prazo médio (dias)</CabecalhoOrdenavel>
              <CabecalhoOrdenavel coluna="COMPETITIVIDADE_PRECO_PCT">Competitividade de preço</CabecalhoOrdenavel>
              <CabecalhoOrdenavel coluna="PRODUTOS_DISTINTOS">Produtos distintos</CabecalhoOrdenavel>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visiveis.map((linha) => {
              const nome = String(linha.FORNECEDOR ?? '');
              const competitividade = linha.COMPETITIVIDADE_PRECO_PCT != null ? Number(linha.COMPETITIVIDADE_PRECO_PCT) : null;
              const status = String(linha.STATUS_COMPETITIVIDADE ?? '');
              return (
                <tr key={nome} className="hover:bg-slate-50">
                  <td className="p-3"><input type="checkbox" checked={selecionados.has(nome)} onChange={() => alternarSelecao(nome)} className="rounded border-slate-300" /></td>
                  <td className="p-3 text-slate-500 font-medium">{numero(linha.RANKING_GERAL)}</td>
                  <td className="p-3 font-semibold text-slate-800 whitespace-nowrap">{nome}</td>
                  <td className="p-3"><BadgeScorePill score={Number(linha.SUPPLIER_SCORE ?? 0)} /></td>
                  <td className="p-3 text-slate-700">{numero(linha.TOTAL_COTACOES)}</td>
                  <td className="p-3 text-slate-700">{numero(linha.TAXA_VITORIA_PCT, 1)}%</td>
                  <td className="p-3 text-slate-700">{linha.PRAZO_MEDIO_DIAS != null ? numero(linha.PRAZO_MEDIO_DIAS, 1) : '—'}</td>
                  <td className={`p-3 font-semibold whitespace-nowrap ${status === 'Mais competitivo' ? 'text-emerald-600' : status === 'Mais caro' ? 'text-rose-600' : 'text-slate-500'}`}>
                    {competitividade != null ? `${status === 'Mais caro' ? '' : ''}${numero(Math.abs(competitividade), 0)}% ${status === 'Mais caro' ? 'mais caro' : 'mais competitivo'}` : '—'}
                  </td>
                  <td className="p-3 text-slate-700">{numero(linha.PRODUTOS_DISTINTOS)}</td>
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

      {comparando && (
        <ModalExpandido aberto={comparando} onFechar={() => setComparando(false)} titulo="Comparar fornecedores" subtitulo="Métricas do período filtrado, lado a lado.">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${linhasSelecionadas.length}, minmax(160px, 1fr))` }}>
            {linhasSelecionadas.map((l) => (
              <div key={String(l.FORNECEDOR)} className="border rounded-xl p-3 space-y-2">
                <p className="font-bold text-slate-800 text-sm">{String(l.FORNECEDOR)}</p>
                <div className="text-xs space-y-1.5">
                  <p className="flex justify-between"><span className="text-slate-400">Score</span><span className="font-semibold text-slate-700">{numero(l.SUPPLIER_SCORE, 1)}</span></p>
                  <p className="flex justify-between"><span className="text-slate-400">Faixa</span><span className="font-semibold" style={{ color: FAIXA_COR[String(l.FAIXA_SUPPLIER_SCORE)] }}>{FAIXA_ROTULO[String(l.FAIXA_SUPPLIER_SCORE)] ?? String(l.FAIXA_SUPPLIER_SCORE)}</span></p>
                  <p className="flex justify-between"><span className="text-slate-400">Total cotações</span><span className="font-semibold text-slate-700">{numero(l.TOTAL_COTACOES)}</span></p>
                  <p className="flex justify-between"><span className="text-slate-400">Taxa de vitória</span><span className="font-semibold text-slate-700">{numero(l.TAXA_VITORIA_PCT, 1)}%</span></p>
                  <p className="flex justify-between"><span className="text-slate-400">Prazo médio</span><span className="font-semibold text-slate-700">{l.PRAZO_MEDIO_DIAS != null ? `${numero(l.PRAZO_MEDIO_DIAS, 1)}d` : '—'}</span></p>
                  <p className="flex justify-between"><span className="text-slate-400">Produtos distintos</span><span className="font-semibold text-slate-700">{numero(l.PRODUTOS_DISTINTOS)}</span></p>
                </div>
              </div>
            ))}
          </div>
        </ModalExpandido>
      )}
    </>
  );
}

export function Fornecedores() {
  const { dados, erro, carregando, carregar, dataDe, setDataDe, dataAte, setDataAte, insights } = useEstoquePainel();
  const [modalAberto, setModalAberto] = useState<ChaveKpi | null>(null);
  const [verMetodologia, setVerMetodologia] = useState(false);
  const [fornecedorDestaque, setFornecedorDestaque] = useState('todos');

  // Análise de Fornecedores fornecida pela Fazenda Progresso (script próprio deles): Supplier
  // Score ponderado (35% taxa de vitória, 30% competitividade de preço vs. concorrentes na MESMA
  // cotação/item, 15% prazo, 10% cobertura de produtos, 10% volume) e economia calculada item a
  // item — não é estimativa nossa, é a fórmula e os dados reais deles, no período filtrado acima.
  // Prazo pode vir "—" (sem dado) quando nenhuma cotação respondida do fornecedor tem prazo de
  // entrega registrado — nunca vira 0 só pra preencher o card.
  const fornecedores = useMemo(() => (dados?.fornecedores ?? []).map((l) => ({
    fornecedor: String(l.FORNECEDOR ?? ''),
    prazo: l.PRAZO_MEDIO_DIAS != null ? Number(l.PRAZO_MEDIO_DIAS) : null,
    taxa: Number(l.TAXA_VITORIA_PCT ?? 0),
    cotacoes: Number(l.TOTAL_COTACOES ?? 0),
    produtos: Number(l.PRODUTOS_DISTINTOS ?? 0),
    score: Number(l.SUPPLIER_SCORE ?? 0),
    faixa: String(l.FAIXA_SUPPLIER_SCORE ?? ''),
    competitividade: l.COMPETITIVIDADE_PRECO_PCT ?? l.COMPETITIVIDADE_PRECO_MEDIA_PCT ?? null,
    statusCompetitividade: String(l.STATUS_COMPETITIVIDADE ?? ''),
  })), [dados]);
  // O gráfico só faz sentido pra quem tem os dois eixos — sem prazo registrado não dá pra plotar.
  const fornecedoresComPrazo = useMemo(() => fornecedores.filter((f) => f.prazo !== null), [fornecedores]);
  const fornecedoresGrafico = useMemo(
    () => fornecedorDestaque === 'todos' ? fornecedoresComPrazo : fornecedoresComPrazo.filter((f) => f.fornecedor === fornecedorDestaque),
    [fornecedoresComPrazo, fornecedorDestaque],
  );

  // A própria consulta já traz o ranking (RANKING_GERAL=1 é o melhor no período) e os totais
  // gerais do período replicados em toda linha (K.*) — pega da primeira, que é constante.
  const melhor = fornecedores[0];
  const totais = dados?.fornecedores?.[0];

  const linhasRanking = useMemo(() => (dados?.fornecedores ?? []).map((l) => ({
    RANKING_GERAL: l.RANKING_GERAL,
    FORNECEDOR: l.FORNECEDOR,
    SUPPLIER_SCORE: l.SUPPLIER_SCORE,
    FAIXA_SUPPLIER_SCORE: l.FAIXA_SUPPLIER_SCORE,
    TAXA_VITORIA_PCT: l.TAXA_VITORIA_PCT,
    PRAZO_MEDIO_DIAS: l.PRAZO_MEDIO_DIAS,
    COMPETITIVIDADE_PRECO_PCT: l.COMPETITIVIDADE_PRECO_PCT ?? l.COMPETITIVIDADE_PRECO_MEDIA_PCT ?? null,
    STATUS_COMPETITIVIDADE: l.STATUS_COMPETITIVIDADE,
    CATEGORIAS_DISTINTAS: l.CATEGORIAS_DISTINTAS,
    ECONOMIA_POSITIVA_VS_MEDIA: l.ECONOMIA_POSITIVA_VS_MEDIA,
    TOTAL_COTACOES: l.TOTAL_COTACOES,
    PRODUTOS_DISTINTOS: l.PRODUTOS_DISTINTOS,
  })), [dados]);

  const linhasModal = useMemo(() => {
    if (!modalAberto) return [];
    const cfg = MODAL_CONFIG[modalAberto];
    return ordenarComNulosPorUltimo(linhasRanking, cfg.ordenarPor as string, cfg.desc);
  }, [modalAberto, linhasRanking]);

  return <div className="space-y-5 pb-12">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold tracking-wider uppercase text-emerald-700">Estoque</p>
        <h1 className="text-2xl font-bold text-slate-800">Fornecedores</h1>
        <p className="text-sm text-slate-500 mt-1">Desempenho, competitividade e prazo para melhores decisões de compra.</p>
      </div>
      <Link to="/logistica/estoque/dashboard" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shrink-0">
        <BarChart3 size={15} className="text-emerald-700" /> Ver Dashboard
      </Link>
    </div>
    <FiltroDataEstoque dataDe={dataDe} setDataDe={setDataDe} dataAte={dataAte} setDataAte={setDataAte} carregando={carregando} carregar={carregar} />
    {erro && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{erro}</div>}
    {carregando && !dados ? <div className="bg-white border rounded-2xl p-12"><Carregando mensagem="Carregando fornecedores…" /></div> : dados && (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <CardFornecedores Icon={Boxes} cor="bg-blue-50 text-blue-600" rotulo="Fornecedores ativos" valor={numero(totais?.FORNECEDORES_ATIVOS_PERIODO)} onClick={() => setModalAberto('ativos')} />
          <CardFornecedores Icon={Clock3} cor="bg-emerald-50 text-emerald-600" rotulo="Melhor prazo médio" valor={totais?.MELHOR_PRAZO_MEDIO_PERIODO != null ? `${numero(totais.MELHOR_PRAZO_MEDIO_PERIODO, 1)} dias` : '—'} onClick={() => setModalAberto('prazo')} />
          <CardFornecedores Icon={Trophy} cor="bg-amber-50 text-amber-600" rotulo="Maior taxa de vitória" valor={totais?.MAIOR_TAXA_VITORIA_PERIODO != null ? `${numero(totais.MAIOR_TAXA_VITORIA_PERIODO, 1)}%` : '—'} onClick={() => setModalAberto('taxa')} />
          <CardFornecedores Icon={Layers} cor="bg-violet-50 text-violet-600" rotulo="Cobertura por categoria" valor={numero(totais?.CATEGORIAS_ATENDIDAS_PERIODO)} apoio="categorias atendidas" onClick={() => setModalAberto('categorias')} />
          <CardFornecedores Icon={Database} cor="bg-teal-50 text-teal-600" rotulo="Economia acumulada" valor={moeda(totais?.ECONOMIA_ACUMULADA_PERIODO)} onClick={() => setModalAberto('economia')} />
        </div>

        {melhor && (
          <section className="bg-white border border-emerald-200 rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 shrink-0"><Trophy size={18} /></span>
                <div>
                  <p className="font-bold text-slate-800">Melhor fornecedor no período</p>
                  <p className="text-xs text-slate-500">Com base no Supplier Score, taxa de vitória, prazo e competitividade.</p>
                </div>
              </div>
              <button onClick={() => setVerMetodologia((v) => !v)} className="text-xs font-bold text-emerald-700 hover:text-emerald-800 whitespace-nowrap">
                Ver metodologia →
              </button>
            </div>
            {verMetodologia && (
              <p className="mt-3 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
                Supplier Score pondera: 35% taxa de vitória, 30% competitividade de preço (vs. concorrentes na mesma cotação/item), 15% prazo de entrega, 10% cobertura de produtos distintos e 10% volume de cotações — calculado sobre os dados reais do período filtrado acima.
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <p className="text-lg font-bold text-slate-800">{melhor.fornecedor}</p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold"><Trophy size={12} /> 1º no ranking</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold">Supplier Score {numero(melhor.score, 0)}</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${FAIXA_ESTILO[melhor.faixa] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>{FAIXA_ROTULO[melhor.faixa] ?? melhor.faixa}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 border-t border-slate-100">
              <div><p className="text-lg font-bold text-slate-800">{numero(melhor.cotacoes)}</p><p className="text-[11px] text-slate-400">Total de cotações</p></div>
              <div><p className="text-lg font-bold text-slate-800">{numero(melhor.taxa, 1)}%</p><p className="text-[11px] text-slate-400">Taxa de vitória</p></div>
              <div><p className="text-lg font-bold text-slate-800">{melhor.prazo != null ? numero(melhor.prazo, 1) : '—'}</p><p className="text-[11px] text-slate-400">Prazo médio (dias)</p></div>
              <div><p className="text-lg font-bold text-slate-800">{melhor.competitividade != null ? `${numero(Math.abs(Number(melhor.competitividade)), 0)}%` : '—'}</p><p className="text-[11px] text-slate-400">{melhor.statusCompetitividade === 'Mais caro' ? 'Mais caro' : 'Mais competitivo'}</p></div>
              <div><p className="text-lg font-bold text-slate-800">{numero(melhor.produtos)}</p><p className="text-[11px] text-slate-400">Produtos distintos</p></div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <div className="xl:col-span-2 space-y-5">

        <section className="bg-white border rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
            <div>
              <h2 className="font-bold text-slate-800 flex items-center gap-2"><BarChart3 size={16} className="text-emerald-600" /> Preço × Prazo × Taxa de Vitória</h2>
              <p className="text-xs text-slate-500 mt-1">Cada ponto representa um fornecedor. Bubbles maiores indicam maior volume de cotações.</p>
            </div>
            <select value={fornecedorDestaque} onChange={(e) => setFornecedorDestaque(e.target.value)} className="rounded-xl border px-3 py-1.5 text-xs font-semibold text-slate-600">
              <option value="todos">Todos os fornecedores</option>
              {fornecedoresComPrazo.map((f) => <option key={f.fornecedor} value={f.fornecedor}>{f.fornecedor}</option>)}
            </select>
          </div>
          {fornecedoresComPrazo.length === 0 ? <SemDado mensagem="Nenhum fornecedor com prazo de entrega registrado no período filtrado." /> : (
            <div className="flex flex-col lg:flex-row gap-4 mt-3">
              <ResponsiveContainer width="100%" height={320} className="flex-1">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <XAxis type="number" dataKey="prazo" name="Prazo médio" unit=" dias" label={{ value: 'Prazo médio (dias)', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#898781' }} tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} />
                  <YAxis type="number" dataKey="taxa" name="Taxa de vitória" unit="%" domain={[0, 100]} label={{ value: 'Taxa de vitória', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#898781' }} tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} />
                  <ZAxis type="number" dataKey="cotacoes" range={[40, 400]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const p = payload[0].payload as typeof fornecedoresComPrazo[number];
                      return (
                        <div className="bg-white border rounded-xl shadow-lg p-2.5 text-xs">
                          <p className="font-bold text-slate-800">{p.fornecedor}</p>
                          <p className="text-slate-500">Score: {numero(p.score, 1)} ({FAIXA_ROTULO[p.faixa] ?? p.faixa})</p>
                          <p className="text-slate-500">Prazo médio: {numero(p.prazo, 1)} dias</p>
                          <p className="text-slate-500">Taxa de vitória: {numero(p.taxa, 1)}%</p>
                          <p className="text-slate-500">Cotações: {numero(p.cotacoes)}</p>
                        </div>
                      );
                    }} />
                  <Scatter data={fornecedoresGrafico} fillOpacity={0.75}>
                    {fornecedoresGrafico.map((f, i) => <Cell key={i} fill={FAIXA_COR[f.faixa] ?? '#94a3b8'} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <div className="flex lg:flex-col gap-3 lg:w-40 shrink-0 lg:justify-center flex-wrap">
                {Object.entries(FAIXA_ROTULO).map(([chave, rotulo]) => (
                  <div key={chave} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: FAIXA_COR[chave] }} />
                    <div>
                      <p className="text-[11px] font-bold text-slate-700 leading-tight">{rotulo}</p>
                      <p className="text-[10px] text-slate-400 leading-tight">{FAIXA_FAIXA_TEXTO[chave]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {fornecedoresComPrazo.length > 0 && fornecedoresComPrazo.length < fornecedores.length && (
            <p className="text-[11px] text-slate-400 mt-2">{fornecedores.length - fornecedoresComPrazo.length} fornecedor(es) sem prazo de entrega registrado não aparece(m) no gráfico.</p>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <h2 className="font-bold text-slate-800 mb-1">Ranking de fornecedores</h2>
          <p className="text-xs text-slate-500 mb-3">Compare fornecedores por desempenho, prazo, competitividade e produtos.</p>
          {insights.fornecedores && <p className="text-xs text-emerald-700 mb-3 flex items-start gap-1.5"><Sparkles size={13} className="shrink-0 mt-0.5" />{insights.fornecedores}</p>}
          {dados.erros.fornecedores
            ? <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3">Esta seção não pôde ser carregada: {dados.erros.fornecedores}</p>
            : <TabelaRanking linhas={linhasRanking as unknown as LinhaRanking[]} />}
        </section>

        </div>
        <div className="xl:col-span-1 xl:sticky xl:top-5">
          <SugestoesAutomaticas dados={dados} limite={6} />
        </div>
        </div>
      </>
    )}

    {modalAberto && (
      <ModalExpandido aberto={modalAberto !== null} onFechar={() => setModalAberto(null)} titulo={MODAL_CONFIG[modalAberto].titulo} subtitulo={MODAL_CONFIG[modalAberto].subtitulo}>
        <TabelaInterativa linhas={linhasModal} />
      </ModalExpandido>
    )}
  </div>;
}
