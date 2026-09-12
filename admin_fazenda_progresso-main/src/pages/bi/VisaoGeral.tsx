import { useEffect, useMemo, useState } from 'react';
import {
  Boxes, Truck, Factory, Wrench, ShoppingCart, Wallet, Handshake, Calculator, Users, HardHat, ClipboardList, Receipt,
  AlertTriangle, Fuel, Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cabecalhoPerfil } from '../../utils/apiAuth';
import { Carregando, ErroCarregamento } from '../../components/common/viz';
import { useEstoquePainel } from '../estoque/estoqueShared';
import { Grafico, KpiRow, Legenda, PizzaCategorica, BarrasHorizontais, LinhaSerie, SemDadoBI, SeloIlustrativo, numero, moeda, moedaCurta, COR_CATEGORICA } from './biShared';
import { MODULOS_MOCK, type ModuloMock } from './mockData';

const API_URL = import.meta.env.VITE_API_URL ?? '';

type AbaBI = { chave: string; rotulo: string; Icon: typeof Boxes };
const ABAS: AbaBI[] = [
  { chave: 'estoque', rotulo: 'Estoque', Icon: Boxes },
  { chave: 'logistica_frota', rotulo: 'Logística', Icon: Truck },
  { chave: 'producao_batata', rotulo: 'Produção', Icon: Factory },
  { chave: 'manutencao', rotulo: 'Manutenção', Icon: Wrench },
  { chave: 'compras', rotulo: 'Compras', Icon: ShoppingCart },
  { chave: 'financeiro', rotulo: 'Financeiro', Icon: Wallet },
  { chave: 'comercial', rotulo: 'Comercial', Icon: Handshake },
  { chave: 'custos', rotulo: 'Custos', Icon: Calculator },
  { chave: 'rh', rotulo: 'DP / RH', Icon: Users },
  { chave: 'seguranca_trabalho', rotulo: 'Segurança', Icon: HardHat },
  { chave: 'controladoria', rotulo: 'Controladoria', Icon: ClipboardList },
  { chave: 'fiscal', rotulo: 'Fiscal', Icon: Receipt },
];

