import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, AlertTriangle, Gauge, Trophy, Medal, Truck, User } from 'lucide-react';
import { BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Cell } from 'recharts';
import { DataTable } from '../../components/common/DataTable';

const API_URL = import.meta.env.VITE_API_URL ?? '';

// Contrato de campos das views novas do PRD v3 §9.3-9.7 (sql/013_painel_metas_completo.sql,
// já aplicado no banco pelo cliente) — só leitura, nada é recalculado aqui.
interface ResultadoDiarioVeiculo {
  Dia: string;
  EquipamentoId: number;
  CodigoEquipamento: string;
  NomeEquipamento: string;
  MotoristaNomeFicha: string | null;
  MetaCpk: number | null;
  MetaKmL: number | null;
  KmRodadoDia: number | null;
  CustoOperacionalRealDia: number | null;
  CustoEsperadoDia: number | null;
  ResultadoDia: number | null;
}

interface ResultadoDiarioMotorista {
  Dia: string;
  MotoristaNomeFicha: string;
  QtdCaminhoes: number;
  KmRodadoDia: number | null;
  CustoOperacionalRealDia: number | null;
  CustoEsperadoDia: number | null;
  ResultadoDia: number | null;
}

interface MotivoOperacao {
  Estado: string | null;
  OperacaoDescricao: string | null;
  QtdLeituras: number;
  MinutosAproximados: number;
}

interface TempoMotor {
  Dia: string;
  MinutosMotorLigado: number;
  MinutosMotorOcioso: number;
}

interface ProgressoVeiculo {
  EquipamentoId: number;
  CodigoEquipamento: string;
  NomeEquipamento: string;
  Competencia: string;
  DiaDoMesAtual: number;
  DiasNoMes: number;
  KmAcumuladoMes: number | null;
  CustoRealAcumuladoMes: number | null;
  CustoEsperadoAcumuladoMes: number | null;
  SaldoAcumuladoMes: number | null;
}

interface ProgressoMotorista {
  MotoristaNomeFicha: string;
  Competencia: string;
  DiaDoMesAtual: number;
  DiasNoMes: number;
  QtdCaminhoes: number;
  KmAcumuladoMes: number | null;
  CustoRealAcumuladoMes: number | null;
  CustoEsperadoAcumuladoMes: number | null;
  SaldoAcumuladoMes: number | null;
}

const formatMoeda = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? '—' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatData = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return iso;
  }
};

const formatMinutos = (minutos: number | null | undefined) => {
  if (!minutos) return '0min';
  const horas = Math.floor(minutos / 60);
  const resto = Math.round(minutos % 60);
  return horas > 0 ? `${horas}h ${resto}min` : `${resto}min`;
};

const competenciaAtual = () => {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
};

const dataISO = (diasAtras: number) => {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().slice(0, 10);
};

