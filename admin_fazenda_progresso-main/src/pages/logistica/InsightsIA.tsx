import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, CheckCircle2, Eye, Truck, Wallet, AlertTriangle, Wrench } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL ?? '';

interface Insight {
  InsightId: number;
  GeradoEm: string;
  Categoria: 'Metas' | 'Gastos' | 'Alarmes' | 'Manutencao';
  Severidade: 'baixa' | 'media' | 'alta';
  Titulo: string;
  Descricao: string;
  EntidadeReferencia: string | null;
  Lido: boolean;
  Resolvido: boolean;
  ResolvidoPor: string | null;
  ResolvidoEm: string | null;
}

const formatData = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
};

const categoriaIcon = (categoria: Insight['Categoria']) => {
  if (categoria === 'Metas') return <Truck size={14} />;
  if (categoria === 'Gastos') return <Wallet size={14} />;
  if (categoria === 'Manutencao') return <Wrench size={14} />;
  return <AlertTriangle size={14} />;
};

const severidadeClasses: Record<Insight['Severidade'], string> = {
  alta: 'border-rose-300 bg-rose-50/70',
  media: 'border-amber-300 bg-amber-50/70',
  baixa: 'border-slate-200 bg-white',
};

const severidadeBadge: Record<Insight['Severidade'], string> = {
  alta: 'bg-rose-100 text-rose-700 border-rose-200',
  media: 'bg-amber-100 text-amber-700 border-amber-200',
  baixa: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const InsightsIA = () => {
  const { usuario } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [mostrarResolvidos, setMostrarResolvidos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}/api/insights/listar?resolvido=${mostrarResolvidos}`);
      if (!resp.ok) throw new Error('Falha ao consultar a API');
      setInsights(await resp.json());
      setErro(null);
    } catch (error) {
      console.error('Erro ao buscar insights:', error);
      setErro('Não foi possível conectar ao banco de dados da fazenda (SQL Server). A tabela InsightIA já existe?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarResolvidos]);

  const gerarInsights = async () => {
    setGerando(true);
    setErro(null);
    try {
      const resp = await fetch(`${API_URL}/api/insights/gerar`, { method: 'POST' });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error ?? 'Falha ao gerar insights');
      }
      await carregar();
    } catch (error) {
      console.error('Erro ao gerar insights:', error);
      setErro(error instanceof Error ? error.message : 'Falha ao gerar insights. Verifique a OPENAI_API_KEY no Vercel.');
    } finally {
      setGerando(false);
    }
  };

  const atualizarInsight = async (insightId: number, patch: { lido?: boolean; resolvido?: boolean }) => {
    setInsights((atual) => atual.map((i) => (i.InsightId === insightId ? { ...i, ...patch } as Insight : i)));
    try {
      await fetch(`${API_URL}/api/insights/listar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId, ...patch, resolvidoPor: usuario?.nome }),
      });
      if (patch.resolvido !== undefined) carregar();
    } catch (error) {
      console.error('Erro ao atualizar insight:', error);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles size={22} className="text-emerald-600" /> Insights (IA)
          </h2>
          <p className="text-slate-500 mt-1">A IA lê Metas, Gastos e Alarmes agregados e sugere o que vale a pena olhar — nunca envia remuneração de motorista pra fora.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={carregar}
            className="inline-flex items-center px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm"
          >
            <RefreshCw size={16} className="mr-2" />
            Atualizar
          </button>
          <button
            onClick={gerarInsights}
            disabled={gerando}
            className="inline-flex items-center px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50"
          >
            <Sparkles size={16} className="mr-2" />
            {gerando ? 'Gerando...' : 'Gerar novos insights'}
          </button>
        </div>
      </div>

      {erro && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{erro}</div>}

      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setMostrarResolvidos(false)}
          className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${!mostrarResolvidos ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Em aberto
        </button>
        <button
          onClick={() => setMostrarResolvidos(true)}
          className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${mostrarResolvidos ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Resolvidos
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">Carregando...</div>
      ) : insights.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
          {mostrarResolvidos ? 'Nenhum insight resolvido ainda.' : 'Nenhum insight em aberto — clique em "Gerar novos insights".'}
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <div
              key={insight.InsightId}
              className={`rounded-2xl border shadow-soft p-5 flex items-start gap-4 ${severidadeClasses[insight.Severidade]}`}
            >
              <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 shrink-0">
                {categoriaIcon(insight.Categoria)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${severidadeBadge[insight.Severidade]}`}>
                    {insight.Severidade}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{insight.Categoria}</span>
                  {insight.EntidadeReferencia && (
                    <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">{insight.EntidadeReferencia}</span>
                  )}
                </div>
                <h3 className="font-bold text-slate-800">{insight.Titulo}</h3>
                <p className="text-sm text-slate-600 mt-1">{insight.Descricao}</p>
                <p className="text-[11px] text-slate-400 mt-2">
                  Gerado em {formatData(insight.GeradoEm)}
                  {insight.Resolvido && insight.ResolvidoPor && ` · Resolvido por ${insight.ResolvidoPor}`}
                </p>
              </div>
              {!insight.Resolvido && (
                <div className="flex flex-col gap-1.5 shrink-0">
                  {!insight.Lido && (
                    <button
                      onClick={() => atualizarInsight(insight.InsightId, { lido: true })}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      <Eye size={13} /> Marcar como lido
                    </button>
                  )}
                  <button
                    onClick={() => atualizarInsight(insight.InsightId, { resolvido: true })}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                  >
                    <CheckCircle2 size={13} /> Resolver
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
