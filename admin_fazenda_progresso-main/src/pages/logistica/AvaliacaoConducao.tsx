import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ClipboardCheck, Send } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import { useAuth } from '../../context/AuthContext';
import { CRITERIOS_AVALIACAO_CONDUCAO } from '../../config/avaliacaoConducao';

const API_URL = import.meta.env.VITE_API_URL ?? '';

interface AvaliacaoItem {
  Criterio: string;
  Nota: number;
}

interface Avaliacao {
  AvaliacaoConducaoId: number;
  MotoristaNomeFicha: string;
  Avaliador: string;
  DataHora: string;
  NotaFinal: number;
  Observacao: string | null;
  Itens: AvaliacaoItem[];
}

const formatData = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
};

export const AvaliacaoConducao = () => {
  const { usuario } = useAuth();
  const [motoristas, setMotoristas] = useState<string[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [motoristaSelecionado, setMotoristaSelecionado] = useState('');
  const [observacao, setObservacao] = useState('');
  const [notas, setNotas] = useState<Record<string, number>>(
    Object.fromEntries(CRITERIOS_AVALIACAO_CONDUCAO.map((c) => [c, 100]))
  );

  const carregar = async () => {
    setLoading(true);
    try {
      const [respPainel, respAvaliacoes] = await Promise.all([
        fetch(`${API_URL}/api/metas/painel`),
        fetch(`${API_URL}/api/avaliacao/listar`),
      ]);
      if (!respPainel.ok || !respAvaliacoes.ok) throw new Error('Falha ao consultar a API');
      const painel: { MotoristaNomeFicha: string | null }[] = await respPainel.json();
      setMotoristas(Array.from(new Set(painel.map((p) => p.MotoristaNomeFicha).filter(Boolean))) as string[]);
      setAvaliacoes(await respAvaliacoes.json());
      setErro(null);
    } catch (error) {
      console.error('Erro ao buscar dados de avaliação:', error);
      setErro('Não foi possível conectar ao banco de dados da fazenda (SQL Server). Verifique as variáveis MSSQL_* no Vercel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const notaFinalPreview = useMemo(() => {
    const valores = Object.values(notas);
    return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
  }, [notas]);

  const handleEnviar = async () => {
    if (!motoristaSelecionado) return;
    setEnviando(true);
    setSucesso(null);
    try {
      const resp = await fetch(`${API_URL}/api/avaliacao/criar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motoristaNomeFicha: motoristaSelecionado,
          avaliador: usuario?.nome ?? 'Encarregado',
          observacao: observacao || undefined,
          itens: CRITERIOS_AVALIACAO_CONDUCAO.map((criterio) => ({ criterio, nota: notas[criterio] })),
        }),
      });
      if (!resp.ok) throw new Error('Falha ao enviar avaliação');
      setSucesso(`Avaliação de ${motoristaSelecionado} registrada com sucesso.`);
      setObservacao('');
      setNotas(Object.fromEntries(CRITERIOS_AVALIACAO_CONDUCAO.map((c) => [c, 100])));
      carregar();
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      setErro('Não foi possível gravar a avaliação. As tabelas AvaliacaoConducao/AvaliacaoConducaoItem já existem no SQL Server?');
    } finally {
      setEnviando(false);
    }
  };

  const columns = [
    {
      header: 'Motorista',
      render: (a: Avaliacao) => (
        <div>
          <p className="font-bold text-slate-800">{a.MotoristaNomeFicha}</p>
          <p className="text-xs text-slate-500">Avaliado por {a.Avaliador} · {formatData(a.DataHora)}</p>
        </div>
      ),
    },
    {
      header: 'Critérios',
      render: (a: Avaliacao) => (
        <div className="flex flex-wrap gap-1">
          {a.Itens.map((i) => (
            <span key={i.Criterio} className="text-[10px] bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5 text-slate-600">
              {i.Criterio}: <b>{i.Nota}</b>
            </span>
          ))}
        </div>
      ),
    },
    {
      header: 'Nota Final (IEC)',
      align: 'right' as const,
      render: (a: Avaliacao) => (
        <span className={`font-mono font-black ${a.NotaFinal >= 90 ? 'text-emerald-600' : a.NotaFinal >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
          {a.NotaFinal.toFixed(0)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Avaliação de Condução</h2>
          <p className="text-slate-500 mt-1">Índice IEC — frenagem, aceleração, cinto e sinalização, lançado direto no portal.</p>
        </div>
        <button
          onClick={carregar}
          className="inline-flex items-center px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm"
        >
          <RefreshCw size={16} className="mr-2" />
          Atualizar
        </button>
      </div>

      {erro && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{erro}</div>}
      {sucesso && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 text-sm">{sucesso}</div>}

      <div className="bg-white rounded-2xl shadow-soft border border-slate-200/80 p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><ClipboardCheck size={16} className="text-emerald-600" /> Nova avaliação</h3>

        <select
          value={motoristaSelecionado}
          onChange={(e) => setMotoristaSelecionado(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-slate-50"
        >
          <option value="">Selecione o motorista</option>
          {motoristas.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <div className="space-y-3">
          {CRITERIOS_AVALIACAO_CONDUCAO.map((criterio) => (
            <div key={criterio}>
              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                <span>{criterio}</span>
                <span className="font-mono">{notas[criterio]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={notas[criterio]}
                onChange={(e) => setNotas((atual) => ({ ...atual, [criterio]: Number(e.target.value) }))}
                className="w-full accent-emerald-600"
              />
            </div>
          ))}
        </div>

        <textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Observações (opcional)"
          rows={2}
          className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500">Nota final prévia: <b className="text-slate-800">{notaFinalPreview.toFixed(0)}</b></span>
          <button
            onClick={handleEnviar}
            disabled={!motoristaSelecionado || enviando}
            className="inline-flex items-center px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50"
          >
            <Send size={15} className="mr-2" />
            {enviando ? 'Enviando...' : 'Registrar avaliação'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">Carregando...</div>
      ) : (
        <DataTable columns={columns} data={avaliacoes} keyExtractor={(a) => String(a.AvaliacaoConducaoId)} />
      )}
    </div>
  );
};
