import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
} from 'recharts';
import {
  Users,
  Star,
  Shield,
  Fuel,
  ClipboardList,
  Settings,
  Database,
  Plus,
  AlertTriangle,
  GraduationCap,
  Trophy,
  CheckCircle2,
  Calendar,
  X,
} from 'lucide-react';

// Dados de evolução das notas gerais e de segurança
const dadosEvolucao = [
  { mes: 'Mar/26', notaGeral: 70.5, seguranca: 72.8 },
  { mes: 'Abr/26', notaGeral: 73.8, seguranca: 74.2 },
  { mes: 'Mai/26', notaGeral: 78.1, seguranca: 78.9 },
];

// Dados do Radar de Competências (7 eixos)
const dadosRadarCompetencias = [
  { subject: 'Técnica', valor: 78, fullMark: 100 },
  { subject: 'Direção', valor: 82, fullMark: 100 },
  { subject: 'Preservação', valor: 75, fullMark: 100 },
  { subject: 'Segurança', valor: 77, fullMark: 100 },
  { subject: 'Comportamento', valor: 80, fullMark: 100 },
  { subject: 'Conhecimento', valor: 72, fullMark: 100 },
  { subject: 'Econômica', valor: 76.7, fullMark: 100 },
];

// 3 Mini gráficos de tendência
const dadosEconomia = [
  { mes: 'Mar/26', valor: 68.2 },
  { mes: 'Abr/26', valor: 72.5 },
  { mes: 'Mai/26', valor: 79.1 },
];

const dadosSeguranca = [
  { mes: 'Mar/26', valor: 73.0 },
  { mes: 'Abr/26', valor: 74.4 },
  { mes: 'Mai/26', valor: 78.5 },
];

const dadosConservacao = [
  { mes: 'Mar/26', valor: 70.1 },
  { mes: 'Abr/26', valor: 74.0 },
  { mes: 'Mai/26', valor: 77.8 },
];

// Ranking de desempenho dos motoristas
const rankingMotoristas = [
  {
    pos: 1,
    iniciais: 'JP',
    corAvatar: 'bg-emerald-600',
    nome: 'João Pereira',
    cargo: 'Motorista Carreteiro',
    fazenda: 'Fazenda I',
    nota: 94.9,
    classificacao: 'Motorista Referência',
    classificacaoTipo: 'referencia',
  },
  {
    pos: 2,
    iniciais: 'LF',
    corAvatar: 'bg-blue-600',
    nome: 'Luiz Fernando',
    cargo: 'Motorista de Comboio',
    fazenda: 'Fazenda II',
    nota: 81.5,
    classificacao: 'Bom',
    classificacaoTipo: 'bom',
  },
  {
    pos: 3,
    iniciais: 'AC',
    corAvatar: 'bg-cyan-600',
    nome: 'Antônio Carlos',
    cargo: 'Operador de Munck',
    fazenda: 'Fazenda I',
    nota: 81.0,
    classificacao: 'Bom',
    classificacaoTipo: 'bom',
  },
  {
    pos: 4,
    iniciais: 'ER',
    corAvatar: 'bg-indigo-600',
    nome: 'Eduardo Ramos',
    cargo: 'Operador de Munck',
    fazenda: 'Fazenda II',
    nota: 78.7,
    classificacao: 'Bom',
    classificacaoTipo: 'bom',
  },
  {
    pos: 5,
    iniciais: 'PH',
    corAvatar: 'bg-sky-600',
    nome: 'Pedro Henrique',
    cargo: 'Motorista Pipa',
    fazenda: 'Fazenda I',
    nota: 77.2,
    classificacao: 'Bom',
    classificacaoTipo: 'bom',
  },
  {
    pos: 6,
    iniciais: 'TM',
    corAvatar: 'bg-teal-600',
    nome: 'Tiago Moreira',
    cargo: 'Motorista de Semirreboque',
    fazenda: 'Fazenda II',
    nota: 76.0,
    classificacao: 'Bom',
    classificacaoTipo: 'bom',
  },
];

