import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, CircleHelp, RefreshCw, Truck, User, TrendingUp, TrendingDown } from 'lucide-react';
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
  COR, estiloTooltip, formatMoeda, formatMoedaCurta, hojeISO, diasAtrasISO, somar,
} from '../../components/common/vizTokens';
import { CardKpi, CardViz, SemDado, Legenda } from '../../components/common/viz';
import { useAuth } from '../../context/AuthContext';
import { cabecalhoPerfil } from '../../utils/apiAuth';

const API_URL = import.meta.env.VITE_API_URL ?? '';

// Lucro x Prejuízo (PRD v3 §5.2): ResultadoDia = CustoEsperadoDia − CustoOperacionalRealDia.
// Positivo = rodou abaixo da meta (economia); negativo = estourou a meta (prejuízo). As duas
// views já entregam isso pronto — por veículo e por motorista (essa última já somando todos os
// caminhões que o motorista rodou no dia, por isso QtdCaminhoes existe).
interface LinhaVeiculo {
  Dia: string;
  EquipamentoId: number;
  CodigoEquipamento: string | null;
  NomeEquipamento: string | null;
  MotoristaNomeFicha: string | null;
  KmRodadoDia: number | null;
  CustoOperacionalRealDia: number | null;
  CustoEsperadoDia: number | null;
  ResultadoDia: number | null;
  CustoCombustivelDia: number | null;
  CustoPneusDia: number | null;
  CustoManutencaoDia: number | null;
  CustoOutrosDia: number | null;
  CustoMotoristaRateadoDia: number | null;
}

interface LinhaMotorista {
  Dia: string;
  MotoristaNomeFicha: string;
  QtdCaminhoes: number | null;
  KmRodadoDia: number | null;
  CustoOperacionalRealDia: number | null;
  CustoEsperadoDia: number | null;
  ResultadoDia: number | null;
}

interface Agregado {
  chave: string;
  rotulo: string;
  detalhe: string;
  esperado: number;
  real: number;
  saldo: number;
  km: number;
  dias: number;
  diasPositivos: number;
  combustivel: number;
  pneusManutencao: number;
  outros: number;
  motorista: number;
  diasComMeta: number;
}

