import { useState, useRef, useEffect } from 'react';
import { LogOut, Bell, Settings, Wifi, Search, CheckCircle2, ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onAbrirMenu?: () => void;
}

export const Header = ({ onAbrirMenu }: HeaderProps) => {
  const { usuario, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-3 sm:px-6 h-14 flex items-center justify-between gap-2 shadow-2xs">
      {/* Botão de menu mobile + Barra de Busca Corporativa */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {onAbrirMenu && (
          <button
            onClick={onAbrirMenu}
            className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors shrink-0"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="relative w-full max-w-xs hidden sm:block">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por OS, motorista ou placa..."
            className="w-full pl-8 pr-12 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 transition-all"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs hidden lg:block">
            Ctrl+K
          </kbd>
        </div>
      </div>

      {/* Ações e Informações de Sessão */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Status de Integrações (Sóbrios) */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50/80 text-emerald-800 rounded-md border border-emerald-200/70 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <span>ERP Sankhya Online</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200/80 text-[11px] font-medium">
            <Wifi size={12} className="text-slate-500" />
            <span>Telemetria Conectada</span>
          </div>
        </div>

        <div className="h-4 w-px bg-slate-200 hidden lg:block" />

        {/* Notificações */}
        <button
          className="relative p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
          title="Notificações do Sistema"
        >
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
        </button>

        {/* Perfil & Menu Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-md hover:bg-slate-100/80 transition-colors focus:outline-hidden"
          >
            <div className="w-7 h-7 rounded-md bg-[#1e3a2f] text-emerald-100 flex items-center justify-center font-semibold text-xs shadow-2xs">
              {usuario?.nome.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight">{usuario?.nome}</p>
              <p className="text-[10px] text-slate-500 leading-tight">
                {usuario?.perfil === 'logistica' ? 'Gestor de Frota' : usuario?.perfil}
              </p>
            </div>
            <ChevronDown size={13} className="text-slate-400 hidden sm:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in-50 duration-100">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">{usuario?.nome}</p>
                <p className="text-[11px] text-slate-500 truncate">{usuario?.departamento ?? 'Departamento de Logística'}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => setDropdownOpen(false)}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium transition-colors"
                >
                  <Settings size={14} className="text-slate-400" />
                  Configurações do Perfil
                </button>
                <div className="px-3 py-1.5 text-[11px] text-slate-500 flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>Ambiente de Produção</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-1 mt-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold transition-colors"
                >
                  <LogOut size={14} />
                  Encerrar Sessão
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
