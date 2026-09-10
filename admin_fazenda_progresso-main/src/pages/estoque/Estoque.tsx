import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, ChevronDown, ChevronUp, RefreshCw, Search, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cabecalhoPerfil } from '../../utils/apiAuth';

const API_URL = import.meta.env.VITE_API_URL ?? '';
type Linha = Record<string, unknown>;
type DadosEstoque = { ruptura: Linha[]; semMovimentacao: Linha[]; valor: Linha[]; fornecedores: Linha[]; cotacoes: Linha[]; giroProdutos: Linha[]; kpis: Linha; erros: Record<string, string> };

const moeda = (valor: unknown) => Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = (valor: unknown, casas = 0) => Number(valor ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: casas });
const data = (valor: unknown) => valor ? new Date(String(valor)).toLocaleDateString('pt-BR') : '—';

const ROTULOS_COLUNAS: Record<string, string> = {
  CODPROD: 'Código', DESCRPROD: 'Descrição', REFERENCIA: 'Referência', LOCAL: 'Local', EMPRESA: 'Empresa', LOTE: 'Lote',
  ESTOQUE: 'Estoque', MINIMO: 'Mínimo', MAXIMO: 'Máximo', MINIMOSUGERIDO: 'Mínimo sugerido', DIASRUPTURA: 'Dias p/ ruptura',
  PRODFALTA: 'Em falta', PONTOPEDIDO: 'Ponto de pedido', GIRODIARIO: 'Giro diário', DIASSEMVENDA: 'Dias sem venda',
  VALORESTOQUE: 'Valor em estoque', CUSTO: 'Custo', VALORTOTAL: 'Valor total', CLASSEABC: 'ABC', FORNECEDOR: 'Fornecedor',
  CONFIABILIDADE: 'Confiabilidade', QUALIDADEATENDIMENTO: 'Qualidade de atendimento', QUALIDADEPRODUTO: 'Qualidade do produto',
  PRAZOMEDIO: 'Prazo médio', TOTALCOTACOES: 'Total de cotações', TOTALVENCIDAS: 'Total vencidas', NUMCOTACAO: 'Nº cotação',
  DHINIC: 'Início', DHFINAL: 'Prazo final', SITUACAO: 'Situação', COMPRADOR: 'Comprador', TOTALITENS: 'Total de itens',
  CODEMP: 'Empresa', QTD_COMPRA: 'Qtd. compra', QTD_DEV_COMPRA: 'Qtd. devolução', COMPRA_LIQUIDA: 'Compra líquida',
  CONSUMO: 'Consumo', ESTOQUE_ATUAL: 'Estoque atual', ESTMIN: 'Estoque mínimo', ESTMAX: 'Estoque máximo',
  GIRO_ESTOQUE: 'Giro de estoque', DIAS_COBERTURA: 'Dias de cobertura',
};
const rotuloColuna = (chave: string) => ROTULOS_COLUNAS[chave]
  ?? chave.replace(/_/g, ' ').toLowerCase().replace(/^\p{L}/u, (letra) => letra.toUpperCase());

const valorCelula = (chave: string, valor: unknown) => {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (/VALOR|CUSTO|CONFIAB|QUALIDADE|PRAZO|PONTO/i.test(chave)) return moeda(valor);
  if (/DATA|DHINIC|DHFINAL/i.test(chave)) return data(valor);
  if (typeof valor === 'number') return numero(valor, /GIRO/i.test(chave) ? 3 : 0);
  return String(valor);
};

