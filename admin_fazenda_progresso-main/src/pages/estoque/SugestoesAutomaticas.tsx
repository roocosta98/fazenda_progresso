import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Boxes, FileText, ListChecks } from 'lucide-react';
import { comStatusEstoque, comSituacaoCotacao, numero, type DadosEstoque, type Linha } from './estoqueShared';
import { DetalheDrawer, type TipoDetalhe } from './DetalheDrawer';

interface Sugestao {
  tipo: TipoDetalhe;
  titulo: string;
  motivo: string;
  peso: number; // menor = mais urgente
  linhaOriginal: Linha;
}

// Mesmas regras de negócio da Central de Ações (limiar de estoque mínimo, prazo de cotação
// vencido) — nada de "IA" ou economia estimada: cada motivo vem direto do dado real da linha.
// Existe pra dar visibilidade rápida do que precisa de ação em qualquer tela do Estoque, sem
// precisar entrar na Central de Ações pra ver.
function useSugestoes(dados: DadosEstoque | null, limite: number): Sugestao[] {
  return useMemo(() => {
    if (!dados) return [];
    const rupturaComStatus = comStatusEstoque(dados.ruptura, { estoque: 'ESTOQUE', minimo: 'MINIMO', maximo: 'MAXIMO' });
    const doRuptura: Sugestao[] = rupturaComStatus
      .filter((l) => l.STATUS === 'Zerado' || l.STATUS === 'Abaixo do mínimo')
      .map((l) => ({
        tipo: 'produto',
        titulo: String(l.DESCRPROD ?? ''),
        motivo: l.STATUS === 'Zerado' ? 'Estoque zerado — repor' : `Estoque (${numero(l.ESTOQUE)}) abaixo do mínimo (${numero(l.MINIMO)})`,
        peso: l.STATUS === 'Zerado' ? 0 : 1,
        linhaOriginal: l,
      }));
    const cotacoesComSituacao = comSituacaoCotacao(dados.cotacoes);
    const doCotacoes: Sugestao[] = cotacoesComSituacao
      .filter((l) => l.SITUACAO_COTACAO === 'Atrasada' || l.SITUACAO_COTACAO === 'Sem prazo')
      .map((l) => ({
        tipo: 'cotacao',
        titulo: `Cotação nº ${l.NUMCOTACAO}`,
        motivo: l.SITUACAO_COTACAO === 'Atrasada' ? 'Prazo final vencido — cobrar retorno do fornecedor' : 'Sem prazo final definido',
        peso: l.SITUACAO_COTACAO === 'Atrasada' ? 0.5 : 2,
        linhaOriginal: l,
      }));
    return [...doRuptura, ...doCotacoes].sort((a, b) => a.peso - b.peso).slice(0, limite);
  }, [dados, limite]);
}

export function SugestoesAutomaticas({ dados, limite = 5 }: { dados: DadosEstoque | null; limite?: number }) {
  const sugestoes = useSugestoes(dados, limite);
  const [detalheAberto, setDetalheAberto] = useState<{ tipo: TipoDetalhe; linha: Linha } | null>(null);

  if (!dados || sugestoes.length === 0) return null;

  return (
    <section className="bg-white border border-slate-200/80 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><ListChecks size={16} className="text-emerald-600" />Sugestões automáticas</h2>
          <p className="text-xs text-slate-500 mt-1">Geradas por regra de estoque mínimo e prazo de cotação — sem inteligência artificial.</p>
        </div>
        <Link to="/logistica/estoque/central-de-acoes" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 shrink-0 whitespace-nowrap">
          Ver todas <ArrowRight size={13} />
        </Link>
      </div>
      <div className="mt-4 space-y-2">
        {sugestoes.map((s, i) => (
          <button key={i} onClick={() => setDetalheAberto({ tipo: s.tipo, linha: s.linhaOriginal })}
            className="w-full flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors text-left">
            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${s.tipo === 'produto' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
              {s.tipo === 'produto' ? <Boxes size={15} /> : <FileText size={15} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-800 truncate">{s.titulo}</span>
              <span className="block text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <AlertTriangle size={11} className="text-slate-400 shrink-0" />{s.motivo}
              </span>
            </span>
          </button>
        ))}
      </div>
      {detalheAberto && <DetalheDrawer aberto onFechar={() => setDetalheAberto(null)} tipo={detalheAberto.tipo} linha={detalheAberto.linha} />}
    </section>
  );
}
