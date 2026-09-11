import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrainCircuit, Database, FileUp, MessageSquareText, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const MODULOS = [
  { id: 'geral', nome: 'Geral (todos os módulos)' },
  { id: 'estoque', nome: 'Estoque' },
  { id: 'logistica_frota', nome: 'Logística / Frota' },
  { id: 'producao_batata', nome: 'Produção / Batata' },
  { id: 'manutencao', nome: 'Manutenção' },
];

type TipoConteudo = 'schema' | 'prompt' | 'texto';

const TIPOS: { id: TipoConteudo; nome: string; icone: typeof Database; descricao: string; placeholderTitulo: string; placeholderConteudo: string; monoespacado?: boolean }[] = [
  {
    id: 'schema',
    nome: 'Esquema de banco de dados',
    icone: Database,
    descricao: 'Nomes reais de tabela/coluna, formato de campo, valores possíveis, particularidades do cadastro (ex.: um campo que nesta instalação sempre vem zerado).',
    placeholderTitulo: 'Ex.: TGFITC.SITUACAO — valores reais',
    placeholderConteudo: 'Tabela: TGFITC\nColuna: SITUACAO\nValores encontrados em produção: \'P\' (pendente), \'A\' (atendido)\nObservação: cada item de cotação tem uma linha CODPARC=0 (placeholder) além da linha do fornecedor real.',
    monoespacado: true,
  },
  {
    id: 'prompt',
    nome: 'Instrução de prompt',
    icone: MessageSquareText,
    descricao: 'Uma regra de como a IA deve se comportar ao responder ou montar a consulta (tom, prioridade, o que nunca fazer).',
    placeholderTitulo: 'Ex.: Sempre citar a unidade de medida',
    placeholderConteudo: 'Ao responder quantidades de produto, sempre inclua a unidade de medida (UN, KG, L etc.) junto do número. Nunca arredonde valores monetários.',
  },
  {
    id: 'texto',
    nome: 'Conteúdo / documento',
    icone: BrainCircuit,
    descricao: 'Texto livre, observação de negócio, sinônimo de termo usado pelo pessoal da fazenda, política interna.',
    placeholderTitulo: 'Ex.: Sinônimos de produtos',
    placeholderConteudo: 'Quando o usuário perguntar por "defensivo", considere também os produtos classificados como "Agroquímico" no cadastro.',
  },
];

type Entrada = {
  ConfiguracaoIAId: number;
  Titulo: string;
  Conteudo: string;
  Modulo: string;
  Tipo: TipoConteudo;
  Ativo: boolean;
  AtualizadoEm: string;
  CriadoPor: string | null;
};

const FORM_VAZIO = { titulo: '', conteudo: '', modulo: 'estoque', tipo: 'texto' as TipoConteudo };