export const PainelMetasDiario = () => {
  const [visao, setVisao] = useState<'veiculo' | 'motorista'>('veiculo');
  const [dataInicio, setDataInicio] = useState(dataISO(30));
  const [dataFim, setDataFim] = useState(dataISO(0));
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [selecionado, setSelecionado] = useState<string>('');

  const [porVeiculo, setPorVeiculo] = useState<ResultadoDiarioVeiculo[]>([]);
  const [porMotorista, setPorMotorista] = useState<ResultadoDiarioMotorista[]>([]);
  const [motivos, setMotivos] = useState<MotivoOperacao[]>([]);
  const [motor, setMotor] = useState<TempoMotor[]>([]);
  const [progVeiculo, setProgVeiculo] = useState<ProgressoVeiculo[]>([]);
  const [progMotorista, setProgMotorista] = useState<ProgressoMotorista[]>([]);

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarDiario = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}/api/metas/diario?modo=diario&dataInicio=${dataInicio}&dataFim=${dataFim}`);
      if (!resp.ok) throw new Error('Falha ao consultar a API');
      const dados = await resp.json();
      setPorVeiculo(dados.porVeiculo ?? []);
      setPorMotorista(dados.porMotorista ?? []);
      setErro(null);
    } catch (error) {
      console.error('Erro ao buscar painel diário:', error);
      setErro('Não foi possível conectar ao banco de dados da fazenda (SQL Server). As views do painel diário (sql/013_painel_metas_completo.sql) existem?');
    } finally {
      setLoading(false);
    }
  };

  const carregarProgresso = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/metas/diario?modo=progresso&competencia=${competencia}`);
      if (!resp.ok) throw new Error('Falha ao consultar a API');
      const dados = await resp.json();
      setProgVeiculo(dados.porVeiculo ?? []);
      setProgMotorista(dados.porMotorista ?? []);
    } catch (error) {
      console.error('Erro ao buscar progresso mensal:', error);
    }
  };

  useEffect(() => {
    carregarDiario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicio, dataFim]);

  useEffect(() => {
    carregarProgresso();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competencia]);

  // Lista de opções pro seletor de veículo/motorista vem do próprio resultado diário — não
  // precisa de endpoint novo só pra listar equipamentos.
  const opcoesVeiculo = useMemo(() => {
    const mapa = new Map<number, string>();
    porVeiculo.forEach((l) => mapa.set(l.EquipamentoId, `${l.NomeEquipamento} (${l.CodigoEquipamento})`));
    return Array.from(mapa.entries());
  }, [porVeiculo]);

  const opcoesMotorista = useMemo(
    () => Array.from(new Set(porMotorista.map((l) => l.MotoristaNomeFicha))),
    [porMotorista]
  );

  useEffect(() => {
    setSelecionado('');
  }, [visao]);

  const equipamentoIdSelecionado = visao === 'veiculo' && selecionado ? Number(selecionado) : null;

  useEffect(() => {
    if (equipamentoIdSelecionado === null) {
      setMotivos([]);
      setMotor([]);
      return;
    }
    fetch(`${API_URL}/api/metas/diario?modo=motivos&equipamentoId=${equipamentoIdSelecionado}&dataInicio=${dataInicio}&dataFim=${dataFim}`)
      .then((r) => r.json())
      .then(setMotivos)
      .catch(() => setMotivos([]));
    fetch(`${API_URL}/api/metas/diario?modo=motor&equipamentoId=${equipamentoIdSelecionado}&dataInicio=${dataInicio}&dataFim=${dataFim}`)
      .then((r) => r.json())
      .then(setMotor)
      .catch(() => setMotor([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipamentoIdSelecionado, dataInicio, dataFim]);

  const serieGrafico = useMemo(() => {
    if (visao === 'veiculo') {
      const linhas = equipamentoIdSelecionado !== null
        ? porVeiculo.filter((l) => l.EquipamentoId === equipamentoIdSelecionado)
        : [];
      return linhas
        .slice()
        .sort((a, b) => a.Dia.localeCompare(b.Dia))
        .map((l) => ({ dia: formatData(l.Dia), realizado: l.CustoOperacionalRealDia ?? 0, esperado: l.CustoEsperadoDia ?? 0, bateu: (l.ResultadoDia ?? 0) >= 0 }));
    }
    const linhas = selecionado ? porMotorista.filter((l) => l.MotoristaNomeFicha === selecionado) : [];
    return linhas
      .slice()
      .sort((a, b) => a.Dia.localeCompare(b.Dia))
      .map((l) => ({ dia: formatData(l.Dia), realizado: l.CustoOperacionalRealDia ?? 0, esperado: l.CustoEsperadoDia ?? 0, bateu: (l.ResultadoDia ?? 0) >= 0 }));
  }, [visao, porVeiculo, porMotorista, equipamentoIdSelecionado, selecionado]);

  const motorTotais = motor.reduce(
    (acc, m) => ({ ligado: acc.ligado + (m.MinutosMotorLigado ?? 0), ocioso: acc.ocioso + (m.MinutosMotorOcioso ?? 0) }),
    { ligado: 0, ocioso: 0 }
  );

  interface LinhaRankingProgresso {
    chave: string;
    rotulo: string;
    qtdCaminhoes: number | null;
    DiaDoMesAtual: number;
    DiasNoMes: number;
    KmAcumuladoMes: number | null;
    SaldoAcumuladoMes: number | null;
  }

  const rankingProgresso: LinhaRankingProgresso[] = visao === 'veiculo'
    ? progVeiculo.map((p) => ({
        chave: `${p.EquipamentoId}`,
        rotulo: `${p.NomeEquipamento} (${p.CodigoEquipamento})`,
        qtdCaminhoes: null,
        DiaDoMesAtual: p.DiaDoMesAtual,
        DiasNoMes: p.DiasNoMes,
        KmAcumuladoMes: p.KmAcumuladoMes,
        SaldoAcumuladoMes: p.SaldoAcumuladoMes,
      }))
    : progMotorista.map((p) => ({
        chave: p.MotoristaNomeFicha,
        rotulo: p.MotoristaNomeFicha,
        qtdCaminhoes: p.QtdCaminhoes,
        DiaDoMesAtual: p.DiaDoMesAtual,
        DiasNoMes: p.DiasNoMes,
        KmAcumuladoMes: p.KmAcumuladoMes,
        SaldoAcumuladoMes: p.SaldoAcumuladoMes,
      }));

  const coberturaMes = rankingProgresso[0];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => { carregarDiario(); carregarProgresso(); }}
          className="inline-flex items-center px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm"
        >
          <RefreshCw size={16} className="mr-2" />
          Atualizar
        </button>
      </div>

      {erro && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{erro}</div>}

      <div className="bg-white p-2 rounded-2xl shadow-soft border border-slate-200/80 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setVisao('veiculo')}
            className={`flex-1 md:flex-none px-5 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${visao === 'veiculo' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Truck size={14} /> Por veículo
          </button>
          <button
            onClick={() => setVisao('motorista')}
            className={`flex-1 md:flex-none px-5 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${visao === 'motorista' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <User size={14} /> Por motorista
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-2">
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium bg-slate-50" />
          <span className="text-xs text-slate-400">até</span>
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium bg-slate-50" />
          <select value={selecionado} onChange={(e) => setSelecionado(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium bg-slate-50 min-w-[220px]">
            <option value="">{visao === 'veiculo' ? 'Selecione um veículo' : 'Selecione um motorista'}</option>
            {visao === 'veiculo'
              ? opcoesVeiculo.map(([id, label]) => <option key={id} value={id}>{label}</option>)
              : opcoesMotorista.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">Carregando...</div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-soft border border-slate-200/80 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-1">Meta x Realizado por dia</h3>
            <p className="text-xs text-slate-400 mb-3">Colunas verdes = bateu a meta do dia; vermelhas = não bateu. Linha = custo esperado (MetaCpk × km rodado).</p>
            {serieGrafico.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">Selecione {visao === 'veiculo' ? 'um veículo' : 'um motorista'} pra ver o gráfico.</p>
            ) : (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={serieGrafico} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => formatMoeda(Number(value))} />
                    <Bar dataKey="realizado" name="Custo realizado" radius={[4, 4, 0, 0]}>
                      {serieGrafico.map((s, idx) => (
                        <Cell key={idx} fill={s.bateu ? '#16a34a' : '#e11d48'} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="esperado" name="Custo esperado" stroke="#0f172a" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {visao === 'veiculo' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-soft border border-slate-200/80 p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-amber-500" /> Motivos de parada e operação</h3>
                {equipamentoIdSelecionado === null ? (
                  <p className="text-sm text-slate-400 text-center py-8">Selecione um veículo.</p>
                ) : motivos.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">Sem dado no período.</p>
                ) : (
                  <div className="space-y-2">
                    {motivos.slice(0, 8).map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{m.OperacaoDescricao ?? m.Estado ?? '—'}</span>
                        <span className="font-mono font-bold text-slate-800">{formatMinutos(m.MinutosAproximados)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-soft border border-slate-200/80 p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Gauge size={16} className="text-slate-500" /> Motor ligado x ocioso</h3>
                {equipamentoIdSelecionado === null ? (
                  <p className="text-sm text-slate-400 text-center py-8">Selecione um veículo.</p>
                ) : motor.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">Sem dado no período.</p>
                ) : (
                  <div style={{ width: '100%', height: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{ nome: 'Período', Ligado: motorTotais.ligado, Ocioso: motorTotais.ocioso }]} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="nome" hide />
                        <Tooltip formatter={(value) => formatMinutos(Number(value))} />
                        <Bar dataKey="Ligado" fill="#0ea5e9" radius={[6, 6, 6, 6]} barSize={28} />
                        <Bar dataKey="Ocioso" fill="#f59e0b" radius={[6, 6, 6, 6]} barSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-slate-500 mt-2">Motor ligado: <b>{formatMinutos(motorTotais.ligado)}</b> · Ocioso (ligado + parado): <b className="text-amber-600">{formatMinutos(motorTotais.ocioso)}</b></p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-soft border border-slate-200/80 p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Trophy size={16} className="text-amber-500" /> Progresso do mês (ponto de equilíbrio) e ranking</h3>
              <input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-medium bg-slate-50" />
            </div>
            {coberturaMes && (
              <p className="text-xs text-slate-400 mb-3">Calculado com {coberturaMes.DiaDoMesAtual} de {coberturaMes.DiasNoMes} dias do mês sincronizados.</p>
            )}
            <DataTable
              columns={[
                {
                  header: '#',
                  align: 'center' as const,
                  render: (l: (typeof rankingProgresso)[number]) => {
                    const posicao = rankingProgresso.indexOf(l) + 1;
                    return (
                      <span className="flex items-center justify-center gap-1 font-mono font-bold text-slate-500">
                        {posicao === 1 && <Trophy size={14} className="text-amber-500" />}
                        {(posicao === 2 || posicao === 3) && <Medal size={14} className="text-slate-400" />}
                        {posicao}
                      </span>
                    );
                  },
                },
                {
                  header: visao === 'veiculo' ? 'Veículo' : 'Motorista',
                  render: (l: (typeof rankingProgresso)[number]) => (
                    <div>
                      <p className="font-bold text-slate-800">{l.rotulo}</p>
                      {l.qtdCaminhoes !== null && l.qtdCaminhoes > 1 && (
                        <p className="text-xs text-slate-500">{l.qtdCaminhoes} caminhões</p>
                      )}
                    </div>
                  ),
                },
                {
                  header: 'Km acumulado',
                  align: 'right' as const,
                  render: (l: (typeof rankingProgresso)[number]) => <span className="font-mono">{l.KmAcumuladoMes?.toLocaleString('pt-BR') ?? '—'}</span>,
                },
                {
                  header: 'Saldo acumulado (ponto de equilíbrio)',
                  align: 'right' as const,
                  render: (l: (typeof rankingProgresso)[number]) => (
                    <span className={`font-mono font-bold ${((l.SaldoAcumuladoMes ?? 0) >= 0) ? 'text-green-600' : 'text-rose-600'}`}>
                      {formatMoeda(l.SaldoAcumuladoMes)}
                    </span>
                  ),
                },
              ]}
              data={rankingProgresso}
              keyExtractor={(l) => l.chave}
              emptyMessage="Sem dado de progresso pra esta competência ainda."
            />
          </div>
        </>
      )}
    </div>
  );
};
