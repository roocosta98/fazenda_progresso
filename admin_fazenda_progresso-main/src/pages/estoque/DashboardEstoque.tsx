import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Maximize2, Sparkles } from 'lucide-react';
import { FiltroDataEstoque, KpiCardsEstoque, ModalExpandido, TabelaInterativa, moeda, numero, useEstoquePainel } from './estoqueShared';
import { Carregando, SemDado } from '../../components/common/viz';

// Paleta categórica validada (dataviz skill): ordem fixa, nunca ciclar por rank.
// As 3 primeiras posições passam validação par-a-par completa (all-pairs) em claro e escuro.
const COR_CATEGORICA = ['#2a78d6', '#eb6834', '#1baf7a'];
// Hue sequencial (mesma paleta): 1º contexto de magnitude usa azul, o 2º contexto simultâneo
// (2 gráficos de magnitude na mesma tela) usa o próximo slot categórico, laranja.
const COR_SEQ_1 = '#2a78d6';
const COR_SEQ_2 = '#eb6834';
const COR_SEQ_3 = '#1baf7a';

function truncar(texto: string, tamanho: number) {
  return texto.length > tamanho ? `${texto.slice(0, tamanho - 1)}…` : texto;
}

type ChaveSecao = 'curvaAbc' | 'ruptura' | 'giro' | 'parados' | 'fornecedores' | 'cotacoes';