export function ConfiguracaoIA() {
  const { usuario } = useAuth();
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [filtroTipo, setFiltroTipo] = useState<TipoConteudo | 'todos'>('todos');
  const [importando, setImportando] = useState(false);
  const [avisoImportacao, setAvisoImportacao] = useState<string | null>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);
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

  const tipoAtual = useMemo(() => TIPOS.find((t) => t.id === form.tipo) ?? TIPOS[2], [form.tipo]);

  const iniciarEdicao = (entrada: Entrada) => {
    setEditandoId(entrada.ConfiguracaoIAId);
    setForm({ titulo: entrada.Titulo, conteudo: entrada.Conteudo, modulo: entrada.Modulo, tipo: entrada.Tipo ?? 'texto' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cancelarEdicao = () => { setEditandoId(null); setForm(FORM_VAZIO); setAvisoImportacao(null); };

  const importarArquivo = async (arquivo: File) => {
    setImportando(true); setErro(null); setAvisoImportacao(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(String(leitor.result).split(',')[1] ?? '');
        leitor.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
        leitor.readAsDataURL(arquivo);
      });
      const resposta = await fetch(`${API_URL}/api/administracao/ia-importar`, { method: 'POST', headers, body: JSON.stringify({ nomeArquivo: arquivo.name, conteudoBase64: base64 }) });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.error);
      setEditandoId(null);
      setForm({ titulo: corpo.titulo, conteudo: corpo.conteudo, modulo: corpo.modulo, tipo: corpo.tipo });
      setAvisoImportacao(corpo.truncado
        ? `Arquivo "${arquivo.name}" processado — ele é grande e o conteúdo foi cortado no que a IA conseguiu organizar. Revise antes de salvar.`
        : `Arquivo "${arquivo.name}" processado. Revise o título, tipo e conteúdo sugeridos abaixo antes de salvar.`);
    } catch (falha) { setErro(falha instanceof Error ? falha.message : 'Falha ao importar o arquivo.'); }
    finally { setImportando(false); if (inputArquivoRef.current) inputArquivoRef.current.value = ''; }
  };

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
      const resposta = await fetch(`${API_URL}/api/administracao/ia`, { method: 'PUT', headers, body: JSON.stringify({ id: entrada.ConfiguracaoIAId, titulo: entrada.Titulo, conteudo: entrada.Conteudo, modulo: entrada.Modulo, tipo: entrada.Tipo, ativo: !entrada.Ativo }) });
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

  const entradasFiltradas = filtroTipo === 'todos' ? entradas : entradas.filter((e) => (e.Tipo ?? 'texto') === filtroTipo);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Administração</p>
        <h1 className="text-2xl font-bold text-slate-800">Configuração de IA</h1>
        <p className="text-sm text-slate-500 mt-1">
          Base de conhecimento que a IA sempre consulta antes de responder ou montar consultas: esquema real do banco, instruções de comportamento e conteúdo/documentos de negócio. Só entradas <b>ativas</b> são usadas; "Geral" vale para todos os módulos. Toda pesquisa e insight por IA lê esta base automaticamente — não precisa configurar nada além de cadastrar aqui.
        </p>
      </div>

      {erro && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{erro}</div>}

      <form onSubmit={salvar} className="bg-white border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            {editandoId ? <Pencil size={18} className="text-emerald-600" /> : <Plus size={18} className="text-emerald-600" />}
            {editandoId ? 'Editando entrada' : 'Nova entrada de treinamento'}
          </div>
          <div>
            <input ref={inputArquivoRef} type="file" accept=".txt,.md,.csv,.pdf,.docx,.xlsx,.xls" className="hidden" onChange={(e) => { const arquivo = e.target.files?.[0]; if (arquivo) importarArquivo(arquivo); }} />
            <button type="button" disabled={importando} onClick={() => inputArquivoRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
              <FileUp size={15} />{importando ? 'Lendo arquivo…' : 'Importar de um arquivo (.pdf, .docx, .xlsx, .txt)'}
            </button>
          </div>
        </div>
        {avisoImportacao && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{avisoImportacao}</div>}

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">1. Que tipo de conteúdo é este?</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TIPOS.map((t) => {
              const Icone = t.icone;
              const selecionado = form.tipo === t.id;
              return (
                <button type="button" key={t.id} onClick={() => setForm({ ...form, tipo: t.id })}
                  className={`text-left rounded-xl border-2 p-3 transition-colors ${selecionado ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className={`flex items-center gap-2 font-bold text-sm ${selecionado ? 'text-emerald-700' : 'text-slate-700'}`}>
                    <Icone size={16} />{t.nome}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{t.descricao}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">2. Título e módulo</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder={tipoAtual.placeholderTitulo} className="rounded-xl border px-3 py-2.5 text-sm" />
            <select value={form.modulo} onChange={(e) => setForm({ ...form, modulo: e.target.value })} className="rounded-xl border px-3 py-2.5 text-sm">
              {MODULOS.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">3. Conteúdo</p>
          <textarea required value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} placeholder={tipoAtual.placeholderConteudo} rows={tipoAtual.monoespacado ? 8 : 6}
            className={`w-full rounded-xl border px-3 py-2.5 text-sm ${tipoAtual.monoespacado ? 'font-mono bg-slate-50' : ''}`} />
        </div>

        <div className="flex items-center gap-2">
          <button disabled={salvando} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            <BrainCircuit size={16} />{salvando ? 'Salvando…' : editandoId ? 'Salvar alterações' : 'Adicionar ao treinamento'}
          </button>
          {editandoId && <button type="button" onClick={cancelarEdicao} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold text-slate-600"><X size={16} />Cancelar</button>}
        </div>
      </form>

      <section className="bg-white border rounded-2xl overflow-hidden">
        <div className="p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="font-bold text-slate-800 flex items-center gap-2"><BrainCircuit size={18} className="text-emerald-600" /> Entradas cadastradas</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => setFiltroTipo('todos')} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${filtroTipo === 'todos' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>Todos</button>
            {TIPOS.map((t) => (
              <button key={t.id} onClick={() => setFiltroTipo(t.id)} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${filtroTipo === t.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>{t.nome}</button>
            ))}
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr><th className="p-3">Tipo</th><th className="p-3">Título</th><th className="p-3">Módulo</th><th className="p-3">Status</th><th className="p-3">Atualizado em</th><th className="p-3">Ações</th></tr>
            </thead>
            <tbody>
              {entradasFiltradas.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhuma entrada cadastrada ainda.</td></tr>}
              {entradasFiltradas.map((item) => {
                const tipoInfo = TIPOS.find((t) => t.id === (item.Tipo ?? 'texto')) ?? TIPOS[2];
                const Icone = tipoInfo.icone;
                return (
                  <tr key={item.ConfiguracaoIAId} className="border-t">
                    <td className="p-3"><span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600"><Icone size={13} />{tipoInfo.nome}</span></td>
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
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex gap-2">
        <Sparkles size={16} className="shrink-0 mt-0.5" />
        <p>Sempre que descobrir algo novo sobre o significado real de um dado (um valor de código, um campo que costuma vir vazio, uma regra de negócio implícita), cadastre aqui como "Esquema de banco de dados" — a IA passa a considerar isso em toda pesquisa e insight, sem precisar mexer em código.</p>
      </div>
    </div>
  );
}
