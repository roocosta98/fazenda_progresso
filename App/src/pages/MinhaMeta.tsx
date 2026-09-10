import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Fuel, Gauge, PartyPopper, TrendingUp, CalendarDays, Truck } from 'lucide-react';
import { BarChart, Bar, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { MetaMotorista, ResultadoDiarioMotorista, ProgressoMensalMotorista } from '../types';

const formatNumero = (valor: number | null, casas = 2) =>
  valor === null ? '—' : valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

const formatMoeda = (valor: number | null) =>
  valor === null ? '—' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDia = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return iso;
  }
};

export const MinhaMeta: React.FC = () => {
  const navigate = useNavigate();
  const { motorista } = useAuth();
  const [metas, setMetas] = useState<MetaMotorista[]>([]);
  const [diario, setDiario] = useState<ResultadoDiarioMotorista[]>([]);
  const [progresso, setProgresso] = useState<ProgressoMensalMotorista | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!motorista) return;
    api
      .minhaMeta(motorista)
      .then((dados) => {
        setMetas(dados);
        setErro(null);
      })
      .catch((error) => {
        console.error('Erro ao buscar minha meta:', error);
        setErro('Não foi possível carregar sua meta agora. Verifique sua conexão.');
      })
      .finally(() => setLoading(false));

    // Painel de Metas Completo (diário, PRD v3 §5/§10.2) — não bloqueia a tela principal se
    // falhar (ex.: views do painel diário ainda não sincronizadas), só some as seções extras.
    api.metaDiaria(motorista).then(setDiario).catch(() => setDiario([]));
    api.progressoMensal(motorista).then(setProgresso).catch(() => setProgresso(null));
  }, [motorista]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <div className="bg-[#1E3A2F] text-white px-4 py-4 shadow-md flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="mr-3 p-1.5 rounded-full hover:bg-[#2D5A46] active:bg-green-800 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-lg font-bold leading-tight">Minha Meta</h1>
            <p className="text-xs text-green-100">Programa Motorista de Excelência</p>
          </div>
        </div>
        <Trophy size={22} className="text-green-100" />
      </div>

      <div className="flex-1 p-4 space-y-4 pb-10">
        {loading && <p className="text-sm text-slate-400 text-center py-12">Carregando sua meta...</p>}

        {erro && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm">{erro}</div>
        )}

        {!loading && !erro && metas.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center text-slate-400 text-sm">
            Nenhuma meta encontrada pro seu nome neste mês ainda. Fale com a logística se isso não for esperado.
          </div>
        )}

        {progresso && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><TrendingUp size={16} className="text-[#1E3A2F]" /> Ponto de equilíbrio do mês</h3>
              {progresso.QtdCaminhoes > 1 && (
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><Truck size={12} /> {progresso.QtdCaminhoes} caminhões</span>
              )}
            </div>
            <p className={`text-2xl font-black ${((progresso.SaldoAcumuladoMes ?? 0) >= 0) ? 'text-[#1E3A2F]' : 'text-rose-600'}`}>
              {formatMoeda(progresso.SaldoAcumuladoMes)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {(progresso.SaldoAcumuladoMes ?? 0) >= 0 ? 'Você está dentro do orçamento do mês até hoje.' : 'Você já ultrapassou o custo esperado do mês até hoje.'}
            </p>
            <p className="text-[11px] text-slate-400 mt-2">Calculado com {progresso.DiaDoMesAtual} de {progresso.DiasNoMes} dias do mês sincronizados.</p>
          </div>
        )}

        {diario.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><CalendarDays size={16} className="text-[#1E3A2F]" /> Meta x realizado por dia</h3>
            <p className="text-[11px] text-slate-400 mb-3">Barras verdes = bateu a meta do dia. Linha = custo esperado.</p>
            <div style={{ width: '100%', height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={diario.map((d) => ({ dia: formatDia(d.Dia), realizado: d.CustoOperacionalRealDia ?? 0, esperado: d.CustoEsperadoDia ?? 0, bateu: (d.ResultadoDia ?? 0) >= 0 }))}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => formatMoeda(Number(value))} />
                  <Bar dataKey="realizado" radius={[4, 4, 0, 0]}>
                    {diario.map((d, idx) => (
                      <Cell key={idx} fill={(d.ResultadoDia ?? 0) >= 0 ? '#16a34a' : '#e11d48'} />
                    ))}
                  </Bar>
                  <Line type="monotone" dataKey="esperado" stroke="#0f172a" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {metas.map((meta) => {
          const bateuKmL = meta.PercentualMetaKmL !== null && meta.PercentualMetaKmL >= 100;
          const bateuCpk = meta.PercentualMetaCpk !== null && meta.PercentualMetaCpk >= 100;

          return (
            <div key={meta.EquipamentoId} className="space-y-4">
              {(bateuKmL || bateuCpk) && (
                <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-amber-500/20">
                  <PartyPopper size={28} />
                  <div>
                    <p className="font-black text-sm">Parabéns! Você bateu a meta 🎉</p>
                    <p className="text-xs text-amber-50">Continue assim em {meta.Atividade ?? 'sua atividade'}.</p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{meta.Atividade ?? 'Atividade'}</p>
                <p className="text-sm font-bold text-slate-700 mb-4">{meta.NomeEquipamento}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-100 border border-slate-200 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-[#1E3A2F] uppercase flex items-center gap-1"><Fuel size={12} /> Km/L</p>
                    <p className="text-xl font-black text-[#1E3A2F]">{formatNumero(meta.KmLRealizado)}</p>
                    <p className="text-[11px] text-[#1E3A2F]">Meta: {formatNumero(meta.MetaKmL)}</p>
                    {meta.PercentualMetaKmL !== null && (
                      <div className="mt-2 h-1.5 bg-[#D4AF37]/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-1000 rounded-full"
                          style={{ width: `${Math.min(100, meta.PercentualMetaKmL)}%` }}
                        />
                      </div>
                    )}
                    <p className="text-[11px] font-bold text-[#1E3A2F] mt-1">
                      {meta.PercentualMetaKmL !== null ? `${formatNumero(meta.PercentualMetaKmL, 0)}% da meta` : 'Sem leitura suficiente ainda'}
                    </p>
                  </div>

                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-amber-600 uppercase flex items-center gap-1"><Gauge size={12} /> CPK</p>
                    <p className="text-xl font-black text-amber-800">{formatMoeda(meta.CpkRealizado)}</p>
                    <p className="text-[11px] text-amber-600">Meta: {formatMoeda(meta.MetaCpk)}</p>
                    {meta.PercentualMetaCpk !== null && (
                      <div className="mt-2 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.min(100, meta.PercentualMetaCpk)}%` }}
                        />
                      </div>
                    )}
                    <p className="text-[11px] font-bold text-amber-700 mt-1">
                      {meta.PercentualMetaCpk !== null ? `${formatNumero(meta.PercentualMetaCpk, 0)}% da meta` : 'Sem leitura suficiente ainda'}
                    </p>
                  </div>
                </div>

                {meta.PosicaoRanking !== null && (
                  <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-slate-400" /> Posição no ranking ({meta.Atividade})
                    </span>
                    <span className="text-sm font-black text-slate-800">
                      {meta.PosicaoRanking}º de {meta.TotalMotoristasAtividade}
                    </span>
                  </div>
                )}

                {meta.ReconhecimentoMensal !== null && (
                  <div className="mt-3 bg-[#1E3A2F] text-white rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs font-bold">Reconhecimento do mês</span>
                    <span className="text-sm font-black">{formatMoeda(meta.ReconhecimentoMensal)}</span>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-3">Histórico → Meta → Futuro</h3>
                <div style={{ width: '100%', height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { fase: 'Hist.', KmL: meta.KmLHistorico ?? 0 },
                        { fase: 'Meta', KmL: meta.MetaKmL ?? 0 },
                        { fase: 'Futuro', KmL: meta.KmLFuturo ?? 0 },
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="fase" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value) => [`${value} km/L`, 'Km/L']} />
                      <Bar dataKey="KmL" radius={[6, 6, 0, 0]} fill="#16a34a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