// Principais desvios encontrados
const principaisDesvios = [
  { descricao: 'Realiza trocas suaves', ocorrencias: 11, max: 11 },
  { descricao: 'Conhecimento do equipamento', ocorrencias: 10, max: 11 },
  { descricao: 'Conhecimento das normas', ocorrencias: 10, max: 11 },
  { descricao: 'Uso racional do freio', ocorrencias: 10, max: 11 },
  { descricao: 'Atenção constante', ocorrencias: 9, max: 11 },
  { descricao: 'Cuidados com a caixa de marchas', ocorrencias: 9, max: 11 },
];

// Planos de ação pendentes
const planosAcao = [
  {
    motorista: 'Antônio Carlos',
    pontoMelhoria: 'Uso correto das rotações',
    nota: 5,
    prazo: '15 dias',
  },
  {
    motorista: 'Antônio Carlos',
    pontoMelhoria: 'Escolhe marcha adequada',
    nota: 6,
    prazo: '15 dias',
  },
  {
    motorista: 'Antônio Carlos',
    pontoMelhoria: 'Realiza trocas suaves',
    nota: 6,
    prazo: '15 dias',
  },
  {
    motorista: 'Antônio Carlos',
    pontoMelhoria: 'Utiliza corretamente o freio motor',
    nota: 6,
    prazo: '15 dias',
  },
  {
    motorista: 'Antônio Carlos',
    pontoMelhoria: 'Preserva o sistema de freios',
    nota: 6,
    prazo: '15 dias',
  },
  {
    motorista: 'Antônio Carlos',
    pontoMelhoria: 'Mantém distância segura',
    nota: 6,
    prazo: '15 dias',
  },
];

// Treinamentos recomendados
const treinamentosRecomendados = [
  {
    titulo: 'Treinamento prático de Técnica de Condução e Operação Suave',
    motoristas: 19,
  },
  {
    titulo: 'Treinamento de Direção Econômica e Aproveitamento de Inércia',
    motoristas: 18,
  },
  {
    titulo: 'Curso de Direção Defensiva e Percepção de Riscos',
    motoristas: 18,
  },
  {
    titulo: 'Treinamento de Preservação e Conservação de Veículos',
    motoristas: 17,
  },
  {
    titulo: 'Reciclagem em Segurança Operacional, EPIs e Procedimentos',
    motoristas: 16,
  },
  {
    titulo: 'Desenvolvimento Comportamental e Postura Profissional',
    motoristas: 16,
  },
];