export const LucroPrejuizo: React.FC = () => {
  const { usuario } = useAuth();
  const [dataDe, setDataDe] = useState(diasAtrasISO(30));
  const [dataAte, setDataAte] = useState(hojeISO());
  const [visao, setVisao] = useState<'veiculo' | 'motorista'>('veiculo');

  const [porVeiculo, setPorVeiculo] = useState<LinhaVeiculo[]>([]);
  const [porMotorista, setPorMotorista] = useState<LinhaMotorista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const qs = new URLSearchParams({ dataInicio: dataDe, dataFim: dataAte, modo: 'diario' });
      const resp = await fetch(`${API_URL}/api/metas/diario?${qs}`, { headers: cabecalhoPerfil(usuario?.perfil) });
      if (!resp.ok) throw new Error(`API respondeu ${resp.status}`);
      const json = await resp.json();
      setPorVeiculo(json.porVeiculo ?? []);
      setPorMotorista(json.porMotorista ?? []);
      setErro(null);
    } catch (e) {
      console.error('Erro ao carregar lucro/prejuízo:', e);
      setErro('Não foi possível carregar os resultados do período. Verifique a conexão com o SQL Server.');
    } finally {
      setCarregando(false);
    }
  }, [dataDe, dataAte, usuario?.perfil]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const agregados = useMemo<Agregado[]>(() => {
    const mapa = new Map<string, Agregado>();

    const acumular = (chave: string, rotulo: string, detalhe: string, linha: {
      CustoEsperadoDia: number | null;
      CustoOperacionalRealDia: number | null;
      ResultadoDia: number | null;
      KmRodadoDia: number | null;
    }) => {
      const atual = mapa.get(chave) ?? { chave, rotulo, detalhe, esperado: 0, real: 0, saldo: 0, km: 0, dias: 0, diasComMeta: 0, diasPositivos: 0, combustivel: 0, pneusManutencao: 0, outros: 0, motorista: 0 };
      atual.esperado += linha.CustoEsperadoDia ?? 0;
      atual.real += linha.CustoOperacionalRealDia ?? 0;
      if (linha.CustoEsperadoDia !== null) {
        atual.saldo += linha.ResultadoDia ?? (linha.CustoEsperadoDia - (linha.CustoOperacionalRealDia ?? 0));
        atual.diasComMeta += 1;
        if ((linha.ResultadoDia ?? 0) >= 0) atual.diasPositivos += 1;
      }
      atual.km += linha.KmRodadoDia ?? 0;
      atual.dias += 1;
      if ('CustoCombustivelDia' in linha) {
        const veiculo = linha as LinhaVeiculo;
        atual.combustivel += veiculo.CustoCombustivelDia ?? 0;
        atual.pneusManutencao += (veiculo.CustoPneusDia ?? 0) + (veiculo.CustoManutencaoDia ?? 0);
        atual.outros += veiculo.CustoOutrosDia ?? 0;
        atual.motorista += veiculo.CustoMotoristaRateadoDia ?? 0;
      }
      atual.detalhe = detalhe;
      mapa.set(chave, atual);
    };

    if (visao === 'veiculo') {
      porVeiculo.forEach((l) => {
        acumular(
          String(l.EquipamentoId),
          l.NomeEquipamento ?? `Equipamento ${l.EquipamentoId}`,
          [l.CodigoEquipamento, l.MotoristaNomeFicha].filter(Boolean).join(' · ') || '—',
          l
        );
      });
    } else {
      porMotorista.forEach((l) => {
        const caminhoes = l.QtdCaminhoes ?? 0;
        acumular(
          l.MotoristaNomeFicha,
          l.MotoristaNomeFicha,
          caminhoes > 1 ? `${caminhoes} caminhões no período` : '1 caminhão',
          l
        );
      });
    }

    return Array.from(mapa.values()).sort((a, b) => b.saldo - a.saldo);
  }, [visao, porVeiculo, porMotorista]);

  const dadosGrafico = useMemo(
    () => agregados.filter((a) => a.diasComMeta > 0 && a.saldo !== 0).slice(0, 15),
    [agregados]
  );

  const totalLucro = somar(agregados.filter((a) => a.saldo > 0), (a) => a.saldo);
  const totalPrejuizo = somar(agregados.filter((a) => a.saldo < 0), (a) => a.saldo);
  const saldoLiquido = totalLucro + totalPrejuizo;
  const noPositivo = agregados.filter((a) => a.saldo >= 0).length;

  const substantivo = visao === 'veiculo' ? 'caminhão' : 'motorista';
  const substantivoPlural = visao === 'veiculo' ? 'caminhões' : 'motoristas';

  return (
    <div className={`space-y-5 transition-opacity ${carregando ? 'opacity-60' : 'opacity-100'}`}>
      {/* Filtros — uma linha só, acima de tudo que eles afetam */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex flex-wrap items-center gap-3">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setVisao('veiculo')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${visao === 'veiculo' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Truck size={14} /> Por caminhão
          </button>
          <button
            onClick={() => setVisao('motorista')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${visao === 'motorista' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <User size={14} /> Por motorista
          </button>
        </div>

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

        <button onClick={carregar}
          className="ml-auto inline-flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 text-xs">
          <RefreshCw size={13} className="mr-1.5" /> Atualizar
        </button>
      </div>

      {erro && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{erro}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CardKpi label="Economia total" valor={formatMoeda(totalLucro)} apoio={`${substantivoPlural} que rodaram abaixo da meta`} tom={COR.bom} />
        <CardKpi label="Prejuízo total" valor={formatMoeda(Math.abs(totalPrejuizo))} apoio={`${substantivoPlural} que estouraram a meta`} tom={COR.critico} />
        <CardKpi label="Saldo líquido" valor={formatMoeda(saldoLiquido)} apoio="Economia menos prejuízo no período"
          tom={saldoLiquido >= 0 ? COR.bom : COR.critico} destaque />
        <CardKpi label="No positivo" valor={`${noPositivo} / ${agregados.length}`} apoio={`${substantivoPlural} dentro da meta`} />
      </div>

      <CardViz
        titulo={`Lucro x prejuízo por ${substantivo} no período`}
        acessorio={<Legenda itens={[
          { cor: COR.bom, rotulo: 'Lucro (economia)' },
          { cor: COR.critico, rotulo: 'Prejuízo (estourou a meta)' },
        ]} />}
      >
        {dadosGrafico.length === 0 ? (
          <SemDado mensagem={`Nenhum resultado diário lançado no período pra calcular lucro/prejuízo por ${substantivo}.`} />
        ) : (
          <>
            <div style={{ height: Math.max(dadosGrafico.length * 34 + 40, 200) }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGrafico} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                  <CartesianGrid horizontal={false} stroke={COR.grid} />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: COR.tintaMuda, fontSize: 10 }}
                    tickFormatter={(v) => formatMoedaCurta(Number(v))} />
                  <YAxis type="category" dataKey="rotulo" width={visao === 'veiculo' ? 230 : 190} tickLine={false} axisLine={false}
                    tick={{ fill: COR.tintaSecundaria, fontSize: 11 }} />
                  <ReferenceLine x={0} stroke={COR.eixo} />
                  <Tooltip contentStyle={estiloTooltip} cursor={{ fill: 'rgba(11,11,11,0.03)' }}
                    formatter={(valor) => [formatMoeda(Number(valor)), Number(valor) >= 0 ? 'Lucro (economia)' : 'Prejuízo']} />
                  <Bar dataKey="saldo" radius={4} maxBarSize={22}>
                    {dadosGrafico.map((d) => (
                      <Cell key={d.chave} fill={d.saldo >= 0 ? COR.bom : COR.critico} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {agregados.length > dadosGrafico.length && (
              <p className="text-[11px] text-slate-400 mt-2">
                Mostrando os {dadosGrafico.length} maiores desvios de {agregados.length} {substantivoPlural} com dado no período.
              </p>
            )}
          </>
        )}
      </CardViz>

      <CardViz titulo={`Detalhamento por ${substantivo}`}>
        {agregados.length === 0 ? (
          <SemDado mensagem="Sem dado no período." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <th className="pb-3">{visao === 'veiculo' ? 'Caminhão' : 'Motorista'}</th>
                  <th className="pb-3 text-right">Custo esperado (meta)</th>
                  <th className="pb-3 text-right">Custo real</th>
                  <th className="pb-3 text-right">Km rodado</th>
                  <th className="pb-3 text-right">
                    <span className="inline-flex items-center justify-end gap-1">
                      Dias na meta
                      <span className="group relative inline-flex" tabIndex={0}>
                        <CircleHelp size={13} className="text-slate-400" aria-label="O que significa Dias na meta?" />
                        <span role="tooltip" className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 hidden w-64 rounded-lg bg-slate-900 p-2 text-left text-[10px] font-normal leading-relaxed text-white shadow-lg group-hover:block group-focus-within:block">
                          Quantidade de dias em que o custo operacional real foi menor ou igual ao custo esperado (Meta CPK × km rodado), sobre o total de dias com dados no período.
                        </span>
                      </span>
                    </span>
                  </th>
                  <th className="pb-3 text-right">Resultado</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agregados.map((a) => {
                  const aberto = expandidos[a.chave];
                  const desvio = a.real - a.esperado;
                  return <React.Fragment key={a.chave}>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3">
                      <p className="font-semibold text-slate-800">{a.rotulo}</p>
                      <p className="text-[11px] text-slate-500">{a.detalhe}</p>
                    </td>
                    <td className="py-3 text-right text-slate-600 tabular-nums">{a.diasComMeta ? formatMoeda(a.esperado) : 'Meta não cadastrada'}</td>
                    <td className="py-3 text-right text-slate-600 tabular-nums">{formatMoeda(a.real)}</td>
                    <td className="py-3 text-right text-slate-600 tabular-nums">
                      {a.km.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km
                    </td>
                    <td className="py-3 text-right text-slate-600 tabular-nums">{a.diasComMeta ? `${a.diasPositivos} / ${a.diasComMeta}` : 'Não comparável'}</td>
                    <td className="py-3 text-right font-bold tabular-nums">
                      {a.diasComMeta ? <span className="inline-flex items-center gap-1" style={{ color: a.saldo >= 0 ? COR.bom : COR.critico }}>
                        {a.saldo >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {formatMoeda(a.saldo)}
                      </span> : <span className="text-slate-400">Não comparável</span>}
                    </td>
                    <td className="py-3 text-right">
                      <button onClick={() => setExpandidos((estado) => ({ ...estado, [a.chave]: !estado[a.chave] }))}
                        className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-500" aria-label={`${aberto ? 'Fechar' : 'Abrir'} detalhamento de ${a.rotulo}`}>
                        {aberto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </td>
                  </tr>
                  {aberto && <tr>
                    <td colSpan={7} className="bg-slate-50/70 p-4 border-y border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="font-bold text-slate-800">Como o resultado foi calculado</p>
                          <p className="mt-2 text-slate-600">Meta esperada: {a.diasComMeta ? formatMoeda(a.esperado) : 'Meta não cadastrada'}</p>
                          <p className="text-slate-600">Realizado: {formatMoeda(a.real)}</p>
                          <p className="mt-1 font-bold" style={{ color: a.saldo >= 0 ? COR.bom : COR.critico }}>{a.saldo >= 0 ? 'Economia' : 'Excesso'}: {formatMoeda(Math.abs(a.saldo))}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="font-bold text-slate-800">Indicadores do período</p>
                          <p className="mt-2 text-slate-600">Km rodado: {a.km.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km</p>
                          <p className="text-slate-600">Custo por km: {a.km > 0 ? formatMoeda(a.real / a.km) : '—'}</p>
                          <p className="text-slate-600">Dias dentro da meta: {a.diasComMeta ? `${a.diasPositivos} de ${a.diasComMeta} dias com meta` : 'Não comparável — sem meta'}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="font-bold text-slate-800">Motivos do custo</p>
                          {visao === 'veiculo' ? <>
                            <p className="mt-2 text-slate-600">Combustível: {formatMoeda(a.combustivel)}</p>
                            <p className="text-slate-600">Pneus + manutenção: {formatMoeda(a.pneusManutencao)}</p>
                            <p className="text-slate-600">Motorista: {formatMoeda(a.motorista)}</p>
                            <p className="text-slate-600">Outros: {formatMoeda(a.outros)}</p>
                          </> : <p className="mt-2 text-slate-600">O detalhamento por natureza está disponível na visão por caminhão.</p>}
                          <p className="mt-2 font-semibold" style={{ color: desvio <= 0 ? COR.bom : COR.critico }}>{desvio <= 0 ? 'O realizado ficou abaixo do esperado.' : 'O realizado ultrapassou o esperado.'}</p>
                        </div>
                      </div>
                    </td>
                  </tr>}
                  </React.Fragment>;
                })}
              </tbody>
            </table>
            <p className="text-[11px] text-slate-400 mt-3">
              Resultado = custo esperado pela meta (MetaCpk × km rodado) − custo operacional real do dia, somado no período.
              Positivo significa que rodou mais barato que a meta.
            </p>
          </div>
        )}
      </CardViz>
    </div>
  );
};
