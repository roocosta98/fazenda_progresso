import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Trophy, Fuel, Gauge, Medal, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DataTable } from '../../components/common/DataTable';

const API_URL = import.meta.env.VITE_API_URL ?? '';

interface LinhaPainelMetas {
  EquipamentoId: number;
  CodigoEquipamento: string;
  NomeEquipamento: string;
  Fazenda: string | null;
  GrupoFrente: string | null;
  TipoEquipamento: string | null;
  CompetenciaMeta: string;
  MotoristaNomeFicha: string | null;
  Atividade: string | null;
  KmLHistorico: number | null;
  MetaKmL: number | null;
  KmLFuturo: number | null;
  CpkHistorico: number | null;
  MetaCpk: number | null;
  CpkFuturo: number | null;
  MetaIec: number | null;
  MetaIco: number | null;
  ReconhecimentoMensal: number | null;
  CustoOperacionalTotalMes: number | null;
  KmLRealizado: number | null;
  CpkRealizado: number | null;
  MetaOrfa: boolean;
}

const formatNumero = (valor: number | null | undefined, casas = 2) =>
  valor === null || valor === undefined ? '—' : valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

const formatMoeda = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? '—' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Progresso: Km/L maior é melhor, CPK menor é melhor (PRD 4.1) — normaliza os dois pro mesmo
// sentido "% da meta atingido" pra dar pra comparar/ordenar ranking de forma justa.
const percentualMeta = (realizado: number | null, meta: number | null, kmLMaiorMelhor: boolean) => {
  if (realizado === null || meta === null || meta === 0) return null;
  return kmLMaiorMelhor ? (realizado / meta) * 100 : (meta / realizado) * 100;
};

const competenciaAtual = () => {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
};

