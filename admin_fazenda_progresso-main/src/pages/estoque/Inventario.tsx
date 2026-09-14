import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpCircle, BarChart3, Boxes, MapPinOff, Sparkles, Timer } from 'lucide-react';
import {
  FiltroDataEstoque, TabelaInterativa, comStatusEstoque, numero, useEstoquePainel, type FiltroSituacaoTabela, type Linha,
} from './estoqueShared';
import { Carregando, SemDado } from '../../components/common/viz';

type Aba = 'ruptura' | 'curvaAbc' | 'semMovimentacao' | 'giro';

const ABAS: { chave: Aba; rotulo: string; subtitulo: string }[] = [
  { chave: 'ruptura', rotulo: 'Ruptura e estoque mínimo/máximo', subtitulo: 'Itens sinalizados para reposição ou abaixo do mínimo configurado.' },
  { chave: 'curvaAbc', rotulo: 'Maior valor em estoque · Curva ABC', subtitulo: 'Valor calculado por estoque × custo gerencial mais recente.' },
  { chave: 'semMovimentacao', rotulo: 'Itens sem movimentação', subtitulo: 'Produtos sem saída (consumo, produção ou baixa) por 90 dias ou mais.' },
  { chave: 'giro', rotulo: 'Giro por produto', subtitulo: 'Consumo por requisição no período filtrado, giro e dias de cobertura do estoque atual.' },
];

const NOTA_ABC = 'Classe A: ~20% dos itens concentram ~80% do valor total — exigem controle rígido e inventários frequentes.\nClasse B: ~30% dos itens, ~15% do valor total — importância intermediária, monitoramento moderado.\nClasse C: ~50% dos itens, apenas ~5% do valor total — baixo valor unitário ou baixa movimentação, controle mais simples.';

const FILTRO_SEM_MOVIMENTACAO: FiltroSituacaoTabela = { coluna: 'SITUACAO', rotuloSim: 'Com estoque', rotuloNao: 'Sem estoque' };