export function VisaoGeral() {
  const [abaAtual, setAbaAtual] = useState('estoque');
  return (
    <div className="space-y-5 pb-12">
      <div>
        <p className="text-xs uppercase font-bold tracking-wider text-emerald-700">Visão geral</p>
        <h1 className="text-2xl font-bold text-slate-800">Painel Geral (BI)</h1>
        <p className="text-sm text-slate-500 mt-1">Todos os módulos num só lugar. Estoque e Logística com dados reais; os demais com dados ilustrativos até termos a integração real.</p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 max-w-full">
        {ABAS.map(({ chave, rotulo, Icon }) => (
          <button key={chave} onClick={() => setAbaAtual(chave)}
            className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              abaAtual === chave ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <Icon size={14} /> {rotulo}
          </button>
        ))}
      </div>

      {abaAtual === 'estoque' && <PainelEstoqueBI />}
      {abaAtual === 'logistica_frota' && <PainelLogisticaBI />}
      {MODULOS_MOCK[abaAtual] && <PainelMock config={MODULOS_MOCK[abaAtual]} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estoque — dado real (reaproveita o mesmo hook/painel do Dashboard de Estoque)
// ---------------------------------------------------------------------------
function PainelEstoqueBI() {
  const { dados, erro, carregando } = useEstoquePainel();

  const curvaAbc = useMemo(() => ['A', 'B', 'C'].map((classe) => {
    const linha = (dados?.curvaAbc ?? []).find((l) => l.CLASSEABC === classe);
    return { classe: `Curva ${classe}`, valor: Number(linha?.VALORTOTAL ?? 0) };
  }).filter((l) => l.valor > 0), [dados]);

  const cotacoesPorSituacao = useMemo(() => (dados?.cotacoesPorSituacao ?? [])
    .map((l) => ({ situacao: String(l.SITUACAO ?? ''), itens: Number(l.TOTALITENS ?? 0) })), [dados]);

  const ruptura = useMemo(() => (dados?.ruptura ?? [])
    .map((l) => ({ produto: String(l.DESCRPROD ?? ''), estoque: Number(l.ESTOQUE ?? 0), minimo: Number(l.MINIMO ?? 0) }))
    .sort((a, b) => (b.minimo - b.estoque) - (a.minimo - a.estoque))
    .slice(0, 6), [dados]);

  if (carregando && !dados) return <div className="p-12 bg-white border rounded-2xl"><Carregando mensagem="Carregando dados do Sankhya…" /></div>;
  if (erro) return <ErroCarregamento mensagem={erro} />;

  return (
    <div className="space-y-4">
      <KpiRow cards={[
        { rotulo: 'Valor total em estoque', valor: moeda(dados?.kpis.VALORTOTALESTOQUE), Icon: Boxes },
        { rotulo: 'Itens em ruptura', valor: numero(dados?.kpis.TOTALRUPTURA), Icon: AlertTriangle },
        { rotulo: 'Cotações em aberto', valor: numero(dados?.kpis.TOTALCOTACOES), Icon: Boxes },
        { rotulo: 'Giro de estoque (período)', valor: dados?.kpis.giroEstoque == null ? '—' : `${numero(dados.kpis.giroEstoque, 2)}x`, Icon: Boxes },
      ]} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Grafico titulo="Valor por Curva ABC">
          {curvaAbc.length === 0 ? <SemDadoBI mensagem="Sem dado de valor classificado." /> : <PizzaCategorica dados={curvaAbc} chaveValor="valor" chaveNome="classe" formatador={moeda} />}
        </Grafico>
        <Grafico titulo="Cotações por situação (itens)">
          {cotacoesPorSituacao.length === 0 ? <SemDadoBI mensagem="Sem cotações cadastradas." /> : (
            <BarrasHorizontais dados={cotacoesPorSituacao} categoria="situacao" series={[{ chave: 'itens', nome: 'Itens', cor: COR_CATEGORICA[0] }]} />
          )}
        </Grafico>
        <Grafico titulo="Itens mais críticos (estoque x mínimo)">
          {ruptura.length === 0 ? <SemDadoBI mensagem="Nenhum item em ruptura." /> : (
            <>
              <BarrasHorizontais dados={ruptura} categoria="produto" series={[
                { chave: 'estoque', nome: 'Estoque atual', cor: COR_CATEGORICA[0] },
                { chave: 'minimo', nome: 'Mínimo', cor: COR_CATEGORICA[1] },
              ]} />
              <Legenda itens={[{ cor: COR_CATEGORICA[0], rotulo: 'Estoque atual' }, { cor: COR_CATEGORICA[1], rotulo: 'Mínimo' }]} />
            </>
          )}
        </Grafico>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Logística — dado real (api/metas/diario, mesmos endpoints do Dashboard/PainelMetasDiario)
// ---------------------------------------------------------------------------
type ExecutivoResp = {
  tendenciaMensal: { CompetenciaMeta: string; CustoFixoTotalMes: number; CustoOperacionalTotalMes: number }[];
  porFrenteFazenda: { GrupoFrente: string; Fazenda: string; CustoOperacionalTotalMes: number }[];
  pontoEquilibrio: { TotalMotoristas: number; DentroDoPontoDeEquilibrio: number };
  alarmes24h: number;
};
type MotorResp = { minutosMotorLigado: number; minutosMotorOcioso: number };

function PainelLogisticaBI() {
  const { usuario } = useAuth();
  const [executivo, setExecutivo] = useState<ExecutivoResp | null>(null);
  const [motor, setMotor] = useState<MotorResp | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setCarregando(true); setErro(null);
    Promise.all([
      fetch(`${API_URL}/api/metas/diario?modo=executivo`, { headers: cabecalhoPerfil(usuario?.perfil) }).then((r) => r.json()),
      fetch(`${API_URL}/api/metas/diario?modo=motor`, { headers: cabecalhoPerfil(usuario?.perfil) }).then((r) => r.json()),
    ])
      .then(([exec, mot]) => { setExecutivo(exec); setMotor(mot); })
      .catch(() => setErro('Não foi possível carregar os dados de logística.'))
      .finally(() => setCarregando(false));
  }, [usuario?.perfil]);

  const tendencia = useMemo(() => (executivo?.tendenciaMensal ?? []).map((l) => ({
    mes: l.CompetenciaMeta, fixo: Number(l.CustoFixoTotalMes ?? 0), operacional: Number(l.CustoOperacionalTotalMes ?? 0),
  })), [executivo]);

  const porFrente = useMemo(() => (executivo?.porFrenteFazenda ?? [])
    .map((l) => ({ frente: `${l.GrupoFrente ?? ''} · ${l.Fazenda ?? ''}`, custo: Number(l.CustoOperacionalTotalMes ?? 0) }))
    .sort((a, b) => b.custo - a.custo).slice(0, 6), [executivo]);

  const motorPizza = useMemo(() => {
    if (!motor) return [];
    const total = motor.minutosMotorLigado + motor.minutosMotorOcioso;
    if (total <= 0) return [];
    return [
      { estado: 'Produtivo', minutos: motor.minutosMotorLigado - motor.minutosMotorOcioso > 0 ? motor.minutosMotorLigado - motor.minutosMotorOcioso : motor.minutosMotorLigado },
      { estado: 'Ocioso', minutos: motor.minutosMotorOcioso },
    ];
  }, [motor]);

  const custoMesAtual = tendencia.at(-1)?.operacional ?? 0;

  if (carregando) return <div className="p-12 bg-white border rounded-2xl"><Carregando mensagem="Carregando dados de logística…" /></div>;
  if (erro) return <ErroCarregamento mensagem={erro} />;

  return (
    <div className="space-y-4">
      <KpiRow cards={[
        { rotulo: 'Custo operacional (mês)', valor: moedaCurta(custoMesAtual), Icon: Truck },
        { rotulo: 'Motoristas no ponto de equilíbrio', valor: `${numero(executivo?.pontoEquilibrio.DentroDoPontoDeEquilibrio)} de ${numero(executivo?.pontoEquilibrio.TotalMotoristas)}`, Icon: Users },
        { rotulo: 'Alarmes (24h)', valor: numero(executivo?.alarmes24h), Icon: AlertTriangle },
        { rotulo: 'Motor ocioso (acumulado)', valor: motor ? `${numero((motor.minutosMotorOcioso / 60), 0)}h` : '—', Icon: Fuel },
      ]} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Grafico titulo="Custo fixo x operacional por mês">
          {tendencia.length === 0 ? <SemDadoBI mensagem="Sem tendência mensal disponível." /> : (
            <LinhaSerie dados={tendencia} categoria="mes" formatador={moedaCurta} series={[
              { chave: 'fixo', nome: 'Custo fixo', cor: COR_CATEGORICA[0] },
              { chave: 'operacional', nome: 'Custo operacional', cor: COR_CATEGORICA[1] },
            ]} />
          )}
        </Grafico>
        <Grafico titulo="Motor: produtivo x ocioso">
          {motorPizza.length === 0 ? <SemDadoBI mensagem="Sem leitura de motor no período." /> : (
            <PizzaCategorica dados={motorPizza} chaveValor="minutos" chaveNome="estado" formatador={(v) => `${numero(v / 60, 0)}h`} />
          )}
        </Grafico>
        <Grafico titulo="Custo operacional por frente/fazenda">
          {porFrente.length === 0 ? <SemDadoBI mensagem="Sem dado por frente/fazenda." /> : (
            <BarrasHorizontais dados={porFrente} categoria="frente" formatador={moedaCurta} series={[{ chave: 'custo', nome: 'Custo operacional', cor: COR_CATEGORICA[0] }]} />
          )}
        </Grafico>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Módulos ainda sem integração real — mesmo layout, dado ilustrativo (selo sempre visível)
// ---------------------------------------------------------------------------
function PainelMock({ config }: { config: ModuloMock }) {
  const formato = config.graficoPrincipal.formato === 'moeda' ? moeda : numero;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><SeloIlustrativo /><span className="text-xs text-slate-400">Aguardando integração com a fonte de dados real deste módulo.</span></div>
      <KpiRow cards={config.kpis.map((k) => ({ ...k, Icon: Clock }))} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Grafico titulo={config.graficoPrincipal.titulo} ilustrativo>
          {config.graficoPrincipal.tipo === 'linha'
            ? <LinhaSerie dados={config.graficoPrincipal.dados} categoria={config.graficoPrincipal.categoria} series={config.graficoPrincipal.series} formatador={formato} />
            : <BarrasHorizontais dados={config.graficoPrincipal.dados} categoria={config.graficoPrincipal.categoria} series={config.graficoPrincipal.series} formatador={formato} />}
          {config.graficoPrincipal.series.length > 1 && <Legenda itens={config.graficoPrincipal.series.map((s) => ({ cor: s.cor, rotulo: s.nome }))} />}
        </Grafico>
        <Grafico titulo={config.graficoPizza.titulo} ilustrativo>
          <PizzaCategorica dados={config.graficoPizza.dados} chaveValor={config.graficoPizza.chaveValor} chaveNome={config.graficoPizza.chaveNome}
            formatador={config.graficoPizza.formato === 'moeda' ? moeda : numero} />
        </Grafico>
      </div>
    </div>
  );
}
