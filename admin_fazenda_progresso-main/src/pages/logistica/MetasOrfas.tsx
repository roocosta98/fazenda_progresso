import { useEffect, useState } from 'react';
import { RefreshCw, Link2, CheckCircle2 } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import { Carregando } from '../../components/common/viz';

const API_URL = import.meta.env.VITE_API_URL ?? '';

// Metas órfãs (melhoria pedida pelo Rodrigo, PRD §4.3 [PENDENTE]): MetasMotoristas.MotoristaId
// aceita nulo, então nem todo registro de meta está vinculado a um cadastro de motorista. Consulta
// api/metas/vincular-motorista.ts, que lê MetasMotoristas/Motoristas DIRETO (tabela base) — nomes
// de coluna confirmados no DBeaver, não vêm mais da view vw_PainelMotoristaVeiculo (que não expõe
// a chave real MetaMotoristaId nem a coluna de vínculo).
interface MetaOrfa {
  MetaMotoristaId: number;
  Competencia: string;
  CodigoConjunto: string | null;
  Placa: string | null;
  VeiculoModelo: string | null;
  Atividade: string | null;
  MetaKmL: number | null;
  MetaCpk: number | null;
  MotoristaNome: string | null;
}

interface Motorista {
  MotoristaId: number;
  CodigoFuncionario: string | null;
  NomeCompleto: string;
}

const competenciaAtual = () => {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
};

export const MetasOrfas = () => {
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [orfas, setOrfas] = useState<MetaOrfa[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [vinculoEscolhido, setVinculoEscolhido] = useState<Record<number, number>>({});
  const [vinculando, setVinculando] = useState<number | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const [respOrfas, respMotoristas] = await Promise.all([
        fetch(`${API_URL}/api/metas/vincular-motorista?modo=orfas&competencia=${competencia}`),
        fetch(`${API_URL}/api/metas/vincular-motorista?modo=motoristas`),
      ]);
      if (!respOrfas.ok || !respMotoristas.ok) throw new Error('Falha ao consultar a API');
      setOrfas(await respOrfas.json());
      setMotoristas(await respMotoristas.json());
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

  const vincular = async (metaMotoristaId: number) => {
    const motoristaId = vinculoEscolhido[metaMotoristaId];
    if (!motoristaId) return;
    setVinculando(metaMotoristaId);
    setSucesso(null);
    try {
      const resp = await fetch(`${API_URL}/api/metas/vincular-motorista`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metaMotoristaId, motoristaId }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error ?? 'Falha ao vincular');
      }
      setOrfas((atual) => atual.filter((o) => o.MetaMotoristaId !== metaMotoristaId));
      setSucesso('Motorista vinculado com sucesso.');
    } catch (error) {
      console.error('Erro ao vincular motorista:', error);
      setErro(error instanceof Error ? error.message : 'Falha ao vincular motorista.');
    } finally {
      setVinculando(null);
    }
  };

  const columns = [
    {
      header: 'Veículo',
      render: (l: MetaOrfa) => (
        <div>
          <p className="font-bold text-slate-800">{l.VeiculoModelo ?? l.CodigoConjunto ?? '—'}</p>
          <p className="text-xs text-slate-500">Placa {l.Placa ?? '—'} · {l.CodigoConjunto ?? '—'}</p>
        </div>
      ),
    },
    { header: 'Atividade', render: (l: MetaOrfa) => l.Atividade ?? '—' },
    {
      header: 'Meta (Km/L / CPK)',
      render: (l: MetaOrfa) => (
        <span className="font-mono text-slate-700">{l.MetaKmL ?? '—'} km/L · R$ {l.MetaCpk ?? '—'}/km</span>
      ),
    },
    {
      header: 'Vincular motorista',
      render: (l: MetaOrfa) => (
        <select
          value={vinculoEscolhido[l.MetaMotoristaId] ?? ''}
          onChange={(e) => setVinculoEscolhido((atual) => ({ ...atual, [l.MetaMotoristaId]: Number(e.target.value) }))}
          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium bg-slate-50 min-w-[200px]"
        >
          <option value="">Selecione o motorista</option>
          {motoristas.map((m) => (
            <option key={m.MotoristaId} value={m.MotoristaId}>{m.NomeCompleto}</option>
          ))}
        </select>
      ),
    },
    {
      header: '',
      render: (l: MetaOrfa) => (
        <button
          onClick={() => vincular(l.MetaMotoristaId)}
          disabled={!vinculoEscolhido[l.MetaMotoristaId] || vinculando === l.MetaMotoristaId}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Link2 size={13} /> {vinculando === l.MetaMotoristaId ? 'Vinculando...' : 'Vincular'}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Link2 size={22} className="text-green-600" /> Metas Órfãs
          </h2>
          <p className="text-slate-500 mt-1">{orfas.length} meta(s) sem motorista vinculado nesta competência (PRD §4.3).</p>
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
      {sucesso && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} /> {sucesso}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12"><Carregando /></div>
      ) : (
        <DataTable columns={columns} data={orfas} keyExtractor={(l) => `${l.MetaMotoristaId}`} emptyMessage="Nenhuma meta órfã nesta competência." />
      )}
    </div>
  );
};
