import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line
} from 'recharts';
import { Filter } from 'lucide-react';

// --- Dados Mockados baseados no Print ---
const stats = {
  programacoes: 114,
  percAtendimento: '97%',
  canceladas: 3,
  percCancelamento: '3%',
  imediatas: 5,
  percImediatas: '4%',
  atrasos: 11,
  percAtrasos: '10%',
  mediaAtraso: '01:59:16',
  mediaEntrega: '02:41:47',
};

const progPorDia = [
  { dia: '1', qtde: 13 },
  { dia: '2', qtde: 2 },
  { dia: '3', qtde: 44 },
  { dia: '4', qtde: 55 },
];

const progPorHora = [
  { hora: '08:00', qtde: 2 }, { hora: '09:00', qtde: 10 }, { hora: '10:00', qtde: 5 }, { hora: '11:00', qtde: 25 },
  { hora: '12:00', qtde: 4 }, { hora: '13:00', qtde: 12 }, { hora: '14:00', qtde: 6 }, { hora: '15:00', qtde: 22 },
  { hora: '16:00', qtde: 8 }, { hora: '17:00', qtde: 15 }, { hora: '18:00', qtde: 3 }, { hora: '19:00', qtde: 8 },
  { hora: '20:00', qtde: 2 }, { hora: '21:00', qtde: 1 }, { hora: '22:00', qtde: 4 }, { hora: '23:00', qtde: 4 },
];

const progPorSolicitante = [
  { name: 'AUGUSTO DOURADO', qtde: 5 }, { name: 'ALEX JUNIOR MACHA...', qtde: 7 }, { name: 'WAGNER ROCHA LACE...', qtde: 8 },
  { name: 'DANIEL VIANA FERREI...', qtde: 8 }, { name: 'CLAUDIMAR SCHMIDT', qtde: 9 }, { name: 'ROMARIO DOMINGUE...', qtde: 10 },
  { name: 'CLAUDIO SOUZA RIBEI...', qtde: 14 }, { name: 'ANTONIO CARLOS SIL...', qtde: 23 },
];

const progPorMotorista = [
  { name: 'VALDINEI DA CRUZ CO...', qtde: 5 }, { name: 'PETRUQUE BARBOSA D...', qtde: 6 }, { name: 'JOAO BARBOSA DE CA...', qtde: 6 },
  { name: 'EVANGELISTA SILVA BA...', qtde: 6 }, { name: 'CLEIDOMAR LUZ ROCHA', qtde: 6 }, { name: 'ANTENOR ALVES DOS...', qtde: 7 },
  { name: 'CLEALDO LOPES DOS S...', qtde: 10 }, { name: 'ANTONIO SANTOS PER...', qtde: 14 },
];

const progPorAtividade = [
  { name: 'MILHO', qtde: 2 }, { name: 'PLANTIO', qtde: 4 }, { name: 'CAFÉ', qtde: 6 }, { name: 'ÁGUA', qtde: 12 },
  { name: 'FUNCIONÁRIOS', qtde: 17 }, { name: 'EQUIPAMENTOS', qtde: 18 }, { name: 'INSUMOS', qtde: 23 }, { name: 'COMBUSTÍVEL', qtde: 28 },
];

const atrasosPorAtividade = [
  { name: 'INSUMOS', qtde: 2 }, { name: 'FUNCIONÁRIOS', qtde: 2 }, { name: 'ÁGUA', qtde: 3 }, { name: 'EQUIPAMENTOS', qtde: 4 },
];

const atrasosPorMotorista = [
  { name: 'SANDOVAL SANTOS...', qtde: 1 }, { name: 'JOAO BARBOSA DE...', qtde: 1 }, { name: 'EUNAPIO MELO DA...', qtde: 1 },
  { name: 'CLEIDOMAR LUZ RO...', qtde: 1 }, { name: 'ALEX FERREIRA JAR...', qtde: 2 }, { name: 'ADILIO DOS SANTO...', qtde: 2 },
  { name: 'CLEBER SANTOS DE...', qtde: 3 },
];

const imediatasPorSolicitante = [
  { name: 'PAULO HENRIQUE...', qtde: 1 }, { name: 'EDNALDO NASCI...', qtde: 1 }, { name: 'DANIEL VIANA FE...', qtde: 1 },
  { name: 'CLAUDIO SOUZA...', qtde: 1 }, { name: 'ANTONIO EVALD...', qtde: 1 },
];

