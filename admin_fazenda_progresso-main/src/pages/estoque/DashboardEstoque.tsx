import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, RefreshCw } from 'lucide-react';
import { KpiCardsEstoque, useEstoquePainel } from './estoqueShared';

export function DashboardEstoque() {
  const { dados, erro, carregando, carregar } = useEstoquePainel();
  const curvaAbc = useMemo(() => ['A', 'B', 'C'].map((classe) => ({ classe, valor: (dados?.valor ?? []).filter((l) => l.CLASSEABC === classe).reduce((s, l) => s + Number(l.VALORTOTAL ?? 0), 0) })), [dados]);
  const ruptura = useMemo(() => (dados?.ruptura ?? []).slice(0, 10).map((l) => ({ produto: String(l.DESCRPROD ?? '').slice(0, 22), estoque: Number(l.ESTOQUE ?? 0), minimo: Number(l.MINIMO ?? 0) })), [dados]);
  const giro = useMemo(() => (dados?.giroProdutos ?? []).slice(0, 10).map((l) => ({ produto: String(l.DESCRPROD ?? '').slice(0, 22), consumo: Number(l.CONSUMO ?? 0) })), [dados]);
  const parados = useMemo(() => (dados?.semMovimentacao ?? []).slice(0, 10).map((l) => ({ produto: String(l.DESCRPROD ?? '').slice(0, 22), dias: Number(l.DIASSEMVENDA ?? 0), valor: Number(l.VALORESTOQUE ?? 0) })), [dados]);
  return <div className="space-y-5 pb-12">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase font-bold tracking-wider text-emerald-700">Estoque</p>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard de Estoque</h1>
        <p className="text-sm text-slate-500 mt-1">Visão geral e gráfica dos níveis, valor, giro e itens parados (empresa 01).</p>
      </div>
      <button onClick={carregar} className="inline-flex gap-2 items-center bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold"><RefreshCw size={16} className={carregando ? 'animate-spin' : ''}/>Atualizar</button>
    </div>
    {erro && <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{erro}</div>}
    <KpiCardsEstoque kpis={dados?.kpis ?? {}} />
    {carregando && !dados ? <div className="p-12 bg-white border rounded-2xl text-center text-slate-400">Carregando dados do Sankhya…</div> : <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <Grafico titulo="Valor por Curva ABC"><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={curvaAbc} dataKey="valor" nameKey="classe" fill="#10b981"/><Tooltip/><Legend/></PieChart></ResponsiveContainer></Grafico>
      <Grafico titulo="Itens mais críticos"><ResponsiveContainer width="100%" height={260}><BarChart data={ruptura}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="produto" hide/><YAxis/><Tooltip/><Legend/><Bar dataKey="estoque" fill="#ef4444" name="Estoque"/><Bar dataKey="minimo" fill="#f59e0b" name="Mínimo"/></BarChart></ResponsiveContainer></Grafico>
      <Grafico titulo="Maior consumo por requisição (90 dias)"><ResponsiveContainer width="100%" height={260}><BarChart data={giro} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number"/><YAxis dataKey="produto" type="category" width={150}/><Tooltip/><Bar dataKey="consumo" fill="#2563eb" name="Consumo"/></BarChart></ResponsiveContainer></Grafico>
      <Grafico titulo="Produtos parados há mais tempo"><ResponsiveContainer width="100%" height={260}><BarChart data={parados}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="produto" hide/><YAxis/><Tooltip/><Legend/><Bar dataKey="dias" fill="#f59e0b" name="dias"/></BarChart></ResponsiveContainer></Grafico>
    </div>}
  </div>;
}
function Grafico({ titulo, children }: { titulo: string; children: React.ReactNode }) { return <section className="bg-white border rounded-2xl p-5"><h2 className="font-bold text-slate-800 flex gap-2 items-center"><BarChart3 size={17} className="text-emerald-600"/>{titulo}</h2><div className="mt-4">{children}</div></section>; }
