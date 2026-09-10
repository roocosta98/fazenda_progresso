import { useMemo, useState } from 'react';
import { CalendarDays, Plus, Search, Sprout } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';

type StatusSafra = 'Planejada' | 'Em andamento' | 'Encerrada';

interface Safra {
  id: string;
  nome: string;
  cultura: string;
  inicio: string;
  termino: string;
  area: number;
  status: StatusSafra;
}

const safraInicial: Safra[] = [
  { id: 'SAF-001', nome: 'Safra de Soja 2026', cultura: 'Soja', inicio: '2026-09-01', termino: '2027-02-15', area: 1240, status: 'Em andamento' },
  { id: 'SAF-002', nome: 'Safra de Milho Verão 2026', cultura: 'Milho', inicio: '2026-08-20', termino: '2027-01-30', area: 680, status: 'Em andamento' },
  { id: 'SAF-003', nome: 'Safrinha 2027', cultura: 'Milho', inicio: '2027-02-20', termino: '2027-06-30', area: 430, status: 'Planejada' },
];

const statusStyle: Record<StatusSafra, string> = {
  Planejada: 'bg-amber-50 text-amber-700 border-amber-200',
  'Em andamento': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Encerrada: 'bg-slate-100 text-slate-600 border-slate-200',
};

const formatDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR');

export const Safras = () => {
  const [safras, setSafras] = useState<Safra[]>(safraInicial);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ nome: '', cultura: 'Soja', inicio: '', termino: '', area: '', status: 'Planejada' as StatusSafra });

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return termo ? safras.filter((safra) => `${safra.nome} ${safra.cultura} ${safra.status}`.toLowerCase().includes(termo)) : safras;
  }, [busca, safras]);

  const fecharModal = () => {
    setModalAberto(false);
    setForm({ nome: '', cultura: 'Soja', inicio: '', termino: '', area: '', status: 'Planejada' });
  };

  const salvarSafra = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.nome || !form.inicio || !form.termino || !form.area) return;
    setSafras((atuais) => [{
      id: `SAF-${String(atuais.length + 1).padStart(3, '0')}`,
      nome: form.nome,
      cultura: form.cultura,
      inicio: form.inicio,
      termino: form.termino,
      area: Number(form.area),
      status: form.status,
    }, ...atuais]);
    fecharModal();
  };

  const columns = [
    { header: 'Safra', render: (safra: Safra) => <div><p className="font-bold text-slate-800">{safra.nome}</p><p className="text-[11px] text-slate-400 font-mono mt-0.5">{safra.id}</p></div> },
    { header: 'Cultura', render: (safra: Safra) => <span className="text-slate-600 font-medium">{safra.cultura}</span> },
    { header: 'Período', render: (safra: Safra) => <span className="text-slate-600">{formatDate(safra.inicio)} <span className="text-slate-400">até</span> {formatDate(safra.termino)}</span> },
    { header: 'Área', align: 'right' as const, render: (safra: Safra) => <span className="font-semibold text-slate-700">{safra.area.toLocaleString('pt-BR')} ha</span> },
    { header: 'Status', align: 'center' as const, render: (safra: Safra) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyle[safra.status]}`}>{safra.status}</span> },
  ];

  return <div className="space-y-6 pb-12">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div><h2 className="text-2xl font-bold text-slate-800 tracking-tight">Safras</h2><p className="text-slate-500 mt-1">Planeje e acompanhe os ciclos produtivos da fazenda.</p></div>
      <button onClick={() => setModalAberto(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white rounded-xl font-bold text-sm hover:bg-emerald-800 transition-colors shadow-sm"><Plus size={17} /> Nova safra</button>
    </div>

    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-soft flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-slate-700"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Sprout size={20} /></div><div><p className="text-sm font-bold">{safras.length} safras cadastradas</p><p className="text-xs text-slate-500">{safras.filter((s) => s.status === 'Em andamento').length} em andamento</p></div></div>
      <div className="relative w-full sm:w-80"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar safra ou cultura..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15" /></div>
    </div>
    <DataTable columns={columns} data={filtradas} keyExtractor={(safra) => safra.id} emptyMessage="Nenhuma safra encontrada." />

    <Modal isOpen={modalAberto} onClose={fecharModal} title="Cadastrar nova safra" maxWidth="max-w-2xl">
      <form onSubmit={salvarSafra} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="sm:col-span-2 text-sm font-semibold text-slate-700">Nome da safra<input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Safra de Soja 2027" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-500" /></label>
          <label className="text-sm font-semibold text-slate-700">Cultura<select value={form.cultura} onChange={(e) => setForm({ ...form, cultura: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-500"><option>Soja</option><option>Milho</option><option>Algodão</option><option>Feijão</option><option>Outra</option></select></label>
          <label className="text-sm font-semibold text-slate-700">Área prevista (ha)<input required min="0.01" step="0.01" type="number" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-500" /></label>
          <label className="text-sm font-semibold text-slate-700">Início<input required type="date" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-500" /></label>
          <label className="text-sm font-semibold text-slate-700">Término previsto<input required min={form.inicio || undefined} type="date" value={form.termino} onChange={(e) => setForm({ ...form, termino: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-500" /></label>
          <label className="text-sm font-semibold text-slate-700">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusSafra })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-500"><option>Planejada</option><option>Em andamento</option><option>Encerrada</option></select></label>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={fecharModal} className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white text-sm font-bold rounded-lg hover:bg-emerald-800"><CalendarDays size={16} /> Salvar safra</button></div>
      </form>
    </Modal>
  </div>;
};
