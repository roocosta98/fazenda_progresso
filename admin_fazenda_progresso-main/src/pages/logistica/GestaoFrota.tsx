import { useEffect, useState } from 'react';
import { Search, Truck, User, Tag, RefreshCw } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';

const API_URL = import.meta.env.VITE_API_URL ?? '';

interface Equipamento {
  EquipamentoId: number;
  CodigoEquipamento: string;
  Nome: string;
  TipoEquipamento: string | null;
  GrupoFrente: string | null;
  Fazenda: string | null;
  CriadoEm: string;
  AtualizadoEm: string;
}

interface Operador {
  OperadorId: number;
  CodigoOrigem: string;
  Nome: string;
  CriadoEm: string;
  AtualizadoEm: string;
}

const formatData = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
};

export const GestaoFrota = () => {
  const [activeTab, setActiveTab] = useState<'veiculos' | 'operadores'>('veiculos');
  const [busca, setBusca] = useState('');
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const [respEquipamentos, respOperadores] = await Promise.all([
        fetch(`${API_URL}/api/frota/equipamentos`),
        fetch(`${API_URL}/api/frota/operadores`),
      ]);
      if (!respEquipamentos.ok || !respOperadores.ok) {
        throw new Error('Falha ao consultar a API');
      }
      setEquipamentos(await respEquipamentos.json());
      setOperadores(await respOperadores.json());
      setErro(null);
    } catch (error) {
      console.error('Erro ao buscar Equipamentos/Operadores:', error);
      setErro('Não foi possível conectar ao banco de dados da fazenda (SQL Server). Verifique as variáveis MSSQL_* no Vercel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const filteredEquipamentos = equipamentos.filter((eq) =>
    eq.Nome.toLowerCase().includes(busca.toLowerCase()) ||
    eq.CodigoEquipamento.toLowerCase().includes(busca.toLowerCase())
  );

  const filteredOperadores = operadores.filter((op) =>
    op.Nome.toLowerCase().includes(busca.toLowerCase())
  );

  const columnsEquipamentos = [
    {
      header: 'Identificação',
      render: (eq: Equipamento) => (
        <div>
          <p className="font-bold text-slate-800">{eq.Nome}</p>
          <p className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded mt-1 inline-block border border-slate-200">{eq.CodigoEquipamento}</p>
        </div>
      ),
    },
    {
      header: 'Tipo',
      render: (eq: Equipamento) => (
        <span className="flex items-center text-slate-600 font-medium">
          <Truck size={14} className="mr-2 text-slate-400" /> {eq.TipoEquipamento ?? '—'}
        </span>
      ),
    },
    {
      header: 'Grupo de Frente',
      render: (eq: Equipamento) => <span className="text-slate-600 font-medium">{eq.GrupoFrente ?? '—'}</span>,
    },
    {
      header: 'Fazenda',
      render: (eq: Equipamento) => <span className="text-slate-600 font-medium">{eq.Fazenda ?? '—'}</span>,
    },
  ];

  const columnsOperadores = [
    {
      header: 'Operador',
      render: (op: Operador) => (
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 font-bold mr-3 shadow-sm">
            {op.Nome.charAt(0)}
          </div>
          <p className="font-bold text-slate-800">{op.Nome}</p>
        </div>
      ),
    },
    {
      header: 'Código',
      render: (op: Operador) => (
        <span className="flex items-center font-mono text-slate-600 font-medium">
          <Tag size={13} className="mr-1.5 text-slate-400" /> {op.CodigoOrigem}
        </span>
      ),
    },
    {
      header: 'Cadastrado em',
      render: (op: Operador) => <span className="text-slate-500 font-medium">{formatData(op.CriadoEm)}</span>,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão de Frota e Operadores</h2>
          <p className="text-slate-500 mt-1">Equipamentos e operadores cadastrados no banco de dados da fazenda.</p>
        </div>
        <button
          onClick={carregar}
          className="inline-flex items-center px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm"
        >
          <RefreshCw size={16} className="mr-2" />
          Atualizar
        </button>
      </div>

      {erro && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{erro}</div>
      )}

      <div className="bg-white p-2 rounded-2xl shadow-soft border border-slate-200/80 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab('veiculos')}
            className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'veiculos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Veículos ({equipamentos.length})
          </button>
          <button
            onClick={() => setActiveTab('operadores')}
            className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'operadores' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Operadores ({operadores.length})
          </button>
        </div>

        <div className="relative w-full md:w-96 px-4">
          <div className="absolute inset-y-0 left-0 pl-7 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400" />
          </div>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={activeTab === 'veiculos' ? 'Buscar código ou nome...' : 'Buscar nome...'}
            className="block w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50 text-sm font-medium transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 flex items-center justify-center gap-2">
          <User size={16} className="animate-pulse" /> Carregando...
        </div>
      ) : activeTab === 'veiculos' ? (
        <DataTable columns={columnsEquipamentos} data={filteredEquipamentos} keyExtractor={(eq) => String(eq.EquipamentoId)} />
      ) : (
        <DataTable columns={columnsOperadores} data={filteredOperadores} keyExtractor={(op) => String(op.OperadorId)} />
      )}
    </div>
  );
};
