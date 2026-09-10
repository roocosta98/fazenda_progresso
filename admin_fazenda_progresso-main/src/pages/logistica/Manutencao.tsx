import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, Filter, Plus, Search, Wrench, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const STORAGE_KEY = 'fp-manutencao-ordens-v1';

type AbaManutencao = 'visao-geral' | 'preventivas' | 'ordens' | 'historico';
type StatusOS = 'aberta' | 'em_andamento' | 'concluida';

interface Equipamento { EquipamentoId: number; CodigoEquipamento: string; Nome: string; TipoEquipamento: string | null; }
interface Ordem { id: string; equipamentoId: number; equipamento: string; codigo: string; tipo: 'Preventiva' | 'Corretiva'; servico: string; responsavel: string; prevista: string; custo: number; status: StatusOS; }

const hoje = new Date().toISOString().slice(0, 10);
const somaDias = (dias: number) => { const data = new Date(); data.setDate(data.getDate() + dias); return data.toISOString().slice(0, 10); };

const ordensIniciais: Ordem[] = [
  { id: 'OS-1042', equipamentoId: 1, equipamento: 'Trator John Deere 7230', codigo: 'TR-023', tipo: 'Preventiva', servico: 'Revisão de 1.000 h', responsavel: 'Oficina interna', prevista: somaDias(1), custo: 1850, status: 'aberta' },
  { id: 'OS-1041', equipamentoId: 2, equipamento: 'Colheitadeira S770', codigo: 'CL-011', tipo: 'Corretiva', servico: 'Inspeção do sistema hidráulico', responsavel: 'AgroMecânica', prevista: hoje, custo: 4200, status: 'em_andamento' },
  { id: 'OS-1038', equipamentoId: 3, equipamento: 'Pulverizador Imperador', codigo: 'PV-008', tipo: 'Preventiva', servico: 'Troca de filtros e óleo', responsavel: 'Oficina interna', prevista: somaDias(-4), custo: 980, status: 'concluida' },
];

