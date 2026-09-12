import { useNavigate } from 'react-router-dom';
import { Truck, Boxes, Factory, Wrench, ShoppingCart, Wallet, Handshake, Calculator, Users, HardHat, ClipboardList, Receipt, PieChart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { ModuloSistema } from '../../types';

interface CardModulo {
  modulo: ModuloSistema;
  titulo: string;
  descricao: string;
  icone: React.ReactNode;
  to: string;
  cor: string;
  ativo: boolean;
}

const CARDS: CardModulo[] = [
  {
    modulo: 'logistica_frota',
    titulo: 'Logística',
    descricao: 'Frota, solicitações, metas e telemetria.',
    icone: <Truck size={28} />,
    to: '/logistica/dashboard',
    cor: 'bg-blue-50 text-blue-600 border-blue-200',
    ativo: true,
  },
  {
    modulo: 'estoque',
    titulo: 'Estoque',
    descricao: 'Níveis, giro, ruptura e cotações.',
    icone: <Boxes size={28} />,
    to: '/logistica/estoque/dashboard',
    cor: 'bg-amber-50 text-amber-600 border-amber-200',
    ativo: true,
  },
  {
    modulo: 'producao_batata',
    titulo: 'Produção',
    descricao: 'Safras, colheita e custo por tonelada.',
    icone: <Factory size={28} />,
    to: '/producao/batata',
    cor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    ativo: false,
  },
  {
    modulo: 'manutencao',
    titulo: 'Manutenção',
    descricao: 'Ativos, ordens de serviço e preventivas.',
    icone: <Wrench size={28} />,
    to: '/manutencao',
    cor: 'bg-orange-50 text-orange-600 border-orange-200',
    ativo: false,
  },
  {
    modulo: 'compras',
    titulo: 'Compras',
    descricao: 'Cotações, pedidos e fornecedores.',
    icone: <ShoppingCart size={28} />,
    to: '/compras',
    cor: 'bg-violet-50 text-violet-600 border-violet-200',
    ativo: false,
  },
  {
    modulo: 'financeiro',
    titulo: 'Financeiro',
    descricao: 'Contas a pagar, a receber e fluxo de caixa.',
    icone: <Wallet size={28} />,
    to: '/financeiro',
    cor: 'bg-teal-50 text-teal-600 border-teal-200',
    ativo: false,
  },
  {
    modulo: 'comercial',
    titulo: 'Comercial',
    descricao: 'Vendas, contratos e clientes.',
    icone: <Handshake size={28} />,
    to: '/comercial',
    cor: 'bg-rose-50 text-rose-600 border-rose-200',
    ativo: false,
  },
  {
    modulo: 'custos',
    titulo: 'Custos',
    descricao: 'Apuração e rateio de custos por centro.',
    icone: <Calculator size={28} />,
    to: '/custos',
    cor: 'bg-sky-50 text-sky-600 border-sky-200',
    ativo: false,
  },
  {
    modulo: 'rh',
    titulo: 'DP / RH',
    descricao: 'Folha, admissões e gestão de pessoas.',
    icone: <Users size={28} />,
    to: '/rh',
    cor: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200',
    ativo: false,
  },
  {
    modulo: 'seguranca_trabalho',
    titulo: 'Segurança do Trabalho',
    descricao: 'Treinamentos, EPIs e ocorrências.',
    icone: <HardHat size={28} />,
    to: '/seguranca-trabalho',
    cor: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    ativo: false,
  },
  {
    modulo: 'controladoria',
    titulo: 'Controladoria',
    descricao: 'Indicadores gerenciais e auditoria.',
    icone: <ClipboardList size={28} />,
    to: '/controladoria',
    cor: 'bg-slate-100 text-slate-600 border-slate-200',
    ativo: false,
  },
  {
    modulo: 'fiscal',
    titulo: 'Fiscal',
    descricao: 'Notas fiscais e obrigações tributárias.',
    icone: <Receipt size={28} />,
    to: '/fiscal',
    cor: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    ativo: false,
  },
];

export function Inicio() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const modulosDisponiveis = usuario?.tipoUsuario === 'admin'
    ? CARDS.map((c) => c.modulo)
    : (usuario?.modulos?.length ? usuario.modulos : ['logistica_frota']);
  const cards = CARDS.filter((c) => modulosDisponiveis.includes(c.modulo));

  return (
    <div className="max-w-5xl mx-auto pt-8 pb-12">
      <div className="text-center mb-10">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Fazenda Progresso</p>
        <h1 className="text-3xl font-bold text-slate-800 mt-1">Olá, {usuario?.nome?.split(' ')[0]}</h1>
        <p className="text-slate-500 mt-2">Escolha um módulo para começar.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card) => (
          <button
            key={card.modulo}
            onClick={() => navigate(card.to)}
            className="group relative text-left bg-white border border-slate-200/80 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <span
              className={`absolute top-4 right-4 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                card.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {card.ativo ? 'Ativo' : 'Em construção'}
            </span>
            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl border ${card.cor}`}>
              {card.icone}
            </div>
            <h2 className="text-lg font-bold text-slate-800 mt-4 group-hover:text-emerald-700 transition-colors">
              {card.titulo}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{card.descricao}</p>
          </button>
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <button
          onClick={() => navigate('/visao-geral')}
          className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-950 text-white font-bold hover:bg-emerald-900 transition-colors shadow-sm"
        >
          <PieChart size={19} className="text-emerald-300" />
          Visão Geral (BI) — todos os módulos num só painel
        </button>
      </div>
    </div>
  );
}
