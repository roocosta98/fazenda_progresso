import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import { Carregando } from '../../components/common/viz';

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

// Só leitura + filtro por motorista (pedido do Rodrigo) — o lançamento de nota (IEC) deixa de
// ser feito pelo Admin; a ideia do PRD (§4.5) é o encarregado/motorista educador registrar isso
// direto no app/portal do motorista no futuro. O backend (api/avaliacao/index.ts) continua com
// GET+POST — só paramos de chamar o POST por aqui.
export const AvaliacaoConducao = () => {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [motoristaFiltro, setMotoristaFiltro] = useState('todos');

  const carregar = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}/api/avaliacao`);
      if (!resp.ok) throw new Error('Falha ao consultar a API');
      setAvaliacoes(await resp.json());
      setErro(null);
    } catch (error) {
      console.error('Erro ao buscar avaliações de condução:', error);
      setErro('Não foi possível conectar ao banco de dados da fazenda (SQL Server). Verifique as variáveis MSSQL_* no Vercel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const motoristas = useMemo(
    () => Array.from(new Set(avaliacoes.map((a) => a.MotoristaNomeFicha))).sort(),
    [avaliacoes]
  );

  const filtradas = motoristaFiltro === 'todos' ? avaliacoes : avaliacoes.filter((a) => a.MotoristaNomeFicha === motoristaFiltro);

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
        <span className={`font-mono font-black ${a.NotaFinal >= 90 ? 'text-green-600' : a.NotaFinal >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
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
          <p className="text-slate-500 mt-1">Índice IEC — frenagem, aceleração, cinto e sinalização. Só consulta; o lançamento passa a ser feito pelo encarregado.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={motoristaFiltro}
            onChange={(e) => setMotoristaFiltro(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-slate-50 min-w-[200px]"
          >
            <option value="todos">Todos os motoristas</option>
            {motoristas.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button
            onClick={carregar}
            className="inline-flex items-center px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm"
          >
            <RefreshCw size={16} className="mr-2" />
            Atualizar
          </button>
        </div>
      </div>

      {erro && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{erro}</div>}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12"><Carregando /></div>
      ) : (
        <DataTable
          columns={columns}
          data={filtradas}
          keyExtractor={(a) => String(a.AvaliacaoConducaoId)}
          emptyMessage="Nenhuma avaliação encontrada."
        />
      )}
    </div>
  );
};
