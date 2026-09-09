import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';

import {
  COR, estiloTooltip, formatMoeda, formatMoedaCurta, formatMinutos, formatDiaCurto,
  hojeISO, diasAtrasISO, somar,
} from '../../components/common/vizTokens';
import { CardKpi, CardViz, SemDado, Legenda } from '../../components/common/viz';
import { useAuth } from '../../context/AuthContext';
import { cabecalhoPerfil } from '../../utils/apiAuth';

const API_URL = import.meta.env.VITE_API_URL ?? '';

// O cadastro legado possui variações de grafia para o mesmo modelo (ex.: BENS/BENZ
// e ATEGO/ATEGOO). A normalização é apenas visual: patrimônio e motorista seguem
// em linhas separadas, mas os modelos iguais ficam juntos na listagem.
const normalizarModelo = (nome: string) => nome
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/\bBENS\b/g, 'BENZ')
  .replace(/\bATEGO+\b/g, 'ATEGO')
  .replace(/\s+/g, ' ')
  .trim();

// O primeiro número técnico do nome é o identificador do modelo. Assim 2429,
// 31.330 e 32.380 agrupam seus veículos mesmo se marca ou descrição vierem erradas.
const indicadorModelo = (nome: string) => {
  const modelo = normalizarModelo(nome);
  const encontrado = modelo.match(/\b\d{2}\.\d{3}\b|\b\d{4}\b/);
  return encontrado ? encontrado[0].replace(/\D/g, '') : modelo;
};

const tituloGrupoModelo = (nome: string, indicador: string) => {
  const semIdentificacaoPatrimonial = nome.replace(/\s+N[ºO]?\s*\d+\b.*$/i, '').trim();
  return semIdentificacaoPatrimonial || `Modelo ${indicador}`;
};

// Contrato real das views (confirmado no DBeaver, PRD v3 §9.3/§9.5/§9.6).
interface LinhaDiariaVeiculo {
  Dia: string;
  EquipamentoId: number;
  CodigoEquipamento: string | null;
  NomeEquipamento: string | null;
  MotoristaNomeFicha: string | null;
  MotoristaNomeFolha: string | null;
  MetaCpk: number | null;
  KmRodadoDia: number | null;
  CustoCombustivelDia: number | null;
  CustoPneusDia: number | null;
  CustoManutencaoDia: number | null;
  CustoOutrosDia: number | null;
  CustoLogisticoRealDia: number | null;
  CustoMotoristaRateadoDia: number | null;
  CustoOperacionalRealDia: number | null;
  CustoEsperadoDia: number | null;
  ResultadoDia: number | null;
  LitrosConsumidosDia: number | null;
}

interface MotivoAgregado {
  Estado: string | null;
  OperacaoDescricao: string | null;
  MinutosAproximados: number;
  QtdLeituras: number;
  CustoMotorista: number;
  CustoCombustivel: number;
  CustoMaquina: number;
  Homologado: boolean;
}

interface MotorAgregado {
  minutosMotorLigado: number;
  minutosMotorOcioso: number;
  diasComDado: number;
  porDia: { Dia: string; MinutosMotorLigado: number; MinutosMotorOcioso: number }[];
}

interface EquipamentoItem {
  EquipamentoId: number;
  CodigoEquipamento: string | null;
  Nome: string | null;
}

interface InsightItem {
  InsightId: number;
  Categoria: string;
  Severidade: 'baixa' | 'media' | 'alta';
  Titulo: string;
  Descricao: string;
  EntidadeReferencia: string | null;
  EquipamentoId: number | null;
  FatoCalculado: string | null;
  RecomendacaoIA: string | null;
  ValorBaseDiaria: number | null;
  CustoRealDiario: number | null;
  DiferencaPercentual: number | null;
  FonteReferenciaTitulo: string | null;
  FonteReferenciaUrl: string | null;
  EscopoReferencia: string | null;
  GeradoEm: string;
}

