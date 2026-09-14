import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Lightbulb } from 'lucide-react';
import { FiltroDataEstoque, moeda, numero, useEstoquePainel } from './estoqueShared';
import { Carregando, SemDado } from '../../components/common/viz';

// Mesma paleta categórica validada (dataviz skill) do resto do módulo.
const COR_CATEGORICA = ['#2a78d6', '#eb6834', '#1baf7a'];

function truncar(texto: string, tamanho: number) {
  return texto.length > tamanho ? `${texto.slice(0, tamanho - 1)}…` : texto;
}

function Painel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border rounded-2xl p-5">
      <h2 className="font-bold text-slate-800 flex items-center gap-2"><BarChart3 size={16} className="text-emerald-600" />{titulo}</h2>
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

  const criticos = useMemo(() => (dados?.ruptura ?? [])
    .map((l) => ({ produto: String(l.DESCRPROD ?? ''), estoque: Number(l.ESTOQUE ?? 0), minimo: Number(l.MINIMO ?? 0) }))
    .sort((a, b) => (b.minimo - b.estoque) - (a.minimo - a.estoque))
    .slice(0, 8), [dados]);

  const semGiro = useMemo(() => (dados?.semMovimentacao ?? [])
    .filter((l) => String(l.SITUACAO) === 'S')
    .map((l) => ({ produto: String(l.DESCRPROD ?? ''), dias: Number(l.DIAS_SEM_USO ?? 0) }))
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 8), [dados]);

  const distribuicaoLocal = useMemo(() => (dados?.distribuicaoLocal ?? [])
    .map((l) => ({ local: String(l.LOCAL ?? '—'), estoque: Number(l.ESTOQUE ?? 0) }))
    .slice(0, 8), [dados]);

  // Frases geradas por template a partir de número real já calculado — não é IA, é aritmética
  // simples. Se algum dado necessário faltar, a frase correspondente some (nunca aproxima).
  const insightsReais = useMemo(() => {
    const frases: string[] = [];
    const classeA = curvaAbc.find((c) => c.classe === 'A');
    if (classeA && classeA.valor > 0) frases.push(`A classe A concentra ${numero(classeA.percentual, 0)}% do valor em estoque, em ${numero(classeA.qtdProdutos)} produtos.`);
    if (dados?.kpis.TOTALRUPTURA != null) frases.push(`${numero(dados.kpis.TOTALRUPTURA)} produtos estão com estoque zerado ou abaixo do mínimo configurado.`);
    if (dados?.kpis.TOTALSEMMOVIMENTACAO != null) frases.push(`${numero(dados.kpis.TOTALSEMMOVIMENTACAO)} produtos estão sem saída há 90 dias ou mais.`);
    if (criticos[0]) frases.push(`O maior déficit de estoque é em "${criticos[0].produto}" — faltam ${numero(criticos[0].minimo - criticos[0].estoque)} unidades pro mínimo.`);
    return frases;
  }, [curvaAbc, dados, criticos]);

  return <div className="space-y-5 pb-12">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold tracking-wider uppercase text-emerald-700">Estoque</p>
        <h1 className="text-2xl font-bold text-slate-800">Análises</h1>
        <p className="text-sm text-slate-500 mt-1">Previsão de demanda ainda não existe nesta versão — os painéis abaixo são leitura do cadastro e do consumo já ocorrido (empresa 01).</p>
      </div>
      <Link to="/logistica/estoque/dashboard" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shrink-0">
        <BarChart3 size={15} className="text-emerald-700" /> Ver Dashboard
      </Link>
    </div>
    <FiltroDataEstoque dataDe={dataDe} setDataDe={setDataDe} dataAte={dataAte} setDataAte={setDataAte} carregando={carregando} carregar={carregar} />
    {erro && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{erro}</div>}

    {carregando && !dados ? <div className="bg-white border rounded-2xl p-12"><Carregando mensagem="Carregando análises…" /></div> : dados && (
      <>
        {insightsReais.length > 0 && (
          <section className="bg-emerald-950 rounded-2xl p-5 text-white">
            <h2 className="font-bold flex items-center gap-2"><Lightbulb size={16} className="text-emerald-300" /> Resumo (calculado a partir do cadastro atual)</h2>
            <ul className="mt-3 space-y-1.5">
              {insightsReais.map((frase, i) => <li key={i} className="text-sm text-emerald-50 flex gap-2"><span className="text-emerald-400">•</span>{frase}</li>)}
            </ul>
          </section>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Painel titulo="Valor por Curva ABC">
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

          <Painel titulo="Produtos mais críticos (maior déficit)">
            {criticos.length === 0 ? <SemDado mensagem="Nenhum item em ruptura no cadastro atual." /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={criticos} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="produto" type="category" width={140} tick={{ fontSize: 10, fill: '#52514e' }} axisLine={false} tickLine={false} tickFormatter={(v: string) => truncar(v, 20)} />
                  <Tooltip formatter={(v) => numero(v)} labelFormatter={(v) => v} />
                  <Bar dataKey="estoque" name="Estoque atual" fill={COR_CATEGORICA[0]} radius={[0, 4, 4, 0]} barSize={10} />
                  <Bar dataKey="minimo" name="Mínimo" fill={COR_CATEGORICA[1]} radius={[0, 4, 4, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Painel>

          <Painel titulo="Produtos parados há mais tempo">
            {semGiro.length === 0 ? <SemDado mensagem="Nenhum produto sem movimentação no cadastro atual." /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={semGiro} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="produto" type="category" width={140} tick={{ fontSize: 10, fill: '#52514e' }} axisLine={false} tickLine={false} tickFormatter={(v: string) => truncar(v, 20)} />
                  <Tooltip formatter={(v) => `${numero(v)} dias`} labelFormatter={(v) => v} />
                  <Bar dataKey="dias" name="Dias sem saída" fill={COR_CATEGORICA[1]} radius={[0, 4, 4, 0]} barSize={12}>
                    <LabelList dataKey="dias" position="right" style={{ fontSize: 10, fill: '#52514e' }} formatter={(v) => numero(v as number)} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Painel>

          <Painel titulo="Estoque por local">
            {distribuicaoLocal.length === 0 ? <SemDado mensagem="Sem dados de local no cadastro atual." /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={distribuicaoLocal} layout="vertical" margin={{ left: 8, right: 24 }}>
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
