import { LogOut, Bell, Settings, Wifi, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

export const Header = () => {
  const { usuario, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="bg-white/70 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 px-6 py-3 h-16 flex items-center justify-between transition-all">
      <div className="flex items-center text-slate-400">
        <Search size={18} className="mr-2" />
        <span className="text-sm font-medium">Buscar por OS, Motorista, Placa... (Ctrl+K)</span>
      </div>

      <div className="flex items-center space-x-6">
        <div className="hidden md:flex items-center space-x-4 mr-2">
          <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-100 shadow-sm">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse-ring"></span>
            <span>Sankhya Online</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full text-xs font-bold border border-teal-100 shadow-sm">
            <Wifi size={12} className="text-teal-500 animate-pulse" />
            <span>Telemetria On</span>
          </div>
        </div>

        <button className="relative p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100/50 rounded-full transition-colors">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
        </button>

        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-3 focus:outline-none group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800 leading-tight group-hover:text-emerald-700 transition-colors">{usuario?.nome}</p>
              <p className="text-xs text-slate-500 font-medium capitalize">{usuario?.perfil === 'logistica' ? 'Gestor de Frota' : usuario?.perfil}</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 ring-2 ring-slate-100 shadow-sm flex items-center justify-center text-white font-bold text-sm group-hover:ring-emerald-200 transition-all">
              {usuario?.nome.charAt(0)}
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-100 py-1 z-50 animate-fade-in-up">
              <div className="px-4 py-3 border-b border-slate-100 sm:hidden">
                <p className="text-sm font-bold text-slate-800">{usuario?.nome}</p>
                <p className="text-xs text-slate-500 capitalize">{usuario?.perfil}</p>
              </div>
              <button className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center font-medium transition-colors">
                <Settings size={16} className="mr-3 text-slate-400" /> Configurações
              </button>
              <div className="h-px bg-slate-100 my-1"></div>
              <button 
                onClick={logout}
                className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 flex items-center font-bold transition-colors"
              >
                <LogOut size={16} className="mr-3" /> Sair do Sistema
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
