import { useState } from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cabecalhoPerfil } from '../../utils/apiAuth';

const API_URL = import.meta.env.VITE_API_URL ?? '';

type Linha = Record<string, unknown>;

const rotuloColuna = (coluna: string) => coluna.replace(/([a-z])([A-Z])/g, '$1 $2');

const valorCelula = (valor: unknown) => {
  if (valor === null || valor === undefined) return '—';
  if (valor instanceof Date) return new Date(valor).toLocaleString('pt-BR');
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(valor)) {
    const data = new Date(valor);
    return isNaN(data.getTime()) ? valor : data.toLocaleString('pt-BR');
  }
  return String(valor);
};

const SUGESTOES = [
  'Quais equipamentos tiveram maior custo operacional este mês?',
  'Motoristas com mais horas de motor ocioso nos últimos 30 dias',
  'Qual o motorista com melhor resultado no mês atual?',
  'Equipamentos com alarme registrado nas últimas 24 horas',
];

export function PesquisaIA() {
  const { usuario } = useAuth();
  const [pergunta, setPergunta] = useState('');
  const [pesquisando, setPesquisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ resumo: string | null; sql: string; linhas: Linha[] } | null>(null);

  const pesquisar = async () => {
    if (!pergunta.trim()) return;
    setPesquisando(true); setErro(null);
    try {
      const resposta = await fetch(`${API_URL}/api/logistica/pesquisar`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...cabecalhoPerfil(usuario?.perfil) }, body: JSON.stringify({ pergunta }) });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.error ?? 'Não foi possível pesquisar os dados de logística.');
      setResultado(corpo);
    } catch (falha) { setErro(falha instanceof Error ? falha.message : 'Não foi possível pesquisar os dados de logística.'); }
    finally { setPesquisando(false); }
  };

  return (
    <div className="space-y-5 pb-12 max-w-4xl">
      <div>
        <p className="text-xs font-bold tracking-wider uppercase text-emerald-700">Logística / Frota</p>
        <h1 className="text-2xl font-bold text-slate-800">Pergunte à IA</h1>
        <p className="text-sm text-slate-500 mt-1">Faça uma pergunta em português sobre metas, custos, motoristas e equipamentos. A IA consulta somente dados de logística/frota e devolve a resposta com os registros encontrados.</p>
      </div>

      <section className="bg-emerald-950 rounded-2xl border border-emerald-800 p-5 text-white">
        <h2 className="font-bold flex items-center gap-2"><Search size={18} className="text-emerald-300" /> Busca por IA</h2>
        <p className="text-sm text-emerald-100/80 mt-1">Exemplos: custo por equipamento, ranking de motoristas, alarmes recentes, progresso de metas no mês.</p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <input value={pergunta} onChange={(e) => setPergunta(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') pesquisar(); }} placeholder="Ex.: quais motoristas estão abaixo da meta este mês?" className="flex-1 rounded-xl bg-white px-4 py-3 text-sm !text-slate-950 caret-slate-950 placeholder:!text-slate-500 outline-none" />
          <button onClick={pesquisar} disabled={pesquisando || !pergunta.trim()} className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 font-bold text-sm">{pesquisando ? 'Consultando…' : 'Perguntar'}</button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">{SUGESTOES.map((sugestao) => <button key={sugestao} onClick={() => setPergunta(sugestao)} className="text-xs px-3 py-1.5 rounded-full border border-emerald-700 text-emerald-100 hover:bg-emerald-900">{sugestao}</button>)}</div>
        {erro && <div className="mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-200 text-sm">{erro}</div>}
        {resultado && (
          <div className="mt-4 bg-white/10 border border-emerald-800 rounded-xl p-4">
            <p className="text-sm leading-relaxed">{resultado.resumo ?? 'Consulta executada sem resumo.'}</p>
            <details className="mt-3 text-xs text-emerald-100"><summary className="cursor-pointer">Ver consulta utilizada</summary><code className="block whitespace-pre-wrap mt-2 p-2 rounded bg-black/20">{resultado.sql}</code></details>
            {resultado.linhas.length > 0 && (
              <div className="mt-3 max-h-96 overflow-auto rounded bg-white text-slate-800">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-100"><tr>{Object.keys(resultado.linhas[0]).map((coluna) => <th key={coluna} className="p-2 text-left">{rotuloColuna(coluna)}</th>)}</tr></thead>
                  <tbody>{resultado.linhas.map((linha, indice) => <tr key={indice} className="border-t">{Object.entries(linha).map(([coluna, valor]) => <td key={coluna} className="p-2 whitespace-nowrap">{valorCelula(valor)}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
