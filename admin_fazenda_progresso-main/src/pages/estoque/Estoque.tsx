import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Search, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cabecalhoPerfil } from '../../utils/apiAuth';
import { FiltroDataEstoque, KpiCardsEstoque, rotuloColuna, useEstoquePainel, valorCelula, type Linha } from './estoqueShared';
import { Carregando } from '../../components/common/viz';
import { DetalheDrawer, type TipoDetalhe } from './DetalheDrawer';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const ITENS_POR_PAGINA = 25;

// Toda linha que tenha um desses campos pode ser clicada pra abrir o drawer de detalhe —
// a ordem decide a prioridade quando mais de um campo aparecer na mesma linha.
function tipoDetalheDaLinha(linha: Linha): TipoDetalhe | null {
  if (linha.CODPROD !== undefined) return 'produto';
  if (linha.NUMCOTACAO !== undefined) return 'cotacao';
  if (linha.FORNECEDOR !== undefined) return 'fornecedor';
  return null;
}

function Secao({ titulo, subtitulo, linhas, erro, insight }: { titulo: string; subtitulo: string; linhas: Linha[]; erro?: string; insight?: string }) {
  const [aberta, setAberta] = useState(true);
  const [busca, setBusca] = useState('');
  const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
  const [ordemDesc, setOrdemDesc] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [detalheAberto, setDetalheAberto] = useState<{ tipo: TipoDetalhe; linha: Linha } | null>(null);
  const colunas = useMemo(() => linhas.length ? Object.keys(linhas[0]) : [], [linhas]);

  const filtradas = useMemo(() => linhas.filter((linha) => Object.values(linha).some((valor) => String(valor ?? '').toLocaleLowerCase().includes(busca.toLocaleLowerCase()))), [linhas, busca]);

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

  return <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
    <button onClick={() => setAberta((atual) => !atual)} className="w-full p-5 flex items-start justify-between text-left hover:bg-slate-50">
      <div>
        <h2 className="font-bold text-slate-800">{titulo}</h2>
        <p className="text-xs text-slate-500 mt-1">{subtitulo}</p>
        {insight && <p className="text-xs text-emerald-700 mt-1.5 flex items-start gap-1.5"><Sparkles size={13} className="shrink-0 mt-0.5" />{insight}</p>}
      </div>
      {aberta ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
    </button>
    {aberta && <div className="px-5 pb-5">
      {erro ? <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3">Esta seção não pôde ser carregada: {erro}</p>
        : linhas.length === 0 ? <p className="text-sm text-slate-400 border border-dashed rounded-xl p-6 text-center">Nenhum dado encontrado.</p>
          : <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 border rounded-xl px-3 py-2 max-w-sm text-slate-500 flex-1 min-w-[200px]">
                <Search size={14}/><input value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} placeholder="Buscar nesta lista" className="w-full outline-none text-xs" />
              </label>
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
          </>}
    </div>}
    {detalheAberto && <DetalheDrawer aberto onFechar={() => setDetalheAberto(null)} tipo={detalheAberto.tipo} linha={detalheAberto.linha} />}
  </section>;
}

