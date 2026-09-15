import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Lightbulb } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cabecalhoPerfil } from '../../utils/apiAuth';
import { COR, formatMoeda } from '../../components/common/vizTokens';
import { Carregando, SemDado } from '../../components/common/viz';

const API_URL = import.meta.env.VITE_API_URL ?? '';

const numero = (valor: number | null | undefined, casas = 0) =>
  valor === null || valor === undefined ? '—' : valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

function truncar(texto: string, tamanho: number) {
  return texto.length > tamanho ? `${texto.slice(0, tamanho - 1)}…` : texto;
}

function mesCurto(competencia: string) {
  const d = new Date(competencia);
  return isNaN(d.getTime()) ? competencia : d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}

// Km/L maior é melhor, CPK menor é melhor — normaliza os dois pro mesmo sentido "% da meta
// atingido" pra dar pra ranquear (mesma lógica já usada em PainelMetas.tsx).
function percentualMeta(realizado: number | null, meta: number | null, kmLMaiorMelhor: boolean) {
  if (realizado === null || meta === null || meta === 0) return null;
  return kmLMaiorMelhor ? (realizado / meta) * 100 : (meta / realizado) * 100;
}

interface DadosExecutivo {
  tendenciaMensal: { CompetenciaMeta: string; CustoOperacionalTotalMes: number | null }[];
  porFrenteFazenda: { GrupoFrente: string | null; Fazenda: string | null; CustoOperacionalTotalMes: number | null }[];
  pontoEquilibrio: { TotalMotoristas: number; DentroDoPontoDeEquilibrio: number };
  alarmes24h: number;
}
interface LinhaPainel {
  MotoristaNomeFicha: string | null;
  KmLRealizado: number | null; MetaKmL: number | null;
  CpkRealizado: number | null; MetaCpk: number | null;
  MetaOrfa: boolean;
}
interface Avaliacao { NotaFinal: number | null }

