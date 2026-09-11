import { useMemo } from 'react';
import { Bar, BarChart, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { FiltroDataEstoque, KpiCardsEstoque, moeda, numero, useEstoquePainel } from './estoqueShared';
import { Carregando, SemDado } from '../../components/common/viz';

// Paleta categórica validada (dataviz skill): ordem fixa, nunca ciclar por rank.
// As 3 primeiras posições passam validação par-a-par completa (all-pairs) em claro e escuro.
const COR_CATEGORICA = ['#2a78d6', '#eb6834', '#1baf7a'];
// Hue sequencial (mesma paleta): 1º contexto de magnitude usa azul, o 2º contexto simultâneo
// (2 gráficos de magnitude na mesma tela) usa o próximo slot categórico, laranja.
const COR_SEQ_1 = '#2a78d6';
const COR_SEQ_2 = '#eb6834';

function truncar(texto: string, tamanho: number) {
  return texto.length > tamanho ? `${texto.slice(0, tamanho - 1)}…` : texto;
}

export function DashboardEstoque() {
  const { dados, erro, carregando, carregar, dataDe, setDataDe, dataAte, setDataAte } = useEstoquePainel();

  // dados.curvaAbc já vem agregado sobre a base INTEIRA de produtos (não só os 100 de
  // dados.valor, que é só a listagem dos itens de maior valor) — ver comentário na query.
  const curvaAbc = useMemo(() => {
    const linhas = ['A', 'B', 'C'].map((classe) => {
      const linha = (dados?.curvaAbc ?? []).find((l) => l.CLASSEABC === classe);
      return { classe, valor: Number(linha?.VALORTOTAL ?? 0), qtdProdutos: Number(linha?.QTDPRODUTOS ?? 0) };
    });
    const total = linhas.reduce((s, l) => s + l.valor, 0);
    return linhas.map((l) => ({ ...l, percentual: total > 0 ? (l.valor / total) * 100 : 0 }));
  }, [dados]);

  const ruptura = useMemo(() => (dados?.ruptura ?? [])
    .map((l) => ({
      produto: String(l.DESCRPROD ?? ''),
      estoque: Number(l.ESTOQUE ?? 0),
      minimo: Number(l.MINIMO ?? 0),
    }))
    .sort((a, b) => (b.minimo - b.estoque) - (a.minimo - a.estoque))
    .slice(0, 8), [dados]);

  const giro = useMemo(() => (dados?.giroProdutos ?? [])
    .map((l) => ({ produto: String(l.DESCRPROD ?? ''), consumo: Number(l.CONSUMO ?? 0) }))
    .sort((a, b) => b.consumo - a.consumo)
    .slice(0, 8), [dados]);

  const parados = useMemo(() => (dados?.semMovimentacao ?? [])
    .map((l) => ({ produto: String(l.DESCRPROD ?? ''), dias: Number(l.DIASSEMVENDA ?? 0), valor: Number(l.VALORESTOQUE ?? 0) }))
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 8), [dados]);

  const piorRuptura = ruptura[0];
  const maiorConsumo = giro[0];
  const maisParado = parados[0];

  return <div className="space-y-5 pb-12">
    <div>
      <p className="text-xs uppercase font-bold tracking-wider text-emerald-700">Estoque</p>
      <h1 className="text-2xl font-bold text-slate-800">Dashboard de Estoque</h1>
      <p className="text-sm text-slate-500 mt-1">Visão geral e gráfica dos níveis, valor, giro e itens parados (empresa 01).</p>
    </div>
    <FiltroDataEstoque dataDe={dataDe} setDataDe={setDataDe} dataAte={dataAte} setDataAte={setDataAte} carregando={carregando} carregar={carregar} />
    {erro && <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{erro}</div>}
    <KpiCardsEstoque kpis={dados?.kpis ?? {}} />
    {carregando && !dados ? <div className="p-12 bg-white border rounded-2xl"><Carregando mensagem="Carregando dados do Sankhya…" /></div> : <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

      <Grafico titulo="Valor por Curva ABC">
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
      </Grafico>

      <Grafico
        titulo="Itens mais críticos"
        bigNumber={piorRuptura ? { rotulo: 'Maior déficit vs. mínimo', valor: truncar(piorRuptura.produto, 34), apoio: `faltam ${numero(piorRuptura.minimo - piorRuptura.estoque)} un.` } : undefined}
      >
        {ruptura.length === 0 ? <SemDado mensagem="Nenhum item em ruptura no cadastro atual." /> : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ruptura} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="produto" type="category" width={140} tick={{ fontSize: 10, fill: '#52514e' }} axisLine={false} tickLine={false}
                  tickFormatter={(v: string) => truncar(v, 20)} />
                <Tooltip formatter={(v) => numero(v)} labelFormatter={(v) => v} />
                <Bar dataKey="estoque" name="Estoque atual" fill={COR_CATEGORICA[0]} radius={[0, 4, 4, 0]} barSize={10}>
                  <LabelList dataKey="estoque" position="right" style={{ fontSize: 10, fill: '#52514e' }} />
                </Bar>
                <Bar dataKey="minimo" name="Mínimo" fill={COR_CATEGORICA[1]} radius={[0, 4, 4, 0]} barSize={10}>
                  <LabelList dataKey="minimo" position="right" style={{ fontSize: 10, fill: '#52514e' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <Legenda itens={[{ cor: COR_CATEGORICA[0], rotulo: 'Estoque atual' }, { cor: COR_CATEGORICA[1], rotulo: 'Mínimo' }]} />
          </>
        )}
      </Grafico>

      <Grafico
        titulo="Maior consumo por requisição (período filtrado)"
        bigNumber={maiorConsumo ? { rotulo: 'Maior consumo no período', valor: truncar(maiorConsumo.produto, 34), apoio: `${numero(maiorConsumo.consumo)} un.` } : undefined}
      >
        {giro.length === 0 ? <SemDado mensagem="Nenhum consumo por requisição no período filtrado." /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={giro} layout="vertical" margin={{ left: 8, right: 24 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="produto" type="category" width={140} tick={{ fontSize: 10, fill: '#52514e' }} axisLine={false} tickLine={false}
                tickFormatter={(v: string) => truncar(v, 20)} />
              <Tooltip formatter={(v) => numero(v)} labelFormatter={(v) => v} />
              <Bar dataKey="consumo" name="Consumo" fill={COR_SEQ_1} radius={[0, 4, 4, 0]} barSize={14}>
                <LabelList dataKey="consumo" position="right" style={{ fontSize: 10, fill: '#52514e' }} formatter={(v) => numero(v as number)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Grafico>

      <Grafico
        titulo="Produtos parados há mais tempo"
        bigNumber={maisParado ? { rotulo: 'Parado há mais tempo', valor: truncar(maisParado.produto, 34), apoio: `${numero(maisParado.dias)} dias` } : undefined}
      >
        {parados.length === 0 ? <SemDado mensagem="Nenhum produto sem movimentação no cadastro atual." /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={parados} layout="vertical" margin={{ left: 8, right: 24 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="produto" type="category" width={140} tick={{ fontSize: 10, fill: '#52514e' }} axisLine={false} tickLine={false}
                tickFormatter={(v: string) => truncar(v, 20)} />
              <Tooltip formatter={(v) => `${numero(v)} dias`} labelFormatter={(v) => v} />
              <Bar dataKey="dias" name="Dias sem venda" fill={COR_SEQ_2} radius={[0, 4, 4, 0]} barSize={14}>
                <LabelList dataKey="dias" position="right" style={{ fontSize: 10, fill: '#52514e' }} formatter={(v) => numero(v as number)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Grafico>

    </div>}
  </div>;
}

function Legenda({ itens }: { itens: { cor: string; rotulo: string }[] }) {
  return (
    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
      {itens.map((i) => (
        <div key={i.rotulo} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: i.cor }} />
          <span className="text-[11px] font-medium text-slate-600">{i.rotulo}</span>
        </div>
      ))}
    </div>
  );
}

function Grafico({ titulo, bigNumber, children }: {
  titulo: string;
  bigNumber?: { rotulo: string; valor: string; apoio: string };
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <h2 className="font-bold text-slate-800 flex gap-2 items-center shrink-0">
          <BarChart3 size={17} className="text-emerald-600" />{titulo}
        </h2>
        {bigNumber && (
          <div className="sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{bigNumber.rotulo}</p>
            <p className="text-sm font-bold text-slate-800 truncate max-w-[280px]" title={bigNumber.valor}>{bigNumber.valor}</p>
            <p className="text-xs text-emerald-700 font-semibold">{bigNumber.apoio}</p>
          </div>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
