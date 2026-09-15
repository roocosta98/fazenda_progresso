import { useMemo, useState } from 'react';
import { BarChart3, Boxes, Clock3, Layers, Sparkles, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { FiltroDataEstoque, ModalExpandido, TabelaInterativa, moeda, numero, useEstoquePainel, type Linha } from './estoqueShared';
import { SugestoesAutomaticas } from './SugestoesAutomaticas';
import { Carregando, SemDado } from '../../components/common/viz';

// Cores por faixa do Supplier Score (paleta categórica validada + um tom extra pra "Atenção",
// já que aqui são 4 níveis de status, não 3 séries categóricas).
const FAIXA_COR: Record<string, string> = {
  'Excelente': '#1baf7a',
  'Bom': '#2a78d6',
  'Regular': '#eb6834',
  'Atencao': '#e11d48',
};
const FAIXA_ROTULO: Record<string, string> = { Excelente: 'Excelente', Bom: 'Bom', Regular: 'Regular', Atencao: 'Atenção' };

type ChaveKpi = 'ativos' | 'prazo' | 'taxa' | 'categorias' | 'economia';
const MODAL_CONFIG: Record<ChaveKpi, { titulo: string; subtitulo: string; ordenarPor: keyof Linha; desc: boolean }> = {
  ativos: { titulo: 'Fornecedores ativos no período', subtitulo: 'Todos os fornecedores com pelo menos uma cotação respondida no período filtrado, por ranking geral (Supplier Score).', ordenarPor: 'RANKING_GERAL', desc: false },
  prazo: { titulo: 'Melhor prazo médio', subtitulo: 'Fornecedores ordenados pelo menor prazo médio de entrega cotado.', ordenarPor: 'PRAZO_MEDIO_DIAS', desc: false },
  taxa: { titulo: 'Maior taxa de vitória', subtitulo: 'Fornecedores ordenados pela taxa de vitória (itens vencidos ÷ itens cotados).', ordenarPor: 'TAXA_VITORIA_PCT', desc: true },
  categorias: { titulo: 'Categorias atendidas por fornecedor', subtitulo: 'Fornecedores ordenados pelo número de categorias de produto distintas atendidas no período.', ordenarPor: 'CATEGORIAS_DISTINTAS', desc: true },
  economia: { titulo: 'Economia por fornecedor', subtitulo: 'Fornecedores ordenados pela economia gerada: cotações vencidas com preço abaixo da média dos concorrentes.', ordenarPor: 'ECONOMIA_POSITIVA_VS_MEDIA', desc: true },
};

// Ordena colocando valores nulos sempre por último, na direção pedida pro resto.
function ordenarComNulosPorUltimo(linhas: Linha[], chave: string, desc: boolean): Linha[] {
  return [...linhas].sort((a, b) => {
    const va = a[chave]; const vb = b[chave];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    const cmp = Number(va) - Number(vb);
    return desc ? -cmp : cmp;
  });
}

function CardFornecedores({ Icon, cor, rotulo, valor, apoio, onClick }: { Icon: typeof Boxes; cor: string; rotulo: string; valor: string; apoio?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`bg-white border rounded-2xl p-4 ${onClick ? 'cursor-pointer hover:border-emerald-300 transition-colors' : ''}`}>
      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3 ${cor}`}><Icon size={17} /></span>
      <p className="text-[11px] uppercase font-bold text-slate-400">{rotulo}</p>
      <p className="text-xl font-bold text-slate-800 mt-1">{valor}</p>
      {apoio && <p className="text-[11px] text-slate-400 mt-0.5">{apoio}</p>}
    </div>
  );
}

export function Fornecedores() {
  const { dados, erro, carregando, carregar, dataDe, setDataDe, dataAte, setDataAte, insights } = useEstoquePainel();
  const [modalAberto, setModalAberto] = useState<ChaveKpi | null>(null);

  // Análise de Fornecedores fornecida pela Fazenda Progresso (script próprio deles): Supplier
  // Score ponderado (35% taxa de vitória, 30% competitividade de preço vs. concorrentes na MESMA
  // cotação/item, 15% prazo, 10% cobertura de produtos, 10% volume) e economia calculada item a
  // item — não é estimativa nossa, é a fórmula e os dados reais deles, no período filtrado acima.
  // Prazo pode vir "—" (sem dado) quando nenhuma cotação respondida do fornecedor tem prazo de
  // entrega registrado — nunca vira 0 só pra preencher o card.
  const fornecedores = useMemo(() => (dados?.fornecedores ?? []).map((l) => ({
    fornecedor: String(l.FORNECEDOR ?? ''),
    prazo: l.PRAZO_MEDIO_DIAS != null ? Number(l.PRAZO_MEDIO_DIAS) : null,
    taxa: Number(l.TAXA_VITORIA_PCT ?? 0),
    cotacoes: Number(l.TOTAL_COTACOES ?? 0),
    produtos: Number(l.PRODUTOS_DISTINTOS ?? 0),
    score: Number(l.SUPPLIER_SCORE ?? 0),
    faixa: String(l.FAIXA_SUPPLIER_SCORE ?? ''),
    competitividade: l.COMPETITIVIDADE_PRECO_PCT ?? l.COMPETITIVIDADE_PRECO_MEDIA_PCT ?? null,
    statusCompetitividade: String(l.STATUS_COMPETITIVIDADE ?? ''),
  })), [dados]);
  // O gráfico só faz sentido pra quem tem os dois eixos — sem prazo registrado não dá pra plotar.
  const fornecedoresComPrazo = useMemo(() => fornecedores.filter((f) => f.prazo !== null), [fornecedores]);

  // A própria consulta já traz o ranking (RANKING_GERAL=1 é o melhor no período) e os totais
  // gerais do período replicados em toda linha (K.*) — pega da primeira, que é constante.
  const melhor = fornecedores[0];
  const totais = dados?.fornecedores?.[0];

  const linhasRanking = useMemo(() => (dados?.fornecedores ?? []).map((l) => ({
    RANKING_GERAL: l.RANKING_GERAL,
    FORNECEDOR: l.FORNECEDOR,
    SUPPLIER_SCORE: l.SUPPLIER_SCORE,
    FAIXA_SUPPLIER_SCORE: l.FAIXA_SUPPLIER_SCORE,
    TAXA_VITORIA_PCT: l.TAXA_VITORIA_PCT,
    PRAZO_MEDIO_DIAS: l.PRAZO_MEDIO_DIAS,
    COMPETITIVIDADE_PRECO_PCT: l.COMPETITIVIDADE_PRECO_PCT ?? l.COMPETITIVIDADE_PRECO_MEDIA_PCT ?? null,
    STATUS_COMPETITIVIDADE: l.STATUS_COMPETITIVIDADE,
    CATEGORIAS_DISTINTAS: l.CATEGORIAS_DISTINTAS,
    ECONOMIA_POSITIVA_VS_MEDIA: l.ECONOMIA_POSITIVA_VS_MEDIA,
    TOTAL_COTACOES: l.TOTAL_COTACOES,
    PRODUTOS_DISTINTOS: l.PRODUTOS_DISTINTOS,
  })), [dados]);

  const linhasModal = useMemo(() => {
    if (!modalAberto) return [];
    const cfg = MODAL_CONFIG[modalAberto];
    return ordenarComNulosPorUltimo(linhasRanking, cfg.ordenarPor as string, cfg.desc);
  }, [modalAberto, linhasRanking]);

  return <div className="space-y-5 pb-12">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold tracking-wider uppercase text-emerald-700">Estoque</p>
        <h1 className="text-2xl font-bold text-slate-800">Fornecedores</h1>
        <p className="text-sm text-slate-500 mt-1">Supplier Score e indicadores de cotação do período filtrado (empresa 01).</p>
      </div>
      <Link to="/logistica/estoque/dashboard" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shrink-0">
        <BarChart3 size={15} className="text-emerald-700" /> Ver Dashboard
      </Link>
    </div>
    <FiltroDataEstoque dataDe={dataDe} setDataDe={setDataDe} dataAte={dataAte} setDataAte={setDataAte} carregando={carregando} carregar={carregar} />
    {erro && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{erro}</div>}
    {carregando && !dados ? <div className="bg-white border rounded-2xl p-12"><Carregando mensagem="Carregando fornecedores…" /></div> : dados && (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <CardFornecedores Icon={Boxes} cor="bg-blue-50 text-blue-600" rotulo="Fornecedores ativos (período)" valor={numero(totais?.FORNECEDORES_ATIVOS_PERIODO)} onClick={() => setModalAberto('ativos')} />
          <CardFornecedores Icon={Clock3} cor="bg-emerald-50 text-emerald-600" rotulo="Melhor prazo médio (período)" valor={totais?.MELHOR_PRAZO_MEDIO_PERIODO != null ? `${numero(totais.MELHOR_PRAZO_MEDIO_PERIODO, 1)} dias` : '—'} onClick={() => setModalAberto('prazo')} />
          <CardFornecedores Icon={BarChart3} cor="bg-amber-50 text-amber-600" rotulo="Maior taxa de vitória (período)" valor={totais?.MAIOR_TAXA_VITORIA_PERIODO != null ? `${numero(totais.MAIOR_TAXA_VITORIA_PERIODO, 1)}%` : '—'} onClick={() => setModalAberto('taxa')} />
          <CardFornecedores Icon={Layers} cor="bg-violet-50 text-violet-600" rotulo="Categorias atendidas (período)" valor={numero(totais?.CATEGORIAS_ATENDIDAS_PERIODO)} onClick={() => setModalAberto('categorias')} />
          <CardFornecedores Icon={Wallet} cor="bg-teal-50 text-teal-600" rotulo="Economia acumulada (período)" valor={moeda(totais?.ECONOMIA_ACUMULADA_PERIODO)} apoio="Soma das cotações vencidas com preço abaixo da média dos concorrentes" onClick={() => setModalAberto('economia')} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <div className="xl:col-span-2 space-y-5">

        {melhor && (
          <section className="bg-white border rounded-2xl p-5 flex flex-wrap items-center gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400">Melhor fornecedor do período (Supplier Score)</p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">{melhor.fornecedor}</p>
              <p className="text-[11px] text-slate-400 mt-1">Score pondera 35% taxa de vitória, 30% competitividade de preço, 15% prazo, 10% cobertura, 10% volume.</p>
            </div>
            <div className="flex flex-wrap gap-6 ml-auto">
              <div><p className="text-[10px] font-bold uppercase text-slate-400">Score</p><p className="text-sm font-bold text-slate-800">{numero(melhor.score, 1)} · <span style={{ color: FAIXA_COR[melhor.faixa] }}>{FAIXA_ROTULO[melhor.faixa] ?? melhor.faixa}</span></p></div>
              <div><p className="text-[10px] font-bold uppercase text-slate-400">Taxa de vitória</p><p className="text-sm font-bold text-slate-800">{numero(melhor.taxa, 1)}%</p></div>
              <div><p className="text-[10px] font-bold uppercase text-slate-400">Prazo médio</p><p className="text-sm font-bold text-slate-800">{melhor.prazo != null ? `${numero(melhor.prazo, 1)} dias` : '—'}</p></div>
              <div><p className="text-[10px] font-bold uppercase text-slate-400">Competitividade</p><p className="text-sm font-bold text-slate-800">{melhor.competitividade != null ? `${numero(Number(melhor.competitividade), 1)}%` : '—'}</p></div>
              <div><p className="text-[10px] font-bold uppercase text-slate-400">Cotações (período)</p><p className="text-sm font-bold text-slate-800">{numero(melhor.cotacoes)}</p></div>
            </div>
          </section>
        )}

        <section className="bg-white border rounded-2xl p-5">
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><BarChart3 size={16} className="text-emerald-600" /> Prazo × Taxa de vitória</h2>
          <p className="text-xs text-slate-500 mt-1 mb-3">Cada ponto é um fornecedor com prazo registrado no período; o tamanho da bolha é o volume de cotações e a cor é a faixa do Supplier Score.</p>
          {fornecedoresComPrazo.length === 0 ? <SemDado mensagem="Nenhum fornecedor com prazo de entrega registrado no período filtrado." /> : (
            <>
              <ResponsiveContainer width="100%" height={320}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <XAxis type="number" dataKey="prazo" name="Prazo médio" unit=" dias" tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} />
                  <YAxis type="number" dataKey="taxa" name="Taxa de vitória" unit="%" domain={[0, 100]} tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} />
                  <ZAxis type="number" dataKey="cotacoes" range={[40, 400]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const p = payload[0].payload as typeof fornecedoresComPrazo[number];
                      return (
                        <div className="bg-white border rounded-xl shadow-lg p-2.5 text-xs">
                          <p className="font-bold text-slate-800">{p.fornecedor}</p>
                          <p className="text-slate-500">Score: {numero(p.score, 1)} ({FAIXA_ROTULO[p.faixa] ?? p.faixa})</p>
                          <p className="text-slate-500">Prazo médio: {numero(p.prazo, 1)} dias</p>
                          <p className="text-slate-500">Taxa de vitória: {numero(p.taxa, 1)}%</p>
                          <p className="text-slate-500">Cotações: {numero(p.cotacoes)}</p>
                        </div>
                      );
                    }} />
                  <Scatter data={fornecedoresComPrazo} fillOpacity={0.75}>
                    {fornecedoresComPrazo.map((f, i) => <Cell key={i} fill={FAIXA_COR[f.faixa] ?? '#94a3b8'} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-4 mt-2 pt-3 border-t border-slate-100">
                {Object.entries(FAIXA_ROTULO).map(([chave, rotulo]) => (
                  <div key={chave} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: FAIXA_COR[chave] }} />
                    <span className="text-[11px] font-medium text-slate-600">{rotulo}</span>
                  </div>
                ))}
              </div>
              {fornecedoresComPrazo.length < fornecedores.length && (
                <p className="text-[11px] text-slate-400 mt-2">{fornecedores.length - fornecedoresComPrazo.length} fornecedor(es) sem prazo de entrega registrado não aparece(m) no gráfico.</p>
              )}
            </>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <h2 className="font-bold text-slate-800 mb-3">Ranking de fornecedores</h2>
          {insights.fornecedores && <p className="text-xs text-emerald-700 mb-3 flex items-start gap-1.5"><Sparkles size={13} className="shrink-0 mt-0.5" />{insights.fornecedores}</p>}
          {dados.erros.fornecedores
            ? <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3">Esta seção não pôde ser carregada: {dados.erros.fornecedores}</p>
            : <TabelaInterativa linhas={linhasRanking} />}
        </section>

        </div>
        <div className="xl:col-span-1 xl:sticky xl:top-5">
          <SugestoesAutomaticas dados={dados} limite={6} />
        </div>
        </div>
      </>
    )}

    {modalAberto && (
      <ModalExpandido aberto={modalAberto !== null} onFechar={() => setModalAberto(null)} titulo={MODAL_CONFIG[modalAberto].titulo} subtitulo={MODAL_CONFIG[modalAberto].subtitulo}>
        <TabelaInterativa linhas={linhasModal} />
      </ModalExpandido>
    )}
  </div>;
}