function Secao({ titulo, subtitulo, linhas, erro }: { titulo: string; subtitulo: string; linhas: Linha[]; erro?: string }) {
  const [aberta, setAberta] = useState(true);
  const [busca, setBusca] = useState('');
  const colunas = useMemo(() => linhas.length ? Object.keys(linhas[0]) : [], [linhas]);
  const filtradas = useMemo(() => linhas.filter((linha) => Object.values(linha).some((valor) => String(valor ?? '').toLocaleLowerCase().includes(busca.toLocaleLowerCase()))), [linhas, busca]);
  return <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
    <button onClick={() => setAberta((atual) => !atual)} className="w-full p-5 flex items-start justify-between text-left hover:bg-slate-50">
      <div><h2 className="font-bold text-slate-800">{titulo}</h2><p className="text-xs text-slate-500 mt-1">{subtitulo}</p></div>
      {aberta ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
    </button>
    {aberta && <div className="px-5 pb-5">
      {erro ? <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3">Esta seção não pôde ser carregada: {erro}</p>
        : linhas.length === 0 ? <p className="text-sm text-slate-400 border border-dashed rounded-xl p-6 text-center">Nenhum dado encontrado.</p>
          : <><label className="mb-3 flex items-center gap-2 border rounded-xl px-3 py-2 max-w-sm text-slate-500"><Search size={14}/><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nesta lista" className="w-full outline-none text-xs" /></label>
            <div className="overflow-auto max-h-[420px] border rounded-xl"><table className="w-full text-xs text-left"><thead className="sticky top-0 bg-slate-50 text-slate-500"><tr>{colunas.map((coluna) => <th key={coluna} className="p-3 font-semibold whitespace-nowrap">{rotuloColuna(coluna)}</th>)}</tr></thead><tbody className="divide-y">{filtradas.map((linha, indice) => <tr key={indice} className="hover:bg-slate-50">{colunas.map((coluna) => <td key={coluna} className="p-3 whitespace-nowrap text-slate-700">{valorCelula(coluna, linha[coluna])}</td>)}</tr>)}</tbody></table></div>
            <p className="text-[11px] text-slate-400 mt-2">Exibindo {filtradas.length} registro(s) carregados.</p></>}
    </div>}
  </section>;
}

export function Estoque() {
  const { usuario } = useAuth();
  const [dados, setDados] = useState<DadosEstoque | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [pergunta, setPergunta] = useState('');
  const [pesquisando, setPesquisando] = useState(false);
  const [resultadoPesquisa, setResultadoPesquisa] = useState<{ resumo: string | null; sql: string; linhas: Linha[] } | null>(null);
  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try {
      const resposta = await fetch(`${API_URL}/api/estoque/painel`, { headers: cabecalhoPerfil(usuario?.perfil) });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.error ?? 'Falha ao consultar o estoque.');
      setDados(corpo);
    } catch (falha) { setErro(falha instanceof Error ? falha.message : 'Falha ao carregar o estoque.'); }
    finally { setCarregando(false); }
  }, [usuario?.perfil]);
  useEffect(() => { carregar(); }, [carregar]);
  const pesquisar = async () => {
    if (!pergunta.trim()) return;
    setPesquisando(true); setErro(null);
    try {
      const resposta = await fetch(`${API_URL}/api/estoque/pesquisar`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...cabecalhoPerfil(usuario?.perfil) }, body: JSON.stringify({ pergunta }) });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.error ?? 'Não foi possível pesquisar o estoque.');
      setResultadoPesquisa(corpo);
    } catch (falha) { setErro(falha instanceof Error ? falha.message : 'Não foi possível pesquisar o estoque.'); }
    finally { setPesquisando(false); }
  };
  const kpis = dados?.kpis ?? {};
  const cards: { rotulo: string; valor: string; Icon: typeof Boxes }[] = [
    { rotulo: 'Valor total em estoque', valor: moeda(kpis.VALORTOTALESTOQUE), Icon: Boxes },
    { rotulo: 'Itens em ruptura', valor: numero(kpis.TOTALRUPTURA), Icon: AlertTriangle },
    { rotulo: 'Sem venda há 90+ dias', valor: numero(kpis.TOTALSEMMOVIMENTACAO), Icon: AlertTriangle },
    { rotulo: 'Cotações em aberto', valor: numero(kpis.TOTALCOTACOES), Icon: Boxes },
    { rotulo: 'Giro nos últimos 90 dias', valor: kpis.giroEstoque90Dias == null ? '—' : `${numero(kpis.giroEstoque90Dias, 2)}x`, Icon: TrendingUp },
  ];
  return <div className="space-y-5 pb-12">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-wider uppercase text-emerald-700">Controle de estoque</p><h1 className="text-2xl font-bold text-slate-800">Estoque inteligente</h1><p className="text-sm text-slate-500 mt-1">Dados operacionais do Sankhya: níveis, giro, fornecedores e cotações.</p></div><button onClick={carregar} disabled={carregando} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-60"><RefreshCw size={16} className={carregando ? 'animate-spin' : ''}/> Atualizar</button></div>
    {erro && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{erro}</div>}
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
      {cards.map(({ rotulo, valor, Icon }) => <div key={rotulo} className="bg-white border rounded-2xl p-4"><Icon size={17} className="text-emerald-600 mb-3"/><p className="text-[11px] uppercase font-bold text-slate-400">{rotulo}</p><p className="text-xl font-bold text-slate-800 mt-1">{valor}</p></div>)}
    </div>
    <section className="bg-emerald-950 rounded-2xl border border-emerald-800 p-5 text-white">
      <h2 className="font-bold flex items-center gap-2"><Search size={18} className="text-emerald-300"/> Pergunte ao estoque</h2>
      <p className="text-sm text-emerald-100/80 mt-1">Faça uma pergunta em português. A IA consulta somente dados de estoque do Sankhya e devolve a resposta com os registros encontrados.</p>
      <div className="mt-4 flex flex-col sm:flex-row gap-2"><input value={pergunta} onChange={(e) => setPergunta(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') pesquisar(); }} placeholder="Ex.: quais produtos de agroquímico vencem nos próximos 30 dias?" className="flex-1 rounded-xl bg-white px-4 py-3 text-sm !text-slate-950 caret-slate-950 placeholder:!text-slate-500 outline-none"/><button onClick={pesquisar} disabled={pesquisando || !pergunta.trim()} className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 font-bold text-sm">{pesquisando ? 'Consultando…' : 'Perguntar'}</button></div>
      <div className="flex flex-wrap gap-2 mt-3">{['Produtos com estoque abaixo do mínimo', 'Quais fornecedores têm melhor prazo de entrega?', 'Cotações em aberto com prazo nesta semana', 'Produtos com vinho, café ou batata em estoque'].map((sugestao) => <button key={sugestao} onClick={() => setPergunta(sugestao)} className="text-xs px-3 py-1.5 rounded-full border border-emerald-700 text-emerald-100 hover:bg-emerald-900">{sugestao}</button>)}</div>
      {resultadoPesquisa && <div className="mt-4 bg-white/10 border border-emerald-800 rounded-xl p-4"><p className="text-sm leading-relaxed">{resultadoPesquisa.resumo ?? 'Consulta executada sem resumo.'}</p><details className="mt-3 text-xs text-emerald-100"><summary className="cursor-pointer">Ver consulta utilizada</summary><code className="block whitespace-pre-wrap mt-2 p-2 rounded bg-black/20">{resultadoPesquisa.sql}</code></details>{resultadoPesquisa.linhas.length > 0 && <div className="mt-3 max-h-64 overflow-auto rounded bg-white text-slate-800"><table className="w-full text-xs"><thead className="sticky top-0 bg-slate-100"><tr>{Object.keys(resultadoPesquisa.linhas[0]).map((coluna) => <th key={coluna} className="p-2 text-left">{rotuloColuna(coluna)}</th>)}</tr></thead><tbody>{resultadoPesquisa.linhas.map((linha, indice) => <tr key={indice} className="border-t">{Object.entries(linha).map(([coluna, valor]) => <td key={coluna} className="p-2 whitespace-nowrap">{valorCelula(coluna, valor)}</td>)}</tr>)}</tbody></table></div>}</div>}
    </section>
    {carregando && !dados ? <div className="bg-white border rounded-2xl p-12 text-center text-slate-400">Carregando dados do estoque…</div> : dados && <div className="space-y-4">
      <Secao titulo="Ruptura e estoque mínimo/máximo" subtitulo="Itens sinalizados para reposição ou abaixo do mínimo configurado." linhas={dados.ruptura} erro={dados.erros.ruptura}/>
      <Secao titulo="Itens sem movimentação" subtitulo="Produtos sem venda por 90 dias ou mais." linhas={dados.semMovimentacao} erro={dados.erros.semMovimentacao}/>
      <Secao titulo="Maior valor em estoque · Curva ABC" subtitulo="Valor calculado por estoque × custo gerencial mais recente, empresa 01." linhas={dados.valor} erro={dados.erros.valor}/>
      <Secao titulo="Giro por produto" subtitulo="Consumo por requisição nos últimos 90 dias, giro e dias de cobertura do estoque atual." linhas={dados.giroProdutos} erro={dados.erros.giroProdutos}/>
      <Secao titulo="Ranking de fornecedores" subtitulo="Histórico de cotações: confiabilidade, qualidade, prazo e vitórias." linhas={dados.fornecedores} erro={dados.erros.fornecedores}/>
      <Secao titulo="Cotações em aberto" subtitulo="Cotações ainda não finalizadas ou canceladas." linhas={dados.cotacoes} erro={dados.erros.cotacoes}/>
    </div>}
  </div>;
}
