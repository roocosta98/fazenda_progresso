import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrainCircuit, Calendar, Database, FileUp, MessageSquareText, Pencil, Plus, Settings, Sparkles, Trash2, Wand2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useConfiguracaoGeral, invalidarCacheConfiguracaoGeral, PRAZO_PADRAO_DIAS_FALLBACK } from '../../hooks/useConfiguracaoGeral';

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

// Modelos prontos com o esquema real já validado nesta instalação (achados confirmados nas
// próprias telas/queries do sistema) — clique em "Usar modelo" pra já cair no formulário
// pronto pra revisar e adicionar, em vez de digitar tudo do zero.
const MODELOS_PRONTOS: { titulo: string; modulo: string; tipo: TipoConteudo; conteudo: string }[] = [
  {
    titulo: 'Fornecedores — critério real de vitória em cotação',
    modulo: 'estoque',
    tipo: 'schema',
    conteudo: 'Tabela: TGFITC (itens de cotação de compra).\nPara saber se um fornecedor venceu o item, use ITC.MELHOR=\'S\' — é o campo nativo do Sankhya dedicado a isso.\nNÃO use ITC.SITUACAO=\'A\' como critério de vitória: SITUACAO é um status de fluxo mais amplo (cotações enviadas passam por \'E\',\'R\',\'G\',\'A\'), não indica quem ganhou o item.',
  },
  {
    titulo: 'Frota — limites de status de comunicação do equipamento',
    modulo: 'logistica_frota',
    tipo: 'schema',
    conteudo: 'Campo MinutosSemComunicacao (retornado por /api/frota/posicoes):\n- até 30 min: comunicação normal\n- de 30 a 1440 min (24h): atenção, equipamento sem sinal recente\n- acima de 1440 min: crítico, provável equipamento parado/desligado há mais de 1 dia\nCampo AlarmesUltimas24h conta os alarmes do equipamento gerados nas últimas 24h.',
  },
  {
    titulo: 'Estoque — regra de status do item (Zerado/Abaixo do mínimo/Normal)',
    modulo: 'estoque',
    tipo: 'schema',
    conteudo: 'Calculado no cliente a partir de ESTOQUE, MINIMO e MAXIMO (nunca vem pronto do Sankhya):\n- ESTOQUE <= 0 → "Zerado"\n- MINIMO > 0 e ESTOQUE < MINIMO → "Abaixo do mínimo"\n- MAXIMO > 0 e ESTOQUE > MAXIMO → "Acima do máximo"\n- caso contrário → "Normal"\nSe MINIMO ou MAXIMO vier zerado/vazio no cadastro, aquela regra é ignorada (não vira "abaixo do mínimo" por um mínimo mal cadastrado).',
  },
  {
    titulo: 'Cotações em aberto — situação calculada (Atrasada/Sem prazo/Em andamento)',
    modulo: 'estoque',
    tipo: 'schema',
    conteudo: 'Campo usado: DHFINAL (prazo final da cotação).\n- DHFINAL vazio/nulo → "Sem prazo" (nunca tratado como atrasada por falta de dado)\n- DHFINAL no passado → "Atrasada"\n- DHFINAL no futuro → "Em andamento"',
  },
  {
    titulo: 'Metas — saldo acumulado do motorista (ponto de equilíbrio)',
    modulo: 'logistica_frota',
    tipo: 'schema',
    conteudo: 'Endpoint /api/metas/diario?modo=progresso retorna porMotorista[] com MotoristaNomeFicha e SaldoAcumuladoMes.\nSaldoAcumuladoMes positivo = motorista dentro do ponto de equilíbrio no mês; negativo = abaixo do ponto de equilíbrio.\nO array porVeiculo[] existe na mesma resposta mas ainda não tem colunas confirmadas em produção — não usar sem validar antes.',
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

type Aba = 'geral' | 'ia';

function PainelPadroesDoSistema() {
  const { usuario } = useAuth();
  const { prazoPadraoDias, carregado } = useConfiguracaoGeral();
  const [valor, setValor] = useState(PRAZO_PADRAO_DIAS_FALLBACK);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => { if (carregado) setValor(prazoPadraoDias); }, [carregado, prazoPadraoDias]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true); setErro(null); setSucesso(false);
    try {
      const resposta = await fetch(`${API_URL}/api/administracao/geral`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-type': usuario?.tipoUsuario ?? '' },
        body: JSON.stringify({ prazoPadraoDias: valor }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.error);
      invalidarCacheConfiguracaoGeral();
      setSucesso(true);
    } catch (falha) { setErro(falha instanceof Error ? falha.message : 'Falha ao salvar.'); }
    finally { setSalvando(false); }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={salvar} className="bg-white border rounded-2xl p-5 space-y-4 max-w-2xl">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <Calendar size={18} className="text-emerald-600" /> Período padrão dos filtros de data
        </div>
        <p className="text-sm text-slate-500">
          Define o período relativo (últimos N dias) que os filtros de data de Estoque e Logística abrem por padrão, em vez de um intervalo fixo "de-até". O usuário sempre pode trocar pra outro preset ou escolher "Personalizado" na hora.
        </p>
        <div className="flex items-center gap-3">
          <input type="number" min={1} max={365} value={valor} onChange={(e) => setValor(Number(e.target.value))}
            className="w-28 rounded-xl border px-3 py-2.5 text-sm font-semibold text-center" />
          <span className="text-sm text-slate-600">dias</span>
        </div>
        {erro && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{erro}</div>}
        {sucesso && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">Prazo padrão salvo. Já vale pra próxima vez que qualquer tela de filtro de período for aberta.</div>}
        <button disabled={salvando} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Salvar padrão'}
        </button>
      </form>
    </div>
  );
}

function PainelTreinamentoIA() {
  const { usuario } = useAuth();
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [filtroTipo, setFiltroTipo] = useState<TipoConteudo | 'todos'>('todos');
  const [importando, setImportando] = useState(false);
  const [avisoImportacao, setAvisoImportacao] = useState<string | null>(null);
  const [mostrarModelos, setMostrarModelos] = useState(false);
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

  const usarModelo = (modelo: typeof MODELOS_PRONTOS[number]) => {
    setEditandoId(null);
    setForm({ titulo: modelo.titulo, conteudo: modelo.conteudo, modulo: modelo.modulo, tipo: modelo.tipo });
    setAvisoImportacao(null);
    setMostrarModelos(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        Base de conhecimento que a IA sempre consulta antes de responder ou montar consultas: esquema real do banco, instruções de comportamento e conteúdo/documentos de negócio. Só entradas <b>ativas</b> são usadas; "Geral" vale para todos os módulos. Toda pesquisa e insight por IA lê esta base automaticamente — não precisa configurar nada além de cadastrar aqui.
      </p>

      {erro && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{erro}</div>}

      <div className="bg-white border rounded-2xl overflow-hidden">
        <button type="button" onClick={() => setMostrarModelos((v) => !v)} className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-50">
          <div className="flex items-center gap-2 font-bold text-slate-800"><Wand2 size={17} className="text-emerald-600" /> Modelos prontos com o esquema real já mapeado nesta instalação</div>
          <span className="text-xs font-semibold text-emerald-700">{mostrarModelos ? 'Esconder' : `Ver ${MODELOS_PRONTOS.length} modelos`}</span>
        </button>
        {mostrarModelos && (
          <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-3">
            {MODELOS_PRONTOS.map((modelo) => (
              <div key={modelo.titulo} className="border rounded-xl p-3 flex flex-col gap-2">
                <p className="text-sm font-bold text-slate-800">{modelo.titulo}</p>
                <p className="text-xs text-slate-500 font-mono whitespace-pre-line line-clamp-4">{modelo.conteudo}</p>
                <button type="button" onClick={() => usarModelo(modelo)} className="self-start inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
                  <Plus size={13} /> Usar este modelo
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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

export function ConfiguracoesGerais() {
  const [aba, setAba] = useState<Aba>('geral');
  const abas: { id: Aba; label: string; icon: React.ReactNode }[] = [
    { id: 'geral', label: 'Padrões do Sistema', icon: <Settings size={15} /> },
    { id: 'ia', label: 'Treinamento de IA', icon: <BrainCircuit size={15} /> },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Administração</p>
        <h1 className="text-2xl font-bold text-slate-800">Configurações Gerais</h1>
        <p className="text-sm text-slate-500 mt-1">Padrões do sistema (como o período inicial dos filtros de data) e a base de conhecimento que a IA usa nas pesquisas e insights.</p>
      </div>

      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 max-w-full overflow-x-auto w-fit">
        {abas.map((a) => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${aba === a.id ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>
            {a.icon} {a.label}
          </button>
        ))}
      </div>

      {aba === 'geral' && <PainelPadroesDoSistema />}
      {aba === 'ia' && <PainelTreinamentoIA />}
    </div>
  );
}
