import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowRight, BarChart3, PackageX, Sparkles } from 'lucide-react';
import { FiltroDataEstoque, moeda, numero, useEstoquePainel } from './estoqueShared';
import { Carregando, SemDado } from '../../components/common/viz';

// Mesma paleta categórica validada (dataviz skill) do resto do módulo.
const COR_CATEGORICA = ['#2a78d6', '#eb6834', '#1baf7a'];

function truncar(texto: string, tamanho: number) {
  return texto.length > tamanho ? `${texto.slice(0, tamanho - 1)}…` : texto;
}

function Painel({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border rounded-2xl p-5">
      <h2 className="font-bold text-slate-800 flex items-center gap-2"><BarChart3 size={16} className="text-emerald-600" />{titulo}</h2>
      {subtitulo && <p className="text-xs text-slate-500 mt-1">{subtitulo}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Analises() {
  const { dados, erro, carregando, carregar, dataDe, setDataDe, dataAte, setDataAte } = useEstoquePainel();

  const curvaAbc = useMemo(() => {
    const linhas = ['A', 'B', 'C'].map((classe) => {
      const linha = (dados?.curvaAbc ?? []).find((l) => l.CLASSEABC === classe);
      return { classe, valor: Number(linha?.VALORTOTAL ?? 0), qtdProdutos: Number(linha?.QTDPRODUTOS ?? 0) };
    });
    const total = linhas.reduce((s, l) => s + l.valor, 0);
    return linhas.map((l) => ({ ...l, percentual: total > 0 ? (l.valor / total) * 100 : 0 }));
  }, [dados]);
  const valorTotalEstoque = useMemo(() => curvaAbc.reduce((s, c) => s + c.valor, 0), [curvaAbc]);
  const produtosTotal = useMemo(() => curvaAbc.reduce((s, c) => s + c.qtdProdutos, 0), [curvaAbc]);

  const criticos = useMemo(() => (dados?.ruptura ?? [])
    .map((l) => ({ produto: String(l.DESCRPROD ?? ''), estoque: Number(l.ESTOQUE ?? 0), minimo: Number(l.MINIMO ?? 0), dias: l.DIASRUPTURA != null ? Number(l.DIASRUPTURA) : null }))
    .sort((a, b) => (b.minimo - b.estoque) - (a.minimo - a.estoque))
    .slice(0, 8), [dados]);

  const semGiro = useMemo(() => (dados?.semMovimentacao ?? [])
    .filter((l) => String(l.SITUACAO) === 'S')
    .map((l) => ({ produto: String(l.DESCRPROD ?? ''), dias: Number(l.DIAS_SEM_USO ?? 0), valor: Number(l.TOTAL ?? 0) }))
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 8), [dados]);
  const maiorDiasSemGiro = useMemo(() => Math.max(...semGiro.map((s) => s.dias), 1), [semGiro]);
  const valorTotalSemGiro = useMemo(() => (dados?.semMovimentacao ?? []).filter((l) => String(l.SITUACAO) === 'S').reduce((s, l) => s + Number(l.TOTAL ?? 0), 0), [dados]);
  const valorTotalExcesso = useMemo(() => (dados?.excesso ?? []).reduce((s, l) => s + Number(l.VALORPARADO ?? 0), 0), [dados]);

  // Frases geradas por template a partir de número real já calculado — não é IA, é aritmética
  // simples. Se algum dado necessário faltar, a frase correspondente some (nunca aproxima).
  const insightsReais = useMemo(() => {
    const frases: string[] = [];
    const classeA = curvaAbc.find((c) => c.classe === 'A');
    if (classeA && classeA.valor > 0) frases.push(`A classe A concentra ${numero(classeA.percentual, 0)}% do valor em estoque, em ${numero(classeA.qtdProdutos)} produtos.`);
    if (criticos[0]) frases.push(`O maior déficit de estoque é em "${criticos[0].produto}" — faltam ${numero(criticos[0].minimo - criticos[0].estoque)} unidades pro mínimo.`);
    return frases;
  }, [curvaAbc, criticos]);

  return <div className="space-y-5 pb-12">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold tracking-wider uppercase text-emerald-700">Estoque</p>
        <h1 className="text-2xl font-bold text-slate-800">Análises</h1>
        <p className="text-sm text-slate-500 mt-1">Tendências e leitura do estoque a partir do cadastro e do consumo já ocorrido — sem previsão (empresa 01).</p>
      </div>
      <Link to="/logistica/estoque/pesquisa-ia" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950 text-white text-xs font-bold hover:bg-emerald-900 transition-colors shrink-0">
        <Sparkles size={15} className="text-emerald-300" /> Pergunte à IA
      </Link>
    </div>
    <FiltroDataEstoque dataDe={dataDe} setDataDe={setDataDe} dataAte={dataAte} setDataAte={setDataAte} carregando={carregando} carregar={carregar} />
    {erro && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{erro}</div>}

    {carregando && !dados ? <div className="bg-white border rounded-2xl p-12"><Carregando mensagem="Carregando análises…" /></div> : dados && (
      <>
        {insightsReais.length > 0 && (
          <section className="bg-emerald-950 rounded-2xl p-5 text-white">
            <h2 className="font-bold flex items-center gap-2"><Sparkles size={16} className="text-emerald-300" /> Resumo (calculado a partir do cadastro atual)</h2>
            <ul className="mt-3 space-y-1.5">
              {insightsReais.map((frase, i) => <li key={i} className="text-sm text-emerald-50 flex gap-2"><span className="text-emerald-400">•</span>{frase}</li>)}
            </ul>
          </section>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border rounded-2xl p-4 flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-rose-50 text-rose-600 shrink-0"><AlertTriangle size={16} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800">{numero(dados.kpis.TOTALRUPTURA)} produtos com risco de ruptura</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Estoque zerado ou abaixo do mínimo configurado.</p>
              <Link to="/logistica/estoque/central-de-acoes" className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 mt-1.5">Ver itens <ArrowRight size={11} /></Link>
            </div>
          </div>
          <div className="bg-white border rounded-2xl p-4 flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-violet-50 text-violet-600 shrink-0"><PackageX size={16} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800">{valorTotalExcesso > 0 ? moeda(valorTotalExcesso) : '—'} em capital parado (excesso)</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Soma do estoque acima do máximo × custo atual.</p>
              <Link to="/logistica/estoque/central-de-acoes" className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 mt-1.5">Ver itens <ArrowRight size={11} /></Link>
            </div>
          </div>
          <div className="bg-white border rounded-2xl p-4 flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-slate-600 shrink-0"><PackageX size={16} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800">{valorTotalSemGiro > 0 ? moeda(valorTotalSemGiro) : '—'} parados sem giro (90+ dias)</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{numero(dados.kpis.TOTALSEMMOVIMENTACAO)} produtos sem saída no período.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Painel titulo="Valor por Curva ABC" subtitulo={`${moeda(valorTotalEstoque)} em ${numero(produtosTotal)} produtos ativos e precificados.`}>
            {curvaAbc.every((c) => c.valor === 0) ? <SemDado mensagem="Nenhum valor de estoque classificado por curva ABC." /> : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={200} className="sm:!w-[55%]">
                  <PieChart>
                    <Pie data={curvaAbc} dataKey="valor" nameKey="classe" innerRadius={55} outerRadius={85} paddingAngle={2} strokeWidth={2} stroke="#fff">
                      {curvaAbc.map((c, i) => <Cell key={c.classe} fill={COR_CATEGORICA[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => moeda(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full sm:w-[45%] space-y-2.5">
                  {curvaAbc.map((c, i) => (
                    <div key={c.classe} className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: COR_CATEGORICA[i] }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-700">Curva {c.classe}</p>
                        <p className="text-[11px] text-slate-500">{moeda(c.valor)} · {numero(c.qtdProdutos)} produtos</p>
                      </div>
                      <span className="text-sm font-bold text-slate-800 tabular-nums shrink-0">{numero(c.percentual, 1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Painel>

          <Painel titulo="Produtos mais críticos" subtitulo="Itens com o maior déficit de estoque em relação ao mínimo cadastrado.">
            {criticos.length === 0 ? <SemDado mensagem="Nenhum item em ruptura no cadastro atual." /> : (
              <div className="space-y-3">
                {criticos.map((c, i) => {
                  const percentual = c.minimo > 0 ? Math.min((c.estoque / c.minimo) * 100, 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-xs font-semibold text-slate-700 truncate">{c.produto}</p>
                        <p className="text-[11px] text-slate-400 whitespace-nowrap">{numero(c.estoque)} / {numero(c.minimo)} mín. {c.dias != null ? `· ${numero(c.dias)}d` : ''}</p>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${percentual}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Painel>

          <Painel titulo="Produtos sem giro" subtitulo="Itens sem saída há mais tempo, com o valor parado em estoque.">
            {semGiro.length === 0 ? <SemDado mensagem="Nenhum produto sem movimentação no cadastro atual." /> : (
              <div className="space-y-3">
                {semGiro.map((s, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-semibold text-slate-700 truncate">{s.produto}</p>
                      <p className="text-[11px] text-slate-400 whitespace-nowrap">{numero(s.dias)} dias{s.valor > 0 ? ` · ${moeda(s.valor)}` : ''}</p>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(s.dias / maiorDiasSemGiro) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Painel>

          <Painel titulo="Estoque por local">
            {(dados.distribuicaoLocal ?? []).length === 0 ? <SemDado mensagem="Sem dados de local no cadastro atual." /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={(dados.distribuicaoLocal ?? []).map((l) => ({ local: String(l.LOCAL ?? '—'), estoque: Number(l.ESTOQUE ?? 0) })).slice(0, 8)} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="local" type="category" width={140} tick={{ fontSize: 10, fill: '#52514e' }} axisLine={false} tickLine={false} tickFormatter={(v: string) => truncar(v, 20)} />
                  <Tooltip formatter={(v) => numero(v)} labelFormatter={(v) => v} />
                  <Bar dataKey="estoque" name="Itens em estoque" fill={COR_CATEGORICA[2]} radius={[0, 4, 4, 0]} barSize={12}>
                    <LabelList dataKey="estoque" position="right" style={{ fontSize: 10, fill: '#52514e' }} formatter={(v) => numero(v as number)} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Painel>
        </div>
      </>
    )}
  </div>;
}
