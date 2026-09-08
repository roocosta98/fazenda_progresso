import { useEffect, useMemo, useState } from 'react';
import { Fuel, Wrench, Shield, Users } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import { DashboardExecutivo } from './DashboardExecutivo';
import { useAuth } from '../../context/AuthContext';
import { cabecalhoPerfil } from '../../utils/apiAuth';

const API_URL = import.meta.env.VITE_API_URL ?? '';

interface LinhaGasto {
  EquipamentoId: number;
  CompetenciaMeta: string;
  CodigoEquipamento: string;
  NomeEquipamento: string;
  TipoEquipamento: string | null;
  Fazenda: string | null;
  GrupoFrente: string | null;
  CustoCombustivelMes: number | null;
  CustoPneusMes: number | null;
  CustoManutencaoMes: number | null;
  CustoSeguroMes: number | null;
  CustoOutrosMes: number | null;
  CustoFixoTotalMes: number | null;
  MotoristaNomeFicha: string | null;
  MotoristaNomeFolha: string | null;
  SalarioBase: number | null;
  EncargosPercentual: number | null;
  CustoMotoristaMes: number | null;
  CustoOperacionalTotalMes: number | null;
}

const formatMoeda = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? '—' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });



const CardTotal = ({ icon, label, valor }: { icon: React.ReactNode; label: string; valor: number }) => (
  <div className="bg-white rounded-2xl shadow-soft border border-slate-200/80 p-5 flex items-center gap-4">
    <div className="p-3 rounded-xl bg-green-50 text-green-600">{icon}</div>
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-slate-800">{formatMoeda(valor)}</p>
    </div>
  </div>
);

export const Gastos = () => {
  const { usuario } = useAuth();
  const [dataInicio, setDataInicio] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [tipoEquipamento, setTipoEquipamento] = useState('todos');
  const [linhas, setLinhas] = useState<LinhaGasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  const carregar = async () => {
    setLoading(true);
    setTrigger(prev => prev + 1);
    try {
      const resp = await fetch(`${API_URL}/api/gastos/resumo?dataInicio=${dataInicio}&dataFim=${dataFim}&tipoEquipamento=${tipoEquipamento}`, { headers: cabecalhoPerfil(usuario?.perfil) });
      if (!resp.ok) throw new Error('Falha ao consultar a API');
      setLinhas(await resp.json());
      setErro(null);
    } catch (error) {
      console.error('Erro ao buscar Gastos:', error);
      setErro('Não foi possível conectar ao banco de dados da fazenda (SQL Server). Verifique as variáveis MSSQL_* no Vercel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicio, dataFim, tipoEquipamento, usuario?.perfil]);

  const tiposEquipamento = useMemo(
    () => Array.from(new Set(linhas.map((l) => l.TipoEquipamento).filter(Boolean))) as string[],
    [linhas]
  );

  const filtradas = linhas.filter((l) => tipoEquipamento === 'todos' || l.TipoEquipamento === tipoEquipamento);

  const totais = filtradas.reduce(
    (acc, l) => ({
      combustivel: acc.combustivel + (l.CustoCombustivelMes ?? 0),
      manutencao: acc.manutencao + (l.CustoManutencaoMes ?? 0) + (l.CustoPneusMes ?? 0),
      fixoTotal: acc.fixoTotal + (l.CustoFixoTotalMes ?? 0),
      operacionalTotal: acc.operacionalTotal + (l.CustoOperacionalTotalMes ?? l.CustoFixoTotalMes ?? 0),
    }),
    { combustivel: 0, manutencao: 0, fixoTotal: 0, operacionalTotal: 0 }
  );

  const columns = [
    {
      header: 'Equipamento',
      render: (l: LinhaGasto) => (
        <div>
          <p className="font-bold text-slate-800">{l.NomeEquipamento}</p>
          <p className="text-xs text-slate-500">{l.CodigoEquipamento} · {l.TipoEquipamento ?? '—'} · {l.Fazenda ?? '—'}</p>
        </div>
      ),
    },
    {
      header: 'Combustível',
      align: 'right' as const,
      render: (l: LinhaGasto) => <span className="font-mono">{formatMoeda(l.CustoCombustivelMes)}</span>,
    },
    {
      header: 'Pneus + Manutenção',
      align: 'right' as const,
      render: (l: LinhaGasto) => <span className="font-mono">{formatMoeda((l.CustoPneusMes ?? 0) + (l.CustoManutencaoMes ?? 0))}</span>,
    },
    {
      header: 'Seguro + Outros',
      align: 'right' as const,
      render: (l: LinhaGasto) => <span className="font-mono">{formatMoeda((l.CustoSeguroMes ?? 0) + (l.CustoOutrosMes ?? 0))}</span>,
    },
    {
      header: 'Custo Logístico',
      align: 'right' as const,
      render: (l: LinhaGasto) => <span className="font-mono font-bold">{formatMoeda(l.CustoFixoTotalMes)}</span>,
    },
    {
      header: 'Motorista',
      render: (l: LinhaGasto) => (
        <div className="text-xs">
          <p className="font-bold text-slate-700">{l.MotoristaNomeFolha ?? l.MotoristaNomeFicha ?? 'Sem vínculo'}</p>
          {l.CustoMotoristaMes !== null && <p className="text-slate-500">Custo mês: {formatMoeda(l.CustoMotoristaMes)}</p>}
        </div>
      ),
    },
    {
      header: 'Custo Operacional Total',
      align: 'right' as const,
      render: (l: LinhaGasto) => (
        <span className="font-mono font-bold text-green-700">{formatMoeda(l.CustoOperacionalTotalMes ?? l.CustoFixoTotalMes)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Barra de Filtro Unificada no Topo */}
      <div className="bg-white p-4 rounded-2xl shadow-soft border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">DE</span>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ATÉ</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">EQUIPAMENTO</span>
            <select
              value={tipoEquipamento}
              onChange={(e) => setTipoEquipamento(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 min-w-[170px]"
            >
              <option value="todos">Todos os tipos</option>
              {tiposEquipamento.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      <DashboardExecutivo dataInicio={dataInicio} dataFim={dataFim} tipoEquipamento={tipoEquipamento} trigger={trigger} />

      <hr className="border-slate-200/60 my-6" />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">Detalhamento por equipamento e motorista</h3>
      </div>

      {erro && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{erro}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardTotal icon={<Fuel size={20} />} label="Combustível (Consumo)" valor={totais.combustivel} />
        <CardTotal icon={<Wrench size={20} />} label="Pneus + Manutenção" valor={totais.manutencao} />
        <CardTotal icon={<Shield size={20} />} label="Custo Fixo Total" valor={totais.fixoTotal} />
        <CardTotal icon={<Users size={20} />} label="Custo Operacional Total" valor={totais.operacionalTotal} />
      </div>



      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">Carregando...</div>
      ) : (
        <DataTable columns={columns} data={filtradas} keyExtractor={(l) => `${l.EquipamentoId}-${l.CompetenciaMeta}`} />
      )}
    </div>
  );
};
