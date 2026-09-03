import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL ?? '';

// Interface para Equipamentos vindos do banco
interface EquipamentoItem {
  EquipamentoId: number;
  CodigoEquipamento: string;
  Nome: string;
  Operador?: string | null;
  Fazenda?: string | null;
  GrupoFrente?: string | null;
}

interface OperadorItem {
  OperadorId: number;
  Nome: string;
}

// Dados padrão da referência para quando não houver dados do período no banco
const DADOS_GRAFICO_DIARIO = [
  { dia: '20/Aug', previsto: 8800, realizado: 8200, status: 'dentro' },
  { dia: '21/Aug', previsto: 9200, realizado: 8900, status: 'dentro' },
  { dia: '22/Aug', previsto: 9000, realizado: 10400, status: 'acima' },
  { dia: '23/Aug', previsto: 8500, realizado: 7800, status: 'dentro' },
  { dia: '24/Aug', previsto: 9100, realizado: 8500, status: 'dentro' },
  { dia: '25/Aug', previsto: 9300, realizado: 10800, status: 'acima' },
  { dia: '26/Aug', previsto: 8900, realizado: 8400, status: 'dentro' },
  { dia: '27/Aug', previsto: 9200, realizado: 8600, status: 'dentro' },
  { dia: '28/Aug', previsto: 9400, realizado: 12100, status: 'acima' },
  { dia: '29/Aug', previsto: 8800, realizado: 8200, status: 'dentro' },
  { dia: '30/Aug', previsto: 9000, realizado: 8500, status: 'dentro' },
  { dia: '31/Aug', previsto: 9300, realizado: 11200, status: 'acima' },
  { dia: '01/Sep', previsto: 8700, realizado: 8300, status: 'dentro' },
  { dia: '02/Sep', previsto: 9100, realizado: 8600, status: 'dentro' },
];

const DADOS_MOTIVOS_PARADA = [
  { motivo: 'Manutenção Não Prog', minutos: 420, cor: '#ef4444' },
  { motivo: 'Aguardando Transbordo', minutos: 280, cor: '#f97316' },
  { motivo: 'Refeição/Descanso', minutos: 180, cor: '#3b82f6' },
  { motivo: 'Troca de Turno', minutos: 90, cor: '#3b82f6' },
];

const DADOS_USO_MOTOR = [
  { name: 'Motor Produtivo (Operação)', value: 78, color: '#10b981' },
  { name: 'Motor Ocioso (Parado)', value: 22, color: '#ef4444' },
];

