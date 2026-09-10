import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Boxes,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  TrendingDown,
  TrendingUp,
  Download,
  Search,
  Filter,
  Layers,
  ArrowUpDown,
  RefreshCw,
  X,
  ShoppingCart,
  ShieldAlert,
  Archive,
  BarChart3,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import type { ItemGiroEstoque, StatusEstoque } from '../../types/estoque';
import { MOCK_GIRO_ESTOQUE } from '../../mock/estoqueMock';

const API_URL = import.meta.env.VITE_API_URL ?? '';

const formatMoeda = (val: number | null | undefined) =>
  val === null || val === undefined
    ? 'R$ 0,00'
    : val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatNumero = (val: number | null | undefined, dec = 0) =>
  val === null || val === undefined
    ? '0'
    : val.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const CORES_STATUS: Record<StatusEstoque, { bg: string; text: string; border: string; hex: string }> = {
  'RUPTURA / ZERADO': { bg: 'bg-rose-950/40', text: 'text-rose-400', border: 'border-rose-800/60', hex: '#f43f5e' },
  'ABAIXO DO MÍNIMO': { bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-800/60', hex: '#f59e0b' },
  'NORMAL': { bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-800/60', hex: '#10b981' },
  'EXCESSO / ACIMA DO MÁXIMO': { bg: 'bg-purple-950/40', text: 'text-purple-400', border: 'border-purple-800/60', hex: '#a855f7' },
  'SEM GIRO / PARADO': { bg: 'bg-slate-800/50', text: 'text-slate-400', border: 'border-slate-700/60', hex: '#64748b' },
};

export const GiroEstoque = () => {
  const [diasFiltro, setDiasFiltro] = useState<number>(90);
  const [itens, setItens] = useState<ItemGiroEstoque[]>(MOCK_GIRO_ESTOQUE);
  const [loading, setLoading] = useState<boolean>(false);
  const [busca, setBusca] = useState<string>('');
  const [statusFiltro, setStatusFiltro] = useState<string>('todos');
  const [grupoFiltro, setGrupoFiltro] = useState<string>('todos');
  const [ordenacao, setOrdenacao] = useState<'consumoValor' | 'giro' | 'cobertura' | 'estoque'>('consumoValor');
  const [ordemDesc, setOrdemDesc] = useState<boolean>(true);
  const [itemSelecionado, setItemSelecionado] = useState<ItemGiroEstoque | null>(null);

  // Carregar dados da API ou fallback para Mock
  const carregarDados = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}/api/estoque/giro?dias=${diasFiltro}`);
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          setItens(data);
          setLoading(false);
          return;
        }
      }
      // Se a API falhar ou não tiver registros, usa os dados do mock
      setItens(MOCK_GIRO_ESTOQUE);
    } catch (err) {
      console.warn('Usando dados simulados de estoque (SQL Server offline):', err);
      setItens(MOCK_GIRO_ESTOQUE);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diasFiltro]);

  // Extrair grupos únicos para o dropdown
  const grupos = useMemo(() => {
    const map = new Map<number, string>();
    itens.forEach((it) => {
      if (it.CODGRUPOPROD && it.DESCRGRUPOPROD) {
        map.set(it.CODGRUPOPROD, it.DESCRGRUPOPROD);
      }
    });
    return Array.from(map.entries()).map(([codigo, nome]) => ({ codigo, nome }));
  }, [itens]);

  // Itens filtrados e ordenados
  const itensFiltrados = useMemo(() => {
    return itens
      .filter((it) => {
        const matchBusca =
          busca === '' ||
          it.DESCRPROD.toLowerCase().includes(busca.toLowerCase()) ||
          it.CODPROD.toString().includes(busca) ||
          (it.MARCA && it.MARCA.toLowerCase().includes(busca.toLowerCase()));

        const matchStatus = statusFiltro === 'todos' || it.STATUS_ESTOQUE === statusFiltro;
        const matchGrupo = grupoFiltro === 'todos' || it.CODGRUPOPROD.toString() === grupoFiltro;

        return matchBusca && matchStatus && matchGrupo;
      })
      .sort((a, b) => {
        let diff = 0;
        if (ordenacao === 'consumoValor') {
          diff = a.VLR_CONSUMO - b.VLR_CONSUMO;
        } else if (ordenacao === 'giro') {
          diff = a.GIRO_ESTOQUE - b.GIRO_ESTOQUE;
        } else if (ordenacao === 'cobertura') {
          const cobA = a.DIAS_COBERTURA ?? 9999;
          const cobB = b.DIAS_COBERTURA ?? 9999;
          diff = cobA - cobB;
        } else if (ordenacao === 'estoque') {
          diff = a.ESTOQUE_ATUAL - b.ESTOQUE_ATUAL;
        }
        return ordemDesc ? -diff : diff;
      });
  }, [itens, busca, statusFiltro, grupoFiltro, ordenacao, ordemDesc]);

  // KPIs Totais
  const kpis = useMemo(() => {
    const totalItens = itens.length;
    let valorConsumoTotal = 0;
    let valorComprasTotal = 0;
    let valorEstoqueAtual = 0;
    let somaGiro = 0;
    let itensComEstoque = 0;
    let itensRuptura = 0;
    let itensAbaixoMinimo = 0;
    let itensExcesso = 0;
    let itensSemGiro = 0;
    let capitalParado = 0;

    itens.forEach((it) => {
      valorConsumoTotal += it.VLR_CONSUMO;
      valorComprasTotal += it.VLR_COMPRAS_LIQUIDA;
      const custo = it.CUSTO_MEDIO || (it.VLR_CONSUMO && it.QTD_CONSUMO ? it.VLR_CONSUMO / it.QTD_CONSUMO : 0);
      valorEstoqueAtual += it.ESTOQUE_ATUAL * custo;

      if (it.ESTOQUE_ATUAL > 0) {
        somaGiro += it.GIRO_ESTOQUE;
        itensComEstoque++;
      }

      if (it.STATUS_ESTOQUE === 'RUPTURA / ZERADO') itensRuptura++;
      if (it.STATUS_ESTOQUE === 'ABAIXO DO MÍNIMO') itensAbaixoMinimo++;
      if (it.STATUS_ESTOQUE === 'EXCESSO / ACIMA DO MÁXIMO') itensExcesso++;
      if (it.STATUS_ESTOQUE === 'SEM GIRO / PARADO') {
        itensSemGiro++;
        capitalParado += it.ESTOQUE_ATUAL * custo;
      }
    });

    const giroMedio = itensComEstoque > 0 ? somaGiro / itensComEstoque : 0;

    return {
      totalItens,
      valorConsumoTotal,
      valorComprasTotal,
      valorEstoqueAtual,
      giroMedio,
      itensRuptura,
      itensAbaixoMinimo,
      itensExcesso,
      itensSemGiro,
      capitalParado,
    };
  }, [itens]);

  // Dados para o Gráfico Curva ABC (Top 7 itens por valor consumido)
  const dadosTopConsumo = useMemo(() => {
    return [...itens]
      .sort((a, b) => b.VLR_CONSUMO - a.VLR_CONSUMO)
      .slice(0, 7)
      .map((it) => ({
        nome: it.DESCRPROD.length > 22 ? it.DESCRPROD.substring(0, 20) + '...' : it.DESCRPROD,
        valor: it.VLR_CONSUMO,
        giro: it.GIRO_ESTOQUE,
        descricaoCompleta: it.DESCRPROD,
      }));
  }, [itens]);

  // Dados para o Gráfico Donut de Status
  const dadosStatusDonut = useMemo(() => {
    const contagem: Record<StatusEstoque, number> = {
      'RUPTURA / ZERADO': 0,
      'ABAIXO DO MÍNIMO': 0,
      'NORMAL': 0,
      'EXCESSO / ACIMA DO MÁXIMO': 0,
      'SEM GIRO / PARADO': 0,
    };

    itens.forEach((it) => {
      contagem[it.STATUS_ESTOQUE] = (contagem[it.STATUS_ESTOQUE] || 0) + 1;
    });

    return (Object.keys(contagem) as StatusEstoque[])
      .filter((k) => contagem[k] > 0)
      .map((k) => ({
        name: k,
        value: contagem[k],
        color: CORES_STATUS[k].hex,
      }));
  }, [itens]);

  // Exportar Excel
  const exportarExcel = () => {
    const dadosExportacao = itensFiltrados.map((it) => ({
      'Código Produto': it.CODPROD,
      'Descrição': it.DESCRPROD,
      'Marca': it.MARCA,
      'Grupo': it.DESCRGRUPOPROD,
      'Estoque Atual': it.ESTOQUE_ATUAL,
      'Estoque Mínimo': it.ESTMIN,
      'Estoque Máximo': it.ESTMAX,
      'Consumo (Qtd)': it.QTD_CONSUMO,
      'Consumo (R$)': it.VLR_CONSUMO,
      'Compras Líquidas (Qtd)': it.QTD_COMPRAS_LIQUIDA,
      'Compras Líquidas (R$)': it.VLR_COMPRAS_LIQUIDA,
      'Giro de Estoque': it.GIRO_ESTOQUE,
      'Consumo Médio Diário': it.CONSUMO_MEDIO_DIARIO,
      'Dias de Cobertura': it.DIAS_COBERTURA !== null ? it.DIAS_COBERTURA : 'Sem Consumo',
      'Status': it.STATUS_ESTOQUE,
      'Ranking Valor Consumo': it.RANKING_VALOR_CONSUMO,
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExportacao);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Giro de Estoque');
    XLSX.writeFile(wb, `giro-estoque-fazenda-progresso-${diasFiltro}d.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1800px] mx-auto text-slate-200">
      {/* 1. Header do Painel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#102219] p-5 rounded-2xl border border-[#1e382b] shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#183426] border border-[#2b5840] flex items-center justify-center text-emerald-400 shadow-inner">
            <Boxes size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-800/60">
                Supply Chain & Peças
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar size={13} /> Base Sankhya ERP
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight mt-0.5">
              Jornada de Giro & Cobertura de Estoque
            </h1>
          </div>
        </div>

        {/* Controles de Período e Exportação */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-[#152a20] rounded-xl p-1 border border-[#224433]">
            {[
              { label: '30 dias', dias: 30 },
              { label: '60 dias', dias: 60 },
              { label: '90 dias', dias: 90 },
              { label: '180 dias', dias: 180 },
            ].map((p) => (
              <button
                key={p.dias}
                onClick={() => setDiasFiltro(p.dias)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  diasFiltro === p.dias
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={carregarDados}
            disabled={loading}
            title="Atualizar Dados"
            className="p-2.5 rounded-xl bg-[#152a20] hover:bg-[#1c382b] border border-[#224433] text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-emerald-400' : ''} />
          </button>

          <button
            onClick={exportarExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-semibold border border-emerald-500/40 shadow-md transition-all active:scale-95"
          >
            <Download size={15} />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Top KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Consumo Total */}
        <div className="bg-[#102219] p-4 rounded-xl border border-[#1e382b] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              Consumo no Período
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xl font-extrabold text-white tracking-tight">
              {formatMoeda(kpis.valorConsumoTotal)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              Compras líq: <span className="text-slate-300 font-medium">{formatMoeda(kpis.valorComprasTotal)}</span>
            </p>
          </div>
        </div>

        {/* Card 2: Giro Médio */}
        <div className="bg-[#102219] p-4 rounded-xl border border-[#1e382b] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              Giro Médio (Vezes)
            </span>
            <span className="p-1.5 rounded-lg bg-sky-950/80 text-sky-400 border border-sky-800/40">
              <BarChart3 size={16} />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <p className="text-xl font-extrabold text-white tracking-tight">
                {formatNumero(kpis.giroMedio, 2)}x
              </p>
              <span className="text-xs font-semibold text-sky-400">no ciclo de {diasFiltro}d</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {kpis.totalItens} produtos monitorados
            </p>
          </div>
        </div>

        {/* Card 3: Rupturas Críticas */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
          kpis.itensRuptura > 0
            ? 'bg-rose-950/30 border-rose-800/60 shadow-lg shadow-rose-950/20'
            : 'bg-[#102219] border-[#1e382b]'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-300 uppercase tracking-wide">
              Rupturas (Zerados)
            </span>
            <span className="p-1.5 rounded-lg bg-rose-950 text-rose-400 border border-rose-800/80 animate-pulse">
              <AlertOctagon size={16} />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-extrabold text-rose-400 tracking-tight">
                {kpis.itensRuptura} {kpis.itensRuptura === 1 ? 'item' : 'itens'}
              </p>
            </div>
            <p className="text-[11px] text-rose-300/80 mt-1">
              Estoque zerado com histórico de demanda
            </p>
          </div>
        </div>

        {/* Card 4: Abaixo do Mínimo */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
          kpis.itensAbaixoMinimo > 0
            ? 'bg-amber-950/30 border-amber-800/60'
            : 'bg-[#102219] border-[#1e382b]'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wide">
              Abaixo do Mínimo
            </span>
            <span className="p-1.5 rounded-lg bg-amber-950 text-amber-400 border border-amber-800/80">
              <AlertTriangle size={16} />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xl font-extrabold text-amber-400 tracking-tight">
              {kpis.itensAbaixoMinimo} {kpis.itensAbaixoMinimo === 1 ? 'item' : 'itens'}
            </p>
            <p className="text-[11px] text-amber-300/80 mt-1">
              Ponto de reposição imediata acionado
            </p>
          </div>
        </div>

        {/* Card 5: Capital Parado */}
        <div className="bg-[#102219] p-4 rounded-xl border border-[#1e382b] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              Capital Parado / Sem Giro
            </span>
            <span className="p-1.5 rounded-lg bg-slate-900 text-slate-400 border border-slate-700">
              <Archive size={16} />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xl font-extrabold text-slate-300 tracking-tight">
              {formatMoeda(kpis.capitalParado)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {kpis.itensSemGiro} itens sem consumo no período
            </p>
          </div>
        </div>
      </div>

      {/* 3. Gráficos Analíticos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Gráfico Curva ABC: Top 7 Produtos por Valor Consumido */}
        <div className="lg:col-span-2 bg-[#102219] p-5 rounded-2xl border border-[#1e382b] shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 size={16} className="text-emerald-400" />
                Curva ABC — Top Produtos por Valor Consumido (R$)
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Itens mais representativos no custo de manutenção e consumo da fazenda
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
              Top 7
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dadosTopConsumo}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1b3628" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                />
                <YAxis
                  dataKey="nome"
                  type="category"
                  stroke="#94a3b8"
                  fontSize={11}
                  width={140}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0b1611] text-white p-3 rounded-xl border border-[#234232] shadow-2xl text-xs space-y-1">
                          <p className="font-bold text-emerald-400">{data.descricaoCompleta}</p>
                          <p className="text-slate-300">
                            Valor Consumido: <span className="font-semibold text-white">{formatMoeda(data.valor)}</span>
                          </p>
                          <p className="text-slate-300">
                            Giro: <span className="font-semibold text-sky-400">{formatNumero(data.giro, 2)}x</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Donut: Distribuição do Diagnóstico de Estoque */}
        <div className="bg-[#102219] p-5 rounded-2xl border border-[#1e382b] shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert size={16} className="text-emerald-400" />
                Diagnóstico de Estoque
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              Distribuição dos itens monitorados por nível de risco e giro
            </p>
          </div>

          <div className="h-52 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosStatusDonut}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {dadosStatusDonut.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const entry = payload[0];
                      return (
                        <div className="bg-[#0b1611] text-white px-3 py-2 rounded-lg border border-[#234232] text-xs">
                          <span className="font-semibold text-slate-200">{entry.name}: </span>
                          <span className="font-bold text-emerald-400">{entry.value} itens</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-[10px] text-slate-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Filtros e Ações da Tabela */}
      <div className="bg-[#102219] p-4 rounded-2xl border border-[#1e382b] shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Campo de Busca */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por código, produto ou marca..."
            className="w-full bg-[#152a20] border border-[#234332] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Dropdowns de Filtro */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Filtro por Grupo */}
          <div className="flex items-center gap-1.5 bg-[#152a20] px-3 py-1.5 rounded-xl border border-[#234332]">
            <Layers size={14} className="text-slate-400" />
            <select
              value={grupoFiltro}
              onChange={(e) => setGrupoFiltro(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer"
            >
              <option value="todos" className="bg-[#102219]">Todos os Grupos</option>
              {grupos.map((g) => (
                <option key={g.codigo} value={g.codigo.toString()} className="bg-[#102219]">
                  {g.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Status */}
          <div className="flex items-center gap-1.5 bg-[#152a20] px-3 py-1.5 rounded-xl border border-[#234332]">
            <Filter size={14} className="text-slate-400" />
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer"
            >
              <option value="todos" className="bg-[#102219]">Todos os Status</option>
              <option value="RUPTURA / ZERADO" className="bg-[#102219]">Ruptura (Zerado)</option>
              <option value="ABAIXO DO MÍNIMO" className="bg-[#102219]">Abaixo do Mínimo</option>
              <option value="NORMAL" className="bg-[#102219]">Normal</option>
              <option value="EXCESSO / ACIMA DO MÁXIMO" className="bg-[#102219]">Excesso</option>
              <option value="SEM GIRO / PARADO" className="bg-[#102219]">Sem Giro (Parado)</option>
            </select>
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-1.5 bg-[#152a20] px-3 py-1.5 rounded-xl border border-[#234332]">
            <ArrowUpDown size={14} className="text-slate-400" />
            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer"
            >
              <option value="consumoValor" className="bg-[#102219]">Maior Valor Consumo</option>
              <option value="giro" className="bg-[#102219]">Maior Giro</option>
              <option value="cobertura" className="bg-[#102219]">Menor Cobertura (Dias)</option>
              <option value="estoque" className="bg-[#102219]">Estoque Atual</option>
            </select>
            <button
              onClick={() => setOrdemDesc(!ordemDesc)}
              title={ordemDesc ? 'Decrescente' : 'Crescente'}
              className="ml-1 text-slate-400 hover:text-white"
            >
              {ordemDesc ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* 5. Tabela Analítica de Giro de Estoque */}
      <div className="bg-[#102219] rounded-2xl border border-[#1e382b] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0b1611]/80 border-b border-[#1b3628] text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Produto / Marca</th>
                <th className="py-3 px-4">Grupo</th>
                <th className="py-3 px-4 text-center">Nível de Estoque</th>
                <th className="py-3 px-4 text-right">Consumo ({diasFiltro}d)</th>
                <th className="py-3 px-4 text-center">Giro</th>
                <th className="py-3 px-4 text-center">Cobertura</th>
                <th className="py-3 px-4 text-center">Status / Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172d22]">
              {itensFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    Nenhum item encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                itensFiltrados.map((it) => {
                  const cores = CORES_STATUS[it.STATUS_ESTOQUE];
                  const percEstoque = it.ESTMAX > 0 ? Math.min(100, Math.round((it.ESTOQUE_ATUAL / it.ESTMAX) * 100)) : 50;

                  return (
                    <tr
                      key={it.CODPROD}
                      onClick={() => setItemSelecionado(it)}
                      className="hover:bg-[#152a20]/70 cursor-pointer transition-colors"
                    >
                      {/* Ranking */}
                      <td className="py-3.5 px-4">
                        <span className="w-6 h-6 rounded-full bg-[#183124] border border-[#274c39] flex items-center justify-center font-bold text-[10px] text-slate-300">
                          {it.RANKING_VALOR_CONSUMO}
                        </span>
                      </td>

                      {/* Produto & Marca */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-white tracking-tight leading-snug">
                          {it.DESCRPROD}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                          <span>Cód: <strong className="text-slate-300">{it.CODPROD}</strong></span>
                          <span>•</span>
                          <span>Marca: <strong className="text-emerald-400">{it.MARCA || '—'}</strong></span>
                        </div>
                      </td>

                      {/* Grupo */}
                      <td className="py-3.5 px-4 text-slate-300 font-medium max-w-[180px] truncate">
                        {it.DESCRGRUPOPROD}
                      </td>

                      {/* Nível de Estoque (Atual vs Min vs Max) */}
                      <td className="py-3.5 px-4 text-center min-w-[160px]">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-bold text-white">{it.ESTOQUE_ATUAL} {it.UNIDADE || 'UN'}</span>
                          <span className="text-slate-400 text-[10px]">
                            Mín: {it.ESTMIN} | Máx: {it.ESTMAX}
                          </span>
                        </div>
                        {/* Barra de Progresso do Nível */}
                        <div className="w-full bg-[#0d1a14] h-1.5 rounded-full overflow-hidden border border-[#223f30]">
                          <div
                            className={`h-full rounded-full transition-all ${
                              it.STATUS_ESTOQUE === 'RUPTURA / ZERADO'
                                ? 'bg-rose-500 w-0'
                                : it.STATUS_ESTOQUE === 'ABAIXO DO MÍNIMO'
                                ? 'bg-amber-500'
                                : it.STATUS_ESTOQUE === 'EXCESSO / ACIMA DO MÁXIMO'
                                ? 'bg-purple-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(4, percEstoque)}%` }}
                          />
                        </div>
                      </td>

                      {/* Consumo */}
                      <td className="py-3.5 px-4 text-right">
                        <p className="font-bold text-white">{formatMoeda(it.VLR_CONSUMO)}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                          {formatNumero(it.QTD_CONSUMO)} {it.UNIDADE || 'UN'}
                        </p>
                      </td>

                      {/* Giro */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                          it.GIRO_ESTOQUE >= 3
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                            : it.GIRO_ESTOQUE >= 1
                            ? 'bg-sky-950/80 text-sky-300 border-sky-800/60'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}>
                          {formatNumero(it.GIRO_ESTOQUE, 2)}x
                        </span>
                      </td>

                      {/* Cobertura */}
                      <td className="py-3.5 px-4 text-center">
                        {it.DIAS_COBERTURA !== null ? (
                          <div className="flex flex-col items-center">
                            <span className={`font-bold ${
                              it.DIAS_COBERTURA <= 15
                                ? 'text-rose-400'
                                : it.DIAS_COBERTURA <= 30
                                ? 'text-amber-400'
                                : 'text-slate-200'
                            }`}>
                              {formatNumero(it.DIAS_COBERTURA, 1)} dias
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({formatNumero(it.CONSUMO_MEDIO_DIARIO, 2)}/dia)
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-medium">Sem Giro</span>
                        )}
                      </td>

                      {/* Status & Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${cores.bg} ${cores.text} ${cores.border}`}
                        >
                          {it.STATUS_ESTOQUE === 'RUPTURA / ZERADO' && <AlertOctagon size={12} />}
                          {it.STATUS_ESTOQUE === 'ABAIXO DO MÍNIMO' && <AlertTriangle size={12} />}
                          {it.STATUS_ESTOQUE === 'NORMAL' && <CheckCircle2 size={12} />}
                          {it.STATUS_ESTOQUE === 'EXCESSO / ACIMA DO MÁXIMO' && <TrendingUp size={12} />}
                          {it.STATUS_ESTOQUE === 'SEM GIRO / PARADO' && <Clock size={12} />}
                          <span>{it.STATUS_ESTOQUE}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé Informativo */}
        <div className="bg-[#0b1611]/80 px-4 py-3 border-t border-[#1b3628] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400">
          <span>
            Mostrando <strong className="text-slate-200">{itensFiltrados.length}</strong> de{' '}
            <strong className="text-slate-200">{itens.length}</strong> produtos cadastrados.
          </span>
          <span className="text-[11px] text-slate-500 mt-1 sm:mt-0">
            Clique em qualquer linha para abrir a simulação de reposição e detalhes do item.
          </span>
        </div>
      </div>

      {/* 6. Modal de Detalhes do Produto & Sugestão de Reposição */}
      {itemSelecionado && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#102219] border border-[#234232] w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in duration-150 text-slate-200">
            {/* Fechar */}
            <button
              onClick={() => setItemSelecionado(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#162d22] transition-colors"
            >
              <X size={20} />
            </button>

            {/* Cabeçalho do Modal */}
            <div className="flex items-start gap-3.5 pr-8">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
                <Boxes size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300">
                    Cód: {itemSelecionado.CODPROD}
                  </span>
                  <span className="text-xs text-slate-400">Marca: {itemSelecionado.MARCA || '—'}</span>
                </div>
                <h3 className="text-base font-bold text-white mt-1 leading-snug">
                  {itemSelecionado.DESCRPROD}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{itemSelecionado.DESCRGRUPOPROD}</p>
              </div>
            </div>

            {/* Status Atual */}
            <div className="mt-5 p-3 rounded-xl bg-[#0b1611] border border-[#1b3628] flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Classificação Atual:</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${CORES_STATUS[itemSelecionado.STATUS_ESTOQUE].bg} ${CORES_STATUS[itemSelecionado.STATUS_ESTOQUE].text} ${CORES_STATUS[itemSelecionado.STATUS_ESTOQUE].border}`}
              >
                {itemSelecionado.STATUS_ESTOQUE}
              </span>
            </div>

            {/* Grids de Dados e Indicadores */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-center">
              <div className="bg-[#152a20] p-3 rounded-xl border border-[#234332]">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Estoque Atual</p>
                <p className="text-lg font-bold text-white mt-0.5">{itemSelecionado.ESTOQUE_ATUAL}</p>
                <p className="text-[10px] text-slate-400">Mín: {itemSelecionado.ESTMIN} | Máx: {itemSelecionado.ESTMAX}</p>
              </div>
              <div className="bg-[#152a20] p-3 rounded-xl border border-[#234332]">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Consumo ({diasFiltro}d)</p>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">{formatNumero(itemSelecionado.QTD_CONSUMO)}</p>
                <p className="text-[10px] text-slate-400">{formatMoeda(itemSelecionado.VLR_CONSUMO)}</p>
              </div>
              <div className="bg-[#152a20] p-3 rounded-xl border border-[#234332]">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Giro de Estoque</p>
                <p className="text-lg font-bold text-sky-400 mt-0.5">{formatNumero(itemSelecionado.GIRO_ESTOQUE, 2)}x</p>
                <p className="text-[10px] text-slate-400">Giro no período</p>
              </div>
              <div className="bg-[#152a20] p-3 rounded-xl border border-[#234332]">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Dias Cobertura</p>
                <p className="text-lg font-bold text-amber-400 mt-0.5">
                  {itemSelecionado.DIAS_COBERTURA !== null ? `${formatNumero(itemSelecionado.DIAS_COBERTURA, 1)}d` : '—'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {formatNumero(itemSelecionado.CONSUMO_MEDIO_DIARIO, 2)} unid/dia
                </p>
              </div>
            </div>

            {/* Sugestão de Reposição / Compra */}
            <div className="mt-5 p-4 rounded-xl bg-[#13271d] border border-[#234734] flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/60 shrink-0">
                <ShoppingCart size={20} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Recomendação de Compra & Reposição
                </h4>
                {itemSelecionado.STATUS_ESTOQUE === 'RUPTURA / ZERADO' ? (
                  <p className="text-xs text-rose-300 mt-1">
                    <strong>Alerta de Ruptura Crítica:</strong> Item zerado com demanda ativa.
                    Recomenda-se emissão de pedido imediato de no mínimo{' '}
                    <strong>{Math.max(itemSelecionado.ESTMAX, itemSelecionado.ESTMIN * 2)} {itemSelecionado.UNIDADE || 'unidades'}</strong> para restabelecer o estoque de segurança.
                  </p>
                ) : itemSelecionado.STATUS_ESTOQUE === 'ABAIXO DO MÍNIMO' ? (
                  <p className="text-xs text-amber-300 mt-1">
                    <strong>Ponto de Pedido Atingido:</strong> O estoque atual ({itemSelecionado.ESTOQUE_ATUAL}) está abaixo do mínimo ({itemSelecionado.ESTMIN}).
                    Sugestão de compra de reposição:{' '}
                    <strong>{Math.max(0, itemSelecionado.ESTMAX - itemSelecionado.ESTOQUE_ATUAL)} {itemSelecionado.UNIDADE || 'unidades'}</strong> (para atingir o estoque máximo).
                  </p>
                ) : itemSelecionado.STATUS_ESTOQUE === 'EXCESSO / ACIMA DO MÁXIMO' ? (
                  <p className="text-xs text-purple-300 mt-1">
                    <strong>Excesso de Estoque:</strong> Saldo atual ({itemSelecionado.ESTOQUE_ATUAL}) supera o teto máximo de {itemSelecionado.ESTMAX}.
                    Recomenda-se pausar compras até que o consumo normalize os níveis.
                  </p>
                ) : itemSelecionado.STATUS_ESTOQUE === 'SEM GIRO / PARADO' ? (
                  <p className="text-xs text-slate-300 mt-1">
                    <strong>Estoque Parado:</strong> Nenhuma requisição nos últimos {diasFiltro} dias.
                    Avaliar obsolescência técnica ou readequação do cadastro no Sankhya.
                  </p>
                ) : (
                  <p className="text-xs text-emerald-300 mt-1">
                    <strong>Nível Equilibrado:</strong> Giro e cobertura dentro dos parâmetros normais de operação da Fazenda Progresso.
                  </p>
                )}
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setItemSelecionado(null)}
                className="px-4 py-2 rounded-xl bg-[#152a20] hover:bg-[#1e3b2e] text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
