import { useCallback, useEffect, useState } from 'react';
import { BrainCircuit, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const MODULOS = [
  { id: 'geral', nome: 'Geral (todos os módulos)' },
  { id: 'estoque', nome: 'Estoque' },
  { id: 'logistica_frota', nome: 'Logística / Frota' },
  { id: 'producao_batata', nome: 'Produção / Batata' },
  { id: 'manutencao', nome: 'Manutenção' },
];

type Entrada = {
  ConfiguracaoIAId: number;
  Titulo: string;
  Conteudo: string;
  Modulo: string;
  Ativo: boolean;
  AtualizadoEm: string;
  CriadoPor: string | null;
};

const FORM_VAZIO = { titulo: '', conteudo: '', modulo: 'estoque' };

export function ConfiguracaoIA() {
  const { usuario } = useAuth();
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const headers = { 'Content-Type': 'application/json', 'x-user-type': usuario?.tipoUsuario ?? '' };

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch(`${API_URL}/api/administracao/ia`, { headers });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.error);
      setEntradas(corpo);
    } catch (falha) { setErro(falha instanceof Error ? falha.message : 'Falha ao carregar configuração de IA.'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.tipoUsuario]);
  useEffect(() => { carregar(); }, [carregar]);

  const iniciarEdicao = (entrada: Entrada) => {
    setEditandoId(entrada.ConfiguracaoIAId);
    setForm({ titulo: entrada.Titulo, conteudo: entrada.Conteudo, modulo: entrada.Modulo });
  };
  const cancelarEdicao = () => { setEditandoId(null); setForm(FORM_VAZIO); };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true); setErro(null);
    try {
      const resposta = editandoId
        ? await fetch(`${API_URL}/api/administracao/ia`, { method: 'PUT', headers, body: JSON.stringify({ id: editandoId, ...form, ativo: true }) })
        : await fetch(`${API_URL}/api/administracao/ia`, { method: 'POST', headers, body: JSON.stringify({ ...form, criadoPor: usuario?.nome }) });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.error);
      cancelarEdicao();
      await carregar();
    } catch (falha) { setErro(falha instanceof Error ? falha.message : 'Falha ao salvar.'); }
    finally { setSalvando(false); }
  };

  const alternarAtivo = async (entrada: Entrada) => {
    try {
      const resposta = await fetch(`${API_URL}/api/administracao/ia`, { method: 'PUT', headers, body: JSON.stringify({ id: entrada.ConfiguracaoIAId, titulo: entrada.Titulo, conteudo: entrada.Conteudo, modulo: entrada.Modulo, ativo: !entrada.Ativo }) });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.error);
      await carregar();
    } catch (falha) { setErro(falha instanceof Error ? falha.message : 'Falha ao atualizar.'); }
  };

  const excluir = async (id: number) => {
    if (!confirm('Excluir esta entrada de treinamento? A IA deixa de usar esse conteúdo imediatamente.')) return;
    try {
      const resposta = await fetch(`${API_URL}/api/administracao/ia?id=${id}`, { method: 'DELETE', headers });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.error);
      if (editandoId === id) cancelarEdicao();
      await carregar();
    } catch (falha) { setErro(falha instanceof Error ? falha.message : 'Falha ao excluir.'); }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Administração</p>
        <h1 className="text-2xl font-bold text-slate-800">Configuração de IA</h1>
        <p className="text-sm text-slate-500 mt-1">
          Texto de treinamento (documentos, observações, particularidades do cadastro) que entra como contexto extra nos prompts de busca por IA. Só entradas <b>ativas</b> são usadas; "Geral" vale para todos os módulos.
        </p>
      </div>

      {erro && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{erro}</div>}

      <form onSubmit={salvar} className="bg-white border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          {editandoId ? <Pencil size={18} className="text-emerald-600" /> : <Plus size={18} className="text-emerald-600" />}
          {editandoId ? 'Editando entrada' : 'Nova entrada de treinamento'}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Título (ex.: Sinônimos de produtos, Regra de cotação fechada)" className="rounded-xl border px-3 py-2.5 text-sm" />
          <select value={form.modulo} onChange={(e) => setForm({ ...form, modulo: e.target.value })} className="rounded-xl border px-3 py-2.5 text-sm">
            {MODULOS.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </div>
        <textarea required value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} placeholder="Cole aqui o texto, documento ou observação que a IA deve considerar…" rows={6} className="w-full rounded-xl border px-3 py-2.5 text-sm" />
        <div className="flex items-center gap-2">
          <button disabled={salvando} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            <BrainCircuit size={16} />{salvando ? 'Salvando…' : editandoId ? 'Salvar alterações' : 'Adicionar ao treinamento'}
          </button>
          {editandoId && <button type="button" onClick={cancelarEdicao} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold text-slate-600"><X size={16} />Cancelar</button>}
        </div>
      </form>

      <section className="bg-white border rounded-2xl overflow-hidden">
        <div className="p-5 font-bold text-slate-800 flex items-center gap-2"><BrainCircuit size={18} className="text-emerald-600" /> Entradas cadastradas</div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr><th className="p-3">Título</th><th className="p-3">Módulo</th><th className="p-3">Status</th><th className="p-3">Atualizado em</th><th className="p-3">Ações</th></tr>
            </thead>
            <tbody>
              {entradas.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhuma entrada cadastrada ainda.</td></tr>}
              {entradas.map((item) => (
                <tr key={item.ConfiguracaoIAId} className="border-t">
                  <td className="p-3 font-medium max-w-xs truncate" title={item.Titulo}>{item.Titulo}</td>
                  <td className="p-3 text-slate-600">{MODULOS.find((m) => m.id === item.Modulo)?.nome ?? item.Modulo}</td>
                  <td className="p-3">
                    <button onClick={() => alternarAtivo(item)} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${item.Ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {item.Ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="p-3 text-xs text-slate-500">{new Date(item.AtualizadoEm).toLocaleString('pt-BR')}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => iniciarEdicao(item)} title="Editar" className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded"><Pencil size={14} /></button>
                      <button onClick={() => excluir(item.ConfiguracaoIAId)} title="Excluir" className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