const cancelamentoPorSolicitante = [
  { name: 'ROMARIO DOMING...', qtde: 1 }, { name: 'ANTONIO CARLOS S...', qtde: 1 }, { name: 'ALEX FERREIRA JAR...', qtde: 1 },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 text-white rounded-lg p-3 text-xs shadow-xl border border-slate-700">
        <p className="font-semibold mb-1 text-slate-300">{label || payload[0].name}</p>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <span>Quantidade: <span className="font-bold text-emerald-400">{entry.value}</span></span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Componente utilitário para envolver os gráficos no padrão Premium
const ChartCard = ({ title, children, colSpan = "col-span-1" }: { title: string, children: React.ReactNode, colSpan?: string }) => (
  <div className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-200/60 flex flex-col ${colSpan}`}>
    <h3 className="text-[13px] font-bold text-slate-800 mb-4 px-1">{title}</h3>
    <div className="flex-1 w-full min-h-[200px]">
      {children}
    </div>
  </div>
);

export const DashboardBI = () => {
  const { veiculos, projetos } = useAppContext();

  // Filtros
  const [mesDia, setMesDia] = useState<string>('agosto');
  const [placaFiltro, setPlacaFiltro] = useState<string>('Todos');
  const [origemFiltro, setOrigemFiltro] = useState<string>('Todos');
  const [destinoFiltro, setDestinoFiltro] = useState<string>('Todos');
  const [projetoFiltro, setProjetoFiltro] = useState<string>('Todos');

  return (
    <div className="font-sans text-slate-800 p-4 h-full flex flex-col lg:flex-row gap-6 max-w-[1800px] mx-auto bg-slate-50/50">
      
      {/* 1. Barra Lateral de Filtros (Esquerda) */}
      <div className="w-full lg:w-64 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 flex flex-col gap-6">
        <div className="flex items-center gap-2 text-slate-800 mb-2 border-b border-slate-100 pb-3">
          <Filter size={18} className="text-emerald-600" />
          <h2 className="font-bold text-sm">Filtros do Painel</h2>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-600">Mês, Dia</label>
          <select value={mesDia} onChange={e => setMesDia(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all">
            <option value="agosto">agosto</option>
            <option value="julho">julho</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-600">Placa</label>
          <select value={placaFiltro} onChange={e => setPlacaFiltro(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all">
            <option>Todos</option>
            {veiculos.map(v => <option key={v.id}>{v.placa}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-600">Origem</label>
          <select value={origemFiltro} onChange={e => setOrigemFiltro(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all">
            <option>Todos</option>
            <option>Sede Central</option>
            <option>Galpão Insumos</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-600">Destino</label>
          <select value={destinoFiltro} onChange={e => setDestinoFiltro(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all">
            <option>Todos</option>
            <option>Pivô 04</option>
            <option>Campo de Batata</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-600">Projeto</label>
          <select value={projetoFiltro} onChange={e => setProjetoFiltro(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all">
            <option>Todos</option>
            {projetos.map(p => <option key={p.id}>{p.nome}</option>)}
          </select>
        </div>
      </div>

      {/* 2. Área Principal (KPIs e Gráficos) */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Bloco Superior: 10 KPIs Lineares */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 mb-6">
          <div className="grid grid-cols-5 xl:grid-cols-10 gap-y-6 gap-x-2 text-center divide-x divide-slate-100">
            
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-slate-500 mb-1.5">Programações</span>
              <span className="text-2xl font-black text-slate-900">{stats.programacoes}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-slate-500 mb-1.5">% Atendimento</span>
              <span className="text-2xl font-black text-slate-900">{stats.percAtendimento}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-slate-500 mb-1.5">Canceladas</span>
              <span className="text-2xl font-black text-slate-900">{stats.canceladas}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-slate-500 mb-1.5">% Cancelamento</span>
              <span className="text-2xl font-black text-slate-900">{stats.percCancelamento}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-slate-500 mb-1.5">Imediatas</span>
              <span className="text-2xl font-black text-slate-900">{stats.imediatas}</span>
            </div>
            <div className="flex flex-col xl:border-l xl:border-slate-100">
              <span className="text-[10px] font-semibold text-slate-500 mb-1.5">% Imediatas</span>
              <span className="text-2xl font-black text-slate-900">{stats.percImediatas}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-slate-500 mb-1.5">Atrasos</span>
              <span className="text-2xl font-black text-slate-900">{stats.atrasos}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-slate-500 mb-1.5">% Atrasos</span>
              <span className="text-2xl font-black text-slate-900">{stats.percAtrasos}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-slate-500 mb-1.5">Média de Atraso</span>
              <span className="text-xl mt-1 font-bold text-slate-900">{stats.mediaAtraso}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-slate-500 mb-1.5">Média de Entrega</span>
              <span className="text-xl mt-1 font-bold text-slate-900">{stats.mediaEntrega}</span>
            </div>

          </div>
        </div>

        {/* 3. Grid de Gráficos (3 Linhas) */}
        <div className="flex flex-col gap-6">
          
          {/* Linha 1: Evolução Temporal */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartCard title="Programações por Dia">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progPorDia} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area type="stepAfter" dataKey="qtde" stroke="#1e40af" strokeWidth={2} fill="#93c5fd" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Programações por Hora">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progPorHora} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} ticks={['11:00', '17:00', '23:00']} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="qtde" stroke="#1e40af" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 6, fill: '#1e40af', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Linha 2: Volume Geral */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartCard title="Programações por Solicitante">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progPorSolicitante} layout="vertical" margin={{ top: 0, right: 25, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#475569' }} width={120} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="qtde" fill="#1e40af" radius={[0, 4, 4, 0]} barSize={16}>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Programações por Motorista">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progPorMotorista} layout="vertical" margin={{ top: 0, right: 25, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#475569' }} width={120} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="qtde" fill="#1e40af" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Programações por Atividade">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progPorAtividade} layout="vertical" margin={{ top: 0, right: 25, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#475569' }} width={90} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="qtde" fill="#1e40af" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Linha 3: Anomalias e Exceções */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <ChartCard title="Atrasos por Atividade">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={atrasosPorAtividade} layout="vertical" margin={{ top: 0, right: 25, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#475569' }} width={80} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="qtde" fill="#1e40af" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Atrasos por Motorista">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={atrasosPorMotorista} layout="vertical" margin={{ top: 0, right: 25, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#475569' }} width={110} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="qtde" fill="#1e40af" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="P. Imediatas por Solicitante">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={imediatasPorSolicitante} layout="vertical" margin={{ top: 0, right: 25, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#475569' }} width={110} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="qtde" fill="#1e40af" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Cancelamento por Solicitante">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cancelamentoPorSolicitante} layout="vertical" margin={{ top: 0, right: 25, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#475569' }} width={110} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="qtde" fill="#1e40af" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

        </div>
      </div>
    </div>
  );
};
