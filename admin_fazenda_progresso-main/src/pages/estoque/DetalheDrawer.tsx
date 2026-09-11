import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cabecalhoPerfil } from '../../utils/apiAuth';
import { SlideOverDrawer } from '../../components/common/SlideOverDrawer';
import { Carregando, ErroCarregamento, SemDado } from '../../components/common/viz';
import { rotuloColuna, valorCelula, type Linha } from './estoqueShared';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export type TipoDetalhe = 'produto' | 'cotacao' | 'fornecedor';

interface DetalheDrawerProps {
  aberto: boolean;
  onFechar: () => void;
  tipo: TipoDetalhe;
  linha: Linha;
}

function TabelaGenerica({ linhas, vazio }: { linhas: Linha[]; vazio: string }) {
  if (linhas.length === 0) return <SemDado mensagem={vazio} />;
  const colunas = Object.keys(linhas[0]);
  return (
    <div className="overflow-auto max-h-72 border rounded-xl">
      <table className="w-full text-xs text-left">
        <thead className="sticky top-0 bg-slate-50 text-slate-500">
          <tr>{colunas.map((c) => <th key={c} className="p-2.5 font-semibold whitespace-nowrap">{rotuloColuna(c)}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {linhas.map((linha, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {colunas.map((c) => <td key={c} className="p-2.5 whitespace-nowrap text-slate-700">{valorCelula(c, linha[c])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CamposLinha({ linha }: { linha: Linha }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
      {Object.entries(linha).map(([chave, valor]) => (
        <div key={chave} className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{rotuloColuna(chave)}</p>
          <p className="text-sm font-semibold text-slate-800 truncate" title={String(valorCelula(chave, valor))}>{valorCelula(chave, valor)}</p>
        </div>
      ))}
    </div>
  );
}

const TITULOS: Record<TipoDetalhe, string> = {
  produto: 'Detalhe do produto',
  cotacao: 'Detalhe da cotação',
  fornecedor: 'Detalhe do fornecedor',
};

export function DetalheDrawer({ aberto, onFechar, tipo, linha }: DetalheDrawerProps) {
  const { usuario } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setCarregando(true);
    setErro(null);
    setDetalhe(null);
    const parametros = new URLSearchParams({ tipo });
    if (tipo === 'produto') parametros.set('codprod', String(linha.CODPROD ?? ''));
    if (tipo === 'cotacao') parametros.set('numcotacao', String(linha.NUMCOTACAO ?? ''));
    if (tipo === 'fornecedor') parametros.set('nomeparc', String(linha.FORNECEDOR ?? ''));
    fetch(`${API_URL}/api/estoque/detalhe?${parametros}`, { headers: cabecalhoPerfil(usuario?.perfil) })
      .then(async (resp) => {
        const corpo = await resp.json();
        if (!resp.ok) throw new Error(corpo.error ?? 'Não foi possível carregar o detalhe.');
        setDetalhe(corpo);
      })
      .catch((falha) => setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar o detalhe.'))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, tipo, linha]);

  return (
    <SlideOverDrawer isOpen={aberto} onClose={onFechar} title={TITULOS[tipo]} width="max-w-xl">
      <div className="space-y-5">
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Dados desta linha</h3>
          <CamposLinha linha={linha} />
        </section>

        <hr className="border-slate-100" />

        {erro ? <ErroCarregamento mensagem={erro} /> : carregando ? <Carregando mensagem="Carregando detalhe…" /> : detalhe && (
          <>
            {tipo === 'produto' && (
              <>
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Estoque por local</h3>
                  <TabelaGenerica linhas={(detalhe.estoquePorLocal as Linha[]) ?? []} vazio="Sem estoque em nenhum local." />
                </section>
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Últimas movimentações (entradas e saídas)</h3>
                  <TabelaGenerica linhas={(detalhe.movimentos as Linha[]) ?? []} vazio="Nenhuma movimentação encontrada pra este produto." />
                </section>
              </>
            )}
            {tipo === 'cotacao' && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Itens da cotação</h3>
                <TabelaGenerica linhas={(detalhe.itens as Linha[]) ?? []} vazio="Nenhum item encontrado nesta cotação." />
              </section>
            )}
            {tipo === 'fornecedor' && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Cotações deste fornecedor</h3>
                <TabelaGenerica linhas={(detalhe.cotacoes as Linha[]) ?? []} vazio="Nenhuma cotação encontrada pra este fornecedor." />
              </section>
            )}
          </>
        )}
      </div>
    </SlideOverDrawer>
  );
}
