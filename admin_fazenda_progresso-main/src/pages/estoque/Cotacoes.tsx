import { useMemo } from 'react';
import { BarChart3, Boxes, CalendarClock, ListChecks, Sparkles, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TabelaInterativa, comSituacaoCotacao, numero, useEstoquePainel } from './estoqueShared';
import { SugestoesAutomaticas } from './SugestoesAutomaticas';
import { Carregando } from '../../components/common/viz';

function CardCotacoes({ Icon, cor, rotulo, valor, apoio }: { Icon: typeof Boxes; cor: string; rotulo: string; valor: string; apoio?: string }) {
  return (
    <div className="bg-white border rounded-2xl p-4">
      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3 ${cor}`}><Icon size={17} /></span>
      <p className="text-[11px] uppercase font-bold text-slate-400">{rotulo}</p>
      <p className="text-xl font-bold text-slate-800 mt-1">{valor}</p>
      {apoio && <p className="text-[11px] text-slate-400 mt-0.5">{apoio}</p>}
    </div>
  );
}

// Situação por ITEM de cotação (STATUSPRODCOT do Sankhya, já traduzido no backend) — cores só de
// identidade visual, cada rótulo vem direto do campo real "SITUACAO" da consulta cotacoesPorSituacao.
const SITUACAO_ITEM_ESTILO: Record<string, string> = {
  'Aberta': 'bg-blue-50 text-blue-700 border-blue-200',
  'Enviada': 'bg-violet-50 text-violet-700 border-violet-200',
  'Aprovada': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Precificada': 'bg-amber-50 text-amber-700 border-amber-200',
  'Fechada': 'bg-slate-100 text-slate-600 border-slate-200',
  'Cancelada': 'bg-rose-50 text-rose-700 border-rose-200',
};

export function Cotacoes() {
  const { dados, erro, carregando, insights } = useEstoquePainel();

  const cotacoesComSituacao = useMemo(() => comSituacaoCotacao(dados?.cotacoes ?? []), [dados]);
  const atrasadas = useMemo(() => cotacoesComSituacao.filter((l) => l.SITUACAO_COTACAO === 'Atrasada').length, [cotacoesComSituacao]);
  const semPrazo = useMemo(() => cotacoesComSituacao.filter((l) => l.SITUACAO_COTACAO === 'Sem prazo').length, [cotacoesComSituacao]);
  const prazoMedioDias = useMemo(() => {
    const validas = (dados?.cotacoes ?? [])
      .map((l) => l.DHFINAL)
      .filter((v): v is string => typeof v === 'string' && v !== '')
      .map((v) => {
        const m = v.match(/^(\d{2})(\d{2})(\d{4})/);
        if (!m) return null;
        const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
        return Math.round((d.getTime() - Date.now()) / 86_400_000);
      })
      .filter((v): v is number => v !== null && v >= 0); // só as ainda dentro do prazo — atrasadas já têm seu próprio card
    if (!validas.length) return null;
    return validas.reduce((s, v) => s + v, 0) / validas.length;
  }, [dados]);

  return <div className="space-y-5 pb-12">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold tracking-wider uppercase text-emerald-700">Estoque</p>
        <h1 className="text-2xl font-bold text-slate-800">Compras & Cotações</h1>
        <p className="text-sm text-slate-500 mt-1">Cotações com pelo menos um item ainda não fechado ou cancelado (empresa 01).</p>
      </div>
      <Link to="/logistica/estoque/dashboard" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shrink-0">
        <BarChart3 size={15} className="text-emerald-700" /> Ver Dashboard
      </Link>
    </div>
    {erro && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{erro}</div>}
    {carregando && !dados ? <div className="bg-white border rounded-2xl p-12"><Carregando mensagem="Carregando cotações…" /></div> : dados && (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <CardCotacoes Icon={Boxes} cor="bg-blue-50 text-blue-600" rotulo="Cotações em aberto" valor={numero(dados.cotacoes.length)} />
          <CardCotacoes Icon={TriangleAlert} cor="bg-rose-50 text-rose-600" rotulo="Atrasadas" valor={numero(atrasadas)} apoio="Prazo final já vencido" />
          <CardCotacoes Icon={CalendarClock} cor="bg-amber-50 text-amber-600" rotulo="Sem prazo definido" valor={numero(semPrazo)} />
          <CardCotacoes Icon={CalendarClock} cor="bg-violet-50 text-violet-600" rotulo="Prazo médio até o final" valor={prazoMedioDias == null ? '—' : `${numero(prazoMedioDias, 0)} dias`} apoio="Só cotações dentro do prazo (exclui atrasadas)" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <div className="xl:col-span-2 space-y-5">

        {!!dados.cotacoesPorSituacao?.length && (
          <section className="bg-white border rounded-2xl p-4 flex flex-wrap gap-3">
            {dados.cotacoesPorSituacao.map((linha) => {
              const situacao = String(linha.SITUACAO);
              return (
                <div key={situacao} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${SITUACAO_ITEM_ESTILO[situacao] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  <span className="text-[11px] uppercase font-bold">{situacao}</span>
                  <span className="text-sm font-bold">{numero(linha.TOTALITENS)}</span>
                  <span className="text-[11px] font-normal opacity-70">itens</span>
                </div>
              );
            })}
          </section>
        )}
        <section className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><ListChecks size={16} className="text-emerald-600" />Cotações em aberto</h2>
          {insights.cotacoes && <p className="text-xs text-emerald-700 mt-2 mb-1 flex items-start gap-1.5"><Sparkles size={13} className="shrink-0 mt-0.5" />{insights.cotacoes}</p>}
          <div className="mt-3">
            {dados.erros.cotacoes
              ? <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3">Esta seção não pôde ser carregada: {dados.erros.cotacoes}</p>
              : <TabelaInterativa linhas={cotacoesComSituacao} />}
          </div>
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