export const PainelMetas = () => {
  const [activeTab, setActiveTab] = useState<'painel' | 'ranking'>('painel');
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [atividade, setAtividade] = useState('todas');
  const [tipoEquipamento, setTipoEquipamento] = useState('todos');
  const [ocultarOrfas, setOcultarOrfas] = useState(true);
  const [linhas, setLinhas] = useState<LinhaPainelMetas[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}/api/metas/painel?competencia=${competencia}`);
      if (!resp.ok) throw new Error('Falha ao consultar a API');
      setLinhas(await resp.json());
      setErro(null);
    } catch (error) {
      console.error('Erro ao buscar Painel de Metas:', error);
      setErro('Não foi possível conectar ao banco de dados da fazenda (SQL Server). Verifique as variáveis MSSQL_* no Vercel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competencia]);

  const atividades = useMemo(
    () => Array.from(new Set(linhas.map((l) => l.Atividade).filter(Boolean))) as string[],
    [linhas]
  );
  const tiposEquipamento = useMemo(
    () => Array.from(new Set(linhas.map((l) => l.TipoEquipamento).filter(Boolean))) as string[],
    [linhas]
  );

  const filtradas = linhas.filter((l) => {
    if (ocultarOrfas && l.MetaOrfa) return false;
    if (atividade !== 'todas' && l.Atividade !== atividade) return false;
    if (tipoEquipamento !== 'todos' && l.TipoEquipamento !== tipoEquipamento) return false;
    return true;
  });

  const comProgresso = filtradas.map((l) => {
    const percKmL = percentualMeta(l.KmLRealizado, l.MetaKmL, true);
    const percCpk = percentualMeta(l.CpkRealizado, l.MetaCpk, false);
    const percentuais = [percKmL, percCpk].filter((v): v is number => v !== null);
    const percentualMedio = percentuais.length ? percentuais.reduce((a, b) => a + b, 0) / percentuais.length : null;
    return { ...l, percKmL, percCpk, percentualMedio };
  });

  const ranking = [...comProgresso]
    .sort((a, b) => (b.percentualMedio ?? -1) - (a.percentualMedio ?? -1))
    .map((l, idx) => ({ ...l, posicao: idx + 1 }));

  // Fechamento automático do Reconhecimento Mensal (melhoria pedida pelo Rodrigo): gera a
  // planilha direto no navegador a partir do que já está carregado na tela — sem endpoint novo —
  // pronta pra RH/financeiro fechar a folha de bonificação sem redigitar nada.
  const exportarXlsx = () => {
    const linhas = filtradas.map((l) => ({
      Motorista: l.MotoristaNomeFicha ?? 'Sem motorista vinculado',
      Atividade: l.Atividade ?? '—',
      Competência: l.CompetenciaMeta,
      'Km/L Histórico': l.KmLHistorico,
      'Km/L Meta': l.MetaKmL,
      'Km/L Futuro': l.KmLFuturo,
      'Km/L Realizado': l.KmLRealizado,
      'CPK Histórico': l.CpkHistorico,
      'CPK Meta': l.MetaCpk,
      'CPK Futuro': l.CpkFuturo,
      'CPK Realizado': l.CpkRealizado,
      'Reconhecimento Mensal (R$)': l.ReconhecimentoMensal,
    }));
    const planilha = XLSX.utils.json_to_sheet(linhas);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, 'Reconhecimento Mensal');
    XLSX.writeFile(livro, `reconhecimento-mensal-${competencia}.xlsx`);
  };

  const columns = [
    {
      header: 'Motorista / Atividade',
      render: (l: LinhaPainelMetas) => (
        <div>
          <p className="font-bold text-slate-800">{l.MotoristaNomeFicha ?? 'Sem motorista vinculado'}</p>
          <p className="text-xs text-slate-500">{l.Atividade ?? '—'} · {l.NomeEquipamento} ({l.CodigoEquipamento})</p>
        </div>
      ),
    },
    {
      header: 'Km/L (Hist. → Meta → Futuro)',
      render: (l: LinhaPainelMetas) => (
        <span className="font-mono text-slate-700">
          {formatNumero(l.KmLHistorico)} → <b>{formatNumero(l.MetaKmL)}</b> → {formatNumero(l.KmLFuturo)}
        </span>
      ),
    },
    {
      header: 'CPK (Hist. → Meta → Futuro)',
      render: (l: LinhaPainelMetas) => (
        <span className="font-mono text-slate-700">
          {formatMoeda(l.CpkHistorico)} → <b>{formatMoeda(l.MetaCpk)}</b> → {formatMoeda(l.CpkFuturo)}
        </span>
      ),
    },
    {
      header: 'Realizado no mês',
      render: (l: LinhaPainelMetas) => (
        <div className="text-xs space-y-0.5">
          <p className="flex items-center gap-1"><Fuel size={12} className="text-green-500" /> Km/L: <b>{formatNumero(l.KmLRealizado)}</b></p>
          <p className="flex items-center gap-1"><Gauge size={12} className="text-amber-500" /> CPK: <b>{formatMoeda(l.CpkRealizado)}</b></p>
        </div>
      ),
    },
    {
      header: 'Reconhecimento',
      align: 'right' as const,
      render: (l: LinhaPainelMetas) => <span className="font-bold text-green-700">{formatMoeda(l.ReconhecimentoMensal)}</span>,
    },
  ];

  type LinhaRanking = LinhaPainelMetas & { percentualMedio: number | null; posicao: number };

  const columnsRanking = [
    {
      header: '#',
      align: 'center' as const,
      render: (l: LinhaRanking) => <span className="font-mono font-bold text-slate-500">{l.posicao}</span>,
    },
    {
      header: 'Motorista',
      render: (l: LinhaRanking) => (
        <div className="flex items-center gap-2">
          {l.posicao === 1 && <Trophy size={16} className="text-amber-500" />}
          {(l.posicao === 2 || l.posicao === 3) && <Medal size={16} className="text-slate-400" />}
          <div>
            <p className="font-bold text-slate-800">{l.MotoristaNomeFicha ?? 'Sem motorista vinculado'}</p>
            <p className="text-xs text-slate-500">{l.Atividade ?? '—'}</p>
          </div>
        </div>
      ),
    },
    {
      header: '% da meta (Km/L + CPK)',
      render: (l: LinhaRanking) => (
        <span className="font-mono font-bold text-slate-800">{l.percentualMedio !== null ? `${formatNumero(l.percentualMedio, 0)}%` : '—'}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Programa Motorista de Excelência</h2>
          <p className="text-slate-500 mt-1">Metas, resultado do mês e ranking — dado ao vivo de vw_PainelMotoristaVeiculo.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportarXlsx}
            disabled={filtradas.length === 0}
            className="inline-flex items-center px-4 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-xl font-bold hover:bg-green-100 transition-colors text-sm disabled:opacity-50"
          >
            <FileSpreadsheet size={16} className="mr-2" />
            Exportar planilha
          </button>
          <button
            onClick={carregar}
            className="inline-flex items-center px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm"
          >
            <RefreshCw size={16} className="mr-2" />
            Atualizar
          </button>
        </div>
      </div>

      {erro && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{erro}</div>
      )}

      <div className="bg-white p-2 rounded-2xl shadow-soft border border-slate-200/80 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab('painel')}
            className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'painel' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Painel ({filtradas.length})
          </button>
          <button
            onClick={() => setActiveTab('ranking')}
            className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'ranking' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Ranking / Pódio
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-2">
          <input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium bg-slate-50"
          />
          <select
            value={atividade}
            onChange={(e) => setAtividade(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium bg-slate-50"
          >
            <option value="todas">Todas as atividades</option>
            {atividades.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={tipoEquipamento}
            onChange={(e) => setTipoEquipamento(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium bg-slate-50"
          >
            <option value="todos">Todos os equipamentos</option>
            {tiposEquipamento.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <input type="checkbox" checked={ocultarOrfas} onChange={(e) => setOcultarOrfas(e.target.checked)} />
            Ocultar metas sem motorista vinculado
          </label>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">Carregando...</div>
      ) : activeTab === 'painel' ? (
        <DataTable columns={columns} data={filtradas} keyExtractor={(l) => `${l.EquipamentoId}-${l.CompetenciaMeta}`} />
      ) : (
        <DataTable
          columns={columnsRanking}
          data={ranking}
          keyExtractor={(l) => `${l.EquipamentoId}-${l.CompetenciaMeta}`}
        />
      )}
    </div>
  );
};
