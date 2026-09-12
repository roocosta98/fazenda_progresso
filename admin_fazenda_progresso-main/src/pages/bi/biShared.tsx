import { BarChart3, Info } from 'lucide-react';
import { Bar, BarChart, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COR, estiloTooltip } from '../../components/common/vizTokens';

// Paleta categórica validada (dataviz skill): ordem fixa, nunca ciclar por rank.
// 4 slots — todos passam banda de luminosidade, piso de croma e separação CVD; o 3º (verde)
// fica abaixo do piso de contraste isolado contra branco, por isso sempre acompanhado de rótulo
// direto (nunca só a cor), como já é o padrão no Dashboard de Estoque.
export const COR_CATEGORICA = [COR.serie1, COR.serie2, '#1baf7a', '#8a5cf6'];

export const numero = (valor: unknown, casas = 0) => Number(valor ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: casas });
export const moeda = (valor: unknown) => Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const moedaCurta = (valor: unknown) => Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });

export function truncar(texto: string, tamanho: number) {
  return texto.length > tamanho ? `${texto.slice(0, tamanho - 1)}…` : texto;
}

// Selo visível em todo painel alimentado por dado de exemplo — nunca deixar dado ilustrativo
// se passar por real (o Marcos já levantou preocupação com credibilidade do sistema nas
// apresentações). Fica junto do KPI/gráfico que ele qualifica, não escondido.
export function SeloIlustrativo() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      <Info size={11} /> Dados ilustrativos
    </span>
  );
}

export function KpiCard({ rotulo, valor, apoio, Icon }: { rotulo: string; valor: string; apoio?: string; Icon: typeof BarChart3 }) {
  return (
    <div className="bg-white border rounded-2xl p-4">
      <Icon size={17} className="text-emerald-600 mb-3" />
      <p className="text-[11px] uppercase font-bold text-slate-400">{rotulo}</p>
      <p className="text-xl font-bold text-slate-800 mt-1">{valor}</p>
      {apoio && <p className="text-[11px] text-slate-400 mt-0.5">{apoio}</p>}
    </div>
  );
}

export function KpiRow({ cards }: { cards: { rotulo: string; valor: string; apoio?: string; Icon: typeof BarChart3 }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {cards.map((c) => <KpiCard key={c.rotulo} {...c} />)}
    </div>
  );
}

export function Legenda({ itens }: { itens: { cor: string; rotulo: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-100">
      {itens.map((i) => (
        <div key={i.rotulo} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: i.cor }} />
          <span className="text-[11px] font-medium text-slate-600">{i.rotulo}</span>
        </div>
      ))}
    </div>
  );
}

export function Grafico({ titulo, ilustrativo, children }: { titulo: string; ilustrativo?: boolean; children: React.ReactNode }) {
  return (
    <section className="bg-white border rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-slate-800 flex gap-2 items-center shrink-0 text-sm">
          <BarChart3 size={16} className="text-emerald-600" />{titulo}
        </h2>
        {ilustrativo && <SeloIlustrativo />}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SemDadoBI({ mensagem }: { mensagem: string }) {
  return <p className="text-sm text-slate-400 border border-dashed rounded-xl p-6 text-center">{mensagem}</p>;
}

// Barras horizontais categóricas — mesmo padrão do Dashboard de Estoque, generalizado pra
// aceitar 1-2 séries (dataKey/nome/cor por série).
export function BarrasHorizontais({ dados, categoria, series, formatador }: {
  dados: Record<string, unknown>[];
  categoria: string;
  series: { chave: string; nome: string; cor: string }[];
  formatador?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(dados.length * 34, 140)}>
      <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 24 }}>
        <XAxis type="number" tick={{ fontSize: 10, fill: COR.tintaMuda }} axisLine={false} tickLine={false} />
        <YAxis dataKey={categoria} type="category" width={140} tick={{ fontSize: 10, fill: COR.tintaSecundaria }} axisLine={false} tickLine={false}
          tickFormatter={(v: string) => truncar(v, 20)} />
        <Tooltip formatter={(v) => (formadorPadrao(formatador)(Number(v)))} labelFormatter={(v) => v} contentStyle={estiloTooltip} />
        {series.map((s) => <Bar key={s.chave} dataKey={s.chave} name={s.nome} fill={s.cor} radius={[0, 4, 4, 0]} barSize={series.length > 1 ? 10 : 14} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

function formadorPadrao(formatador?: (v: number) => string) {
  return formatador ?? ((v: number) => numero(v));
}

export function LinhaSerie({ dados, categoria, series, formatador }: {
  dados: Record<string, unknown>[];
  categoria: string;
  series: { chave: string; nome: string; cor: string }[];
  formatador?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={dados} margin={{ left: 4, right: 12, top: 8 }}>
        <XAxis dataKey={categoria} tick={{ fontSize: 10, fill: COR.tintaMuda }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: COR.tintaMuda }} axisLine={false} tickLine={false} width={44} tickFormatter={(v: number) => formadorPadrao(formatador)(v)} />
        <Tooltip formatter={(v) => formadorPadrao(formatador)(Number(v))} contentStyle={estiloTooltip} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {series.map((s) => <Line key={s.chave} type="monotone" dataKey={s.chave} name={s.nome} stroke={s.cor} strokeWidth={2} dot={{ r: 3 }} />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PizzaCategorica({ dados, chaveValor, chaveNome, formatador }: {
  dados: Record<string, unknown>[];
  chaveValor: string;
  chaveNome: string;
  formatador?: (v: number) => string;
}) {
  const total = dados.reduce((s, d) => s + Number(d[chaveValor] ?? 0), 0);
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <ResponsiveContainer width="100%" height={200} className="sm:!w-[55%]">
        <PieChart>
          <Pie data={dados} dataKey={chaveValor} nameKey={chaveNome} innerRadius={55} outerRadius={85} paddingAngle={2} strokeWidth={2} stroke="#fff">
            {dados.map((_, i) => <Cell key={i} fill={COR_CATEGORICA[i % COR_CATEGORICA.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => formadorPadrao(formatador)(Number(v))} contentStyle={estiloTooltip} />
        </PieChart>
      </ResponsiveContainer>
      <div className="w-full sm:w-[45%] space-y-2.5">
        {dados.map((d, i) => {
          const valor = Number(d[chaveValor] ?? 0);
          const percentual = total > 0 ? (valor / total) * 100 : 0;
          return (
            <div key={String(d[chaveNome])} className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: COR_CATEGORICA[i % COR_CATEGORICA.length] }} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-700">{String(d[chaveNome])}</p>
                <p className="text-[11px] text-slate-500">{formadorPadrao(formatador)(valor)}</p>
              </div>
              <span className="text-sm font-bold text-slate-800 tabular-nums shrink-0">{numero(percentual, 1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