export function DashboardEstoque() {
  const { dados, erro, carregando, carregar, dataDe, setDataDe, dataAte, setDataAte, insights } = useEstoquePainel();
  const [modalAberto, setModalAberto] = useState<ChaveSecao | null>(null);

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

  const rupturaTudo = useMemo(() => (dados?.ruptura ?? [])
    .map((l) => ({ produto: String(l.DESCRPROD ?? ''), estoque: Number(l.ESTOQUE ?? 0), minimo: Number(l.MINIMO ?? 0) }))
    .sort((a, b) => (b.minimo - b.estoque) - (a.minimo - a.estoque)), [dados]);
  const ruptura = useMemo(() => rupturaTudo.slice(0, 8), [rupturaTudo]);

  const giroTudo = useMemo(() => (dados?.giroProdutos ?? [])
    .map((l) => ({ produto: String(l.DESCRPROD ?? ''), consumo: Number(l.CONSUMO ?? 0) }))
    .sort((a, b) => b.consumo - a.consumo), [dados]);
  const giro = useMemo(() => giroTudo.slice(0, 8), [giroTudo]);

  const paradosTudo = useMemo(() => (dados?.semMovimentacao ?? [])
    .map((l) => ({ produto: String(l.DESCRPROD ?? ''), dias: Number(l.DIASSEMVENDA ?? 0), valor: Number(l.VALORESTOQUE ?? 0) }))
    .sort((a, b) => b.dias - a.dias), [dados]);
  const parados = useMemo(() => paradosTudo.slice(0, 8), [paradosTudo]);

  const fornecedoresTudo = useMemo(() => (dados?.fornecedores ?? [])
    .map((l) => ({ fornecedor: String(l.FORNECEDOR ?? ''), taxa: Number(l.TAXAVITORIA ?? 0), cotacoes: Number(l.TOTALCOTACOES ?? 0) }))
    .sort((a, b) => b.cotacoes - a.cotacoes), [dados]);
  const fornecedores = useMemo(() => fornecedoresTudo.slice(0, 8), [fornecedoresTudo]);

  const cotacoesPorSituacao = useMemo(() => (dados?.cotacoesPorSituacao ?? [])
    .map((l) => ({ situacao: String(l.SITUACAO ?? ''), itens: Number(l.TOTALITENS ?? 0) }))
    .sort((a, b) => b.itens - a.itens), [dados]);

  const piorRuptura = ruptura[0];
  const maiorConsumo = giro[0];
  const maisParado = parados[0];
  const melhorFornecedor = [...fornecedoresTudo].sort((a, b) => b.taxa - a.taxa)[0];

  const abrirModal = (chave: string) => setModalAberto(chave as ChaveSecao);

  return <div className="space-y-5 pb-12">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase font-bold tracking-wider text-emerald-700">Estoque</p>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard de Estoque</h1>
        <p className="text-sm text-slate-500 mt-1">Visão geral e gráfica dos níveis, valor, giro e itens parados (empresa 01). Clique num card ou gráfico pra ver o detalhe completo.</p>
      </div>
      <Link to="/logistica/estoque#pesquisa-ia" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950 text-white text-xs font-bold hover:bg-emerald-900 transition-colors shrink-0">
        <Sparkles size={15} className="text-emerald-300" /> Pergunte à IA
      </Link>
    </div>
    <FiltroDataEstoque dataDe={dataDe} setDataDe={setDataDe} dataAte={dataAte} setDataAte={setDataAte} carregando={carregando} carregar={carregar} />
    {erro && <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{erro}</div>}
    <KpiCardsEstoque kpis={dados?.kpis ?? {}} cotacoesPorSituacao={dados?.cotacoesPorSituacao} aoClicarCard={abrirModal} />
    {carregando && !dados ? <div className="p-12 bg-white border rounded-2xl"><Carregando mensagem="Carregando dados do Sankhya…" /></div> : <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

      <Grafico titulo="Valor por Curva ABC" insight={insights.curvaAbc} onExpandir={() => setModalAberto('curvaAbc')}>
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
        insight={insights.ruptura}
        onExpandir={() => setModalAberto('ruptura')}
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
        insight={insights.giroProdutos}
        onExpandir={() => setModalAberto('giro')}
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
        insight={insights.semMovimentacao}
        onExpandir={() => setModalAberto('parados')}
      >
        {parados.length === 0 ? <SemDado mensagem="Nenhum produto sem movimentação no cadastro atual." /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={parados} layout="vertical" margin={{ left: 8, right: 24 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="produto" type="category" width={140} tick={{ fontSize: 10, fill: '#52514e' }} axisLine={false} tickLine={false}
                tickFormatter={(v: string) => truncar(v, 20)} />
              <Tooltip formatter={(v) => `${numero(v)} dias`} labelFormatter={(v) => v} />
              <Bar dataKey="dias" name="Dias sem saída" fill={COR_SEQ_2} radius={[0, 4, 4, 0]} barSize={14}>
                <LabelList dataKey="dias" position="right" style={{ fontSize: 10, fill: '#52514e' }} formatter={(v) => numero(v as number)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Grafico>

      <Grafico
        titulo="Ranking de fornecedores"
        bigNumber={melhorFornecedor ? { rotulo: 'Melhor taxa de vitória', valor: truncar(melhorFornecedor.fornecedor, 34), apoio: `${numero(melhorFornecedor.taxa, 1)}%` } : undefined}
        insight={insights.fornecedores}
        onExpandir={() => setModalAberto('fornecedores')}
      >
        {fornecedores.length === 0 ? <SemDado mensagem="Nenhum fornecedor com cotação no cadastro atual." /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={fornecedores} layout="vertical" margin={{ left: 8, right: 24 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} unit="%" />
              <YAxis dataKey="fornecedor" type="category" width={140} tick={{ fontSize: 10, fill: '#52514e' }} axisLine={false} tickLine={false}
                tickFormatter={(v: string) => truncar(v, 20)} />
              <Tooltip formatter={(v) => `${numero(Number(v), 1)}%`} labelFormatter={(v) => v} />
              <Bar dataKey="taxa" name="Taxa de vitória" fill={COR_SEQ_3} radius={[0, 4, 4, 0]} barSize={14}>
                <LabelList dataKey="taxa" position="right" style={{ fontSize: 10, fill: '#52514e' }} formatter={(v) => `${numero(v as number, 1)}%`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Grafico>

      <Grafico titulo="Cotações em aberto por situação" insight={insights.cotacoes} onExpandir={() => setModalAberto('cotacoes')}>
        {cotacoesPorSituacao.length === 0 ? <SemDado mensagem="Nenhuma cotação encontrada no cadastro atual." /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cotacoesPorSituacao} layout="vertical" margin={{ left: 8, right: 24 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis dataKey="situacao" type="category" width={100} tick={{ fontSize: 10, fill: '#52514e' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => `${numero(v)} itens`} labelFormatter={(v) => v} />
              <Bar dataKey="itens" name="Itens" fill={COR_CATEGORICA[0]} radius={[0, 4, 4, 0]} barSize={16}>
                <LabelList dataKey="itens" position="right" style={{ fontSize: 10, fill: '#52514e' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Grafico>

    </div>}

    <ModalExpandido aberto={modalAberto === 'curvaAbc'} onFechar={() => setModalAberto(null)} titulo="Maior valor em estoque · Curva ABC" subtitulo="Valor calculado por estoque × custo gerencial mais recente.">
      <TabelaInterativa linhas={dados?.valor ?? []} />
    </ModalExpandido>
    <ModalExpandido aberto={modalAberto === 'ruptura'} onFechar={() => setModalAberto(null)} titulo="Ruptura e estoque mínimo/máximo" subtitulo="Itens sinalizados para reposição ou abaixo do mínimo configurado.">
      <ResponsiveContainer width="100%" height={Math.max(rupturaTudo.length * 28, 240)}>
        <BarChart data={rupturaTudo} layout="vertical" margin={{ left: 8, right: 24 }}>
          <XAxis type="number" tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} />
          <YAxis dataKey="produto" type="category" width={200} tick={{ fontSize: 10, fill: '#52514e' }} axisLine={false} tickLine={false} tickFormatter={(v: string) => truncar(v, 32)} />
          <Tooltip formatter={(v) => numero(v)} labelFormatter={(v) => v} />
          <Bar dataKey="estoque" name="Estoque atual" fill={COR_CATEGORICA[0]} radius={[0, 4, 4, 0]} barSize={10} />
          <Bar dataKey="minimo" name="Mínimo" fill={COR_CATEGORICA[1]} radius={[0, 4, 4, 0]} barSize={10} />
        </BarChart>
      </ResponsiveContainer>
      <Legenda itens={[{ cor: COR_CATEGORICA[0], rotulo: 'Estoque atual' }, { cor: COR_CATEGORICA[1], rotulo: 'Mínimo' }]} />
      <div className="mt-5"><TabelaInterativa linhas={dados?.ruptura ?? []} /></div>
    </ModalExpandido>
    <ModalExpandido aberto={modalAberto === 'giro'} onFechar={() => setModalAberto(null)} titulo="Giro por produto" subtitulo="Consumo por requisição no período filtrado, giro e dias de cobertura do estoque atual.">
      <TabelaInterativa linhas={dados?.giroProdutos ?? []} />
    </ModalExpandido>
    <ModalExpandido aberto={modalAberto === 'parados'} onFechar={() => setModalAberto(null)} titulo="Itens sem movimentação" subtitulo="Produtos sem saída (consumo, produção ou baixa) por 90 dias ou mais.">
      <TabelaInterativa linhas={dados?.semMovimentacao ?? []} filtroSituacao={{ coluna: 'SITUACAO', rotuloSim: 'Com estoque', rotuloNao: 'Sem estoque' }} />
    </ModalExpandido>
    <ModalExpandido aberto={modalAberto === 'fornecedores'} onFechar={() => setModalAberto(null)} titulo="Ranking de fornecedores" subtitulo="Histórico de cotações: prazo, vitórias e produtos distintos cotados.">
      <TabelaInterativa linhas={dados?.fornecedores ?? []} />
    </ModalExpandido>
    <ModalExpandido aberto={modalAberto === 'cotacoes'} onFechar={() => setModalAberto(null)} titulo="Cotações em aberto" subtitulo="Cotações com pelo menos um item ainda não fechado ou cancelado.">
      <TabelaInterativa linhas={dados?.cotacoes ?? []} />
    </ModalExpandido>
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

function Grafico({ titulo, bigNumber, insight, onExpandir, children }: {
  titulo: string;
  bigNumber?: { rotulo: string; valor: string; apoio: string };
  insight?: string;
  onExpandir?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={`bg-white border rounded-2xl p-5 ${onExpandir ? 'cursor-pointer hover:border-emerald-300 transition-colors' : ''}`} onClick={onExpandir}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-800 flex gap-2 items-center shrink-0">
            <BarChart3 size={17} className="text-emerald-600" />{titulo}
          </h2>
          {insight && <p className="text-xs text-emerald-700 mt-1.5 flex items-start gap-1.5"><Sparkles size={13} className="shrink-0 mt-0.5" />{insight}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {bigNumber && (
            <div className="sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{bigNumber.rotulo}</p>
              <p className="text-sm font-bold text-slate-800 truncate max-w-[280px]" title={bigNumber.valor}>{bigNumber.valor}</p>
              <p className="text-xs text-emerald-700 font-semibold">{bigNumber.apoio}</p>
            </div>
          )}
          {onExpandir && <Maximize2 size={15} className="text-slate-300" />}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
