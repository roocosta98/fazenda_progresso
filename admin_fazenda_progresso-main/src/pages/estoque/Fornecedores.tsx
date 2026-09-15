import { useMemo } from 'react';
import { BarChart3, Boxes, Clock3, Layers, Sparkles, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { TabelaInterativa, moeda, numero, useEstoquePainel } from './estoqueShared';
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

function CardFornecedores({ Icon, cor, rotulo, valor, apoio }: { Icon: typeof Boxes; cor: string; rotulo: string; valor: string; apoio?: string }) {
  return (
    <div className="bg-white border rounded-2xl p-4">
      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3 ${cor}`}><Icon size={17} /></span>
      <p className="text-[11px] uppercase font-bold text-slate-400">{rotulo}</p>
      <p className="text-xl font-bold text-slate-800 mt-1">{valor}</p>
      {apoio && <p className="text-[11px] text-slate-400 mt-0.5">{apoio}</p>}
    </div>
  );
}

export function Fornecedores() {
  const { dados, erro, carregando, insights } = useEstoquePainel();

  // Análise de Fornecedores fornecida pela Fazenda Progresso (script próprio deles): Supplier
  // Score ponderado (35% taxa de vitória, 30% competitividade de preço vs. concorrentes na MESMA
  // cotação/item, 15% prazo, 10% cobertura de produtos, 10% volume) e economia calculada item a
  // item — não é estimativa nossa, é a fórmula e os dados reais deles, dos últimos 90 dias.
  const fornecedores = useMemo(() => (dados?.fornecedores ?? []).map((l) => ({
    fornecedor: String(l.FORNECEDOR ?? ''),
    prazo: Number(l.PRAZO_MEDIO_DIAS ?? 0),
    taxa: Number(l.TAXA_VITORIA_PCT ?? 0),
    cotacoes: Number(l.TOTAL_COTACOES ?? 0),
    produtos: Number(l.PRODUTOS_DISTINTOS ?? 0),
    score: Number(l.SUPPLIER_SCORE ?? 0),
    faixa: String(l.FAIXA_SUPPLIER_SCORE ?? ''),
    competitividade: l.COMPETITIVIDADE_PRECO_PCT ?? l.COMPETITIVIDADE_PRECO_MEDIA_PCT ?? null,
    statusCompetitividade: String(l.STATUS_COMPETITIVIDADE ?? ''),
  })), [dados]);

  // A própria consulta já traz o ranking (RANKING_GERAL=1 é o melhor no período) e os totais
  // gerais dos últimos 90 dias replicados em toda linha (K.*) — pega da primeira, que é constante.
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
    TOTAL_COTACOES: l.TOTAL_COTACOES,
    PRODUTOS_DISTINTOS: l.PRODUTOS_DISTINTOS,
  })), [dados]);

  return <div className="space-y-5 pb-12">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold tracking-wider uppercase text-emerald-700">Estoque</p>
        <h1 className="text-2xl font-bold text-slate-800">Fornecedores</h1>
        <p className="text-sm text-slate-500 mt-1">Supplier Score e indicadores de cotação dos últimos 90 dias (empresa 01).</p>
      </div>
      <Link to="/logistica/estoque/dashboard" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shrink-0">
        <BarChart3 size={15} className="text-emerald-700" /> Ver Dashboard
      </Link>
    </div>
    {erro && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{erro}</div>}
    {carregando && !dados ? <div className="bg-white border rounded-2xl p-12"><Carregando mensagem="Carregando fornecedores…" /></div> : dados && (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <CardFornecedores Icon={Boxes} cor="bg-blue-50 text-blue-600" rotulo="Fornecedores ativos (90d)" valor={numero(totais?.FORNECEDORES_ATIVOS_90D)} />
          <CardFornecedores Icon={Clock3} cor="bg-emerald-50 text-emerald-600" rotulo="Melhor prazo médio (90d)" valor={totais?.MELHOR_PRAZO_MEDIO_90D != null ? `${numero(totais.MELHOR_PRAZO_MEDIO_90D, 1)} dias` : '—'} />
          <CardFornecedores Icon={BarChart3} cor="bg-amber-50 text-amber-600" rotulo="Maior taxa de vitória (90d)" valor={totais?.MAIOR_TAXA_VITORIA_90D != null ? `${numero(totais.MAIOR_TAXA_VITORIA_90D, 1)}%` : '—'} />
          <CardFornecedores Icon={Layers} cor="bg-violet-50 text-violet-600" rotulo="Categorias atendidas (90d)" valor={numero(totais?.CATEGORIAS_ATENDIDAS_90D)} />
          <CardFornecedores Icon={Wallet} cor="bg-teal-50 text-teal-600" rotulo="Economia acumulada (90d)" valor={moeda(totais?.ECONOMIA_ACUMULADA_90D)} apoio="Soma das cotações vencidas com preço abaixo da média dos concorrentes" />
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
              <div><p className="text-[10px] font-bold uppercase text-slate-400">Prazo médio</p><p className="text-sm font-bold text-slate-800">{numero(melhor.prazo, 1)} dias</p></div>
              <div><p className="text-[10px] font-bold uppercase text-slate-400">Competitividade</p><p className="text-sm font-bold text-slate-800">{melhor.competitividade != null ? `${numero(Number(melhor.competitividade), 1)}%` : '—'}</p></div>
              <div><p className="text-[10px] font-bold uppercase text-slate-400">Cotações (90d)</p><p className="text-sm font-bold text-slate-800">{numero(melhor.cotacoes)}</p></div>
            </div>
          </section>
        )}

        <section className="bg-white border rounded-2xl p-5">
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><BarChart3 size={16} className="text-emerald-600" /> Prazo × Taxa de vitória</h2>
          <p className="text-xs text-slate-500 mt-1 mb-3">Cada ponto é um fornecedor (90 dias); o tamanho da bolha é o volume de cotações e a cor é a faixa do Supplier Score.</p>
          {fornecedores.length === 0 ? <SemDado mensagem="Nenhum fornecedor com cotação respondida nos últimos 90 dias." /> : (
            <>
              <ResponsiveContainer width="100%" height={320}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <XAxis type="number" dataKey="prazo" name="Prazo médio" unit=" dias" tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} />
                  <YAxis type="number" dataKey="taxa" name="Taxa de vitória" unit="%" domain={[0, 100]} tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} />
                  <ZAxis type="number" dataKey="cotacoes" range={[40, 400]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const p = payload[0].payload as typeof fornecedores[number];
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
                  <Scatter data={fornecedores} fillOpacity={0.75}>
                    {fornecedores.map((f, i) => <Cell key={i} fill={FAIXA_COR[f.faixa] ?? '#94a3b8'} />)}
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
  </div>;
}
