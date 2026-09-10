import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Factory,
  Plus,
  RefreshCw,
  Scale,
  Truck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../../context/AuthContext";
import { cabecalhoPerfil } from "../../utils/apiAuth";

const API_URL = import.meta.env.VITE_API_URL ?? "";
type Safra = {
  SafraId: number;
  Nome: string;
  Inicio: string;
  Fim: string | null;
  Ativa: boolean;
};
type Lancamento = {
  LancamentoId: number;
  SafraId: number;
  SafraNome: string;
  Dia: string;
  Toneladas: number;
  CustoOperacional: number;
  EquipamentoId: number | null;
  Origem: string;
  Observacao: string | null;
};
type Resumo = Safra & {
  Toneladas: number;
  Custo: number;
  CustoPorTonelada: number | null;
  Lancamentos: number;
};
type Dados = { safras: Safra[]; lancamentos: Lancamento[]; resumo: Resumo[] };
export type TelaProducao = "painel" | "safras" | "lancamentos" | "comparativo";
const moeda = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v ?? 0),
  );
const data = (v: string | null) =>
  v ? new Date(`${v.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";
const hoje = new Date().toISOString().slice(0, 10);

export function ProducaoBatata({ tela = "painel" }: { tela?: TelaProducao }) {
  const { usuario } = useAuth();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [safra, setSafra] = useState({ nome: "", inicio: hoje, fim: "" });
  const [lancamento, setLancamento] = useState({
    safraId: "",
    dia: hoje,
    toneladas: "",
    custoOperacional: "",
    equipamentoId: "",
    observacao: "",
  });
  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch(`${API_URL}/api/producao/batata`, {
        headers: cabecalhoPerfil(usuario?.perfil),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      setDados(body);
      setErro(null);
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Falha ao carregar Produção/Batata.",
      );
    } finally {
      setCarregando(false);
    }
  }, [usuario?.perfil]);
  useEffect(() => {
    carregar();
  }, [carregar]);
  const total = useMemo(
    () =>
      (dados?.resumo ?? []).reduce(
        (a, item) => ({
          toneladas: a.toneladas + Number(item.Toneladas ?? 0),
          custo: a.custo + Number(item.Custo ?? 0),
        }),
        { toneladas: 0, custo: 0 },
      ),
    [dados],
  );
  const custoTon = total.toneladas ? total.custo / total.toneladas : null;
  const criarSafra = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch(`${API_URL}/api/producao/batata`, {
        method: "POST",
        headers: {
          ...cabecalhoPerfil(usuario?.perfil),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ acao: "safra", ...safra }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      setSafra({ nome: "", inicio: hoje, fim: "" });
      await carregar();
    } catch (x) {
      setErro(
        x instanceof Error ? x.message : "Não foi possível criar a safra.",
      );
    } finally {
      setSalvando(false);
    }
  };
  const criarLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch(`${API_URL}/api/producao/batata`, {
        method: "POST",
        headers: {
          ...cabecalhoPerfil(usuario?.perfil),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          acao: "lancamento",
          safraId: Number(lancamento.safraId),
          dia: lancamento.dia,
          toneladas: Number(lancamento.toneladas),
          custoOperacional: Number(lancamento.custoOperacional),
          equipamentoId: lancamento.equipamentoId
            ? Number(lancamento.equipamentoId)
            : null,
          observacao: lancamento.observacao,
        }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      setLancamento({
        safraId: "",
        dia: hoje,
        toneladas: "",
        custoOperacional: "",
        equipamentoId: "",
        observacao: "",
      });
      await carregar();
    } catch (x) {
      setErro(
        x instanceof Error
          ? x.message
          : "Não foi possível registrar a produção.",
      );
    } finally {
      setSalvando(false);
    }
  };
  const cabecalhos: Record<TelaProducao, [string, string]> = {
    painel: [
      "Painel de Produção",
      "Resumo operacional de toneladas e custo por tonelada.",
    ],
    safras: ["Safras", "Cadastre e acompanhe os ciclos de produção de batata."],
    lancamentos: [
      "Colheita e Transporte",
      "Registre a produção diária e o custo operacional.",
    ],
    comparativo: [
      "Comparativo por Safra",
      "Compare custo e produção entre as safras.",
    ],
  };
  return (
    <div className="max-w-7xl space-y-6 pb-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Produção / Batata
          </p>
          <h1 className="text-2xl font-bold text-slate-800">
            {cabecalhos[tela][0]}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{cabecalhos[tela][1]}</p>
        </div>
        <button
          onClick={carregar}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"
        >
          <RefreshCw size={16} className={carregando ? "animate-spin" : ""} />
          Atualizar
        </button>
      </header>
      {erro && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {erro}
        </div>
      )}
      {carregando && !dados ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-slate-400">
          Carregando dados de Produção/Batata…
        </div>
      ) : (
        <>
          {tela === "painel" && (
            <Painel
              total={total}
              custoTon={custoTon}
              resumo={dados?.resumo ?? []}
            />
          )}
          {tela === "safras" && (
            <Safras
              dados={dados?.resumo ?? []}
              form={safra}
              setForm={setSafra}
              salvar={criarSafra}
              salvando={salvando}
            />
          )}
          {tela === "lancamentos" && (
            <Lancamentos
              safras={dados?.safras ?? []}
              dados={dados?.lancamentos ?? []}
              form={lancamento}
              setForm={setLancamento}
              salvar={criarLancamento}
              salvando={salvando}
            />
          )}
          {tela === "comparativo" && (
            <Comparativo dados={dados?.resumo ?? []} />
          )}
        </>
      )}
    </div>
  );
}

function Painel({
  total,
  custoTon,
  resumo,
}: {
  total: { toneladas: number; custo: number };
  custoTon: number | null;
  resumo: Resumo[];
}) {
  const ativa = resumo.find((x) => x.Ativa);
  return (
    <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi
          icone={<Scale size={19} />}
          rotulo="Produção registrada"
          valor={`${total.toneladas.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} t`}
          apoio="Somatório das safras cadastradas"
        />
        <Kpi
          icone={<Factory size={19} />}
          rotulo="Custo operacional"
          valor={moeda(total.custo)}
          apoio="Lançado manualmente ou pela frota"
        />
        <Kpi
          icone={<BarChart3 size={19} />}
          rotulo="Custo por tonelada"
          valor={custoTon === null ? "Sem produção" : moeda(custoTon)}
          apoio="Custo operacional ÷ toneladas"
        />
      </section>
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="font-bold text-slate-800">Safra em acompanhamento</h2>
        {ativa ? (
          <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-4">
            <Resumo rotulo="Safra" valor={ativa.Nome} />
            <Resumo
              rotulo="Produzido"
              valor={`${Number(ativa.Toneladas).toLocaleString("pt-BR")} t`}
            />
            <Resumo rotulo="Custo" valor={moeda(ativa.Custo)} />
            <Resumo
              rotulo="R$/t"
              valor={
                ativa.CustoPorTonelada === null
                  ? "—"
                  : moeda(ativa.CustoPorTonelada)
              }
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            Cadastre uma safra para começar o acompanhamento.
          </p>
        )}
      </section>
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <GraficoProducao titulo="Toneladas por safra" dados={resumo} chave="Toneladas" cor="#059669" />
        <GraficoProducao titulo="Custo por tonelada" dados={resumo.filter((item) => item.CustoPorTonelada !== null)} chave="CustoPorTonelada" cor="#2563eb" moeda />
      </section>
    </>
  );
}

function GraficoProducao({ titulo, dados, chave, cor, moeda: exibirMoeda = false }: { titulo: string; dados: Resumo[]; chave: 'Toneladas' | 'CustoPorTonelada'; cor: string; moeda?: boolean }) {
  return <section className="rounded-2xl border bg-white p-5"><h2 className="font-bold text-slate-800">{titulo}</h2>{dados.length ? <div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={dados}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="Nome" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(valor) => exibirMoeda ? `R$ ${Number(valor).toLocaleString('pt-BR')}` : `${Number(valor).toLocaleString('pt-BR')} t`} /><Tooltip formatter={(valor) => exibirMoeda ? moeda(Number(valor)) : `${Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} t`} /><Legend /><Bar dataKey={chave} name={exibirMoeda ? 'Custo por tonelada' : 'Toneladas'} fill={cor} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="py-16 text-center text-sm text-slate-400">Ainda não há lançamentos para comparar.</p>}</section>;
}
function Safras({
  dados,
  form,
  setForm,
  salvar,
  salvando,
}: {
  dados: Resumo[];
  form: { nome: string; inicio: string; fim: string };
  setForm: (v: { nome: string; inicio: string; fim: string }) => void;
  salvar: (e: React.FormEvent) => void;
  salvando: boolean;
}) {
  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[390px_1fr]">
      <form onSubmit={salvar} className="h-fit rounded-2xl border bg-white p-5">
        <h2 className="flex items-center gap-2 font-bold text-slate-800">
          <Plus size={18} className="text-emerald-600" />
          Nova safra
        </h2>
        <div className="mt-4 space-y-3">
          <input
            required
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex.: Safra Batata 2026"
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
          />
          <label className="block text-xs font-medium text-slate-600">
            Início
            <input
              required
              type="date"
              value={form.inicio}
              onChange={(e) => setForm({ ...form, inicio: e.target.value })}
              className="mt-1 block w-full rounded-xl border px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Fim (opcional)
            <input
              type="date"
              value={form.fim}
              onChange={(e) => setForm({ ...form, fim: e.target.value })}
              className="mt-1 block w-full rounded-xl border px-3 py-2.5 text-sm"
            />
          </label>
        </div>
        <button
          disabled={salvando}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          <CalendarDays size={16} />
          Cadastrar safra
        </button>
      </form>
      <section className="overflow-hidden rounded-2xl border bg-white">
        <div className="border-b p-5">
          <h2 className="font-bold text-slate-800">Safras cadastradas</h2>
        </div>
        <TabelaSafras dados={dados} custos={false} />
      </section>
    </section>
  );
}
function Lancamentos({
  safras,
  dados,
  form,
  setForm,
  salvar,
  salvando,
}: {
  safras: Safra[];
  dados: Lancamento[];
  form: {
    safraId: string;
    dia: string;
    toneladas: string;
    custoOperacional: string;
    equipamentoId: string;
    observacao: string;
  };
  setForm: (v: {
    safraId: string;
    dia: string;
    toneladas: string;
    custoOperacional: string;
    equipamentoId: string;
    observacao: string;
  }) => void;
  salvar: (e: React.FormEvent) => void;
  salvando: boolean;
}) {
  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
      <form onSubmit={salvar} className="h-fit rounded-2xl border bg-white p-5">
        <h2 className="flex items-center gap-2 font-bold text-slate-800">
          <Truck size={18} className="text-emerald-600" />
          Novo lançamento
        </h2>
        <div className="mt-4 grid gap-3">
          <select
            required
            value={form.safraId}
            onChange={(e) => setForm({ ...form, safraId: e.target.value })}
            className="rounded-xl border px-3 py-2.5 text-sm"
          >
            <option value="">Selecione a safra</option>
            {safras.map((x) => (
              <option key={x.SafraId} value={x.SafraId}>
                {x.Nome}
              </option>
            ))}
          </select>
          <label className="text-xs font-medium text-slate-600">
            Data
            <input
              required
              type="date"
              value={form.dia}
              onChange={(e) => setForm({ ...form, dia: e.target.value })}
              className="mt-1 block w-full rounded-xl border px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Toneladas
            <input
              required
              min="0.001"
              step="0.001"
              type="number"
              value={form.toneladas}
              onChange={(e) => setForm({ ...form, toneladas: e.target.value })}
              className="mt-1 block w-full rounded-xl border px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Custo operacional
            <input
              required
              min="0"
              step="0.01"
              type="number"
              value={form.custoOperacional}
              onChange={(e) =>
                setForm({ ...form, custoOperacional: e.target.value })
              }
              className="mt-1 block w-full rounded-xl border px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Código do equipamento (opcional)
            <input
              type="number"
              value={form.equipamentoId}
              onChange={(e) =>
                setForm({ ...form, equipamentoId: e.target.value })
              }
              className="mt-1 block w-full rounded-xl border px-3 py-2.5 text-sm"
            />
          </label>
          <input
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            placeholder="Observação (opcional)"
            className="rounded-xl border px-3 py-2.5 text-sm"
          />
        </div>
        <button
          disabled={salvando || !safras.length}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          <Plus size={16} />
          Registrar produção
        </button>
      </form>
      <section className="overflow-hidden rounded-2xl border bg-white">
        <div className="border-b p-5">
          <h2 className="font-bold text-slate-800">
            Histórico de colheita e transporte
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Safra</th>
                <th className="p-3 text-right">Toneladas</th>
                <th className="p-3 text-right">Custo</th>
                <th className="p-3">Observação</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((x) => (
                <tr key={x.LancamentoId} className="border-t">
                  <td className="p-3">{data(x.Dia)}</td>
                  <td className="p-3 font-medium">{x.SafraNome}</td>
                  <td className="p-3 text-right">
                    {Number(x.Toneladas).toLocaleString("pt-BR", {
                      maximumFractionDigits: 3,
                    })}{" "}
                    t
                  </td>
                  <td className="p-3 text-right">
                    {moeda(x.CustoOperacional)}
                  </td>
                  <td className="p-3 text-slate-600">{x.Observacao || "—"}</td>
                </tr>
              ))}
              {!dados.length && (
                <tr>
                  <td className="p-8 text-center text-slate-400" colSpan={5}>
                    Nenhum lançamento registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
function Comparativo({ dados }: { dados: Resumo[] }) {
  const comparaveis = dados.filter((item) => item.CustoPorTonelada !== null);
  const melhor = [...comparaveis].sort((a, b) => Number(a.CustoPorTonelada) - Number(b.CustoPorTonelada))[0];
  const pior = [...comparaveis].sort((a, b) => Number(b.CustoPorTonelada) - Number(a.CustoPorTonelada))[0];
  const diferenca = melhor && pior ? Number(pior.CustoPorTonelada) - Number(melhor.CustoPorTonelada) : null;
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3"><Kpi icone={<BarChart3 size={19}/>} rotulo="Safras comparáveis" valor={String(comparaveis.length)} apoio="Com produção e custo registrados"/><Kpi icone={<Scale size={19}/>} rotulo="Melhor custo por tonelada" valor={melhor ? moeda(melhor.CustoPorTonelada) : '—'} apoio={melhor ? melhor.Nome : 'Sem dados suficientes'}/><Kpi icone={<Factory size={19}/>} rotulo="Variação entre extremos" valor={diferenca === null ? '—' : moeda(diferenca)} apoio={pior && melhor ? `${pior.Nome} vs. ${melhor.Nome}` : 'Sem dados suficientes'}/></section>
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2"><GraficoProducao titulo="Comparativo de toneladas" dados={dados} chave="Toneladas" cor="#059669"/><GraficoProducao titulo="Comparativo de custo por tonelada" dados={comparaveis} chave="CustoPorTonelada" cor="#2563eb" moeda/></section>
      <section className="overflow-hidden rounded-2xl border bg-white"><div className="border-b p-5"><h2 className="font-bold text-slate-800">Custo por tonelada entre safras</h2><p className="mt-1 text-sm text-slate-500">Compare produção, custo e eficiência de cada ciclo.</p></div><TabelaSafras dados={dados} custos /></section>
    </div>
  );
}
function TabelaSafras({ dados, custos }: { dados: Resumo[]; custos: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[650px] text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="p-3">Safra</th>
            <th className="p-3">Período</th>
            <th className="p-3">Status</th>
            {custos && (
              <>
                <th className="p-3 text-right">Toneladas</th>
                <th className="p-3 text-right">Custo</th>
                <th className="p-3 text-right">R$/t</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {dados.map((x) => (
            <tr key={x.SafraId} className="border-t">
              <td className="p-3 font-semibold text-slate-800">{x.Nome}</td>
              <td className="p-3 text-slate-600">
                {data(x.Inicio)} — {x.Fim ? data(x.Fim) : "em andamento"}
              </td>
              <td className="p-3">
                <span
                  className={`rounded-full px-2 py-1 text-xs ${x.Ativa ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                >
                  {x.Ativa ? "Ativa" : "Encerrada"}
                </span>
              </td>
              {custos && (
                <>
                  <td className="p-3 text-right">
                    {Number(x.Toneladas).toLocaleString("pt-BR", {
                      maximumFractionDigits: 3,
                    })}{" "}
                    t
                  </td>
                  <td className="p-3 text-right">{moeda(x.Custo)}</td>
                  <td className="p-3 text-right font-bold text-emerald-700">
                    {x.CustoPorTonelada === null
                      ? "—"
                      : moeda(x.CustoPorTonelada)}
                  </td>
                </>
              )}
            </tr>
          ))}
          {!dados.length && (
            <tr>
              <td
                className="p-8 text-center text-slate-400"
                colSpan={custos ? 6 : 3}
              >
                Nenhuma safra cadastrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function Kpi({
  icone,
  rotulo,
  valor,
  apoio,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: string;
  apoio: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-center gap-2 text-emerald-600">
        {icone}
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {rotulo}
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-800">{valor}</p>
      <p className="mt-1 text-xs text-slate-500">{apoio}</p>
    </div>
  );
}
function Resumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-slate-400">{rotulo}</p>
      <p className="mt-1 font-semibold text-slate-800">{valor}</p>
    </div>
  );
}
