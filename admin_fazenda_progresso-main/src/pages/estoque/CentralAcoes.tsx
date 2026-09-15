import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BarChart3, Boxes, ChevronLeft, ChevronRight, Clock3, PackageX, Search, Sparkles, TriangleAlert, X } from 'lucide-react';
import { comSituacaoCotacao, moeda, numero, useEstoquePainel, type Linha } from './estoqueShared';
import { DetalheDrawer, type TipoDetalhe } from './DetalheDrawer';
import { Carregando, SemDado } from '../../components/common/viz';

type Impacto = 'Crítico' | 'Alto' | 'Médio';
const IMPACTO_ESTILO: Record<Impacto, string> = {
  'Crítico': 'bg-rose-50 text-rose-700 border-rose-200',
  'Alto': 'bg-amber-50 text-amber-700 border-amber-200',
  'Médio': 'bg-blue-50 text-blue-700 border-blue-200',
};
const IMPACTO_PESO: Record<Impacto, number> = { 'Crítico': 0, 'Alto': 1, 'Médio': 2 };

type Categoria = 'zerado' | 'abaixoMinimo' | 'risco15' | 'excesso' | 'cotacaoAtrasada' | 'cotacaoSemPrazo';
const CATEGORIA_ROTULO: Record<Categoria, string> = {
  zerado: 'Zerado',
  abaixoMinimo: 'Abaixo do mínimo',
  risco15: 'Risco em 15 dias',
  excesso: 'Excesso de estoque',
  cotacaoAtrasada: 'Cotação atrasada',
  cotacaoSemPrazo: 'Cotação sem prazo',
};

interface ItemAcao {
  tipo: 'Produto' | 'Cotação';
  categoria: Categoria;
  codigo: string;
  descricao: string;
  curva: string | null;
  cobertura: number | null;
  impacto: Impacto;
  motivo: string;
  linhaOriginal: Linha;
}