export const DashboardDriveAval: React.FC = () => {
  const [modalNovaAvaliacao, setModalNovaAvaliacao] = useState(false);
  const [modalConfigEnvio, setModalConfigEnvio] = useState(false);
  const [modalBaseCentral, setModalBaseCentral] = useState(false);

  // Form mock para nova avaliação
  const [novoMotorista, setNovoMotorista] = useState('');
  const [novaNota, setNovaNota] = useState('80');
  const [novoFeedback, setNovoFeedback] = useState('');
  const [avaliacaoSalva, setAvaliacaoSalva] = useState(false);

  const salvarNovaAvaliacao = (e: React.FormEvent) => {
    e.preventDefault();
    setAvaliacaoSalva(true);
    setTimeout(() => {
      setAvaliacaoSalva(false);
      setModalNovaAvaliacao(false);
      setNovoMotorista('');
      setNovoFeedback('');
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800">
      {/* 1. Header do Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-400" />
            Visão geral da operação · Junho/2026
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setModalConfigEnvio(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all border border-slate-200/60 shadow-xs active:scale-95"
          >
            <Settings size={14} className="text-slate-500" />
            Configurar envio
          </button>

          <button
            onClick={() => setModalBaseCentral(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100/80 rounded-xl transition-all border border-sky-200/60 shadow-xs active:scale-95"
          >
            <Database size={14} className="text-sky-600" />
            Base central
          </button>

          <button
            onClick={() => setModalNovaAvaliacao(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm shadow-blue-500/20 active:scale-95"
          >
            <Plus size={15} />
            Nova Avaliação
          </button>
        </div>
      </div>

      {/* 2. Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Motoristas Avaliados */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
              Motoristas Avaliados (Mês)
            </span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-400">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">0</span>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
              <span>▲</span>
              <span>+0 avaliações</span>
            </div>
          </div>
        </div>

        {/* Card 2: Média Geral da Frota */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
              Média Geral da Frota
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-500">
              <Star size={16} className="fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">78.1</span>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
              <span>▲</span>
              <span>Bom</span>
            </div>
          </div>
        </div>

        {/* Card 3: Índice de Segurança */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
              Índice de Segurança
            </span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-500">
              <Shield size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">77.0</span>
            <div className="text-[11px] font-medium text-slate-500 mt-1">
              meta ≥ 80
            </div>
          </div>
        </div>

        {/* Card 4: Índice de Economia */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
              Índice de Economia
            </span>
            <div className="p-1.5 rounded-lg bg-orange-50 text-orange-500">
              <Fuel size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">76.7</span>
            <div className="text-[11px] font-medium text-slate-500 mt-1">
              direção econômica
            </div>
          </div>
        </div>

        {/* Card 5: Planos de Ação Pendentes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
              Planos de Ação Pendentes
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-500">
              <ClipboardList size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">406</span>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 mt-1">
              <span>▼</span>
              <span>Itens &lt; 7</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Seção: Evolução e Indicadores */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
          <h2 className="text-base font-bold text-slate-900">Evolução e indicadores</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Gráfico 1: Evolução das notas (frota) */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
              Evolução das notas (frota)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosEvolucao} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="mes"
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="square"
                    iconSize={10}
                    wrapperStyle={{ paddingTop: '15px', fontSize: '11px', color: '#475569' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="notaGeral"
                    name="Nota geral"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#2563eb', strokeWidth: 1.5, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="seguranca"
                    name="Segurança"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#10b981' }}
                    strokeDasharray="4 4"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: Desempenho por competência (Radar) */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Desempenho por competência
            </h3>
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={dadosRadarCompetencias}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: '#475569', fontSize: 10, fontWeight: 500 }}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <Radar
                    name="Desempenho"
                    dataKey="valor"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      fontSize: '11px',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 3 Mini gráficos de tendência */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mini 1: Economia operacional */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <h4 className="text-xs font-bold text-slate-700 mb-2">Economia operacional</h4>
            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosEconomia} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="corEconomia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 8 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '10px' }} />
                  <Area type="monotone" dataKey="valor" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#corEconomia)" dot={{ r: 3, fill: '#f59e0b' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mini 2: Segurança */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <h4 className="text-xs font-bold text-slate-700 mb-2">Segurança</h4>
            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosSeguranca} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="corSeguranca" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 8 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '10px' }} />
                  <Area type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#corSeguranca)" dot={{ r: 3, fill: '#10b981' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mini 3: Conservação dos veículos */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <h4 className="text-xs font-bold text-slate-700 mb-2">Conservação dos veículos</h4>
            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosConservacao} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="corConservacao" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 8 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '10px' }} />
                  <Area type="monotone" dataKey="valor" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#corConservacao)" dot={{ r: 3, fill: '#8b5cf6' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Seção: Rankings & Ações */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
          <h2 className="text-base font-bold text-slate-900">Rankings & ações</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bloco 1: Ranking de desempenho */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Ranking de desempenho
                  </h3>
                </div>
                <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                  ver tudo
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="pb-2.5 w-8">#</th>
                      <th className="pb-2.5">Motorista</th>
                      <th className="pb-2.5">Fazenda</th>
                      <th className="pb-2.5 text-center">Nota</th>
                      <th className="pb-2.5 text-right">Classificação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rankingMotoristas.map((m) => (
                      <tr key={m.pos} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 font-bold text-slate-500">
                          {m.pos === 1 && <span className="text-amber-500">🥇</span>}
                          {m.pos === 2 && <span className="text-slate-400">🥈</span>}
                          {m.pos === 3 && <span className="text-amber-700">🥉</span>}
                          {m.pos > 3 && <span>{m.pos}º</span>}
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] ${m.corAvatar}`}
                            >
                              {m.iniciais}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 leading-tight">{m.nome}</p>
                              <p className="text-[10px] text-slate-400 leading-tight">{m.cargo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 text-slate-600 font-medium">{m.fazenda}</td>
                        <td className="py-2.5 text-center font-extrabold text-emerald-600 text-xs">
                          {m.nota.toFixed(1)}
                        </td>
                        <td className="py-2.5 text-right">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              m.classificacaoTipo === 'referencia'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                            }`}
                          >
                            {m.classificacao}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bloco 2: Principais desvios encontrados */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Principais desvios encontrados
              </h3>
            </div>

            <div className="space-y-3.5">
              {principaisDesvios.map((desvio, idx) => {
                const percentual = (desvio.ocorrencias / desvio.max) * 100;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{desvio.descricao}</span>
                      <span className="font-bold text-slate-900">{desvio.ocorrencias}x</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentual}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bloco 3: Planos de ação pendentes */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ClipboardList size={16} className="text-slate-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Planos de ação pendentes
                  </h3>
                </div>
                <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                  gerenciar
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="pb-2.5">Motorista</th>
                      <th className="pb-2.5">Ponto de Melhoria</th>
                      <th className="pb-2.5 text-center">Nota</th>
                      <th className="pb-2.5 text-right">Prazo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {planosAcao.map((plano, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 font-medium text-slate-800">{plano.motorista}</td>
                        <td className="py-2.5 text-slate-600">{plano.pontoMelhoria}</td>
                        <td className="py-2.5 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[11px] font-bold ${
                              plano.nota <= 5
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {plano.nota}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                            {plano.prazo}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bloco 4: Treinamentos recomendados */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap size={16} className="text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Treinamentos recomendados
              </h3>
            </div>

            <div className="space-y-2.5">
              {treinamentosRecomendados.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-100 transition-colors"
                >
                  <p className="text-xs font-medium text-slate-700 pr-2">{item.titulo}</p>
                  <span className="shrink-0 text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
                    {item.motoristas} motoristas
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Nova Avaliação */}
      {modalNovaAvaliacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setModalNovaAvaliacao(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Plus size={18} className="text-blue-600" />
              Nova Avaliação de Condução
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Lance notas e feedbacks do motorista para atualizar os indicadores da frota.
            </p>

            {avaliacaoSalva ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                <CheckCircle2 size={42} className="text-emerald-500 animate-bounce" />
                <p className="text-sm font-bold text-slate-800">Avaliação registrada com sucesso!</p>
                <p className="text-xs text-slate-500">Os indicadores e rankings foram sincronizados.</p>
              </div>
            ) : (
              <form onSubmit={salvarNovaAvaliacao} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Motorista</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Antônio Carlos"
                    value={novoMotorista}
                    onChange={(e) => setNovoMotorista(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nota Geral da Avaliação (0 a 100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={novaNota}
                    onChange={(e) => setNovaNota(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Observações e Plano de Ação
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Pontos de atenção observados, itens com nota < 7..."
                    value={novoFeedback}
                    onChange={(e) => setNovoFeedback(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setModalNovaAvaliacao(false)}
                    className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm"
                  >
                    Salvar Avaliação
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Configurar Envio */}
      {modalConfigEnvio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative text-xs">
            <button
              onClick={() => setModalConfigEnvio(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Settings size={18} className="text-slate-600" />
              Configurações de Envio e Relatórios
            </h3>
            <p className="text-slate-500 mb-4">
              Defina a frequência de disparo dos relatórios de condução e planos de ação para a gestão.
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                <span>Enviar resumo semanal por e-mail toda segunda-feira</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                <span>Notificar motoristas educadores sobre notas &lt; 7</span>
              </label>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setModalConfigEnvio(false)}
                className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Base Central */}
      {modalBaseCentral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative text-xs">
            <button
              onClick={() => setModalBaseCentral(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Database size={18} className="text-sky-600" />
              Status da Base Central
            </h3>
            <p className="text-slate-500 mb-4">
              Conexão com os repositórios da fazenda e telemetria.
            </p>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Status da sincronização:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Conectado
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Última carga completa:</span>
                <span className="font-semibold text-slate-700">Hoje às 09:30</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Registros em cache:</span>
                <span className="font-semibold text-slate-700">1.420 avaliações</span>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setModalBaseCentral(false)}
                className="px-4 py-2 font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs"
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