const statusLabel: Record<StatusOS, string> = { aberta: 'Aberta', em_andamento: 'Em andamento', concluida: 'Concluída' };
const statusClass: Record<StatusOS, string> = { aberta: 'bg-amber-50 text-amber-700 border-amber-200', em_andamento: 'bg-sky-50 text-sky-700 border-sky-200', concluida: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
const formatarData = (data: string) => new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR');
const moeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const Manutencao = ({ abaInicial = 'visao-geral' }: { abaInicial?: AbaManutencao }) => {
  const [aba, setAba] = useState<AbaManutencao>(abaInicial);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [ordens, setOrdens] = useState<Ordem[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') ?? ordensIniciais; } catch { return ordensIniciais; }
  });
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | StatusOS>('todos');
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ equipamentoId: '', tipo: 'Preventiva' as Ordem['tipo'], servico: '', responsavel: 'Oficina interna', prevista: hoje, custo: '' });

  useEffect(() => { setAba(abaInicial); }, [abaInicial]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(ordens)); }, [ordens]);
  useEffect(() => {
    fetch(`${API_URL}/api/frota/equipamentos`).then((r) => r.ok ? r.json() : []).then(setEquipamentos).catch(() => setEquipamentos([]));
  }, []);

  const filtradas = useMemo(() => ordens.filter((ordem) => {
    const texto = `${ordem.id} ${ordem.equipamento} ${ordem.codigo} ${ordem.servico}`.toLowerCase();
    return texto.includes(busca.toLowerCase()) && (filtroStatus === 'todos' || ordem.status === filtroStatus);
  }), [ordens, busca, filtroStatus]);
  const abertas = ordens.filter((o) => o.status === 'aberta').length;
  const andamento = ordens.filter((o) => o.status === 'em_andamento').length;
  const vencidas = ordens.filter((o) => o.status !== 'concluida' && o.prevista < hoje).length;
  const proximas = ordens.filter((o) => o.status !== 'concluida').sort((a, b) => a.prevista.localeCompare(b.prevista));

  const criarOrdem = (event: React.FormEvent) => {
    event.preventDefault();
    const selecionado = equipamentos.find((e) => String(e.EquipamentoId) === form.equipamentoId);
    const referencia = selecionado ?? { EquipamentoId: 0, Nome: 'Equipamento não cadastrado', CodigoEquipamento: '—', TipoEquipamento: null };
    setOrdens((atual) => [{ id: `OS-${1043 + atual.length}`, equipamentoId: referencia.EquipamentoId, equipamento: referencia.Nome, codigo: referencia.CodigoEquipamento, tipo: form.tipo, servico: form.servico || 'Serviço de manutenção', responsavel: form.responsavel, prevista: form.prevista, custo: Number(form.custo) || 0, status: 'aberta' }, ...atual]);
    setModalAberto(false); setForm({ equipamentoId: '', tipo: 'Preventiva', servico: '', responsavel: 'Oficina interna', prevista: hoje, custo: '' });
  };
  const mudarStatus = (id: string, status: StatusOS) => setOrdens((atual) => atual.map((o) => o.id === id ? { ...o, status } : o));

  const tabs: { id: AbaManutencao; label: string; icon: React.ReactNode }[] = [
    { id: 'visao-geral', label: 'Visão geral', icon: <Wrench size={15} /> }, { id: 'preventivas', label: 'Agenda preventiva', icon: <CalendarClock size={15} /> },
    { id: 'ordens', label: 'Ordens de serviço', icon: <ClipboardList size={15} /> }, { id: 'historico', label: 'Histórico', icon: <CheckCircle2 size={15} /> },
  ];

  return <div className="space-y-6 pb-12">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Operação & frota</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">Manutenção</h2><p className="mt-1 text-sm text-slate-500">Planeje revisões, acompanhe serviços e registre o histórico dos equipamentos.</p></div>
      <button onClick={() => setModalAberto(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-800"><Plus size={17} /> Nova ordem</button>
    </div>
    <div className="flex w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200/70 bg-slate-100 p-1.5 sm:w-fit">{tabs.map((item) => <button key={item.id} onClick={() => setAba(item.id)} className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${aba === item.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{item.icon}{item.label}</button>)}</div>
    {aba === 'visao-geral' && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Kpi icone={<ClipboardList />} titulo="Ordens abertas" valor={abertas} detalhe="Aguardando início" cor="amber" /><Kpi icone={<Wrench />} titulo="Em manutenção" valor={andamento} detalhe="Serviços em execução" cor="sky" /><Kpi icone={<AlertTriangle />} titulo="Atenção imediata" valor={vencidas} detalhe="Prazo preventivo vencido" cor="rose" /><Kpi icone={<CheckCircle2 />} titulo="Concluídas no ciclo" valor={ordens.filter((o) => o.status === 'concluida').length} detalhe="Registros finalizados" cor="emerald" /></div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-bold text-slate-800">Próximas intervenções</h3><p className="text-xs text-slate-500">Priorizadas por data programada.</p></div><button onClick={() => setAba('preventivas')} className="text-xs font-bold text-emerald-700 hover:text-emerald-800">Ver agenda</button></div><ListaOrdens ordens={proximas.slice(0, 4)} aoAlterar={mudarStatus} compacta /></section>
    </>}
    {aba === 'preventivas' && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"><div className="mb-5"><h3 className="font-bold text-slate-800">Agenda preventiva</h3><p className="text-sm text-slate-500">Revisões programadas e tarefas que precisam de agendamento.</p></div><ListaOrdens ordens={proximas.filter((o) => o.tipo === 'Preventiva')} aoAlterar={mudarStatus} /></section>}
    {aba === 'ordens' && <section className="rounded-2xl border border-slate-200 bg-white shadow-soft"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between"><div><h3 className="font-bold text-slate-800">Ordens de serviço</h3><p className="text-sm text-slate-500">Acompanhe e atualize os serviços em aberto.</p></div><Filtros busca={busca} setBusca={setBusca} status={filtroStatus} setStatus={setFiltroStatus} /></div><div className="p-5"><ListaOrdens ordens={filtradas.filter((o) => o.status !== 'concluida')} aoAlterar={mudarStatus} /></div></section>}
    {aba === 'historico' && <section className="rounded-2xl border border-slate-200 bg-white shadow-soft"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between"><div><h3 className="font-bold text-slate-800">Histórico de serviços</h3><p className="text-sm text-slate-500">Ordens finalizadas e custos registrados.</p></div><Filtros busca={busca} setBusca={setBusca} status={filtroStatus} setStatus={setFiltroStatus} /></div><div className="p-5"><ListaOrdens ordens={filtradas.filter((o) => o.status === 'concluida')} aoAlterar={mudarStatus} /></div></section>}
    {modalAberto && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4"><form onSubmit={criarOrdem} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><div className="mb-5 flex items-start justify-between"><div><h3 className="text-lg font-bold text-slate-800">Nova ordem de serviço</h3><p className="text-sm text-slate-500">Registre a demanda para acompanhamento da equipe.</p></div><button type="button" onClick={() => setModalAberto(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button></div><div className="grid gap-4 sm:grid-cols-2"><Campo label="Equipamento"><select required value={form.equipamentoId} onChange={(e) => setForm({ ...form, equipamentoId: e.target.value })}><option value="">Selecione</option>{equipamentos.map((e) => <option key={e.EquipamentoId} value={e.EquipamentoId}>{e.Nome} · {e.CodigoEquipamento}</option>)}</select></Campo><Campo label="Tipo"><select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as Ordem['tipo'] })}><option>Preventiva</option><option>Corretiva</option></select></Campo><Campo label="Serviço"><input required value={form.servico} onChange={(e) => setForm({ ...form, servico: e.target.value })} placeholder="Ex.: troca de óleo" /></Campo><Campo label="Responsável"><input required value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></Campo><Campo label="Data prevista"><input required type="date" value={form.prevista} onChange={(e) => setForm({ ...form, prevista: e.target.value })} /></Campo><Campo label="Custo previsto"><input inputMode="decimal" value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} placeholder="0,00" /></Campo></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setModalAberto(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancelar</button><button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">Criar ordem</button></div></form></div>}
  </div>;
};

const Campo = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block text-xs font-bold text-slate-600">{label}<span className="mt-1.5 block [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-slate-200 [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-sm [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-slate-200 [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-sm">{children}</span></label>;
const kpiCores: Record<string, string> = { amber: 'bg-amber-50 text-amber-600', sky: 'bg-sky-50 text-sky-600', rose: 'bg-rose-50 text-rose-600', emerald: 'bg-emerald-50 text-emerald-600' };
const Kpi = ({ icone, titulo, valor, detalhe, cor }: { icone: React.ReactNode; titulo: string; valor: number; detalhe: string; cor: string }) => <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"><div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${kpiCores[cor]}`}>{icone}</div><p className="text-2xl font-bold text-slate-800">{valor}</p><p className="mt-1 text-sm font-bold text-slate-700">{titulo}</p><p className="mt-0.5 text-xs text-slate-500">{detalhe}</p></div>;
const Filtros = ({ busca, setBusca, status, setStatus }: { busca: string; setBusca: (v: string) => void; status: 'todos' | StatusOS; setStatus: (v: 'todos' | StatusOS) => void }) => <div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar ordem ou equipamento" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs sm:w-56" /></label><label className="relative"><Filter size={14} className="absolute left-3 top-2.5 text-slate-400" /><select value={status} onChange={(e) => setStatus(e.target.value as 'todos' | StatusOS)} className="rounded-xl border border-slate-200 py-2 pl-8 pr-3 text-xs"><option value="todos">Todos os status</option><option value="aberta">Abertas</option><option value="em_andamento">Em andamento</option><option value="concluida">Concluídas</option></select></label></div>;
const ListaOrdens = ({ ordens, aoAlterar, compacta = false }: { ordens: Ordem[]; aoAlterar: (id: string, status: StatusOS) => void; compacta?: boolean }) => ordens.length ? <div className="divide-y divide-slate-100">{ordens.map((o) => <div key={o.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-emerald-700">{o.id}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass[o.status]}`}>{statusLabel[o.status]}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{o.tipo}</span></div><p className="mt-1 truncate text-sm font-bold text-slate-800">{o.servico}</p><p className="text-xs text-slate-500">{o.equipamento} · {o.codigo} · {o.responsavel}</p></div><div className="flex items-center justify-between gap-4 md:justify-end"><div className="text-right text-xs"><p className="font-bold text-slate-700">{formatarData(o.prevista)}</p><p className="text-slate-500">{moeda(o.custo)}</p></div>{!compacta && o.status !== 'concluida' && <select aria-label={`Alterar status da ${o.id}`} value={o.status} onChange={(e) => aoAlterar(o.id, e.target.value as StatusOS)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-600"><option value="aberta">Aberta</option><option value="em_andamento">Em andamento</option><option value="concluida">Concluir</option></select>}</div></div>)}</div> : <div className="py-12 text-center text-sm text-slate-500">Nenhuma ordem encontrada para este filtro.</div>;