export const PainelMetasDiario: React.FC = () => {
  // Filtros de cabeçalho
  const [dataDe, setDataDe] = useState('2026-08-20');
  const [dataAte, setDataAte] = useState('2026-09-02');
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<string>('todos');
  const [motoristaSelecionado, setMotoristaSelecionado] = useState<string>('todos');

  // Listas de seleção carregadas do banco de dados real
  const [veiculosLista, setVeiculosLista] = useState<EquipamentoItem[]>([]);
  const [motoristasLista, setMotoristasLista] = useState<OperadorItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados de dados dinâmicos da API
  const [dadosGraficoDiario, setDadosGraficoDiario] = useState<any[]>(DADOS_GRAFICO_DIARIO);
  const [dadosBalanco, setDadosBalanco] = useState<any[]>([]);
  const [dadosMotivos, setDadosMotivos] = useState<any[]>(DADOS_MOTIVOS_PARADA);
  const [dadosUsoMotor, setDadosUsoMotor] = useState<any[]>(DADOS_USO_MOTOR);
  const [gastos, setGastos] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>(null);

  // Estados de expansão dos acordeões
  const [expandManutencao, setExpandManutencao] = useState(true);
  const [expandTransbordo, setExpandTransbordo] = useState(false);
  const [expandTempoOcioso, setExpandTempoOcioso] = useState(true);
  const [expandGastos, setExpandGastos] = useState<Record<number, boolean>>({
    1: true,
    2: false,
    3: false,
  });
  const [expandInsight1, setExpandInsight1] = useState(true);
  const [expandInsight2, setExpandInsight2] = useState(false);

  // Busca veículos, motoristas e métricas do backend
  const carregarDados = async () => {
    try {
      setLoading(true);
      const [respEq, respOp] = await Promise.all([
        fetch(`${API_URL}/api/frota/equipamentos`).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_URL}/api/frota/operadores`).then((r) => (r.ok ? r.json() : [])),
      ]);
      setVeiculosLista(respEq ?? []);
      setMotoristasLista(respOp ?? []);

      // Monta query string
      const qsParams = new URLSearchParams();
      qsParams.append('dataInicio', dataDe);
      qsParams.append('dataFim', dataAte);
      if (veiculoSelecionado !== 'todos') qsParams.append('equipamentoId', veiculoSelecionado);
      if (motoristaSelecionado !== 'todos') qsParams.append('motorista', motoristaSelecionado);
      const qs = `?${qsParams.toString()}`;

      // Tenta buscar os dados se a API responder corretamente
      try {
        const [respDiario, respMotivos, respMotor, respExec, respGastos] = await Promise.all([
          fetch(`${API_URL}/api/metas/diario${qs}&modo=diario`),
          fetch(`${API_URL}/api/metas/diario${qs}&modo=motivos`),
          fetch(`${API_URL}/api/metas/diario${qs}&modo=motor`),
          fetch(`${API_URL}/api/metas/diario${qs}&modo=executivo`),
          fetch(`${API_URL}/api/gastos/resumo${qs}`)
        ]);

        if (respDiario.ok) {
          const json = await respDiario.json();
          if (json.porVeiculo && json.porVeiculo.length > 0) {
            // Agrupar dados por dia (somando todos os veículos no mesmo dia)
            const dadosPorDia: Record<string, { dataOriginal: string, previsto: number, realizado: number }> = {};
            
            json.porVeiculo.forEach((v: any) => {
              if (!v.Dia) return;
              const diaReal = v.Dia.split('T')[0];
              if (!dadosPorDia[diaReal]) {
                dadosPorDia[diaReal] = { dataOriginal: diaReal, previsto: 0, realizado: 0 };
              }
              dadosPorDia[diaReal].previsto += (v.CustoEsperadoDia ?? 0);
              dadosPorDia[diaReal].realizado += (v.CustoOperacionalRealDia ?? 0);
            });

            const graficoDiario = Object.values(dadosPorDia)
              .sort((a, b) => a.dataOriginal.localeCompare(b.dataOriginal))
              .map(v => {
                const [yyyy, mm, dd] = v.dataOriginal.split('-');
                const dateObj = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
                return {
                  dia: dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
                  previsto: v.previsto,
                  realizado: v.realizado,
                  status: v.realizado <= v.previsto ? 'dentro' : 'acima'
                };
              });

            setDadosGraficoDiario(graficoDiario);

            // Calcular Balanço Financeiro (Lucro vs Prejuízo) por Veículo
            const saldoPorVeiculo: Record<number, number> = {};
            json.porVeiculo.forEach((v: any) => {
              const id = v.EquipamentoId;
              const previsto = v.CustoEsperadoDia ?? 0;
              const realizado = v.CustoOperacionalRealDia ?? 0;
              if (id) {
                if (!saldoPorVeiculo[id]) saldoPorVeiculo[id] = 0;
                saldoPorVeiculo[id] += (previsto - realizado);
              }
            });

            const balancoData = Object.entries(saldoPorVeiculo).map(([idStr, saldo]) => {
              const eqId = Number(idStr);
              // Busca nome na lista carregada, se não achar usa 'Veículo ' + id
              const nome = respEq?.find((e: any) => e.EquipamentoId === eqId)?.Nome || `Veículo ${eqId}`;
              return {
                nome: nome.split(' ')[0] + ' ' + (nome.split(' ')[1] || ''), // Nome abreviado
                saldo: saldo
              };
            });
            // Ordenar para mostrar os maiores lucros primeiro
            balancoData.sort((a, b) => b.saldo - a.saldo);
            setDadosBalanco(balancoData);
          }
        }
        
        if (respMotivos.ok) {
          const json = await respMotivos.json();
          if (json.length > 0) {
            const cores = ['#ef4444', '#f97316', '#3b82f6', '#10b981'];
            setDadosMotivos(json.map((v: any, i: number) => ({
              motivo: v.MotivoParada ?? 'Outros',
              minutos: v.MinutosAproximados ?? 0,
              cor: cores[i % cores.length]
            })));
          }
        }

        if (respMotor.ok) {
          const json = await respMotor.json();
          if (json.length > 0) {
            const total = json.reduce((acc: number, v: any) => acc + (v.MinutosAproximados ?? 0), 0);
            if (total > 0) {
              setDadosUsoMotor([
                { name: 'Produtivo', value: Math.round((json[0]?.MinutosProdutivos ?? 0) / total * 100), color: '#10b981' },
                { name: 'Ocioso', value: Math.round((json[0]?.MinutosOciosos ?? 0) / total * 100), color: '#ef4444' }
              ]);
            }
          }
        }

        if (respExec.ok) {
          setKpis(await respExec.json());
        }

        if (respGastos.ok) {
          setGastos(await respGastos.json());
        }

      } catch (e) {
        console.warn('As rotas de meta diária ainda não estão 100% integradas. Mantendo dados simulados nos gráficos.', e);
      }

    } catch (e) {
      console.error('Erro ao carregar veículos/motoristas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const toggleGasto = (id: number) => {
    setExpandGastos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAtualizar = () => {
    carregarDados();
  };

  // Cálculo dos totais para os 6 KPIs Superiores
  const totalCombustivel = gastos.reduce((acc, g) => acc + (g.CustoCombustivelMes ?? 0), 0);
  const totalManutencao = gastos.reduce((acc, g) => acc + (g.CustoManutencaoMes ?? 0) + (g.CustoPneusMes ?? 0), 0);
  const totalFixo = gastos.reduce((acc, g) => acc + (g.CustoFixoTotalMes ?? 0), 0);
  const totalOperacional = gastos.reduce((acc, g) => acc + (g.CustoOperacionalTotalMes ?? g.CustoFixoTotalMes ?? 0), 0);
  
  const diasTotal = dadosGraficoDiario.length;
  const diasDentro = dadosGraficoDiario.filter(d => d.status === 'dentro').length;
  const porcentagemDentro = diasTotal > 0 ? ((diasDentro / diasTotal) * 100).toFixed(1) : '0.0';

  const formatMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-5 pb-12 font-sans text-slate-800">
      {/* 1. Barra de Filtros no Topo */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Campo DE */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">DE</span>
            <div className="relative">
              <input
                type="date"
                value={dataDe}
                onChange={(e) => setDataDe(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 text-slate-700"
              />
            </div>
          </div>

          {/* Campo ATÉ */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ATÉ</span>
            <div className="relative">
              <input
                type="date"
                value={dataAte}
                onChange={(e) => setDataAte(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 text-slate-700"
              />
            </div>
          </div>

          {/* Seletor de VEÍCULO */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">VEÍCULO</span>
            <select
              value={veiculoSelecionado}
              onChange={(e) => setVeiculoSelecionado(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 text-slate-700 min-w-[170px]"
            >
              <option value="todos">Todos os Veículos</option>
              {veiculosLista.length > 0 ? (
                veiculosLista.map((v) => (
                  <option key={v.EquipamentoId} value={String(v.EquipamentoId)}>
                    {v.Nome} ({v.CodigoEquipamento})
                  </option>
                ))
              ) : (
                <>
                  <option value="1">Volkswagen 32.380</option>
                  <option value="2">Mercedes-Benz Atego 2429</option>
                  <option value="3">Volvo FMX 500</option>
                </>
              )}
            </select>
          </div>

          {/* Seletor de MOTORISTA */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">MOTORISTA</span>
            <select
              value={motoristaSelecionado}
              onChange={(e) => setMotoristaSelecionado(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 text-slate-700 min-w-[170px]"
            >
              <option value="todos">Todos os Motoristas</option>
              {motoristasLista.length > 0 ? (
                motoristasLista.map((m) => (
                  <option key={m.OperadorId} value={m.Nome}>
                    {m.Nome}
                  </option>
                ))
              ) : (
                <>
                  <option value="Tiago">Tiago</option>
                  <option value="Maurício">Maurício</option>
                  <option value="Denilson">Denilson</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Botão Atualizar */}
        <button
          onClick={handleAtualizar}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* 2. Top 6 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1 */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Combustível + Consumo
          </span>
          <div className="my-1.5">
            <span className="text-xl font-black text-slate-900 tracking-tight">{formatMoeda(totalCombustivel)}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Gasto no período filtrado</span>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Pneus + Manutenção
          </span>
          <div className="my-1.5">
            <span className="text-xl font-black text-slate-900 tracking-tight">{formatMoeda(totalManutencao)}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Gasto no período filtrado</span>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Custo Fixo Total
          </span>
          <div className="my-1.5">
            <span className="text-xl font-black text-slate-900 tracking-tight">{formatMoeda(totalFixo)}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Depreciação + Seguro + Adm</span>
        </div>

        {/* Card 4 (Destaque Custo Operacional) */}
        <div className="bg-emerald-50/50 p-3.5 rounded-2xl border-2 border-emerald-500/40 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            Custo Operacional Total
          </span>
          <div className="my-1.5">
            <span className="text-xl font-black text-emerald-700 tracking-tight">{formatMoeda(totalOperacional)}</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">Somatório da operação direta</span>
        </div>

        {/* Card 5 */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Dias Dentro da Meta
          </span>
          <div className="my-1.5">
            <span className="text-xl font-black text-slate-900 tracking-tight">{diasDentro} / {diasTotal}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">{porcentagemDentro}% de conformidade</span>
        </div>

        {/* Card 6 */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Alarmes em Aberto (24h)
          </span>
          <div className="my-1.5">
            <span className="text-xl font-black text-rose-600 tracking-tight">{kpis?.alarmes24h ?? 0}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Registrados no sistema hoje</span>
        </div>
      </div>

      {/* 3. Gráfico Principal: Acompanhamento Diário: Meta Previsto vs Realizado */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <h3 className="text-sm font-bold text-slate-900">
            Acompanhamento Diário: Meta Previsto vs Realizado
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 inline-block" />
              <span className="text-slate-500 text-[11px]">Previsto</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block" />
              <span className="text-slate-700 text-[11px] font-medium">Dentro da Meta</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
              <span className="text-slate-700 text-[11px] font-medium">Acima da Meta</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGraficoDiario} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="dia" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis
                domain={[0, 14000]}
                ticks={[0, 2000, 4000, 6000, 8000, 10000, 12000, 14000]}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={(v) => (v === 0 ? '0' : `${v}`)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  fontSize: '11px',
                }}
                formatter={(val: unknown, name: unknown) => [
                  `R$ ${Number(val ?? 0).toLocaleString('pt-BR')}`,
                  String(name) === 'previsto' ? 'Previsto' : 'Realizado',
                ]}
              />
              <Bar dataKey="previsto" name="previsto" fill="#e2e8f0" radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar dataKey="realizado" name="realizado" radius={[3, 3, 0, 0]} maxBarSize={16}>
                {dadosGraficoDiario.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.status === 'acima' ? '#ef4444' : '#3b82f6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3.1 Gráfico de Balanço Financeiro (Lucro vs Prejuízo) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <h3 className="text-sm font-bold text-slate-900">
            Balanço Financeiro (Economia vs Excesso de Custo)
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
              <span className="text-slate-700 text-[11px] font-medium">Lucro (Economia)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
              <span className="text-slate-700 text-[11px] font-medium">Prejuízo (Excedeu Meta)</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosBalanco.length > 0 ? dadosBalanco : [{ nome: 'Nenhum dado', saldo: 0 }]} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="nome" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={(v) => (v === 0 ? '0' : `${v}`)}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  fontSize: '11px',
                }}
                formatter={(val: unknown) => [
                  `R$ ${Number(val ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  Number(val) >= 0 ? 'Lucro/Economia' : 'Prejuízo/Excesso',
                ]}
              />
              <Bar dataKey="saldo" radius={[3, 3, 3, 3]} maxBarSize={32}>
                {dadosBalanco.map((entry, index) => (
                  <Cell
                    key={`cell-balanco-${index}`}
                    fill={entry.saldo >= 0 ? '#10b981' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Grid de Motivos de Parada e Uso do Motor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Coluna 1: Principais Motivos de Parada */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Principais Motivos de Parada (Minutos)
            </h3>

            {/* Gráfico de Barras Horizontais */}
            <div className="space-y-2.5 mb-5">
              {dadosMotivos.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 font-medium">{item.motivo}</span>
                    <span className="font-bold text-slate-800">{item.minutos} min</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${(item.minutos / 450) * 100}%`,
                        backgroundColor: item.cor,
                      }}
                    />
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-[9px] text-slate-400 pt-1">
                <span>0</span>
                <span>50</span>
                <span>100</span>
                <span>150</span>
                <span>200</span>
                <span>250</span>
                <span>300</span>
                <span>350</span>
                <span>400</span>
                <span>450</span>
              </div>
            </div>

            {/* Acordeões de Ocorrências */}
            <div className="space-y-2.5">
              {/* Acordeão 1: Manutenção Não Programada */}
              <div className="border border-slate-200/80 rounded-xl overflow-hidden text-xs">
                <button
                  onClick={() => setExpandManutencao(!expandManutencao)}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-slate-800 font-semibold transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Manutenção Não Programada (420 min)</span>
                  </div>
                  {expandManutencao ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
                {expandManutencao && (
                  <div className="p-3 bg-white space-y-1.5 text-slate-600 border-t border-slate-100">
                    <p className="font-bold text-slate-700 mb-1 text-[11px]">Ocorrências registradas:</p>
                    <p>• 22/08 - VW 32.380: Troca de mangueira hidráulica (210 min)</p>
                    <p>• 28/08 - MB Atego 2429: Reparo em sistema elétrico (210 min)</p>
                  </div>
                )}
              </div>

              {/* Acordeão 2: Aguardando Transbordo */}
              <div className="border border-slate-200/80 rounded-xl overflow-hidden text-xs">
                <button
                  onClick={() => setExpandTransbordo(!expandTransbordo)}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-slate-800 font-semibold transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <span>Aguardando Transbordo (280 min)</span>
                  </div>
                  {expandTransbordo ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
                {expandTransbordo && (
                  <div className="p-3 bg-white space-y-1.5 text-slate-600 border-t border-slate-100">
                    <p className="font-bold text-slate-700 mb-1 text-[11px]">Ocorrências registradas:</p>
                    <p>• 25/08 - Volvo FMX 500: Gargalo na moega do Talhão 4 (160 min)</p>
                    <p>• 30/08 - VW 32.380: Fila no transbordo central (120 min)</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Coluna 2: Uso do Motor: Produtivo vs Ocioso */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              Uso do Motor: Produtivo vs Ocioso
            </h3>

            <div className="h-52 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosUsoMotor}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {dadosUsoMotor.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [`${val}%`, 'Tempo']} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="square"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Detalhamento do Tempo Ocioso */}
            <div className="border border-slate-200/80 rounded-xl overflow-hidden text-xs mt-3">
              <button
                onClick={() => setExpandTempoOcioso(!expandTempoOcioso)}
                className="w-full p-3 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-slate-800 font-semibold transition-colors"
              >
                <span>Ver Detalhamento do Tempo Ocioso</span>
                {expandTempoOcioso ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
              {expandTempoOcioso && (
                <div className="p-3 bg-white space-y-1.5 text-slate-600 border-t border-slate-100">
                  <p className="font-semibold text-slate-800">
                    Total de tempo ocioso: <span className="text-rose-600 font-bold">48 Horas</span> (22% do tempo total ligado)
                  </p>
                  <p className="text-slate-500">
                    Impacto financeiro estimado: <span className="font-bold text-slate-800">~R$ 4.320,00</span> em combustível desperdiçado no período.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Tabela: Gastos por Equipamento */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Gastos por Equipamento</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                <th className="pb-3">Equipamento</th>
                <th className="pb-3">Combustível</th>
                <th className="pb-3">Manutenção</th>
                <th className="pb-3">Custo Total</th>
                <th className="pb-3 text-emerald-700 font-bold">Custo Operacional</th>
                <th className="pb-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gastos.map((gasto) => {
                const isExpanded = expandGastos[gasto.id];
                return (
                  <React.Fragment key={gasto.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-semibold text-slate-800">{gasto.equipamento}</td>
                      <td className="py-3 text-slate-600">{gasto.combustivel}</td>
                      <td className="py-3 text-slate-600">{gasto.manutencao}</td>
                      <td className="py-3 font-bold text-slate-800">{gasto.custoTotal}</td>
                      <td className="py-3 font-bold text-emerald-700">{gasto.custoOperacional}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => toggleGasto(gasto.id)}
                          className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-500 transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="bg-slate-50/70 p-4 border-y border-slate-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs space-y-1">
                              <p className="font-bold text-slate-800 text-[11px] mb-1">
                                Detalhamento Mensal/Período
                              </p>
                              <p className="text-slate-600">• Seguro Proporcional: {gasto.detalhes.seguro}</p>
                              <p className="text-slate-600">• Pneus: {gasto.detalhes.pneus}</p>
                              <p className="text-slate-600">• Arla 32: {gasto.detalhes.arla}</p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs space-y-1">
                              <p className="font-bold text-slate-800 text-[11px] mb-1">
                                Média Diária Operacional
                              </p>
                              <p className="text-slate-600">• Custo por Dia: {gasto.detalhes.custoDia}</p>
                              <p className="text-slate-600">• Média Consumo: {gasto.detalhes.consumoMedio}</p>
                              <p className="text-slate-600">• Horas Trabalhadas/Dia: {gasto.detalhes.horasTrabalhadas}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Seção: Insights da Inteligência Artificial */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-amber-500" />
          Insights da Inteligência Artificial
        </h3>

        {/* Card 1: Consumo excessivo */}
        <div className="border border-slate-200/80 rounded-2xl p-4 space-y-3 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-700">
                  ALTA
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700">
                  GASTOS
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Consumo excessivo de combustível em marcha lenta
                </h4>
                <p className="text-[11px] text-slate-500">
                  O veículo Volkswagen 32.380 apresentou 18h de motor ocioso nos últimos 4 dias.
                </p>
              </div>
            </div>
            <button
              onClick={() => setExpandInsight1(!expandInsight1)}
              className="p-1 text-slate-400 hover:text-slate-600 self-end sm:self-auto"
            >
              {expandInsight1 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {expandInsight1 && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
              <p className="font-bold text-slate-900 text-[11px]">Diagnóstico Detalhado & Ação Recomendada:</p>
              <p className="text-slate-600 leading-relaxed">
                Identificado padrão de ar-condicionado ligado durante intervalos de transbordo no Talhão 2 pelo motorista Tiago. Recomendação: Orientar o motorista ou redefinir a rota de suporte para reduzir o tempo de espera no ponto de descarga.
              </p>
            </div>
          )}
        </div>

        {/* Card 2: Desvio de pressão */}
        <div className="border border-slate-200/80 rounded-2xl p-4 space-y-3 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800">
                  MÉDIA
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800">
                  ALARMES
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Desvio de pressão de pneus detectado
                </h4>
                <p className="text-[11px] text-slate-500">
                  O veículo Volvo FMX 500 rodou 34km com o pneu traseiro esquerdo 15% abaixo da calibragem ideal.
                </p>
              </div>
            </div>
            <button
              onClick={() => setExpandInsight2(!expandInsight2)}
              className="p-1 text-slate-400 hover:text-slate-600 self-end sm:self-auto"
            >
              {expandInsight2 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {expandInsight2 && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
              <p className="font-bold text-slate-900 text-[11px]">Diagnóstico Detalhado & Ação Recomendada:</p>
              <p className="text-slate-600 leading-relaxed">
                Risco de desgaste prematuro da banda de rodagem ou sobreaquecimento do pneu. Recomendado agendar checagem do sensor de pressão/válvula na próxima parada da borracharia interna.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
