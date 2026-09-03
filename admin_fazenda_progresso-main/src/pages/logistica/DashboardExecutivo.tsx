import { useEffect, useState } from 'react';
import { PieChart as PieChartIcon, Wallet, ShieldCheck, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL ?? '';

interface TendenciaMes {
  CompetenciaMeta: string;
  CustoFixoTotalMes: number;
  CustoOperacionalTotalMes: number;
}

interface FrenteFazenda {
  GrupoFrente: string | null;
  Fazenda: string | null;
  CustoFixoTotalMes: number;
  CustoOperacionalTotalMes: number;
}

interface DashboardExecutivoResposta {
  tendenciaMensal: TendenciaMes[];
  porFrenteFazenda: FrenteFazenda[];
  pontoEquilibrio: { TotalMotoristas: number; DentroDoPontoDeEquilibrio: number };
  alarmes24h: number;
}

const formatMoeda = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? '—' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatMoedaCompacta = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });

const formatCompetencia = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  } catch {
    return iso;
  }
};

const CardKpi = ({ icon, label, valor, tom }: { icon: React.ReactNode; label: string; valor: string; tom: 'emerald' | 'amber' | 'rose' }) => {
  const cores = {
    emerald: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  } as const;
  return (
    <div className="bg-white rounded-2xl shadow-soft border border-slate-200/80 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${cores[tom]}`}>{icon}</div>
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-lg font-bold text-slate-800">{valor}</p>
      </div>
    </div>
  );
};

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-2xl p-4 shadow-soft border border-slate-200/60 flex flex-col">
    <h3 className="text-[13px] font-bold text-slate-800 mb-4 px-1">{title}</h3>
    <div className="flex-1 w-full min-h-[240px]">{children}</div>
  </div>
);



export const DashboardExecutivo = ({
  dataInicio,
  dataFim,
  tipoEquipamento,
  trigger
}: {
  dataInicio: string;
  dataFim: string;
  tipoEquipamento: string;
  trigger: number;
}) => {
  const [dados, setDados] = useState<DashboardExecutivoResposta | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}/api/metas/diario?modo=executivo&dataInicio=${dataInicio}&dataFim=${dataFim}&tipoEquipamento=${tipoEquipamento}`);
      if (!resp.ok) throw new Error('Falha ao consultar a API');
      setDados(await resp.json());
      setErro(null);
    } catch (error) {
      console.error('Erro ao buscar dashboard executivo:', error);
      setErro('Não foi possível conectar ao banco de dados da fazenda (SQL Server).');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicio, dataFim, tipoEquipamento, trigger]);

  const custoMesAtual = dados?.tendenciaMensal[dados.tendenciaMensal.length - 1];
  const custoMesAnterior = dados?.tendenciaMensal[dados.tendenciaMensal.length - 2];
  const variacao = custoMesAtual && custoMesAnterior && custoMesAnterior.CustoOperacionalTotalMes > 0
    ? ((custoMesAtual.CustoOperacionalTotalMes - custoMesAnterior.CustoOperacionalTotalMes) / custoMesAnterior.CustoOperacionalTotalMes) * 100
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <PieChartIcon size={16} className="text-green-600" /> Custo consolidado — tendência e comparação por frente/fazenda
        </h3>
      </div>

      {erro && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{erro}</div>}

      {loading || !dados ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">Carregando...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CardKpi
              icon={<Wallet size={20} />}
              label="Custo operacional do mês"
              valor={formatMoeda(custoMesAtual?.CustoOperacionalTotalMes ?? 0)}
              tom={variacao !== null && variacao > 0 ? 'rose' : 'emerald'}
            />
            <CardKpi
              icon={<ShieldCheck size={20} />}
              label="Motoristas no ponto de equilíbrio"
              valor={`${dados.pontoEquilibrio.DentroDoPontoDeEquilibrio} de ${dados.pontoEquilibrio.TotalMotoristas}`}
              tom={dados.pontoEquilibrio.DentroDoPontoDeEquilibrio >= dados.pontoEquilibrio.TotalMotoristas / 2 ? 'emerald' : 'amber'}
            />
            <CardKpi
              icon={<AlertTriangle size={20} />}
              label="Alarmes (últimas 24h)"
              valor={String(dados.alarmes24h)}
              tom={dados.alarmes24h > 0 ? 'amber' : 'emerald'}
            />
            <CardKpi
              icon={<Wallet size={20} />}
              label="Variação vs. mês anterior"
              valor={variacao !== null ? `${variacao >= 0 ? '+' : ''}${variacao.toFixed(1)}%` : '—'}
              tom={variacao === null ? 'emerald' : variacao > 0 ? 'rose' : 'emerald'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Tendência de custo — últimos 6 meses">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dados.tendenciaMensal.map((t) => ({ mes: formatCompetencia(t.CompetenciaMeta), custo: t.CustoOperacionalTotalMes }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => formatMoedaCompacta(Number(v))} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => formatMoeda(Number(value))} />
                  <Area type="monotone" dataKey="custo" name="Custo operacional" stroke="#16a34a" fill="#16a34a" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Custo por frente/fazenda — mês corrente">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dados.porFrenteFazenda.map((f) => ({ nome: f.GrupoFrente ?? f.Fazenda ?? 'Sem grupo', custo: f.CustoOperacionalTotalMes }))}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={(v) => formatMoedaCompacta(Number(v))} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => formatMoeda(Number(value))} />
                  <Bar dataKey="custo" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
};
