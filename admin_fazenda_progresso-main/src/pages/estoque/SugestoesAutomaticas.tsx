import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ArrowUpCircle, Boxes, Clock3, FileText, ListChecks } from 'lucide-react';
import { comStatusEstoque, comSituacaoCotacao, numero, type DadosEstoque, type Linha } from './estoqueShared';
import { DetalheDrawer, type TipoDetalhe } from './DetalheDrawer';

type IconeSugestao = 'zerado' | 'excesso' | 'parado' | 'cotacao';
const ICONE_ESTILO: Record<IconeSugestao, { Icon: typeof Boxes; cor: string }> = {
  zerado: { Icon: Boxes, cor: 'bg-amber-50 text-amber-600' },
  excesso: { Icon: ArrowUpCircle, cor: 'bg-blue-50 text-blue-600' },
  parado: { Icon: Clock3, cor: 'bg-violet-50 text-violet-600' },
  cotacao: { Icon: FileText, cor: 'bg-rose-50 text-rose-600' },
};

interface Sugestao {
  tipo: TipoDetalhe;
  icone: IconeSugestao;
  titulo: string;
  motivo: string;
  linhaOriginal: Linha;
}

// Mesmas regras de negócio já usadas na Central de Ações/Análises (limiar de estoque mínimo e
// máximo, prazo de cotação vencido, tempo parado) — nada de "IA" ou economia estimada: cada
// motivo vem direto do dado real da linha. Junta vários TIPOS de alerta (não só ruptura) e
// intercala entre eles (round-robin) pra não deixar um tipo dominante — como estoque zerado tem
// milhares de linhas na base real — engolir o card inteiro.
function useSugestoes(dados: DadosEstoque | null, limite: number): Sugestao[] {
  return useMemo(() => {
    if (!dados) return [];

    const rupturaComStatus = comStatusEstoque(dados.ruptura, { estoque: 'ESTOQUE', minimo: 'MINIMO', maximo: 'MAXIMO' });
    const zerados: Sugestao[] = rupturaComStatus
      .filter((l) => l.STATUS === 'Zerado' || l.STATUS === 'Abaixo do mínimo')
      .map((l) => ({
        tipo: 'produto', icone: 'zerado',
        titulo: String(l.DESCRPROD ?? ''),
        motivo: l.STATUS === 'Zerado' ? 'Estoque zerado — repor' : `Estoque (${numero(l.ESTOQUE)}) abaixo do mínimo (${numero(l.MINIMO)})`,
        linhaOriginal: l,
      }));

    const cotacoesComSituacao = comSituacaoCotacao(dados.cotacoes);
    const cotAtrasadas: Sugestao[] = cotacoesComSituacao
      .filter((l) => l.SITUACAO_COTACAO === 'Atrasada')
      .map((l) => ({
        tipo: 'cotacao', icone: 'cotacao',
        titulo: `Cotação nº ${l.NUMCOTACAO}`,
        motivo: 'Prazo final vencido — cobrar retorno do fornecedor',
        linhaOriginal: l,
      }));
    const cotSemPrazo: Sugestao[] = cotacoesComSituacao
      .filter((l) => l.SITUACAO_COTACAO === 'Sem prazo')
      .map((l) => ({
        tipo: 'cotacao', icone: 'cotacao',
        titulo: `Cotação nº ${l.NUMCOTACAO}`,
        motivo: 'Sem prazo final definido',
        linhaOriginal: l,
      }));

    const giroComStatus = comStatusEstoque(dados.giroProdutos, { estoque: 'ESTOQUE_ATUAL', minimo: 'ESTMIN', maximo: 'ESTMAX' });
    const excessos: Sugestao[] = giroComStatus
      .filter((l) => l.STATUS === 'Acima do máximo')
      .map((l) => ({
        tipo: 'produto', icone: 'excesso',
        titulo: String(l.DESCRPROD ?? ''),
        motivo: `Estoque (${numero(l.ESTOQUE_ATUAL)}) acima do máximo (${numero(l.ESTMAX)}) — possível excesso de compra`,
        linhaOriginal: l,
      }));

    const parados: Sugestao[] = dados.semMovimentacao
      .filter((l) => String(l.SITUACAO) === 'S' && Number(l.DIAS_SEM_USO ?? 0) >= 90)
      .sort((a, b) => Number(b.DIAS_SEM_USO ?? 0) - Number(a.DIAS_SEM_USO ?? 0))
      .map((l) => ({
        tipo: 'produto', icone: 'parado',
        titulo: String(l.DESCRPROD ?? ''),
        motivo: `Sem saída há ${numero(l.DIAS_SEM_USO)} dias — avaliar remanejamento ou baixa`,
        linhaOriginal: l,
      }));

    // Round-robin: 1 de cada categoria por vez, na ordem de prioridade, até encher o limite ou
    // esgotar tudo — garante diversidade mesmo quando uma categoria tem muito mais linhas que as outras.
    const categorias = [zerados, cotAtrasadas, excessos, parados, cotSemPrazo];
    const indices = categorias.map(() => 0);
    const resultado: Sugestao[] = [];
    let restante = categorias.reduce((s, c) => s + c.length, 0);
    while (resultado.length < limite && restante > 0) {
      for (let i = 0; i < categorias.length && resultado.length < limite; i++) {
        if (indices[i] < categorias[i].length) {
          resultado.push(categorias[i][indices[i]]);
          indices[i]++;
          restante--;
        }
      }
    }
    return resultado;
  }, [dados, limite]);
}

export function SugestoesAutomaticas({ dados, limite = 6 }: { dados: DadosEstoque | null; limite?: number }) {
  const sugestoes = useSugestoes(dados, limite);
  const [detalheAberto, setDetalheAberto] = useState<{ tipo: TipoDetalhe; linha: Linha } | null>(null);

  if (!dados || sugestoes.length === 0) return null;

  return (
    <section className="bg-white border border-slate-200/80 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><ListChecks size={16} className="text-emerald-600" />Sugestões automáticas</h2>
          <p className="text-xs text-slate-500 mt-1">Por regra de negócio (estoque mínimo/máximo, tempo parado, prazo de cotação) — ainda estamos estudando como aplicar IA de verdade aqui.</p>
        </div>
        <Link to="/logistica/estoque/central-de-acoes" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 shrink-0 whitespace-nowrap">
          Ver todas <ArrowRight size={13} />
        </Link>
      </div>
      <div className="mt-4 space-y-2">
        {sugestoes.map((s, i) => {
          const { Icon, cor } = ICONE_ESTILO[s.icone];
          return (
            <button key={i} onClick={() => setDetalheAberto({ tipo: s.tipo, linha: s.linhaOriginal })}
              className="w-full flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors text-left">
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${cor}`}>
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-800 truncate">{s.titulo}</span>
                <span className="block text-xs text-slate-500 mt-0.5 flex items-start gap-1">
                  <AlertTriangle size={11} className="text-slate-400 shrink-0 mt-0.5" />{s.motivo}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {detalheAberto && <DetalheDrawer aberto onFechar={() => setDetalheAberto(null)} tipo={detalheAberto.tipo} linha={detalheAberto.linha} />}
    </section>
  );
}
