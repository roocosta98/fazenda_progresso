import { ShoppingCart } from 'lucide-react';

export function Compras() {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Compras</p>
      <h1 className="text-2xl font-bold text-slate-800 mt-1">Painel de Compras</h1>
      <div className="mt-6 bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
        <ShoppingCart size={32} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">Este módulo ainda está em construção.</p>
        <p className="text-sm text-slate-400 mt-1">Em breve: cotações, pedidos e fornecedores em um só lugar.</p>
      </div>
    </div>
  );
}
