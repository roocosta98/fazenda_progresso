import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Boxes, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cabecalhoPerfil } from '../../utils/apiAuth';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export type Linha = Record<string, unknown>;
export type DadosEstoque = {
  ruptura: Linha[];
  semMovimentacao: Linha[];
  valor: Linha[];
  fornecedores: Linha[];
  cotacoes: Linha[];
  giroProdutos: Linha[];
  kpis: Linha;
  erros: Record<string, string>;
};

export const moeda = (valor: unknown) => Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const numero = (valor: unknown, casas = 0) => Number(valor ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: casas });
export const data = (valor: unknown) => valor ? new Date(String(valor)).toLocaleDateString('pt-BR') : '—';

export const ROTULOS_COLUNAS: Record<string, string> = {
  CODPROD: 'Código', DESCRPROD: 'Descrição', REFERENCIA: 'Referência', LOCAL: 'Local', LOTE: 'Lote',
  ESTOQUE: 'Estoque', MINIMO: 'Mínimo', MAXIMO: 'Máximo', MINIMOSUGERIDO: 'Mínimo sugerido', DIASRUPTURA: 'Dias p/ ruptura',
  PRODFALTA: 'Em falta', PONTOPEDIDO: 'Ponto de pedido', GIRODIARIO: 'Giro diário', DIASSEMVENDA: 'Dias sem venda',
  VALORESTOQUE: 'Valor em estoque', CUSTO: 'Custo', VALORTOTAL: 'Valor total', CLASSEABC: 'ABC', FORNECEDOR: 'Fornecedor',
  CONFIABILIDADE: 'Confiabilidade', QUALIDADEATENDIMENTO: 'Qualidade de atendimento', QUALIDADEPRODUTO: 'Qualidade do produto',
  PRAZOMEDIO: 'Prazo médio', TOTALCOTACOES: 'Total de cotações', TOTALVENCIDAS: 'Total vencidas', NUMCOTACAO: 'Nº cotação',
  DHINIC: 'Início', DHFINAL: 'Prazo final', COMPRADOR: 'Comprador', TOTALITENS: 'Total de itens', ITENSEMABERTO: 'Itens em aberto',
  QTD_COMPRA: 'Qtd. compra', QTD_DEV_COMPRA: 'Qtd. devolução', COMPRA_LIQUIDA: 'Compra líquida',
  CONSUMO: 'Consumo', ESTOQUE_ATUAL: 'Estoque atual', ESTMIN: 'Estoque mínimo', ESTMAX: 'Estoque máximo',
  GIRO_ESTOQUE: 'Giro de estoque', DIAS_COBERTURA: 'Dias de cobertura',
};
export const rotuloColuna = (chave: string) => ROTULOS_COLUNAS[chave]
  ?? chave.replace(/_/g, ' ').toLowerCase().replace(/^\p{L}/u, (letra) => letra.toUpperCase());

export const valorCelula = (chave: string, valor: unknown) => {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (/VALOR|CUSTO|CONFIAB|QUALIDADE|PRAZO|PONTO/i.test(chave)) return moeda(valor);
  if (/DATA|DHINIC|DHFINAL/i.test(chave)) return data(valor);
  if (typeof valor === 'number') return numero(valor, /GIRO/i.test(chave) ? 3 : 0);
  return String(valor);
};

export function useEstoquePainel() {
  const { usuario } = useAuth();
  const [dados, setDados] = useState<DadosEstoque | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try {
      const resposta = await fetch(`${API_URL}/api/estoque/painel`, { headers: cabecalhoPerfil(usuario?.perfil) });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.error ?? 'Falha ao consultar o estoque.');
      setDados(corpo);
    } catch (falha) { setErro(falha instanceof Error ? falha.message : 'Falha ao carregar o estoque.'); }
    finally { setCarregando(false); }
  }, [usuario?.perfil]);
  useEffect(() => { carregar(); }, [carregar]);
  return { dados, erro, carregando, carregar };
}

export function KpiCardsEstoque({ kpis }: { kpis: Linha }) {
  const cards: { rotulo: string; valor: string; Icon: typeof Boxes }[] = [
    { rotulo: 'Valor total em estoque', valor: moeda(kpis.VALORTOTALESTOQUE), Icon: Boxes },
    { rotulo: 'Itens em ruptura', valor: numero(kpis.TOTALRUPTURA), Icon: AlertTriangle },
    { rotulo: 'Sem venda há 90+ dias', valor: numero(kpis.TOTALSEMMOVIMENTACAO), Icon: AlertTriangle },
    { rotulo: 'Cotações em aberto', valor: numero(kpis.TOTALCOTACOES), Icon: Boxes },
    { rotulo: 'Giro de estoque (90 dias)', valor: kpis.giroEstoque == null ? '—' : `${numero(kpis.giroEstoque, 2)}x`, Icon: TrendingUp },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
      {cards.map(({ rotulo, valor, Icon }) => (
        <div key={rotulo} className="bg-white border rounded-2xl p-4">
          <Icon size={17} className="text-emerald-600 mb-3" />
          <p className="text-[11px] uppercase font-bold text-slate-400">{rotulo}</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{valor}</p>
        </div>
      ))}
    </div>
  );
}