export const PainelMetasDiario: React.FC = () => {
  const { usuario } = useAuth();
  const [dataDe, setDataDe] = useState(diasAtrasISO(30));
  const [dataAte, setDataAte] = useState(hojeISO());
  const [veiculoSelecionado, setVeiculoSelecionado] = useState('todos');
  const [motoristaSelecionado, setMotoristaSelecionado] = useState('todos');

  const [veiculos, setVeiculos] = useState<EquipamentoItem[]>([]);
  const [motoristas, setMotoristas] = useState<string[]>([]);

  const [linhasDiarias, setLinhasDiarias] = useState<LinhaDiariaVeiculo[]>([]);
  const [motivos, setMotivos] = useState<MotivoAgregado[]>([]);
  const [motor, setMotor] = useState<MotorAgregado | null>(null);
  const [alarmes24h, setAlarmes24h] = useState<number | null>(null);
  const [insights, setInsights] = useState<InsightItem[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Record<number, boolean>>({});
  const [insightAberto, setInsightAberto] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const qs = new URLSearchParams({ dataInicio: dataDe, dataFim: dataAte });
    if (veiculoSelecionado !== 'todos') qs.append('equipamentoId', veiculoSelecionado);
    if (motoristaSelecionado !== 'todos') qs.append('motorista', motoristaSelecionado);

    const buscar = async <T,>(url: string, fallback: T): Promise<T> => {
      try {
        const resp = await fetch(url, { headers: cabecalhoPerfil(usuario?.perfil) });
        if (!resp.ok) throw new Error(`API respondeu ${resp.status}`);
        return (await resp.json()) as T;
      } catch (e) {
        console.error('Falha ao consultar', url, e);
        return fallback;
      }
    };

    // Dados centrais primeiro: a consulta de motor pode ser lenta e não deve
    // bloquear KPIs, gráfico diário e a tabela de caminhões.
    const [eqs, mots, diario, exec] = await Promise.all([
      buscar<EquipamentoItem[]>(`${API_URL}/api/frota/equipamentos`, []),
      buscar<string[]>(`${API_URL}/api/metas/diario?modo=motoristas&${qs}`, []),
      buscar<{ porVeiculo: LinhaDiariaVeiculo[] }>(`${API_URL}/api/metas/diario?modo=diario&${qs}`, { porVeiculo: [] }),
      buscar<{ alarmes24h: number }>(`${API_URL}/api/metas/diario?modo=executivo`, { alarmes24h: 0 }),
    ]);

    setVeiculos(eqs);
    setMotoristas(mots);
    setLinhasDiarias(diario.porVeiculo ?? []);
    setAlarmes24h(exec.alarmes24h ?? 0);
    setErro(diario.porVeiculo ? null : 'Não foi possível carregar os dados do painel diário.');
    setCarregando(false);

    void Promise.all([
      buscar<MotivoAgregado[]>(`${API_URL}/api/metas/diario?modo=motivos&${qs}`, []),
      buscar<MotorAgregado>(`${API_URL}/api/metas/diario?modo=motor&${qs}`, { minutosMotorLigado: 0, minutosMotorOcioso: 0, diasComDado: 0, porDia: [] }),
      buscar<InsightItem[]>(`${API_URL}/api/insights/listar?resolvido=false`, []),
    ]).then(([motivosResp, motorResp, insightsResp]) => {
      setMotivos(motivosResp);
      setMotor(motorResp);
      // Mantém todos em memória para localizar os vinculados a cada equipamento.
      setInsights(insightsResp);
    });
  }, [dataDe, dataAte, veiculoSelecionado, motoristaSelecionado, usuario?.perfil]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ---- Tudo abaixo é derivado do MESMO payload diário, então KPIs, gráficos e tabela sempre
  // contam a mesma história e respeitam o intervalo de datas escolhido. (Antes os KPIs vinham de
  // /api/gastos/resumo, que filtra por CompetenciaMeta = dia 1º do mês: um intervalo dentro de um
  // único mês zerava todos os cards.)
  const porDia = useMemo(() => {
    const mapa = new Map<string, { dia: string; previsto: number; realizado: number; temMeta: boolean }>();
    linhasDiarias.forEach((l) => {
      if (!l.Dia) return;
      const chave = l.Dia.split('T')[0];
      const atual = mapa.get(chave) ?? { dia: chave, previsto: 0, realizado: 0, temMeta: false };
      atual.previsto += l.CustoEsperadoDia ?? 0;
      atual.temMeta ||= l.CustoEsperadoDia !== null;
      atual.realizado += l.CustoOperacionalRealDia ?? 0;
      mapa.set(chave, atual);
    });
    return Array.from(mapa.values())
      .sort((a, b) => a.dia.localeCompare(b.dia))
      .map((d) => ({ ...d, rotulo: formatDiaCurto(d.dia), dentroDaMeta: d.temMeta && d.realizado <= d.previsto }));
  }, [linhasDiarias]);

  const porEquipamento = useMemo(() => {
    const mapa = new Map<number, {
      EquipamentoId: number;
      nome: string;
      indicador: string;
      codigo: string;
      motorista: string;
      combustivel: number;
      pneus: number;
      manutencao: number;
      outros: number;
      logistico: number;
      motoristaRateado: number;
      operacional: number;
      esperado: number;
      km: number;
      litros: number;
      dias: number;
      diasComMeta: number;
    }>();
    linhasDiarias.forEach((l) => {
      const atual = mapa.get(l.EquipamentoId) ?? {
        EquipamentoId: l.EquipamentoId,
        nome: normalizarModelo(l.NomeEquipamento ?? `Equipamento ${l.EquipamentoId}`),
        indicador: indicadorModelo(l.NomeEquipamento ?? `Equipamento ${l.EquipamentoId}`),
        codigo: l.CodigoEquipamento ?? '—',
        motorista: l.MotoristaNomeFicha ?? l.MotoristaNomeFolha ?? 'Sem motorista vinculado',
        combustivel: 0, pneus: 0, manutencao: 0, outros: 0, logistico: 0, motoristaRateado: 0,
        operacional: 0, esperado: 0, km: 0, litros: 0, dias: 0, diasComMeta: 0,
      };
      atual.combustivel += l.CustoCombustivelDia ?? 0;
      atual.pneus += l.CustoPneusDia ?? 0;
      atual.manutencao += l.CustoManutencaoDia ?? 0;
      atual.outros += l.CustoOutrosDia ?? 0;
      atual.logistico += l.CustoLogisticoRealDia ?? 0;
      atual.motoristaRateado += l.CustoMotoristaRateadoDia ?? 0;
      atual.operacional += l.CustoOperacionalRealDia ?? 0;
      atual.esperado += l.CustoEsperadoDia ?? 0;
      if (l.CustoEsperadoDia !== null) atual.diasComMeta += 1;
      atual.km += l.KmRodadoDia ?? 0;
      atual.litros += l.LitrosConsumidosDia ?? 0;
      atual.dias += 1;
      mapa.set(l.EquipamentoId, atual);
    });
    // Mantém patrimônios distintos em linhas próprias e usa só o número técnico
    // do modelo para agrupar veículos, ignorando erros de texto no cadastro.
    return Array.from(mapa.values()).sort((a, b) =>
      a.indicador.localeCompare(b.indicador, 'pt-BR', { numeric: true }) || a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }),
    );
  }, [linhasDiarias]);

  // Balanço: saldo assinado por equipamento (esperado − real). Nome completo no eixo, sem cortar
  // em 2 palavras (era isso que fazia vários caminhões virarem "CAMINHAO MERCEDES" repetido).
  const balanco = useMemo(
    () =>
      porEquipamento
        .filter((e) => e.diasComMeta > 0)
        .map((e) => ({
          rotulo: e.codigo !== '—' ? `${e.nome} · ${e.codigo}` : e.nome,
          saldo: e.esperado - e.operacional,
        }))
        .filter((e) => e.saldo !== 0)
        .sort((a, b) => b.saldo - a.saldo)
        .slice(0, 12),
    [porEquipamento]
  );

  const equipamentosAgrupados = useMemo(() => {
    let grupoAnterior = '';
    return porEquipamento.map((equipamento) => {
      const iniciarGrupo = equipamento.indicador !== grupoAnterior;
      grupoAnterior = equipamento.indicador;
      return {
        equipamento,
        iniciarGrupo,
        tituloGrupo: tituloGrupoModelo(equipamento.nome, equipamento.indicador),
      };
    });
  }, [porEquipamento]);

  const motivosGrafico = useMemo(() => {
    const rotulo = (m: MotivoAgregado) =>
      m.OperacaoDescricao?.trim() || m.Estado?.trim() || 'Não informado';
    const somados = new Map<string, { minutos: number; custo: number }>();
    motivos.forEach((m) => {
      const atual = somados.get(rotulo(m)) ?? { minutos: 0, custo: 0 };
      atual.minutos += m.MinutosAproximados ?? 0;
      atual.custo += (m.CustoMotorista ?? 0) + (m.CustoMaquina ?? 0) + (m.CustoCombustivel ?? 0);
      somados.set(rotulo(m), atual);
    });
    const ordenados = Array.from(somados.entries())
      .map(([nome, valores]) => ({ nome, ...valores }))
      .sort((a, b) => b.minutos - a.minutos);
    if (ordenados.length <= 8) return ordenados;
    const principais = ordenados.slice(0, 7);
    const resto = ordenados.slice(7).reduce((acc, m) => ({ minutos: acc.minutos + m.minutos, custo: acc.custo + m.custo }), { minutos: 0, custo: 0 });
    return [...principais, { nome: `Outros (${ordenados.length - 7})`, ...resto }];
  }, [motivos]);

  const totalCombustivel = somar(porEquipamento, (e) => e.combustivel);
  const totalManutencao = somar(porEquipamento, (e) => e.pneus + e.manutencao);
  const totalLogistico = somar(porEquipamento, (e) => e.logistico);
  const totalOperacional = somar(porEquipamento, (e) => e.operacional);
  const totalKm = somar(porEquipamento, (e) => e.km);
  const diasDentro = porDia.filter((d) => d.dentroDaMeta).length;
  const diasComMeta = porDia.filter((d) => d.temMeta).length;
  const percentualDentro = diasComMeta > 0 ? ((diasDentro / diasComMeta) * 100).toFixed(0) : '0';

  const minutosLigado = motor?.minutosMotorLigado ?? 0;
  const minutosOcioso = motor?.minutosMotorOcioso ?? 0;
  const minutosProdutivo = Math.max(minutosLigado - minutosOcioso, 0);
  const percentualOcioso = minutosLigado > 0 ? (minutosOcioso / minutosLigado) * 100 : 0;

  const severidadeBadge: Record<InsightItem['Severidade'], string> = {
    alta: 'bg-rose-100 text-rose-700',
    media: 'bg-amber-100 text-amber-800',
    baixa: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className={`space-y-5 pb-12 transition-opacity ${carregando ? 'opacity-60' : 'opacity-100'}`}>
      {/* Filtros: uma linha só, acima de tudo que eles afetam */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">De</span>
          <input type="date" value={dataDe} max={dataAte} onChange={(e) => setDataDe(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Até</span>
          <input type="date" value={dataAte} min={dataDe} onChange={(e) => setDataAte(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Veículo</span>
          <select value={veiculoSelecionado} onChange={(e) => setVeiculoSelecionado(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 min-w-[200px]">
            <option value="todos">Todos os veículos</option>
            {veiculos.map((v) => (
              <option key={v.EquipamentoId} value={String(v.EquipamentoId)}>
                {v.Nome} {v.CodigoEquipamento ? `(${v.CodigoEquipamento})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Motorista</span>
          <select value={motoristaSelecionado} onChange={(e) => setMotoristaSelecionado(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 min-w-[200px]">
            <option value="todos">Todos os motoristas</option>
            {motoristas.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <button onClick={carregar}
          className="ml-auto inline-flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 text-xs">
          <RefreshCw size={13} className="mr-1.5" /> Atualizar
        </button>
      </div>

      {erro && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{erro}</div>}

      {/* KPIs — todos somados do dado diário dentro do intervalo filtrado */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <CardKpi label="Combustível" valor={formatMoeda(totalCombustivel)} apoio="Somado no período filtrado" />
        <CardKpi label="Pneus + Manutenção" valor={formatMoeda(totalManutencao)} apoio="Somado no período filtrado" />
        <CardKpi label="Custo Logístico" valor={formatMoeda(totalLogistico)} apoio="Combustível + pneus + manut. + outros" />
        <CardKpi label="Custo Operacional" valor={formatMoeda(totalOperacional)} apoio="Logístico + motorista rateado" destaque />
        <CardKpi label="Dias Dentro da Meta" valor={diasComMeta ? `${diasDentro} / ${diasComMeta}` : 'Sem meta'} apoio={`${percentualDentro}% dos dias com meta cadastrada`} />
        <CardKpi label="Alarmes (24h)" valor={alarmes24h === null ? '—' : String(alarmes24h)} apoio="Eventos de risco da frota hoje" />
      </div>

      {/* Meta previsto x realizado por dia */}
      <CardViz
        titulo="Acompanhamento diário: previsto x realizado"
        acessorio={<Legenda itens={[{ cor: COR.serie1, rotulo: 'Custo previsto (meta)' }, { cor: COR.serie2, rotulo: 'Custo realizado' }]} />}
      >
        {porDia.length === 0 ? (
          <SemDado mensagem="Nenhum dia sincronizado nesse período. A carga diária do Sankhya alimenta essa visão." />
        ) : porDia.length === 1 ? (
          // Um único dia não é um gráfico de barras — é um número. (Anti-pattern: one-bar bar chart.)
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Previsto em {porDia[0].rotulo}</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{formatMoeda(porDia[0].previsto)}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Realizado</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{formatMoeda(porDia[0].realizado)}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resultado</p>
              <p className="text-2xl font-black mt-1" style={{ color: porDia[0].dentroDaMeta ? COR.bom : COR.critico }}>
                {formatMoeda(porDia[0].previsto - porDia[0].realizado)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {porDia[0].dentroDaMeta ? 'Dentro da meta do dia' : 'Acima da meta do dia'}
              </p>
            </div>
            <p className="sm:col-span-3 text-[11px] text-slate-400">
              Só um dia com dado no período — quando mais dias forem sincronizados, esse bloco vira o gráfico de evolução.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porDia} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barGap={2}>
                <CartesianGrid vertical={false} stroke={COR.grid} />
                <XAxis dataKey="rotulo" tickLine={false} axisLine={{ stroke: COR.eixo }} tick={{ fill: COR.tintaMuda, fontSize: 10 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: COR.tintaMuda, fontSize: 10 }}
                  tickFormatter={(v) => formatMoedaCurta(Number(v))} width={64} />
                <Tooltip contentStyle={estiloTooltip} cursor={{ fill: 'rgba(11,11,11,0.03)' }}
                  formatter={(valor, nome) => [formatMoeda(Number(valor)), nome === 'previsto' ? 'Previsto (meta)' : 'Realizado']}
                  labelFormatter={(l) => `Dia ${l}`} />
                <Bar dataKey="previsto" name="previsto" fill={COR.serie1} radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar dataKey="realizado" name="realizado" fill={COR.serie2} radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardViz>

      {/* Balanço por veículo */}
      <CardViz
        titulo="Balanço por veículo (economia x excesso de custo)"
        acessorio={<Legenda itens={[{ cor: COR.bom, rotulo: 'Economia (abaixo da meta)' }, { cor: COR.critico, rotulo: 'Excesso (acima da meta)' }]} />}
      >
        {balanco.length === 0 ? (
          <SemDado mensagem="Sem custo diário lançado no período pra calcular o balanço." />
        ) : (
          <>
            <div style={{ height: Math.max(balanco.length * 34 + 40, 180) }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={balanco} layout="vertical" margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
                  <CartesianGrid horizontal={false} stroke={COR.grid} />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: COR.tintaMuda, fontSize: 10 }}
                    tickFormatter={(v) => formatMoedaCurta(Number(v))} />
                  <YAxis type="category" dataKey="rotulo" width={220} tickLine={false} axisLine={false}
                    tick={{ fill: COR.tintaSecundaria, fontSize: 11 }} />
                  <ReferenceLine x={0} stroke={COR.eixo} />
                  <Tooltip contentStyle={estiloTooltip} cursor={{ fill: 'rgba(11,11,11,0.03)' }}
                    formatter={(valor) => [formatMoeda(Number(valor)), Number(valor) >= 0 ? 'Economia' : 'Excesso de custo']} />
                  <Bar dataKey="saldo" radius={4} maxBarSize={22}>
                    {balanco.map((b) => (
                      <Cell key={b.rotulo} fill={b.saldo >= 0 ? COR.bom : COR.critico} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {porEquipamento.length > balanco.length && (
              <p className="text-[11px] text-slate-400 mt-2">Mostrando os {balanco.length} maiores desvios de {porEquipamento.length} veículos com dado.</p>
            )}
          </>
        )}
      </CardViz>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Motivos de parada — agora com o rótulo real (Estado/Operação), não "Outros" */}
        <CardViz titulo="Principais motivos de parada e operação">
          {motivosGrafico.length === 0 ? (
            <SemDado mensagem="Nenhum registro de estado/operação no período." />
          ) : (
            <div className="space-y-3">
              {(() => {
                const maximo = Math.max(...motivosGrafico.map((m) => m.minutos));
                return motivosGrafico.map((m) => (
                  <div key={m.nome} className="space-y-1">
                    <div className="flex justify-between items-baseline gap-3 text-xs">
                      <span className="text-slate-700 font-medium truncate" title={m.nome}>{m.nome}</span>
                      <span className="font-bold text-slate-900 tabular-nums shrink-0 text-right">{formatMinutos(m.minutos)} · {formatMoeda(m.custo)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div className="h-2.5 rounded-full" style={{ width: `${(m.minutos / maximo) * 100}%`, backgroundColor: COR.serie1 }} />
                    </div>
                  </div>
                ));
              })()}
              <p className="text-[11px] text-slate-400 pt-1">
                Somente dentro da jornada cadastrada; “Final de turno” é excluído. Motor desligado: hora-homem. Motor ligado e parado: hora-homem + máquina + diesel.
              </p>
            </div>
          )}
        </CardViz>

        {/* Motor: produtivo x ocioso — barra 100%, não rosca de 2 fatias */}
        <CardViz titulo="Uso do motor: produtivo x ocioso">
          {minutosLigado === 0 ? (
            <SemDado mensagem="Sem leitura de motor no período." />
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Motor produtivo</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{formatMinutos(minutosProdutivo)}</p>
                  <p className="text-[11px] text-slate-500">{(100 - percentualOcioso).toFixed(0)}% do motor ligado</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Motor ocioso</p>
                  <p className="text-2xl font-black mt-1" style={{ color: COR.atencao }}>{formatMinutos(minutosOcioso)}</p>
                  <p className="text-[11px] text-slate-500">{percentualOcioso.toFixed(0)}% do motor ligado</p>
                </div>
              </div>

              <div>
                <div className="flex w-full h-4 rounded-full overflow-hidden bg-slate-100 gap-0.5">
                  <div style={{ width: `${100 - percentualOcioso}%`, backgroundColor: COR.serie1 }} />
                  <div style={{ width: `${percentualOcioso}%`, backgroundColor: COR.atencao }} />
                </div>
                <div className="flex justify-between mt-2">
                  <Legenda itens={[{ cor: COR.serie1, rotulo: 'Produtivo' }, { cor: COR.atencao, rotulo: 'Ocioso (ligado e parado)' }]} />
                  <span className="text-[11px] text-slate-400">Motor ligado: {formatMinutos(minutosLigado)}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Baseado em {motor?.diasComDado ?? 0} dia(s) com leitura de motor no período. Km rodado no período: {totalKm.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km.
              </p>
            </div>
          )}
        </CardViz>
      </div>

      {/* Gastos por equipamento — mesmo payload dos KPIs, então os números fecham */}
      <CardViz titulo="Gastos por equipamento (no período filtrado)">
        {porEquipamento.length === 0 ? (
          <SemDado mensagem="Nenhum equipamento com custo diário lançado no período." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <th className="pb-3">Equipamento</th>
                  <th className="pb-3 text-right">Combustível</th>
                  <th className="pb-3 text-right">Pneus + Manut.</th>
                  <th className="pb-3 text-right">Logístico</th>
                  <th className="pb-3 text-right">Motorista</th>
                  <th className="pb-3 text-right text-green-700">Operacional</th>
                  <th className="pb-3 text-right">Meta (esperado)</th>
                  <th className="pb-3 text-right">Saldo</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {equipamentosAgrupados.map(({ equipamento: e, iniciarGrupo, tituloGrupo }) => {
                  const saldo = e.esperado - e.operacional;
                  const aberto = expandidos[e.EquipamentoId];
                  return (
                    <React.Fragment key={e.EquipamentoId}>
                      {iniciarGrupo && (
                        <tr className="bg-slate-100/80">
                          <td colSpan={9} className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                            Grupo: {tituloGrupo}
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-slate-50">
                        <td className="py-3">
                          <p className="font-semibold text-slate-800">{e.nome}</p>
                          <p className="text-[11px] text-slate-500">{e.codigo} · {e.motorista} · {e.dias} dia(s)</p>
                        </td>
                        <td className="py-3 text-right text-slate-600 tabular-nums">{formatMoeda(e.combustivel)}</td>
                        <td className="py-3 text-right text-slate-600 tabular-nums">{formatMoeda(e.pneus + e.manutencao)}</td>
                        <td className="py-3 text-right text-slate-600 tabular-nums">{formatMoeda(e.logistico)}</td>
                        <td className="py-3 text-right text-slate-600 tabular-nums">{formatMoeda(e.motoristaRateado)}</td>
                        <td className="py-3 text-right font-bold text-green-700 tabular-nums">{formatMoeda(e.operacional)}</td>
                        <td className="py-3 text-right text-slate-600 tabular-nums">{formatMoeda(e.esperado)}</td>
                        <td className="py-3 text-right font-bold tabular-nums" style={{ color: saldo >= 0 ? COR.bom : COR.critico }}>
                          {formatMoeda(saldo)}
                        </td>
                        <td className="py-3 text-right">
                          <button onClick={() => setExpandidos((a) => ({ ...a, [e.EquipamentoId]: !a[e.EquipamentoId] }))}
                            className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-500">
                            {aberto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                        </td>
                      </tr>
                      {aberto && (
                        <tr>
                          <td colSpan={9} className="bg-slate-50/70 p-4 border-y border-slate-100">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              <div className="bg-white p-3 rounded-xl border border-slate-200/60 space-y-1">
                                <p className="font-bold text-slate-800 text-[11px] mb-1">Composição do custo</p>
                                <p className="text-slate-600">• Combustível: {formatMoeda(e.combustivel)} · {e.litros.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L</p>
                                <p className="text-[10px] text-slate-400">Preço médio efetivo: {e.litros > 0 ? `${formatMoeda(e.combustivel / e.litros)}/L` : 'indisponível'}</p>
                                <p className="text-[10px] text-slate-400">Equivalente em diesel: {e.litros > 0 ? `${e.litros.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L para ${formatMoeda(e.combustivel)}` : 'indisponível'}</p>
                                <p className="text-slate-600">• Pneus: {formatMoeda(e.pneus)}</p>
                                <p className="text-slate-600">• Manutenção: {formatMoeda(e.manutencao)}</p>
                                <p className="text-slate-600">• Outros: {formatMoeda(e.outros)}</p>
                                <p className="text-slate-600">• Custo proporcional do motorista: {formatMoeda(e.motoristaRateado)}</p>
                                <p className="text-[10px] text-slate-400">Rateio proporcional ao tempo atribuído ao equipamento no período.</p>
                              </div>
                              <div className="bg-white p-3 rounded-xl border border-slate-200/60 space-y-1">
                                <p className="font-bold text-slate-800 text-[11px] mb-1">Operação no período</p>
                                <p className="text-slate-600">• Km rodado: {e.km.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km</p>
                                <p className="text-slate-600">• Dias com dado: {e.dias}</p>
                                <p className="text-slate-600">• CPK realizado: {e.km > 0 ? formatMoeda(e.operacional / e.km) : '—'}/km</p>
                              </div>
                              <div className="bg-white p-3 rounded-xl border border-slate-200/60 space-y-1">
                                <p className="font-bold text-slate-800 text-[11px] mb-1">Meta x realizado</p>
                                <p className="text-slate-600">• Custo esperado: {e.diasComMeta > 0 ? formatMoeda(e.esperado) : 'Meta não cadastrada'}</p>
                                <p className="text-slate-600">• Custo real: {formatMoeda(e.operacional)}</p>
                                <p className="font-bold" style={{ color: saldo >= 0 ? COR.bom : COR.critico }}>
                                  • {saldo >= 0 ? 'Economia' : 'Excesso'}: {formatMoeda(Math.abs(saldo))}
                                </p>
                              </div>
                            </div>
                            <div className="mt-4 bg-white p-4 rounded-xl border border-amber-200/80 text-xs">
                              <p className="font-bold text-slate-800 text-[11px] mb-2 flex items-center gap-1.5">
                                <Sparkles size={13} className="text-amber-500" /> Insights da IA
                              </p>
                              {(() => {
                                const relacionados = insights.filter((insight) => insight.EquipamentoId === e.EquipamentoId);
                                return relacionados.length > 0 ? relacionados.map((insight) => (
                                  <div key={insight.InsightId} className="mt-1 first:mt-0 text-slate-700 leading-relaxed line-clamp-2">
                                    {insight.ValorBaseDiaria != null
                                      ? <>Referência {formatMoeda(insight.ValorBaseDiaria)}/dia · custo real {formatMoeda(insight.CustoRealDiario ?? 0)}/dia ({Number(insight.DiferencaPercentual ?? 0).toFixed(1).replace('.', ',')}%).</>
                                      : (insight.FatoCalculado ?? insight.Descricao)}
                                  </div>
                                )) : (
                                  <p className="text-slate-500">Custo operacional: {formatMoeda(e.operacional)} no período ({formatMoeda(e.dias > 0 ? e.operacional / e.dias : 0)}/dia). Sem referência externa cadastrada para este modelo.</p>
                                );
                              })()}
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
        )}
      </CardViz>

      {/* Insights reais da tabela InsightIA (os cards de exemplo hardcoded saíram) */}
      <CardViz titulo="Insights da IA (gerados sobre o dado real)" acessorio={
        <span className="text-[11px] text-slate-400">Gere novos na aba Insights (IA)</span>
      }>
        {insights.length === 0 ? (
          <SemDado mensagem="Nenhum insight em aberto. Gere na aba Insights (IA)." />
        ) : (
          <div className="space-y-3">
            {insights.slice(0, 4).map((i) => (
              <div key={i.InsightId} className="border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-1.5 pt-0.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${severidadeBadge[i.Severidade] ?? severidadeBadge.baixa}`}>
                        {i.Severidade}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">{i.Categoria}</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Sparkles size={12} className="text-amber-500 shrink-0" /> {i.Titulo}
                      </h4>
                      {i.EntidadeReferencia && <p className="text-[11px] text-slate-500 mt-0.5">{i.EntidadeReferencia}</p>}
                    </div>
                  </div>
                  <button onClick={() => setInsightAberto(insightAberto === i.InsightId ? null : i.InsightId)}
                    className="p-1 text-slate-400 hover:text-slate-600 shrink-0">
                    {insightAberto === i.InsightId ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>
                {insightAberto === i.InsightId && (
                  <p className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                    {i.Descricao}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardViz>
    </div>
  );
};
