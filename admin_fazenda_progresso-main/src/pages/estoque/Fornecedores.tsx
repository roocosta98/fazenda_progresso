import { useMemo } from 'react';
import { BarChart3, Boxes, Clock3, Sparkles, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { TabelaInterativa, numero, useEstoquePainel } from './estoqueShared';
import { SugestoesAutomaticas } from './SugestoesAutomaticas';
import { Carregando, SemDado } from '../../components/common/viz';

// Paleta categórica validada (dataviz skill): ordem fixa, nunca ciclar por rank — mesma paleta
// já usada no Dashboard de Estoque.
const COR_CATEGORICA = ['#2a78d6', '#eb6834', '#1baf7a'];

function faixaTaxa(taxa: number): { rotulo: string; cor: string } {
  if (taxa >= 90) return { rotulo: 'Alta taxa de vitória (≥90%)', cor: COR_CATEGORICA[2] };
  if (taxa >= 70) return { rotulo: 'Taxa intermediária (70–90%)', cor: COR_CATEGORICA[0] };
  return { rotulo: 'Baixa taxa de vitória (<70%)', cor: COR_CATEGORICA[1] };
}

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

  const fornecedores = useMemo(() => (dados?.fornecedores ?? []).map((l) => ({
    fornecedor: String(l.FORNECEDOR ?? ''),
    prazo: Number(l.PRAZOMEDIO ?? 0),
    taxa: Number(l.TAXAVITORIA ?? 0),
    cotacoes: Number(l.TOTALCOTACOES ?? 0),
    produtos: Number(l.PRODUTOSDISTINTOS ?? 0),
  })), [dados]);

  // "Mais frequente", não "melhor" — não existe pontuação composta de qualidade (isso seria
  // inventar um "Supplier Score"); o critério aqui é só volume real de cotações.
  const maisFrequente = useMemo(() => [...fornecedores].sort((a, b) => b.cotacoes - a.cotacoes)[0], [fornecedores]);
  const melhorPrazo = useMemo(() => fornecedores.filter((f) => f.prazo > 0).sort((a, b) => a.prazo - b.prazo)[0], [fornecedores]);
  const maiorTaxa = useMemo(() => [...fornecedores].sort((a, b) => b.taxa - a.taxa)[0], [fornecedores]);
  const totalCotacoesHistorico = useMemo(() => fornecedores.reduce((s, f) => s + f.cotacoes, 0), [fornecedores]);

  return <div className="space-y-5 pb-12">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold tracking-wider uppercase text-emerald-700">Estoque</p>
        <h1 className="text-2xl font-bold text-slate-800">Fornecedores</h1>
        <p className="text-sm text-slate-500 mt-1">Histórico de cotações: prazo, vitórias e produtos distintos cotados (empresa 01).</p>
      </div>
      <Link to="/logistica/estoque/dashboard" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shrink-0">
        <BarChart3 size={15} className="text-emerald-700" /> Ver Dashboard
      </Link>
    </div>
    {erro && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{erro}</div>}
    {carregando && !dados ? <div className="bg-white border rounded-2xl p-12"><Carregando mensagem="Carregando fornecedores…" /></div> : dados && (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <CardFornecedores Icon={Boxes} cor="bg-blue-50 text-blue-600" rotulo="Fornecedores no histórico" valor={numero(fornecedores.length)} />
          <CardFornecedores Icon={Clock3} cor="bg-emerald-50 text-emerald-600" rotulo="Melhor prazo médio" valor={melhorPrazo ? `${numero(melhorPrazo.prazo, 1)} dias` : '—'} apoio={melhorPrazo?.fornecedor} />
          <CardFornecedores Icon={Trophy} cor="bg-amber-50 text-amber-600" rotulo="Maior taxa de vitória" valor={maiorTaxa ? `${numero(maiorTaxa.taxa, 1)}%` : '—'} apoio={maiorTaxa?.fornecedor} />
          <CardFornecedores Icon={BarChart3} cor="bg-violet-50 text-violet-600" rotulo="Cotações no histórico" valor={numero(totalCotacoesHistorico)} apoio="Soma de todos os fornecedores" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <div className="xl:col-span-2 space-y-5">

        {maisFrequente && (
          <section className="bg-white border rounded-2xl p-5 flex flex-wrap items-center gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400">Fornecedor mais frequente no histórico</p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">{maisFrequente.fornecedor}</p>
            </div>
            <div className="flex flex-wrap gap-6 ml-auto">
              <div><p className="text-[10px] font-bold uppercase text-slate-400">Cotações</p><p className="text-sm font-bold text-slate-800">{numero(maisFrequente.cotacoes)}</p></div>
              <div><p className="text-[10px] font-bold uppercase text-slate-400">Taxa de vitória</p><p className="text-sm font-bold text-slate-800">{numero(maisFrequente.taxa, 1)}%</p></div>
              <div><p className="text-[10px] font-bold uppercase text-slate-400">Prazo médio</p><p className="text-sm font-bold text-slate-800">{numero(maisFrequente.prazo, 1)} dias</p></div>
              <div><p className="text-[10px] font-bold uppercase text-slate-400">Produtos distintos</p><p className="text-sm font-bold text-slate-800">{numero(maisFrequente.produtos)}</p></div>
            </div>
          </section>
        )}

        <section className="bg-white border rounded-2xl p-5">
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><BarChart3 size={16} className="text-emerald-600" /> Prazo × Taxa de vitória</h2>
          <p className="text-xs text-slate-500 mt-1 mb-3">Cada ponto é um fornecedor; o tamanho da bolha é o volume de cotações no histórico.</p>
          {fornecedores.length === 0 ? <SemDado mensagem="Nenhum fornecedor com cotação no cadastro atual." /> : (
            <>
              <ResponsiveContainer width="100%" height={320}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <XAxis type="number" dataKey="prazo" name="Prazo médio" unit=" dias" tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} />
                  <YAxis type="number" dataKey="taxa" name="Taxa de vitória" unit="%" domain={[0, 100]} tick={{ fontSize: 10, fill: '#898781' }} axisLine={false} tickLine={false} />
                  <ZAxis type="number" dataKey="cotacoes" range={[40, 400]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v, nome) => nome === 'taxa' ? `${numero(v as number, 1)}%` : nome === 'prazo' ? `${numero(v as number, 1)} dias` : numero(v as number)}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const p = payload[0].payload as typeof fornecedores[number];
                      return (
                        <div className="bg-white border rounded-xl shadow-lg p-2.5 text-xs">
                          <p className="font-bold text-slate-800">{p.fornecedor}</p>
                          <p className="text-slate-500">Prazo médio: {numero(p.prazo, 1)} dias</p>
                          <p className="text-slate-500">Taxa de vitória: {numero(p.taxa, 1)}%</p>
                          <p className="text-slate-500">Cotações: {numero(p.cotacoes)}</p>
                        </div>
                      );
                    }} />
                  <Scatter data={fornecedores} fillOpacity={0.75}>
                    {fornecedores.map((f, i) => <Cell key={i} fill={faixaTaxa(f.taxa).cor} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-4 mt-2 pt-3 border-t border-slate-100">
                {[faixaTaxa(95), faixaTaxa(80), faixaTaxa(50)].map((f) => (
                  <div key={f.rotulo} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: f.cor }} />
                    <span className="text-[11px] font-medium text-slate-600">{f.rotulo}</span>
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
            : <TabelaInterativa linhas={dados.fornecedores} />}
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
