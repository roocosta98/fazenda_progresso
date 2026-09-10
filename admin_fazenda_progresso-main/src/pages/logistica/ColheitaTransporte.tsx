import { useMemo, useState } from 'react';
import { Plus, Search, Tractor, Truck } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';

type StatusOperacao = 'Programada' | 'Em execução' | 'Concluída';

interface Operacao {
  id: string;
  safra: string;
  frente: string;
  tipo: 'Colheita' | 'Transporte';
  equipamento: string;
  responsavel: string;
  data: string;
  quantidade: number;
  unidade: 'ha' | 't';
  status: StatusOperacao;
}

const operacoesIniciais: Operacao[] = [
  { id: 'OPE-001', safra: 'Safra de Soja 2026', frente: 'Talhão 12', tipo: 'Colheita', equipamento: 'Colheitadeira CR 7.90', responsavel: 'João da Silva', data: '2026-09-10', quantidade: 48, unidade: 'ha', status: 'Em execução' },
  { id: 'OPE-002', safra: 'Safra de Soja 2026', frente: 'Talhão 12', tipo: 'Transporte', equipamento: 'Volvo VM 270 • QWE-1A23', responsavel: 'Marcos Lima', data: '2026-09-10', quantidade: 82, unidade: 't', status: 'Em execução' },
  { id: 'OPE-003', safra: 'Safra de Milho Verão 2026', frente: 'Talhão 04', tipo: 'Colheita', equipamento: 'Colheitadeira S770', responsavel: 'Ana Costa', data: '2026-09-12', quantidade: 36, unidade: 'ha', status: 'Programada' },
];

const statusStyle: Record<StatusOperacao, string> = {
  Programada: 'bg-amber-50 text-amber-700 border-amber-200',
  'Em execução': 'bg-sky-50 text-sky-700 border-sky-200',
  Concluída: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const ColheitaTransporte = () => {
  const [operacoes, setOperacoes] = useState<Operacao[]>(operacoesIniciais);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ safra: 'Safra de Soja 2026', frente: '', tipo: 'Colheita' as Operacao['tipo'], equipamento: '', responsavel: '', data: '', quantidade: '', status: 'Programada' as StatusOperacao });

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return termo ? operacoes.filter((operacao) => `${operacao.safra} ${operacao.frente} ${operacao.tipo} ${operacao.equipamento} ${operacao.responsavel}`.toLowerCase().includes(termo)) : operacoes;
  }, [busca, operacoes]);

  const fecharModal = () => { setModalAberto(false); setForm({ safra: 'Safra de Soja 2026', frente: '', tipo: 'Colheita', equipamento: '', responsavel: '', data: '', quantidade: '', status: 'Programada' }); };
  const salvarOperacao = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.frente || !form.equipamento || !form.responsavel || !form.data || !form.quantidade) return;
    setOperacoes((atuais) => [{ id: `OPE-${String(atuais.length + 1).padStart(3, '0')}`, ...form, quantidade: Number(form.quantidade), unidade: form.tipo === 'Colheita' ? 'ha' : 't' }, ...atuais]);
    fecharModal();
  };

  const columns = [
    { header: 'Operação', render: (op: Operacao) => <div className="flex items-center gap-2.5"><span className={`rounded-lg p-2 ${op.tipo === 'Colheita' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}`}>{op.tipo === 'Colheita' ? <Tractor size={16} /> : <Truck size={16} />}</span><div><p className="font-bold text-slate-800">{op.tipo}</p><p className="text-[11px] text-slate-400">{op.id} · {op.frente}</p></div></div> },
    { header: 'Safra', render: (op: Operacao) => <span className="font-medium text-slate-600">{op.safra}</span> },
    { header: 'Equipamento / responsável', render: (op: Operacao) => <div><p className="font-medium text-slate-700">{op.equipamento}</p><p className="text-[11px] text-slate-400 mt-0.5">{op.responsavel}</p></div> },
    { header: 'Data', render: (op: Operacao) => <span className="text-slate-600">{new Date(`${op.data}T12:00:00`).toLocaleDateString('pt-BR')}</span> },
    { header: 'Produção', align: 'right' as const, render: (op: Operacao) => <span className="font-semibold text-slate-700">{op.quantidade.toLocaleString('pt-BR')} {op.unidade}</span> },
    { header: 'Status', align: 'center' as const, render: (op: Operacao) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyle[op.status]}`}>{op.status}</span> },
  ];

  return <div className="space-y-6 pb-12">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><h2 className="text-2xl font-bold text-slate-800 tracking-tight">Colheita e Transporte</h2><p className="text-slate-500 mt-1">Acompanhe as frentes de colheita e o escoamento da produção.</p></div><button onClick={() => setModalAberto(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white rounded-xl font-bold text-sm hover:bg-emerald-800 transition-colors shadow-sm"><Plus size={17} /> Adicionar operação</button></div>
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-soft flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between"><div className="flex items-center gap-3 text-slate-700"><div className="rounded-xl bg-sky-50 p-2.5 text-sky-700"><Truck size={20} /></div><div><p className="text-sm font-bold">{operacoes.length} operações registradas</p><p className="text-xs text-slate-500">{operacoes.filter((op) => op.status === 'Em execução').length} em execução</p></div></div><div className="relative w-full sm:w-80"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar safra, frente ou equipe..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15" /></div></div>
    <DataTable columns={columns} data={filtradas} keyExtractor={(op) => op.id} emptyMessage="Nenhuma operação encontrada." />
    <Modal isOpen={modalAberto} onClose={fecharModal} title="Adicionar operação" maxWidth="max-w-2xl"><form onSubmit={salvarOperacao} className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="text-sm font-semibold text-slate-700">Safra<select value={form.safra} onChange={(e) => setForm({ ...form, safra: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-500"><option>Safra de Soja 2026</option><option>Safra de Milho Verão 2026</option><option>Safrinha 2027</option></select></label><label className="text-sm font-semibold text-slate-700">Tipo de operação<select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as Operacao['tipo'] })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-500"><option>Colheita</option><option>Transporte</option></select></label><label className="text-sm font-semibold text-slate-700">Frente / talhão<input required value={form.frente} onChange={(e) => setForm({ ...form, frente: e.target.value })} placeholder="Ex.: Talhão 08" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-500" /></label><label className="text-sm font-semibold text-slate-700">Data<input required type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-500" /></label><label className="text-sm font-semibold text-slate-700">Equipamento / veículo<input required value={form.equipamento} onChange={(e) => setForm({ ...form, equipamento: e.target.value })} placeholder="Ex.: Colheitadeira CR 7.90" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-500" /></label><label className="text-sm font-semibold text-slate-700">Responsável<input required value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} placeholder="Nome do operador ou motorista" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-500" /></label><label className="text-sm font-semibold text-slate-700">{form.tipo === 'Colheita' ? 'Área colhida (ha)' : 'Carga transportada (t)'}<input required type="number" min="0.01" step="0.01" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-500" /></label><label className="text-sm font-semibold text-slate-700">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusOperacao })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-500"><option>Programada</option><option>Em execução</option><option>Concluída</option></select></label></div><div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={fecharModal} className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white text-sm font-bold rounded-lg hover:bg-emerald-800"><Plus size={16} /> Salvar operação</button></div></form></Modal>
  </div>;
};