function CardAcoes({ Icon, cor, rotulo, valor, apoio, ativo, onClick }: { Icon: typeof Boxes; cor: string; rotulo: string; valor: string; apoio?: string; ativo?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`text-left bg-white border rounded-2xl p-4 transition-colors ${ativo ? 'border-emerald-400 ring-1 ring-emerald-200' : 'hover:border-slate-300'}`}>
      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3 ${cor}`}><Icon size={17} /></span>
      <p className="text-[11px] uppercase font-bold text-slate-400">{rotulo}</p>
      <p className="text-xl font-bold text-slate-800 mt-1">{valor}</p>
      {apoio && <p className="text-[11px] text-slate-400 mt-0.5">{apoio}</p>}
    </button>
  );
}

const ITENS_POR_PAGINA = 8;

// Todas as regras aqui são de negócio simples (limiar de estoque, prazo vencido), NUNCA um
// modelo preditivo ou pontuação de IA — "impacto" e "motivo" vêm direto do dado real da linha.
export function CentralAcoes() {
  const { dados, erro, carregando } = useEstoquePainel();
  const [busca, setBusca] = useState('');
  const [categoriasFiltro, setCategoriasFiltro] = useState<Set<Categoria>>(new Set());
  const [pagina, setPagina] = useState(1);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [detalheAberto, setDetalheAberto] = useState<{ tipo: TipoDetalhe; linha: Linha } | null>(null);

  // Cruza CODPROD com a Curva ABC calculada na consulta "valor" (top produtos por valor em
  // estoque) — cobertura parcial de propósito: um item de ruptura/excesso sem custo lançado ou
  // fora do topo por valor não tem curva conhecida, e mostra "—" em vez de chutar uma letra.
  const curvaPorProduto = useMemo(() => {
    const mapa = new Map<string, string>();
    (dados?.valor ?? []).forEach((l) => { if (l.CODPROD != null) mapa.set(String(l.CODPROD), String(l.CLASSEABC ?? '')); });
    return mapa;
  }, [dados]);

  const itens = useMemo<ItemAcao[]>(() => {
    if (!dados) return [];
    const doRuptura: ItemAcao[] = (dados.ruptura ?? []).flatMap((l) => {
      const estoque = Number(l.ESTOQUE ?? 0);
      const minimo = Number(l.MINIMO ?? 0);
      const dias = l.DIASRUPTURA != null ? Number(l.DIASRUPTURA) : null;
      const zerado = estoque <= 0;
      const abaixoMinimo = !zerado && minimo > 0 && estoque < minimo;
      const risco15 = !zerado && !abaixoMinimo && dias != null && dias > 0 && dias <= 15;
      if (!zerado && !abaixoMinimo && !risco15) return [];
      const categoria: Categoria = zerado ? 'zerado' : abaixoMinimo ? 'abaixoMinimo' : 'risco15';
      return [{
        tipo: 'Produto', categoria,
        codigo: String(l.CODPROD), descricao: String(l.DESCRPROD ?? ''),
        curva: curvaPorProduto.get(String(l.CODPROD)) || null,
        cobertura: dias,
        impacto: zerado ? 'Crítico' : abaixoMinimo ? 'Alto' : 'Médio',
        motivo: zerado ? 'Estoque zerado' : abaixoMinimo ? `Estoque (${numero(estoque)}) abaixo do mínimo (${numero(minimo)})` : `Risco de ruptura em ${numero(dias)} dia(s)`,
        linhaOriginal: l,
      } satisfies ItemAcao];
    });

    const doExcesso: ItemAcao[] = (dados.excesso ?? []).map((l) => {
      const valorParado = l.VALORPARADO != null ? Number(l.VALORPARADO) : null;
      return {
        tipo: 'Produto', categoria: 'excesso',
        codigo: String(l.CODPROD), descricao: String(l.DESCRPROD ?? ''),
        curva: curvaPorProduto.get(String(l.CODPROD)) || null,
        cobertura: null,
        impacto: 'Médio',
        motivo: valorParado && valorParado > 0 ? `Capital parado: ${moeda(valorParado)}` : `Estoque (${numero(l.ESTOQUE)}) acima do máximo (${numero(l.MAXIMO)})`,
        linhaOriginal: l,
      } satisfies ItemAcao;
    });

    const cotacoesComSituacao = comSituacaoCotacao(dados.cotacoes);
    const doCotacoes: ItemAcao[] = cotacoesComSituacao
      .filter((l) => l.SITUACAO_COTACAO === 'Atrasada' || l.SITUACAO_COTACAO === 'Sem prazo')
      .map((l) => ({
        tipo: 'Cotação',
        categoria: l.SITUACAO_COTACAO === 'Atrasada' ? 'cotacaoAtrasada' : 'cotacaoSemPrazo',
        codigo: String(l.NUMCOTACAO),
        descricao: `Cotação nº ${l.NUMCOTACAO} — ${numero(l.ITENSEMABERTO)} ite${Number(l.ITENSEMABERTO) === 1 ? 'm' : 'ns'} em aberto`,
        curva: null, cobertura: null,
        impacto: l.SITUACAO_COTACAO === 'Atrasada' ? 'Alto' : 'Médio',
        motivo: l.SITUACAO_COTACAO === 'Atrasada' ? 'Prazo final já vencido' : 'Sem prazo final definido',
        linhaOriginal: l,
      } satisfies ItemAcao));

    return [...doRuptura, ...doExcesso, ...doCotacoes].sort((a, b) => IMPACTO_PESO[a.impacto] - IMPACTO_PESO[b.impacto]);
  }, [dados, curvaPorProduto]);

  const filtrados = useMemo(() => itens
    .filter((i) => categoriasFiltro.size === 0 || categoriasFiltro.has(i.categoria))
    .filter((i) => (i.descricao + i.codigo).toLocaleLowerCase().includes(busca.toLocaleLowerCase())),
    [itens, categoriasFiltro, busca]);

  const totalPaginas = Math.max(Math.ceil(filtrados.length / ITENS_POR_PAGINA), 1);
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice((paginaAtual - 1) * ITENS_POR_PAGINA, (paginaAtual - 1) * ITENS_POR_PAGINA + ITENS_POR_PAGINA);

  const alternarCategoria = (categoria: Categoria) => {
    setPagina(1);
    setCategoriasFiltro((atual) => {
      const novo = new Set(atual);
      novo.has(categoria) ? novo.delete(categoria) : novo.add(categoria);
      return novo;
    });
  };

  const porCategoria = (categoria: Categoria) => itens.filter((i) => i.categoria === categoria).length;
  const excessoValorTotal = useMemo(() => (dados?.excesso ?? []).reduce((soma, l) => soma + Number(l.VALORPARADO ?? 0), 0), [dados]);

  const abrirDetalhe = (item: ItemAcao) => {
    if (item.tipo === 'Produto') setDetalheAberto({ tipo: 'produto', linha: item.linhaOriginal });
    else setDetalheAberto({ tipo: 'cotacao', linha: item.linhaOriginal });
  };

  const alternarSelecao = (codigo: string) => {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      novo.has(codigo) ? novo.delete(codigo) : novo.add(codigo);
      return novo;
    });
  };

  return <div className="space-y-5 pb-12">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold tracking-wider uppercase text-emerald-700">Estoque</p>
        <h1 className="text-2xl font-bold text-slate-800">Central de Ações</h1>
        <p className="text-sm text-slate-500 mt-1">Prioridades operacionais que exigem sua atenção para manter o estoque saudável e a operação em dia.</p>
      </div>
      <Link to="/logistica/estoque/dashboard" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shrink-0">
        <BarChart3 size={15} className="text-emerald-700" /> Ver Dashboard
      </Link>
    </div>
    {erro && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{erro}</div>}
    {carregando && !dados ? <div className="bg-white border rounded-2xl p-12"><Carregando mensagem="Carregando itens que precisam de ação…" /></div> : dados && (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <CardAcoes Icon={TriangleAlert} cor="bg-rose-50 text-rose-600" rotulo="Críticos" valor={numero(itens.length)} ativo={categoriasFiltro.size === 0} onClick={() => setCategoriasFiltro(new Set())} />
          <CardAcoes Icon={AlertTriangle} cor="bg-amber-50 text-amber-600" rotulo="Rupturas" valor={numero(dados.kpis.TOTALRUPTURA)} ativo={categoriasFiltro.has('abaixoMinimo') || categoriasFiltro.has('zerado')} onClick={() => setCategoriasFiltro(new Set(['zerado', 'abaixoMinimo']))} />
          <CardAcoes Icon={Clock3} cor="bg-orange-50 text-orange-600" rotulo="Risco em 15 dias" valor={numero(porCategoria('risco15'))} ativo={categoriasFiltro.has('risco15')} onClick={() => setCategoriasFiltro(new Set(['risco15']))} />
          <CardAcoes Icon={Boxes} cor="bg-violet-50 text-violet-600" rotulo="Excesso de estoque" valor={numero((dados.excesso ?? []).length)} apoio={excessoValorTotal > 0 ? `${moeda(excessoValorTotal)} em capital parado` : undefined} ativo={categoriasFiltro.has('excesso')} onClick={() => setCategoriasFiltro(new Set(['excesso']))} />
          <CardAcoes Icon={PackageX} cor="bg-slate-100 text-slate-600" rotulo="Sem giro há 90+ dias" valor={numero(dados.kpis.TOTALSEMMOVIMENTACAO)} apoio="não entra na lista abaixo — ver Análises" />
        </div>

        <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
          <div className="p-5 pb-0 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-800 flex items-center gap-2">Itens que precisam de ação <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold">{itens.length}</span></h2>
              <p className="text-xs text-slate-500 mt-1">Selecione os itens e clique numa linha pra ver o detalhe completo.</p>
            </div>
          </div>
          <div className="p-5">
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {(Object.keys(CATEGORIA_ROTULO) as Categoria[]).map((cat) => (
                <button key={cat} onClick={() => alternarCategoria(cat)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-colors ${categoriasFiltro.has(cat) ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {CATEGORIA_ROTULO[cat]} <span className="opacity-70">({porCategoria(cat)})</span>
                  {categoriasFiltro.has(cat) && <X size={11} />}
                </button>
              ))}
              {categoriasFiltro.size > 0 && (
                <button onClick={() => setCategoriasFiltro(new Set())} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 px-2">Limpar filtros</button>
              )}
            </div>
            <label className="flex items-center gap-2 border rounded-xl px-3 py-2 max-w-sm text-slate-500 mb-3">
              <Search size={14} /><input value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} placeholder="Buscar por código ou descrição" className="w-full outline-none text-xs" />
            </label>
            {filtrados.length === 0 ? <SemDado mensagem="Nenhum item precisa de ação com esse filtro." /> : (
              <div className="overflow-auto border rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="p-3 w-8" />
                      <th className="p-3 font-semibold">Código</th>
                      <th className="p-3 font-semibold">Produto</th>
                      <th className="p-3 font-semibold">Curva</th>
                      <th className="p-3 font-semibold">Cobertura</th>
                      <th className="p-3 font-semibold">Impacto</th>
                      <th className="p-3 font-semibold">Recomendação</th>
                      <th className="p-3 font-semibold">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {visiveis.map((item, i) => (
                      <tr key={`${item.tipo}-${item.codigo}-${i}`} className="hover:bg-slate-50">
                        <td className="p-3"><input type="checkbox" checked={selecionados.has(item.codigo)} onChange={() => alternarSelecao(item.codigo)} className="rounded border-slate-300" /></td>
                        <td className="p-3 whitespace-nowrap font-semibold text-slate-700 cursor-pointer" onClick={() => abrirDetalhe(item)}>{item.codigo}</td>
                        <td className="p-3 text-slate-700 cursor-pointer" onClick={() => abrirDetalhe(item)}>{item.descricao}</td>
                        <td className="p-3 whitespace-nowrap">{item.curva ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-md border text-[11px] font-bold bg-slate-50 border-slate-200 text-slate-600">{item.curva}</span> : <span className="text-slate-300">—</span>}</td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">{item.cobertura != null ? `${numero(item.cobertura)} dias` : '—'}</td>
                        <td className="p-3 whitespace-nowrap"><span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-bold ${IMPACTO_ESTILO[item.impacto]}`}>{item.impacto}</span></td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">{item.motivo}</td>
                        <td className="p-3"><button onClick={() => abrirDetalhe(item)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100">Ver detalhe <ArrowRight size={11} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
              <p className="text-[11px] text-slate-400">Mostrando {visiveis.length} de {filtrados.length} item(ns) — página {paginaAtual} de {totalPaginas}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPagina((p) => Math.max(p - 1, 1))} disabled={paginaAtual <= 1} className="p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50"><ChevronLeft size={14} /></button>
                <button onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas))} disabled={paginaAtual >= totalPaginas} className="p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50"><ChevronRight size={14} /></button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><Sparkles size={16} className="text-emerald-600" /> Resumo por categoria</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {(Object.keys(CATEGORIA_ROTULO) as Categoria[]).map((cat) => (
              <div key={cat} className="border rounded-xl p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold text-slate-500">{CATEGORIA_ROTULO[cat]}</p>
                  <p className="text-lg font-bold text-slate-800">{numero(porCategoria(cat))}</p>
                </div>
                <button onClick={() => setCategoriasFiltro(new Set([cat]))} className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 whitespace-nowrap">Ver itens →</button>
              </div>
            ))}
          </div>
        </section>
      </>
    )}
    {detalheAberto && <DetalheDrawer aberto onFechar={() => setDetalheAberto(null)} tipo={detalheAberto.tipo} linha={detalheAberto.linha} />}
  </div>;
}
