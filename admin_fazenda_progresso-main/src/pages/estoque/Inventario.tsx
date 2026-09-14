import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Sparkles } from 'lucide-react';
import {
  FiltroDataEstoque, KpiCardsEstoque, TabelaInterativa, comStatusEstoque, useEstoquePainel, type FiltroSituacaoTabela, type Linha,
} from './estoqueShared';
import { Carregando } from '../../components/common/viz';

type Aba = 'ruptura' | 'curvaAbc' | 'semMovimentacao' | 'giro';

const ABAS: { chave: Aba; rotulo: string; subtitulo: string }[] = [
  { chave: 'ruptura', rotulo: 'Ruptura e estoque mínimo/máximo', subtitulo: 'Itens sinalizados para reposição ou abaixo do mínimo configurado.' },
  { chave: 'curvaAbc', rotulo: 'Maior valor em estoque · Curva ABC', subtitulo: 'Valor calculado por estoque × custo gerencial mais recente.' },
  { chave: 'semMovimentacao', rotulo: 'Itens sem movimentação', subtitulo: 'Produtos sem saída (consumo, produção ou baixa) por 90 dias ou mais.' },
  { chave: 'giro', rotulo: 'Giro por produto', subtitulo: 'Consumo por requisição no período filtrado, giro e dias de cobertura do estoque atual.' },
];

const NOTA_ABC = 'Classe A: ~20% dos itens concentram ~80% do valor total — exigem controle rígido e inventários frequentes.\nClasse B: ~30% dos itens, ~15% do valor total — importância intermediária, monitoramento moderado.\nClasse C: ~50% dos itens, apenas ~5% do valor total — baixo valor unitário ou baixa movimentação, controle mais simples.';

const FILTRO_SEM_MOVIMENTACAO: FiltroSituacaoTabela = { coluna: 'SITUACAO', rotuloSim: 'Com estoque', rotuloNao: 'Sem estoque' };

export function Inventario() {
  const { dados, erro, carregando, carregar, dataDe, setDataDe, dataAte, setDataAte, insights } = useEstoquePainel();
  const [aba, setAba] = useState<Aba>('ruptura');

  // Status (Zerado/Abaixo do mínimo/Acima do máximo/Normal) é calculado no cliente a partir do
  // estoque/mínimo/máximo que o próprio Sankhya já manda — nunca inventado, só destacado.
  const rupturaComStatus = useMemo(() => comStatusEstoque(dados?.ruptura ?? [], { estoque: 'ESTOQUE', minimo: 'MINIMO', maximo: 'MAXIMO' }), [dados]);
  const giroComStatus = useMemo(() => comStatusEstoque(dados?.giroProdutos ?? [], { estoque: 'ESTOQUE_ATUAL', minimo: 'ESTMIN', maximo: 'ESTMAX' }), [dados]);

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
        <p className="text-sm text-slate-500 mt-1">Consulta detalhada de níveis, ruptura, curva ABC e giro (empresa 01).</p>
      </div>
      <Link to="/logistica/estoque/dashboard" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shrink-0">
        <BarChart3 size={15} className="text-emerald-700" /> Ver Dashboard
      </Link>
    </div>
    <FiltroDataEstoque dataDe={dataDe} setDataDe={setDataDe} dataAte={dataAte} setDataAte={setDataAte} carregando={carregando} carregar={carregar} />
    {erro && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{erro}</div>}
    <KpiCardsEstoque kpis={dados?.kpis ?? {}} cotacoesPorSituacao={dados?.cotacoesPorSituacao} />

    {carregando && !dados ? <div className="bg-white border rounded-2xl p-12"><Carregando mensagem="Carregando dados do estoque…" /></div> : dados && (
      <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
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
    )}
  </div>;
}
