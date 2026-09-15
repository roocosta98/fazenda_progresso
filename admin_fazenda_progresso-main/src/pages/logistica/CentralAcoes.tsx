import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BarChart3, ClipboardCheck, Lightbulb, Search, Truck, TriangleAlert, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cabecalhoPerfil } from '../../utils/apiAuth';
import { formatMoeda } from '../../components/common/vizTokens';
import { Carregando, SemDado } from '../../components/common/viz';

const API_URL = import.meta.env.VITE_API_URL ?? '';

type Impacto = 'Crítico' | 'Alto' | 'Médio';
const IMPACTO_ESTILO: Record<Impacto, string> = {
  'Crítico': 'bg-rose-50 text-rose-700 border-rose-200',
  'Alto': 'bg-amber-50 text-amber-700 border-amber-200',
  'Médio': 'bg-blue-50 text-blue-700 border-blue-200',
};
const IMPACTO_PESO: Record<Impacto, number> = { 'Crítico': 0, 'Alto': 1, 'Médio': 2 };

type TipoAcao = 'Veículo' | 'Motorista' | 'Insight';
const ICONE_TIPO: Record<TipoAcao, typeof Truck> = { 'Veículo': Truck, 'Motorista': User, 'Insight': Lightbulb };

interface ItemAcao {
  tipo: TipoAcao;
  titulo: string;
  motivo: string;
  impacto: Impacto;
  to: string;
}

// Mesmo limite já usado no mapa de monitoramento (MapaMonitoramento.tsx): sem leitura há mais de
// 24h = offline. Duplicado aqui de propósito (função pequena, evita acoplar os dois arquivos).
function statusComunicacao(minutos: number | null): 'online' | 'atencao' | 'offline' | 'sem_dados' {
  if (minutos === null || minutos === undefined) return 'sem_dados';
  if (minutos <= 30) return 'online';
  if (minutos <= 1440) return 'atencao';
  return 'offline';
}

const numero = (valor: number | null | undefined, casas = 0) =>
  valor === null || valor === undefined ? '—' : valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

