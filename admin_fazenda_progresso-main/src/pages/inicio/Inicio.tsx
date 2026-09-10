import { useNavigate } from 'react-router-dom';
import { Truck, Boxes, Factory, Wrench, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { ModuloSistema } from '../../types';

interface CardModulo {
  modulo: ModuloSistema;
  titulo: string;
  descricao: string;
  icone: React.ReactNode;
  to: string;
  cor: string;
}

const CARDS: CardModulo[] = [
  {
    modulo: 'logistica_frota',
    titulo: 'Logística',
    descricao: 'Frota, solicitações, metas e telemetria.',
    icone: <Truck size={28} />,
    to: '/logistica/dashboard',
    cor: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  {
    modulo: 'estoque',
    titulo: 'Estoque',
    descricao: 'Níveis, giro, ruptura e cotações.',
    icone: <Boxes size={28} />,
    to: '/logistica/estoque/dashboard',
    cor: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  {
    modulo: 'producao_batata',
    titulo: 'Produção',
    descricao: 'Safras, colheita e custo por tonelada.',
    icone: <Factory size={28} />,
    to: '/producao/batata',
    cor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
  {
    modulo: 'manutencao',
    titulo: 'Manutenção',
    descricao: 'Ativos, ordens de serviço e preventivas.',
    icone: <Wrench size={28} />,
    to: '/manutencao',
    cor: 'bg-orange-50 text-orange-600 border-orange-200',
  },
  {
    modulo: 'compras',
    titulo: 'Compras',
    descricao: 'Cotações, pedidos e fornecedores.',
    icone: <ShoppingCart size={28} />,
    to: '/compras',
    cor: 'bg-violet-50 text-violet-600 border-violet-200',
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
            className="group text-left bg-white border border-slate-200/80 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
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
    </div>
  );
}
