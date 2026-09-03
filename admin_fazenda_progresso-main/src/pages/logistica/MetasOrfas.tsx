import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Link2, Info } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';

const API_URL = import.meta.env.VITE_API_URL ?? '';

// Metas órfãs (melhoria pedida pelo Rodrigo, PRD §4.3 [PENDENTE]): MetasMotoristas.MotoristaId
// aceita nulo, então nem todo registro de meta está vinculado a um cadastro de motorista. Esta
// tela reaproveita api/metas/painel.ts, que já marca MetaOrfa: true (via view) — sem endpoint
// novo pra listar.
//
// A ESCRITA (vincular de fato) fica bloqueada nesta entrega: eu não tenho os nomes reais de
// coluna de MetasMotoristas/Motoristas (só os nomes de SAÍDA da view, que podem ser diferentes —
// mesmo erro que já aconteceu com CustosFixosEquipamento no módulo de Gastos). O botão fica
// visível e desabilitado até o Rodrigo confirmar o schema real.
interface LinhaPainel {
  EquipamentoId: number;
  CodigoEquipamento: string;
  NomeEquipamento: string;
  Fazenda: string | null;
  GrupoFrente: string | null;
  CompetenciaMeta: string;
  Atividade: string | null;
  MotoristaNomeFicha: string | null;
  MetaKmL: number | null;
  MetaCpk: number | null;
  MetaOrfa: boolean;
}

const competenciaAtual = () => {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
};

export const MetasOrfas = () => {
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [linhas, setLinhas] = useState<LinhaPainel[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [vinculoEscolhido, setVinculoEscolhido] = useState<Record<number, string>>({});

  const carregar = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}/api/metas/painel?competencia=${competencia}`);
      if (!resp.ok) throw new Error('Falha ao consultar a API');
      const dados: LinhaPainel[] = await resp.json();
      setLinhas(dados);
      setErro(null);
    } catch (error) {
      console.error('Erro ao buscar metas órfãs:', error);
      setErro('Não foi possível conectar ao banco de dados da fazenda (SQL Server). Verifique as variáveis MSSQL_* no Vercel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competencia]);

  const orfas = linhas.filter((l) => l.MetaOrfa);

  const motoristasDisponiveis = useMemo(
    () => Array.from(new Set(linhas.map((l) => l.MotoristaNomeFicha).filter(Boolean))) as string[],
    [linhas]
  );

  const columns = [
    {
      header: 'Equipamento',
      render: (l: LinhaPainel) => (
        <div>
          <p className="font-bold text-slate-800">{l.NomeEquipamento}</p>
          <p className="text-xs text-slate-500">{l.CodigoEquipamento} · {l.Fazenda ?? '—'} · {l.GrupoFrente ?? '—'}</p>
        </div>
      ),
    },
    { header: 'Atividade', render: (l: LinhaPainel) => l.Atividade ?? '—' },
    {
      header: 'Meta (Km/L / CPK)',
      render: (l: LinhaPainel) => (
        <span className="font-mono text-slate-700">{l.MetaKmL ?? '—'} km/L · R$ {l.MetaCpk ?? '—'}/km</span>
      ),
    },
    {
      header: 'Vincular motorista',
      render: (l: LinhaPainel) => (
        <select
          value={vinculoEscolhido[l.EquipamentoId] ?? ''}
          onChange={(e) => setVinculoEscolhido((atual) => ({ ...atual, [l.EquipamentoId]: e.target.value }))}
          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium bg-slate-50 min-w-[180px]"
        >
          <option value="">Selecione o motorista</option>
          {motoristasDisponiveis.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      ),
    },
    {
      header: '',
      render: () => (
        <button
          disabled
          title="Escrita bloqueada até confirmar os nomes reais de coluna de MetasMotoristas/Motoristas no SQL Server"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed"
        >
          <Link2 size={13} /> Vincular
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Link2 size={22} className="text-emerald-600" /> Metas Órfãs
          </h2>
          <p className="text-slate-500 mt-1">Metas de {orfas.length} equipamento(s) sem motorista vinculado nesta competência (PRD §4.3).</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-slate-50" />
          <button onClick={carregar} className="inline-flex items-center px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm">
            <RefreshCw size={16} className="mr-2" />
            Atualizar
          </button>
        </div>
      </div>

      {erro && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{erro}</div>}

      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm flex items-start gap-2">
        <Info size={16} className="mt-0.5 shrink-0" />
        <span>O vínculo real (gravar no banco) ainda depende de confirmar os nomes de coluna de <code className="font-mono">MetasMotoristas</code>/<code className="font-mono">Motoristas</code> no SQL Server — por isso o botão "Vincular" está desabilitado. Esta lista já é dado real e serve pra logística identificar quem precisa ser vinculado manualmente por enquanto.</span>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">Carregando...</div>
      ) : (
        <DataTable columns={columns} data={orfas} keyExtractor={(l) => `${l.EquipamentoId}-${l.CompetenciaMeta}`} emptyMessage="Nenhuma meta órfã nesta competência." />
      )}
    </div>
  );
};
