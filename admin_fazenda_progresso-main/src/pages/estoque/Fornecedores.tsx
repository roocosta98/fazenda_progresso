import { BarChart3, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TabelaInterativa, useEstoquePainel } from './estoqueShared';
import { Carregando } from '../../components/common/viz';

export function Fornecedores() {
  const { dados, erro, carregando, insights } = useEstoquePainel();

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
      <section className="bg-white rounded-2xl border border-slate-200/80 p-5">
        {insights.fornecedores && <p className="text-xs text-emerald-700 mb-3 flex items-start gap-1.5"><Sparkles size={13} className="shrink-0 mt-0.5" />{insights.fornecedores}</p>}
        {dados.erros.fornecedores
          ? <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3">Esta seção não pôde ser carregada: {dados.erros.fornecedores}</p>
          : <TabelaInterativa linhas={dados.fornecedores} />}
      </section>
    )}
  </div>;
}