function CardAcoes({ Icon, cor, rotulo, valor }: { Icon: typeof Truck; cor: string; rotulo: string; valor: string }) {
  return (
    <div className="bg-white border rounded-2xl p-4">
      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3 ${cor}`}><Icon size={17} /></span>
      <p className="text-[11px] uppercase font-bold text-slate-400">{rotulo}</p>
      <p className="text-xl font-bold text-slate-800 mt-1">{valor}</p>
    </div>
  );
}

// Todas as regras aqui são de negócio simples (veículo sem comunicação, alarme registrado, saldo
// do mês negativo, nota de avaliação baixa, insight de custo não resolvido) — nunca um modelo
// preditivo ou pontuação de IA. Cada motivo vem direto do dado real já usado nas telas de origem
// (Telemetria & Mapa, Metas, Avaliação de Condução, Insights).
export function CentralAcoes() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [itens, setItens] = useState<ItemAcao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | TipoAcao>('todos');

  useEffect(() => {
    const headers = cabecalhoPerfil(usuario?.perfil);
    Promise.all([
      fetch(`${API_URL}/api/frota/posicoes`, { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch(`${API_URL}/api/metas/diario?modo=progresso`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${API_URL}/api/avaliacao`, { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch(`${API_URL}/api/insights/listar?resolvido=false`, { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([posicoes, progresso, avaliacoes, insights]) => {
      const resultado: ItemAcao[] = [];

      for (const p of Array.isArray(posicoes) ? posicoes : []) {
        const nome = `${p.Nome ?? p.CodigoEquipamento ?? 'Veículo'} (${p.CodigoEquipamento ?? '—'})`;
        const status = statusComunicacao(p.MinutosSemComunicacao ?? null);
        if (status === 'offline') {
          const horas = p.MinutosSemComunicacao != null ? Math.round(Number(p.MinutosSemComunicacao) / 60) : null;
          resultado.push({ tipo: 'Veículo', titulo: nome, motivo: horas != null ? `Sem comunicação há ${numero(horas)}h` : 'Sem comunicação há mais de 24h', impacto: 'Alto', to: '/logistica/monitoramento' });
        }
        const alarmes = Number(p.AlarmesUltimas24h ?? 0);
        if (alarmes > 0) {
          resultado.push({ tipo: 'Veículo', titulo: nome, motivo: `${numero(alarmes)} alarme(s) registrado(s) nas últimas 24h`, impacto: 'Crítico', to: '/logistica/monitoramento' });
        }
      }

      for (const m of progresso?.porMotorista ?? []) {
        const saldo = Number(m.SaldoAcumuladoMes ?? 0);
        if (saldo < 0) {
          resultado.push({ tipo: 'Motorista', titulo: String(m.MotoristaNomeFicha ?? '—'), motivo: `Saldo do mês abaixo do ponto de equilíbrio (${formatMoeda(saldo)})`, impacto: 'Alto', to: '/logistica/metas' });
        }
      }

      for (const a of Array.isArray(avaliacoes) ? avaliacoes : []) {
        const nota = Number(a.NotaFinal ?? 100);
        if (nota < 70) {
          resultado.push({ tipo: 'Motorista', titulo: String(a.MotoristaNomeFicha ?? '—'), motivo: `Avaliação de condução abaixo do esperado (nota ${numero(nota, 0)})`, impacto: 'Alto', to: '/logistica/avaliacao-conducao' });
        }
      }

      for (const i of Array.isArray(insights) ? insights : []) {
        const impacto: Impacto = i.Severidade === 'alta' ? 'Crítico' : i.Severidade === 'media' ? 'Alto' : 'Médio';
        resultado.push({ tipo: 'Insight', titulo: String(i.Titulo ?? '—'), motivo: String(i.Descricao ?? ''), impacto, to: '/logistica/dashboard' });
      }

      resultado.sort((a, b) => IMPACTO_PESO[a.impacto] - IMPACTO_PESO[b.impacto]);
      setItens(resultado);
      setCarregando(false);
    }).catch(() => { setErro('Não foi possível carregar a Central de Ações.'); setCarregando(false); });
  }, [usuario?.perfil]);

  const filtrados = useMemo(() => (itens ?? [])
    .filter((i) => tipoFiltro === 'todos' || i.tipo === tipoFiltro)
    .filter((i) => (i.titulo + i.motivo).toLocaleLowerCase().includes(busca.toLocaleLowerCase())),
    [itens, tipoFiltro, busca]);

  const criticos = (itens ?? []).filter((i) => i.impacto === 'Crítico').length;
  const altos = (itens ?? []).filter((i) => i.impacto === 'Alto').length;
  const medios = (itens ?? []).filter((i) => i.impacto === 'Médio').length;

  return <div className="space-y-5 pb-12">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold tracking-wider uppercase text-emerald-700">Logística</p>
        <h1 className="text-2xl font-bold text-slate-800">Central de Ações</h1>
        <p className="text-sm text-slate-500 mt-1">Veículos, motoristas e insights que pedem atenção agora, priorizados por impacto.</p>
      </div>
      <button onClick={() => navigate('/logistica/dashboard')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shrink-0">
        <BarChart3 size={15} className="text-emerald-700" /> Ver Dashboard
      </button>
    </div>
    {erro && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{erro}</div>}
    {carregando && !itens ? <div className="bg-white border rounded-2xl p-12"><Carregando mensagem="Carregando itens que precisam de ação…" /></div> : itens && (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <CardAcoes Icon={TriangleAlert} cor="bg-rose-50 text-rose-600" rotulo="Críticos" valor={numero(criticos)} />
          <CardAcoes Icon={AlertTriangle} cor="bg-amber-50 text-amber-600" rotulo="Alto impacto" valor={numero(altos)} />
          <CardAcoes Icon={AlertTriangle} cor="bg-blue-50 text-blue-600" rotulo="Médio impacto" valor={numero(medios)} />
          <CardAcoes Icon={ClipboardCheck} cor="bg-slate-100 text-slate-600" rotulo="Total de ações" valor={numero(itens.length)} />
        </div>

        <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
          <div className="p-5 pb-0">
            <h2 className="font-bold text-slate-800">Itens que precisam de ação</h2>
            <p className="text-xs text-slate-500 mt-1">Veículos sem comunicação ou com alarme, motoristas fora da meta ou com avaliação baixa, e insights de custo ainda não resolvidos. Ordenado por impacto.</p>
          </div>
          <div className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 border rounded-xl px-3 py-2 max-w-sm text-slate-500 flex-1 min-w-[200px]">
                <Search size={14} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por veículo, motorista ou insight" className="w-full outline-none text-xs" />
              </label>
              <div className="flex items-center gap-1 border rounded-xl p-1 text-xs">
                {(['todos', 'Veículo', 'Motorista', 'Insight'] as const).map((valor) => (
                  <button key={valor} onClick={() => setTipoFiltro(valor)}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${tipoFiltro === valor ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                    {valor === 'todos' ? 'Todos' : `${valor}s`}
                  </button>
                ))}
              </div>
            </div>
            {filtrados.length === 0 ? <SemDado mensagem="Nenhum item precisa de ação com esse filtro." /> : (
              <div className="overflow-auto max-h-[560px] border rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500">
                    <tr><th className="p-3 font-semibold">Tipo</th><th className="p-3 font-semibold">Item</th><th className="p-3 font-semibold">Impacto</th><th className="p-3 font-semibold">Motivo</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtrados.map((item, i) => {
                      const Icon = ICONE_TIPO[item.tipo];
                      return (
                        <tr key={i} onClick={() => navigate(item.to)} className="hover:bg-slate-50 cursor-pointer">
                          <td className="p-3 whitespace-nowrap text-slate-500"><span className="inline-flex items-center gap-1.5"><Icon size={13} className="text-slate-400" />{item.tipo}</span></td>
                          <td className="p-3 font-semibold text-slate-700 whitespace-nowrap">{item.titulo}</td>
                          <td className="p-3 whitespace-nowrap"><span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-bold ${IMPACTO_ESTILO[item.impacto]}`}>{item.impacto}</span></td>
                          <td className="p-3 text-slate-500">{item.motivo}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-2">Exibindo {filtrados.length} de {itens.length} item(ns) · clique numa linha pra ver a tela de origem</p>
          </div>
        </section>
      </>
    )}
  </div>;
}