export function Estoque() {
  const { usuario } = useAuth();
  const { dados, erro, carregando, carregar, dataDe, setDataDe, dataAte, setDataAte, insights } = useEstoquePainel();
  const [pergunta, setPergunta] = useState('');
  const [pesquisando, setPesquisando] = useState(false);
  const [erroPesquisa, setErroPesquisa] = useState<string | null>(null);
  const [resultadoPesquisa, setResultadoPesquisa] = useState<{ resumo: string | null; sql: string; linhas: Linha[] } | null>(null);
  // Link "Pergunte à IA" no menu aponta pra cá via #pesquisa-ia; o React Router não rola a
  // página sozinho numa troca de hash (a rota em si não muda), então rola manualmente sempre
  // que o hash mudar, inclusive clicando o link estando já na tela de Estoque.
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === '#pesquisa-ia') {
      document.getElementById('pesquisa-ia')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hash]);
  const pesquisar = async () => {
    if (!pergunta.trim()) return;
    setPesquisando(true); setErroPesquisa(null);
    try {
      const resposta = await fetch(`${API_URL}/api/estoque/pesquisar`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...cabecalhoPerfil(usuario?.perfil) }, body: JSON.stringify({ pergunta }) });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.error ?? 'Não foi possível pesquisar o estoque.');
      setResultadoPesquisa(corpo);
    } catch (falha) { setErroPesquisa(falha instanceof Error ? falha.message : 'Não foi possível pesquisar o estoque.'); }
    finally { setPesquisando(false); }
  };
  return <div className="space-y-5 pb-12">
    <div><p className="text-xs font-bold tracking-wider uppercase text-emerald-700">Controle de estoque</p><h1 className="text-2xl font-bold text-slate-800">Estoque inteligente</h1><p className="text-sm text-slate-500 mt-1">Dados operacionais do Sankhya (empresa 01): níveis, giro, fornecedores e cotações.</p></div>
    <FiltroDataEstoque dataDe={dataDe} setDataDe={setDataDe} dataAte={dataAte} setDataAte={setDataAte} carregando={carregando} carregar={carregar} />
    {(erro || erroPesquisa) && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{erro ?? erroPesquisa}</div>}
    <KpiCardsEstoque kpis={dados?.kpis ?? {}} />
    <section id="pesquisa-ia" className="bg-emerald-950 rounded-2xl border border-emerald-800 p-5 text-white scroll-mt-20">
      <h2 className="font-bold flex items-center gap-2"><Search size={18} className="text-emerald-300"/> Pergunte ao estoque</h2>
      <p className="text-sm text-emerald-100/80 mt-1">Faça uma pergunta em português. A IA consulta somente dados de estoque do Sankhya (empresa 01) e devolve a resposta com os registros encontrados.</p>
      <div className="mt-4 flex flex-col sm:flex-row gap-2"><input value={pergunta} onChange={(e) => setPergunta(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') pesquisar(); }} placeholder="Ex.: quais produtos de agroquímico vencem nos próximos 30 dias?" className="flex-1 rounded-xl bg-white px-4 py-3 text-sm !text-slate-950 caret-slate-950 placeholder:!text-slate-500 outline-none"/><button onClick={pesquisar} disabled={pesquisando || !pergunta.trim()} className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 font-bold text-sm">{pesquisando ? 'Consultando…' : 'Perguntar'}</button></div>
      <div className="flex flex-wrap gap-2 mt-3">{['Produtos com estoque abaixo do mínimo', 'Quais fornecedores têm melhor prazo de entrega?', 'Cotações em aberto com prazo nesta semana', 'Produtos com vinho, café ou batata em estoque'].map((sugestao) => <button key={sugestao} onClick={() => setPergunta(sugestao)} className="text-xs px-3 py-1.5 rounded-full border border-emerald-700 text-emerald-100 hover:bg-emerald-900">{sugestao}</button>)}</div>
      {resultadoPesquisa && <div className="mt-4 bg-white/10 border border-emerald-800 rounded-xl p-4"><p className="text-sm leading-relaxed">{resultadoPesquisa.resumo ?? 'Consulta executada sem resumo.'}</p><details className="mt-3 text-xs text-emerald-100"><summary className="cursor-pointer">Ver consulta utilizada</summary><code className="block whitespace-pre-wrap mt-2 p-2 rounded bg-black/20">{resultadoPesquisa.sql}</code></details>{resultadoPesquisa.linhas.length > 0 && <div className="mt-3 max-h-64 overflow-auto rounded bg-white text-slate-800"><table className="w-full text-xs"><thead className="sticky top-0 bg-slate-100"><tr>{Object.keys(resultadoPesquisa.linhas[0]).map((coluna) => <th key={coluna} className="p-2 text-left">{rotuloColuna(coluna)}</th>)}</tr></thead><tbody>{resultadoPesquisa.linhas.map((linha, indice) => <tr key={indice} className="border-t">{Object.entries(linha).map(([coluna, valor]) => <td key={coluna} className="p-2 whitespace-nowrap">{valorCelula(coluna, valor)}</td>)}</tr>)}</tbody></table></div>}</div>}
    </section>
    {carregando && !dados ? <div className="bg-white border rounded-2xl p-12"><Carregando mensagem="Carregando dados do estoque…" /></div> : dados && <div className="space-y-4">
      <Secao titulo="Ruptura e estoque mínimo/máximo" subtitulo="Itens sinalizados para reposição ou abaixo do mínimo configurado." linhas={dados.ruptura} erro={dados.erros.ruptura} insight={insights.ruptura}/>
      <Secao titulo="Itens sem movimentação" subtitulo="Produtos sem venda por 90 dias ou mais." linhas={dados.semMovimentacao} erro={dados.erros.semMovimentacao} insight={insights.semMovimentacao}/>
      <Secao titulo="Maior valor em estoque · Curva ABC" subtitulo="Valor calculado por estoque × custo gerencial mais recente." linhas={dados.valor} erro={dados.erros.valor} insight={insights.valor}/>
      <Secao titulo="Giro por produto" subtitulo="Consumo por requisição no período filtrado, giro e dias de cobertura do estoque atual." linhas={dados.giroProdutos} erro={dados.erros.giroProdutos} insight={insights.giroProdutos}/>
      <Secao titulo="Ranking de fornecedores" subtitulo="Histórico de cotações: prazo, vitórias e produtos distintos cotados." linhas={dados.fornecedores} erro={dados.erros.fornecedores} insight={insights.fornecedores}/>
      <Secao titulo="Cotações em aberto" subtitulo="Cotações com pelo menos um item ainda não fechado ou cancelado." linhas={dados.cotacoes} erro={dados.erros.cotacoes} insight={insights.cotacoes}/>
    </div>}
  </div>;
}