function CardInventario({ Icon, cor, rotulo, valor, apoio }: { Icon: typeof Boxes; cor: string; rotulo: string; valor: string; apoio?: string }) {
  return (
    <div className="bg-white border rounded-2xl p-4">
      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3 ${cor}`}><Icon size={17} /></span>
      <p className="text-[11px] uppercase font-bold text-slate-400">{rotulo}</p>
      <p className="text-xl font-bold text-slate-800 mt-1">{valor}</p>
      {apoio && <p className="text-[11px] text-slate-400 mt-0.5">{apoio}</p>}
    </div>
  );
}

export function Inventario() {
  const { dados, erro, carregando, carregar, dataDe, setDataDe, dataAte, setDataAte, insights } = useEstoquePainel();
  const [aba, setAba] = useState<Aba>('ruptura');

  // Status (Zerado/Abaixo do mínimo/Acima do máximo/Normal) é calculado no cliente a partir do
  // estoque/mínimo/máximo que o próprio Sankhya já manda — nunca inventado, só destacado.
  const rupturaComStatus = useMemo(() => comStatusEstoque(dados?.ruptura ?? [], { estoque: 'ESTOQUE', minimo: 'MINIMO', maximo: 'MAXIMO' }), [dados]);
  const giroComStatus = useMemo(() => comStatusEstoque(dados?.giroProdutos ?? [], { estoque: 'ESTOQUE_ATUAL', minimo: 'ESTMIN', maximo: 'ESTMAX' }), [dados]);

  // Cobertura média — só entre os itens com movimentação no período filtrado (giroProdutos), não
  // o cadastro inteiro; por isso o rótulo é explícito sobre o recorte, nunca "cobertura geral".
  const coberturaMedia = useMemo(() => {
    const validos = (dados?.giroProdutos ?? []).map((l) => Number(l.DIAS_COBERTURA)).filter((v) => Number.isFinite(v) && v > 0);
    if (!validos.length) return null;
    return validos.reduce((s, v) => s + v, 0) / validos.length;
  }, [dados]);

  const distribuicaoLocal = useMemo(() => {
    const linhas = (dados?.distribuicaoLocal ?? []).map((l) => ({ local: String(l.LOCAL ?? '—'), estoque: Number(l.ESTOQUE ?? 0) }));
    const max = Math.max(...linhas.map((l) => l.estoque), 1);
    return linhas.slice(0, 8).map((l) => ({ ...l, percentual: (l.estoque / max) * 100 }));
  }, [dados]);

  const conteudoPorAba: Record<Aba, { linhas: Linha[]; erro?: string; insight?: string; nota?: string; filtroSituacao?: FiltroSituacaoTabela }> = {
    ruptura: { linhas: rupturaComStatus, erro: dados?.erros.ruptura, insight: insights.ruptura },
    curvaAbc: { linhas: dados?.valor ?? [], erro: dados?.erros.valor, insight: insights.valor, nota: NOTA_ABC },
    semMovimentacao: { linhas: dados?.semMovimentacao ?? [], erro: dados?.erros.semMovimentacao, insight: insights.semMovimentacao, filtroSituacao: FILTRO_SEM_MOVIMENTACAO },
    giro: { linhas: giroComStatus, erro: dados?.erros.giroProdutos, insight: insights.giroProdutos },
  };
  const atual = conteudoPorAba[aba];

  return <div className="space-y-5 pb-12">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold tracking-wider uppercase text-emerald-700">Estoque</p>
        <h1 className="text-2xl font-bold text-slate-800">Inventário</h1>
        <p className="text-sm text-slate-500 mt-1">Consulta detalhada de níveis, localizações e cobertura do estoque (empresa 01).</p>
      </div>
      <Link to="/logistica/estoque/dashboard" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shrink-0">
        <BarChart3 size={15} className="text-emerald-700" /> Ver Dashboard
      </Link>
    </div>
    <FiltroDataEstoque dataDe={dataDe} setDataDe={setDataDe} dataAte={dataAte} setDataAte={setDataAte} carregando={carregando} carregar={carregar} />
    {erro && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{erro}</div>}

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
      <CardInventario Icon={Boxes} cor="bg-blue-50 text-blue-600" rotulo="Total de SKUs" valor={numero(dados?.kpis.TOTALSKUS)} apoio="Produtos ativos no escopo de almoxarifado" />
      <CardInventario Icon={AlertTriangle} cor="bg-rose-50 text-rose-600" rotulo="Abaixo do mínimo" valor={numero(dados?.kpis.TOTALRUPTURA)} apoio="Estoque somado ≤ mínimo do produto" />
      <CardInventario Icon={ArrowUpCircle} cor="bg-amber-50 text-amber-600" rotulo="Acima do máximo" valor={numero(dados?.kpis.TOTALACIMAMAXIMO)} apoio="Possível excesso de compra" />
      <CardInventario Icon={MapPinOff} cor="bg-violet-50 text-violet-600" rotulo="Sem local padrão" valor={numero(dados?.kpis.TOTALSEMLOCALIZACAO)} apoio="Com estoque, sem local padrão cadastrado" />
      <CardInventario Icon={Timer} cor="bg-emerald-50 text-emerald-600" rotulo="Cobertura média" valor={coberturaMedia == null ? '—' : `${numero(coberturaMedia, 0)} dias`} apoio="Só itens com consumo no período filtrado" />
    </div>

    {carregando && !dados ? <div className="bg-white border rounded-2xl p-12"><Carregando mensagem="Carregando dados do estoque…" /></div> : dados && (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <section className="xl:col-span-2 bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
          <div className="flex flex-wrap gap-1 p-2 border-b border-slate-100 overflow-x-auto">
            {ABAS.map((item) => (
              <button key={item.chave} onClick={() => setAba(item.chave)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${aba === item.chave ? 'bg-emerald-950 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                {item.rotulo}
              </button>
            ))}
          </div>
          <div className="p-5">
            <p className="text-xs text-slate-500 mb-1">{ABAS.find((a) => a.chave === aba)?.subtitulo}</p>
            {atual.insight && <p className="text-xs text-emerald-700 mb-3 flex items-start gap-1.5"><Sparkles size={13} className="shrink-0 mt-0.5" />{atual.insight}</p>}
            {atual.nota && <pre className="text-xs text-slate-500 whitespace-pre-wrap font-sans bg-slate-50 border border-slate-200/80 rounded-xl p-3 mb-3">{atual.nota}</pre>}
            {atual.erro
              ? <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3">Esta seção não pôde ser carregada: {atual.erro}</p>
              : <TabelaInterativa linhas={atual.linhas} filtroSituacao={atual.filtroSituacao} />}
          </div>
        </section>

        <div className="space-y-5">
          <section className="bg-white rounded-2xl border border-slate-200/80 p-5">
            <h2 className="font-bold text-slate-800 text-sm">Distribuição por local</h2>
            <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Quantidade de itens em estoque por depósito/local (cadastro atual).</p>
            {distribuicaoLocal.length === 0 ? <SemDado mensagem="Sem dados de local no cadastro atual." /> : (
              <div className="space-y-2.5">
                {distribuicaoLocal.map((l) => (
                  <div key={l.local}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium truncate pr-2">{l.local}</span>
                      <span className="text-slate-800 font-bold tabular-nums shrink-0">{numero(l.estoque)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${l.percentual}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-slate-200/80 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-sm">Itens sem movimentação</h2>
              <button onClick={() => setAba('semMovimentacao')} className="text-[11px] font-bold text-emerald-700 hover:underline">Ver todos →</button>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Top produtos parados há mais tempo, com saldo em estoque.</p>
            {(dados.semMovimentacao ?? []).length === 0 ? <SemDado mensagem="Nenhum produto sem movimentação no cadastro atual." /> : (
              <div className="divide-y divide-slate-100">
                {(dados.semMovimentacao ?? [])
                  .filter((l) => String(l.SITUACAO) === 'S')
                  .sort((a, b) => Number(b.DIAS_SEM_USO ?? 0) - Number(a.DIAS_SEM_USO ?? 0))
                  .slice(0, 6)
                  .map((l, i) => (
                    <div key={i} className="py-2 flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-600 truncate">{String(l.DESCRPROD)}</span>
                      <span className="text-amber-700 font-bold shrink-0">{numero(l.DIAS_SEM_USO)} dias</span>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </div>
      </div>
    )}
  </div>;
}
