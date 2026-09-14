import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BarChart3, Boxes, Search, TriangleAlert } from 'lucide-react';
import { comStatusEstoque, comSituacaoCotacao, numero, useEstoquePainel, type Linha } from './estoqueShared';
import { DetalheDrawer, type TipoDetalhe } from './DetalheDrawer';
import { Carregando, SemDado } from '../../components/common/viz';

type Impacto = 'Crítico' | 'Alto' | 'Médio';
const IMPACTO_ESTILO: Record<Impacto, string> = {
  'Crítico': 'bg-rose-50 text-rose-700 border-rose-200',
  'Alto': 'bg-amber-50 text-amber-700 border-amber-200',
  'Médio': 'bg-blue-50 text-blue-700 border-blue-200',
};
const IMPACTO_PESO: Record<Impacto, number> = { 'Crítico': 0, 'Alto': 1, 'Médio': 2 };

interface ItemAcao {
  tipo: 'Produto' | 'Cotação';
  codigo: string;
  descricao: string;
  impacto: Impacto;
  motivo: string;
  linhaOriginal: Linha;
}

function CardAcoes({ Icon, cor, rotulo, valor }: { Icon: typeof Boxes; cor: string; rotulo: string; valor: string }) {
  return (
    <div className="bg-white border rounded-2xl p-4">
      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3 ${cor}`}><Icon size={17} /></span>
      <p className="text-[11px] uppercase font-bold text-slate-400">{rotulo}</p>
      <p className="text-xl font-bold text-slate-800 mt-1">{valor}</p>
    </div>
  );
}

// Todas as regras aqui são de negócio simples (limiar de estoque, prazo vencido), NUNCA um
// modelo preditivo ou pontuação de IA — "impacto" e "motivo" vêm direto do dado real da linha.
export function CentralAcoes() {
  const { dados, erro, carregando } = useEstoquePainel();
  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'Produto' | 'Cotação'>('todos');
  const [detalheAberto, setDetalheAberto] = useState<{ tipo: TipoDetalhe; linha: Linha } | null>(null);

  const itens = useMemo<ItemAcao[]>(() => {
    if (!dados) return [];
    const rupturaComStatus = comStatusEstoque(dados.ruptura, { estoque: 'ESTOQUE', minimo: 'MINIMO', maximo: 'MAXIMO' });
    const doRuptura: ItemAcao[] = rupturaComStatus
      .filter((l) => l.STATUS === 'Zerado' || l.STATUS === 'Abaixo do mínimo')
      .map((l) => ({
        tipo: 'Produto',
        codigo: String(l.CODPROD),
        descricao: String(l.DESCRPROD ?? ''),
        impacto: l.STATUS === 'Zerado' ? 'Crítico' : 'Alto',
        motivo: l.STATUS === 'Zerado' ? 'Estoque zerado' : `Estoque (${numero(l.ESTOQUE)}) abaixo do mínimo (${numero(l.MINIMO)})`,
        linhaOriginal: l,
      }));
    const cotacoesComSituacao = comSituacaoCotacao(dados.cotacoes);
    const doCotacoes: ItemAcao[] = cotacoesComSituacao
      .filter((l) => l.SITUACAO_COTACAO === 'Atrasada' || l.SITUACAO_COTACAO === 'Sem prazo')
      .map((l) => ({
        tipo: 'Cotação',
        codigo: String(l.NUMCOTACAO),
        descricao: `Cotação nº ${l.NUMCOTACAO} — ${numero(l.ITENSEMABERTO)} ite${Number(l.ITENSEMABERTO) === 1 ? 'm' : 'ns'} em aberto`,
        impacto: l.SITUACAO_COTACAO === 'Atrasada' ? 'Alto' : 'Médio',
        motivo: l.SITUACAO_COTACAO === 'Atrasada' ? 'Prazo final já vencido' : 'Sem prazo final definido',
        linhaOriginal: l,
      }));
    return [...doRuptura, ...doCotacoes].sort((a, b) => IMPACTO_PESO[a.impacto] - IMPACTO_PESO[b.impacto]);
  }, [dados]);

  const filtrados = useMemo(() => itens
    .filter((i) => tipoFiltro === 'todos' || i.tipo === tipoFiltro)
    .filter((i) => (i.descricao + i.codigo).toLocaleLowerCase().includes(busca.toLocaleLowerCase())),
    [itens, tipoFiltro, busca]);

  const criticos = itens.filter((i) => i.impacto === 'Crítico').length;
  const altos = itens.filter((i) => i.impacto === 'Alto').length;
  const medios = itens.filter((i) => i.impacto === 'Médio').length;

  const abrirDetalhe = (item: ItemAcao) => {
    if (item.tipo === 'Produto') setDetalheAberto({ tipo: 'produto', linha: item.linhaOriginal });
    else setDetalheAberto({ tipo: 'cotacao', linha: item.linhaOriginal });
  };

  return <div className="space-y-5 pb-12">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold tracking-wider uppercase text-emerald-700">Estoque</p>
        <h1 className="text-2xl font-bold text-slate-800">Central de Ações</h1>
        <p className="text-sm text-slate-500 mt-1">Produtos e cotações que pedem atenção agora, priorizados por impacto (empresa 01).</p>
      </div>
      <Link to="/logistica/estoque/dashboard" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shrink-0">
        <BarChart3 size={15} className="text-emerald-700" /> Ver Dashboard
      </Link>
    </div>
    {erro && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{erro}</div>}
    {carregando && !dados ? <div className="bg-white border rounded-2xl p-12"><Carregando mensagem="Carregando itens que precisam de ação…" /></div> : dados && (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <CardAcoes Icon={TriangleAlert} cor="bg-rose-50 text-rose-600" rotulo="Críticos" valor={numero(criticos)} />
          <CardAcoes Icon={AlertTriangle} cor="bg-amber-50 text-amber-600" rotulo="Alto impacto" valor={numero(altos)} />
          <CardAcoes Icon={AlertTriangle} cor="bg-blue-50 text-blue-600" rotulo="Médio impacto" valor={numero(medios)} />
          <CardAcoes Icon={Boxes} cor="bg-slate-100 text-slate-600" rotulo="Total de ações" valor={numero(itens.length)} />
        </div>

        <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
          <div className="p-5 pb-0">
            <h2 className="font-bold text-slate-800">Itens que precisam de ação</h2>
            <p className="text-xs text-slate-500 mt-1">Produtos com estoque zerado ou abaixo do mínimo, e cotações atrasadas ou sem prazo definido. Ordenado por impacto.</p>
          </div>
          <div className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 border rounded-xl px-3 py-2 max-w-sm text-slate-500 flex-1 min-w-[200px]">
                <Search size={14} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por código ou descrição" className="w-full outline-none text-xs" />
              </label>
              <div className="flex items-center gap-1 border rounded-xl p-1 text-xs">
                {(['todos', 'Produto', 'Cotação'] as const).map((valor) => (
                  <button key={valor} onClick={() => setTipoFiltro(valor)}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${tipoFiltro === valor ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                    {valor === 'todos' ? 'Todos' : `${valor}s`}
                  </button>
                ))}
              </div>
            </div>
            {filtrados.length === 0 ? <SemDado mensagem="Nenhum item precisa de ação com esse filtro." /> : (
              <div className="overflow-auto max-h-[520px] border rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500">
                    <tr><th className="p-3 font-semibold">Tipo</th><th className="p-3 font-semibold">Código</th><th className="p-3 font-semibold">Descrição</th><th className="p-3 font-semibold">Impacto</th><th className="p-3 font-semibold">Motivo</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtrados.map((item, i) => (
                      <tr key={i} onClick={() => abrirDetalhe(item)} className="hover:bg-slate-50 cursor-pointer">
                        <td className="p-3 whitespace-nowrap text-slate-500">{item.tipo}</td>
                        <td className="p-3 whitespace-nowrap font-semibold text-slate-700">{item.codigo}</td>
                        <td className="p-3 text-slate-700">{item.descricao}</td>
                        <td className="p-3 whitespace-nowrap"><span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-bold ${IMPACTO_ESTILO[item.impacto]}`}>{item.impacto}</span></td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">{item.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-2">Exibindo {filtrados.length} de {itens.length} item(ns) · clique numa linha pra ver o detalhe</p>
          </div>
        </section>
      </>
    )}
    {detalheAberto && <DetalheDrawer aberto onFechar={() => setDetalheAberto(null)} tipo={detalheAberto.tipo} linha={detalheAberto.linha} />}
  </div>;
}
