import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, ChevronUp, Search, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cabecalhoPerfil } from '../../utils/apiAuth';
import { FiltroDataEstoque, KpiCardsEstoque, rotuloColuna, TabelaInterativa, useEstoquePainel, valorCelula, type FiltroSituacaoTabela, type Linha } from './estoqueShared';
import { Carregando } from '../../components/common/viz';

const API_URL = import.meta.env.VITE_API_URL ?? '';

function Secao({ titulo, subtitulo, linhas, erro, insight, nota, filtroSituacao }: { titulo: string; subtitulo: string; linhas: Linha[]; erro?: string; insight?: string; nota?: string; filtroSituacao?: FiltroSituacaoTabela }) {
  const [aberta, setAberta] = useState(true);
  return <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
    <button onClick={() => setAberta((atual) => !atual)} className="w-full p-5 flex items-start justify-between text-left hover:bg-slate-50">
      <div>
        <h2 className="font-bold text-slate-800">{titulo}</h2>
        <p className="text-xs text-slate-500 mt-1">{subtitulo}</p>
        {insight && <p className="text-xs text-emerald-700 mt-1.5 flex items-start gap-1.5"><Sparkles size={13} className="shrink-0 mt-0.5" />{insight}</p>}
      </div>
      {aberta ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
    </button>
    {aberta && nota && <div className="px-5 pb-3 -mt-2"><pre className="text-xs text-slate-500 whitespace-pre-wrap font-sans bg-slate-50 border border-slate-200/80 rounded-xl p-3">{nota}</pre></div>}
    {aberta && <div className="px-5 pb-5">
      {erro ? <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3">Esta seção não pôde ser carregada: {erro}</p>
        : <TabelaInterativa linhas={linhas} filtroSituacao={filtroSituacao} />}
    </div>}
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
    <KpiCardsEstoque kpis={dados?.kpis ?? {}} cotacoesPorSituacao={dados?.cotacoesPorSituacao} />
    <section id="pesquisa-ia" className="bg-emerald-950 rounded-2xl border border-emerald-800 p-5 text-white scroll-mt-20">
      <h2 className="font-bold flex items-center gap-2"><Search size={18} className="text-emerald-300"/> Pergunte ao estoque</h2>
      <p className="text-sm text-emerald-100/80 mt-1">Faça uma pergunta em português. A IA consulta somente dados de estoque do Sankhya (empresa 01) e devolve a resposta com os registros encontrados.</p>
      <div className="mt-4 flex flex-col sm:flex-row gap-2"><input value={pergunta} onChange={(e) => setPergunta(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') pesquisar(); }} placeholder="Ex.: quais produtos de agroquímico vencem nos próximos 30 dias?" className="flex-1 rounded-xl bg-white px-4 py-3 text-sm !text-slate-950 caret-slate-950 placeholder:!text-slate-500 outline-none"/><button onClick={pesquisar} disabled={pesquisando || !pergunta.trim()} className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 font-bold text-sm">{pesquisando ? 'Consultando…' : 'Perguntar'}</button></div>
      <div className="flex flex-wrap gap-2 mt-3">{['Produtos com estoque abaixo do mínimo', 'Quais fornecedores têm melhor prazo de entrega?', 'Cotações em aberto com prazo nesta semana', 'Produtos com vinho, café ou batata em estoque'].map((sugestao) => <button key={sugestao} onClick={() => setPergunta(sugestao)} className="text-xs px-3 py-1.5 rounded-full border border-emerald-700 text-emerald-100 hover:bg-emerald-900">{sugestao}</button>)}</div>
      {resultadoPesquisa && <div className="mt-4 bg-white/10 border border-emerald-800 rounded-xl p-4"><p className="text-sm leading-relaxed">{resultadoPesquisa.resumo ?? 'Consulta executada sem resumo.'}</p><details className="mt-3 text-xs text-emerald-100"><summary className="cursor-pointer">Ver consulta utilizada</summary><code className="block whitespace-pre-wrap mt-2 p-2 rounded bg-black/20">{resultadoPesquisa.sql}</code></details>{resultadoPesquisa.linhas.length > 0 && <div className="mt-3 max-h-64 overflow-auto rounded bg-white text-slate-800"><table className="w-full text-xs"><thead className="sticky top-0 bg-slate-100"><tr>{Object.keys(resultadoPesquisa.linhas[0]).map((coluna) => <th key={coluna} className="p-2 text-left">{rotuloColuna(coluna)}</th>)}</tr></thead><tbody>{resultadoPesquisa.linhas.map((linha, indice) => <tr key={indice} className="border-t">{Object.entries(linha).map(([coluna, valor]) => <td key={coluna} className="p-2 whitespace-nowrap">{valorCelula(coluna, valor)}</td>)}</tr>)}</tbody></table></div>}</div>}
    </section>
    {carregando && !dados ? <div className="bg-white border rounded-2xl p-12"><Carregando mensagem="Carregando dados do estoque…" /></div> : dados && <div className="space-y-4">
      <Secao titulo="Ruptura e estoque mínimo/máximo" subtitulo="Itens sinalizados para reposição ou abaixo do mínimo configurado." linhas={dados.ruptura} erro={dados.erros.ruptura} insight={insights.ruptura}/>
      <Secao titulo="Itens sem movimentação" subtitulo="Produtos sem venda por 90 dias ou mais." linhas={dados.semMovimentacao} erro={dados.erros.semMovimentacao} insight={insights.semMovimentacao}
        filtroSituacao={{ coluna: 'SITUACAO', rotuloSim: 'Com estoque', rotuloNao: 'Sem estoque' }}/>
      <Secao titulo="Maior valor em estoque · Curva ABC" subtitulo="Valor calculado por estoque × custo gerencial mais recente." linhas={dados.valor} erro={dados.erros.valor} insight={insights.valor}
        nota={'Classe A: ~20% dos itens concentram ~80% do valor total — exigem controle rígido e inventários frequentes.\nClasse B: ~30% dos itens, ~15% do valor total — importância intermediária, monitoramento moderado.\nClasse C: ~50% dos itens, apenas ~5% do valor total — baixo valor unitário ou baixa movimentação, controle mais simples.'}/>
      <Secao titulo="Giro por produto" subtitulo="Consumo por requisição no período filtrado, giro e dias de cobertura do estoque atual." linhas={dados.giroProdutos} erro={dados.erros.giroProdutos} insight={insights.giroProdutos}/>
      <Secao titulo="Ranking de fornecedores" subtitulo="Histórico de cotações: prazo, vitórias e produtos distintos cotados." linhas={dados.fornecedores} erro={dados.erros.fornecedores} insight={insights.fornecedores}/>
      <Secao titulo="Cotações em aberto" subtitulo="Cotações com pelo menos um item ainda não fechado ou cancelado." linhas={dados.cotacoes} erro={dados.erros.cotacoes} insight={insights.cotacoes}/>
    </div>}
  </div>;
}