// Painel de Logística — mesma lógica do painel de Estoque: gráficos e resumo calculados só a
// partir de dado real já usado nas telas de origem (Métricas, Metas, Avaliação de Condução).
// Nenhuma previsão nem pontuação de IA — quando falta o número, a frase correspondente some.
export function Analises() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [executivo, setExecutivo] = useState<DadosExecutivo | null>(null);
  const [painel, setPainel] = useState<LinhaPainel[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const headers = cabecalhoPerfil(usuario?.perfil);
    Promise.all([
      fetch(`${API_URL}/api/metas/diario?modo=executivo`, { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_URL}/api/metas/painel`, { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/api/avaliacao`, { headers }).then((r) => (r.ok ? r.json() : [])),
    ]).then(([exec, pnl, aval]) => {
      setExecutivo(exec);
      setPainel(Array.isArray(pnl) ? pnl : []);
      setAvaliacoes(Array.isArray(aval) ? aval : []);
      setCarregando(false);
    }).catch(() => { setErro('Não foi possível carregar as análises de Logística.'); setCarregando(false); });
  }, [usuario?.perfil]);

  const tendencia = useMemo(() => (executivo?.tendenciaMensal ?? []).map((l) => ({
    mes: mesCurto(l.CompetenciaMeta), custo: Number(l.CustoOperacionalTotalMes ?? 0),
  })), [executivo]);

  const custoPorFrente = useMemo(() => [...(executivo?.porFrenteFazenda ?? [])]
    .map((l) => ({ nome: `${l.GrupoFrente ?? '—'} · ${l.Fazenda ?? '—'}`, custo: Number(l.CustoOperacionalTotalMes ?? 0) }))
    .sort((a, b) => b.custo - a.custo)
    .slice(0, 8), [executivo]);

  const rankingMotoristas = useMemo(() => painel
    .filter((l) => !l.MetaOrfa && l.MotoristaNomeFicha)
    .map((l) => {
      const percKmL = percentualMeta(l.KmLRealizado, l.MetaKmL, true);
      const percCpk = percentualMeta(l.CpkRealizado, l.MetaCpk, false);
      const percentuais = [percKmL, percCpk].filter((v): v is number => v !== null);
      const percentualMedio = percentuais.length ? percentuais.reduce((a, b) => a + b, 0) / percentuais.length : null;
      return { motorista: String(l.MotoristaNomeFicha), percentualMedio };
    })
    .filter((l) => l.percentualMedio !== null)
    .sort((a, b) => (b.percentualMedio ?? 0) - (a.percentualMedio ?? 0))
    .slice(0, 8), [painel]);

  const distribuicaoAvaliacao = useMemo(() => {
    const notas = avaliacoes.map((a) => Number(a.NotaFinal ?? 0));
    const otima = notas.filter((n) => n >= 90).length;
    const regular = notas.filter((n) => n >= 70 && n < 90).length;
    const critica = notas.filter((n) => n < 70).length;
    return [
      { classe: 'Ótima (≥90)', valor: otima, cor: COR.bom },
      { classe: 'Regular (70–89)', valor: regular, cor: COR.atencao },
      { classe: 'Crítica (<70)', valor: critica, cor: COR.critico },
    ];
  }, [avaliacoes]);

  const insightsReais = useMemo(() => {
    const frases: string[] = [];
    if (executivo?.pontoEquilibrio) {
      const { TotalMotoristas, DentroDoPontoDeEquilibrio } = executivo.pontoEquilibrio;
      if (TotalMotoristas > 0) frases.push(`${numero(DentroDoPontoDeEquilibrio)} de ${numero(TotalMotoristas)} motoristas estão dentro do ponto de equilíbrio este mês.`);
    }
    if (executivo?.alarmes24h != null) frases.push(`${numero(executivo.alarmes24h)} alarme(s) registrado(s) nas últimas 24h em toda a frota.`);
    if (custoPorFrente[0]) frases.push(`A frente com maior custo operacional no mês é "${custoPorFrente[0].nome}", com ${formatMoeda(custoPorFrente[0].custo)}.`);
    if (rankingMotoristas[0]) frases.push(`Melhor % de meta combinada (Km/L + CPK) no mês: ${rankingMotoristas[0].motorista}, com ${numero(rankingMotoristas[0].percentualMedio, 0)}%.`);
    return frases;
  }, [executivo, custoPorFrente, rankingMotoristas]);

  return <div className="space-y-5 pb-12">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold tracking-wider uppercase text-emerald-700">Logística</p>
        <h1 className="text-2xl font-bold text-slate-800">Análises</h1>
        <p className="text-sm text-slate-500 mt-1">Custo, metas e avaliação de condução — leitura do que já foi apurado, sem previsão de tendência.</p>
      </div>
      <button onClick={() => navigate('/logistica/dashboard')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shrink-0">
        <BarChart3 size={15} className="text-emerald-700" /> Ver Dashboard
      </button>
    </div>
    {erro && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{erro}</div>}

    {carregando && !executivo ? <div className="bg-white border rounded-2xl p-12"><Carregando mensagem="Carregando análises…" /></div> : (
      <>
        {insightsReais.length > 0 && (
          <section className="bg-emerald-950 rounded-2xl p-5 text-white">
            <h2 className="font-bold flex items-center gap-2"><Lightbulb size={16} className="text-emerald-300" /> Resumo (calculado a partir do apurado no mês)</h2>
            <ul className="mt-3 space-y-1.5">
              {insightsReais.map((frase, i) => <li key={i} className="text-sm text-emerald-50 flex gap-2"><span className="text-emerald-400">•</span>{frase}</li>)}
            </ul>
          </section>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <section className="bg-white border rounded-2xl p-5">
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><BarChart3 size={16} className="text-emerald-600" />Custo operacional (últimos 6 meses)</h2>
            {tendencia.every((t) => t.custo === 0) ? <SemDado mensagem="Sem custo operacional apurado no período." /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={tendencia} margin={{ left: 8, right: 8, top: 10 }}>
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: COR.tintaMuda }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: COR.tintaMuda }} axisLine={false} tickLine={false} tickFormatter={(v) => numero(v)} />
                  <Tooltip formatter={(v) => formatMoeda(v as number)} labelFormatter={(v) => v} />
                  <Bar dataKey="custo" name="Custo operacional" fill={COR.serie1} radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="bg-white border rounded-2xl p-5">
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><BarChart3 size={16} className="text-emerald-600" />Custo por frente/fazenda (mês atual)</h2>
            {custoPorFrente.length === 0 ? <SemDado mensagem="Sem custo por frente/fazenda apurado no mês." /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={custoPorFrente} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: COR.tintaMuda }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="nome" type="category" width={140} tick={{ fontSize: 10, fill: COR.tintaSecundaria }} axisLine={false} tickLine={false} tickFormatter={(v: string) => truncar(v, 20)} />
                  <Tooltip formatter={(v) => formatMoeda(v as number)} labelFormatter={(v) => v} />
                  <Bar dataKey="custo" name="Custo operacional" fill={COR.serie2} radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="bg-white border rounded-2xl p-5">
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><BarChart3 size={16} className="text-emerald-600" />Ranking de motoristas (% da meta combinada)</h2>
            <p className="text-xs text-slate-500 mt-1 mb-3">Média de Km/L e CPK realizados vs. meta, só motoristas com meta vinculada.</p>
            {rankingMotoristas.length === 0 ? <SemDado mensagem="Sem motoristas com meta e realizado suficientes no mês." /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={rankingMotoristas} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" unit="%" tick={{ fontSize: 10, fill: COR.tintaMuda }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="motorista" type="category" width={140} tick={{ fontSize: 10, fill: COR.tintaSecundaria }} axisLine={false} tickLine={false} tickFormatter={(v: string) => truncar(v, 20)} />
                  <Tooltip formatter={(v) => `${numero(v as number, 0)}%`} labelFormatter={(v) => v} />
                  <Bar dataKey="percentualMedio" name="% da meta" radius={[0, 4, 4, 0]} barSize={14}>
                    {rankingMotoristas.map((r, i) => <Cell key={i} fill={(r.percentualMedio ?? 0) >= 100 ? COR.bom : (r.percentualMedio ?? 0) >= 80 ? COR.serie1 : COR.atencao} />)}
                    <LabelList dataKey="percentualMedio" position="right" style={{ fontSize: 10, fill: COR.tintaSecundaria }} formatter={(v) => `${numero(v as number, 0)}%`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="bg-white border rounded-2xl p-5">
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><BarChart3 size={16} className="text-emerald-600" />Distribuição de avaliações de condução</h2>
            {distribuicaoAvaliacao.every((c) => c.valor === 0) ? <SemDado mensagem="Nenhuma avaliação de condução registrada." /> : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={200} className="sm:!w-[55%]">
                  <PieChart>
                    <Pie data={distribuicaoAvaliacao} dataKey="valor" nameKey="classe" innerRadius={55} outerRadius={85} paddingAngle={2} strokeWidth={2} stroke="#fff">
                      {distribuicaoAvaliacao.map((c) => <Cell key={c.classe} fill={c.cor} />)}
                    </Pie>
                    <Tooltip formatter={(v) => numero(v as number)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full sm:w-[45%] space-y-2.5">
                  {distribuicaoAvaliacao.map((c) => (
                    <div key={c.classe} className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: c.cor }} />
                      <div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-700">{c.classe}</p></div>
                      <span className="text-sm font-bold text-slate-800 tabular-nums shrink-0">{numero(c.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </>
    )}
  </div>;
}
