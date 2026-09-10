import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Wrench } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cabecalhoPerfil } from "../../utils/apiAuth";
const API = import.meta.env.VITE_API_URL ?? "";
export function Manutencao() {
  const { usuario } = useAuth();
  const [d, setD] = useState<any>(null);
  const [e, setE] = useState("");
  const [modalAtivo, setModalAtivo] = useState(false);
  const [f, setF] = useState({
    nome: "",
    tipo: "",
    codigoEquipamento: "",
    localizacao: "",
  });
  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/manutencao`, {
        headers: cabecalhoPerfil(usuario?.perfil),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      setD(b);
      setE("");
    } catch (x) {
      setE(x instanceof Error ? x.message : "Falha ao carregar manutenção.");
    }
  }, [usuario?.perfil]);
  useEffect(() => {
    load();
  }, [load]);
  const salvar = async (x: React.FormEvent) => {
    x.preventDefault();
    const r = await fetch(`${API}/api/manutencao`, {
      method: "POST",
      headers: {
        ...cabecalhoPerfil(usuario?.perfil),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ acao: "ativo", ...f }),
    });
    const b = await r.json();
    if (!r.ok) return setE(b.error);
    setF({ nome: "", tipo: "", codigoEquipamento: "", localizacao: "" });
    setModalAtivo(false);
    load();
  };
  const k = d?.kpis ?? {};
  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-emerald-700">
            Manutenção
          </p>
          <h1 className="text-2xl font-bold">Painel de Manutenção</h1>
        </div>
        <button
          onClick={load}
          className="bg-emerald-600 text-white px-4 rounded-xl"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      {e && <p className="p-3 bg-rose-50 text-rose-700 rounded-xl">{e}</p>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["OS abertas", k.OSABERTAS],
          ["OS atrasadas", k.OSATRASADAS],
          [
            "Custo 30 dias",
            `R$ ${Number(k.CUSTO30DIAS ?? 0).toLocaleString("pt-BR")}`,
          ],
          ["Preventivas", k.PREVENTIVAS],
        ].map(([a, b]) => (
          <div className="bg-white border-slate-200 border rounded-2xl p-5">
            <p className="text-xs text-slate-500">{a}</p>
            <b className="text-2xl">{String(b ?? 0)}</b>
          </div>
        ))}
      </div>
      <section className="bg-white border-slate-200 border rounded-2xl overflow-hidden"><div className="p-5 flex items-center justify-between"><h2 className="font-bold flex gap-2"><Wrench/>Ativos e equipamentos</h2><button onClick={()=>setModalAtivo(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold">Adicionar ativo</button></div><div className="overflow-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3 text-left">Código</th><th className="p-3 text-left">Ativo</th><th className="p-3 text-left">Tipo</th><th className="p-3 text-left">Localização</th></tr></thead><tbody>{(d?.ativos??[]).map((a:any)=><tr className="border-t"><td className="p-3">{a.CodigoEquipamento||'—'}</td><td className="p-3 font-medium">{a.Nome}</td><td className="p-3">{a.Tipo}</td><td className="p-3">{a.Localizacao||'—'}</td></tr>)}{!d?.ativos?.length&&<tr><td colSpan={4} className="p-8 text-center text-slate-400">Nenhum ativo cadastrado.</td></tr>}</tbody></table></div></section>
      {modalAtivo && <div className="fixed inset-0 z-[100] bg-slate-950/40 flex items-center justify-center p-4"><form
          onSubmit={salvar}
          className="bg-white w-full max-w-md rounded-2xl p-5 space-y-3 shadow-xl"
        >
          <h2 className="font-bold flex gap-2">
            <Wrench />
            Cadastrar ativo
          </h2>
          {["nome", "tipo", "codigoEquipamento", "localizacao"].map((c) => (
            <input
              required={c === "nome" || c === "tipo"}
              placeholder={
                c === "nome"
                  ? "Nome do ativo"
                  : c === "tipo"
                    ? "Tipo"
                    : c === "codigoEquipamento"
                      ? "Código do equipamento"
                      : "Localização"
              }
              value={(f as any)[c]}
              onChange={(x) => setF({ ...f, [c]: x.target.value })}
              className="w-full border border-slate-200 rounded-xl p-2"
            />
          ))}
          <div className="flex gap-2"><button className="bg-emerald-600 text-white px-4 py-2 rounded-xl">Salvar</button><button type="button" onClick={()=>setModalAtivo(false)} className="px-4 py-2 rounded-xl border">Cancelar</button></div>
        </form></div>}
    </div>
  );
}
