import React from 'react';
import { X, User, Map, RefreshCw, Settings, LogOut, PlusCircle, Trophy, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNovaSolicitacao?: () => void;
}

export const MenuDrawer: React.FC<MenuDrawerProps> = ({ isOpen, onClose, onOpenNovaSolicitacao }) => {
  const navigate = useNavigate();
  const { motorista, logout } = useAuth();

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="absolute inset-0 bg-gray-900/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div 
        className={`absolute top-0 left-0 h-full w-[280px] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="bg-primary p-6 flex flex-col items-start justify-end h-[160px] relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20 mb-3 backdrop-blur-sm">
            <User className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-white font-bold text-lg leading-tight tracking-tight">{motorista ?? 'Motorista'}</h2>
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider mt-1">Portal Operacional</p>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            <li>
              <button
                onClick={onClose}
                className="w-full flex items-center px-6 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors font-semibold"
              >
                <Map className="w-5 h-5 mr-4 text-gray-500" />
                Minhas Viagens
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  onClose();
                  navigate('/minha-meta');
                }}
                className="w-full flex items-center px-6 py-4 text-slate-800 hover:bg-slate-50 active:bg-slate-100 transition-colors font-semibold"
              >
                <Trophy className="w-5 h-5 mr-4 text-primary" />
                Minhas Metas
              </button>
            </li>
            {onOpenNovaSolicitacao && (
              <li>
                <button 
                  onClick={() => {
                    onClose();
                    onOpenNovaSolicitacao();
                  }} 
                  className="w-full flex items-center px-6 py-4 text-slate-800 hover:bg-slate-50 active:bg-slate-100 transition-colors font-semibold"
                >
                  <PlusCircle className="w-5 h-5 mr-4 text-primary" />
                  Nova Solicitação
                </button>
              </li>
            )}
            <li>
              <button 
                onClick={() => {
                  onClose();
                  navigate('/auditorias');
                }} 
                className="w-full flex items-center px-6 py-4 text-slate-800 hover:bg-slate-50 active:bg-slate-100 transition-colors font-semibold"
              >
                <ClipboardCheck className="w-5 h-5 mr-4 text-primary" />
                Auditorias
              </button>
            </li>
            <li>
              <button 
                onClick={onClose} 
                className="w-full flex items-center px-6 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors font-semibold"
              >
                <RefreshCw className="w-5 h-5 mr-4 text-gray-500" />
                Sincronização offline
              </button>
            </li>
            <li>
              <button 
                onClick={() => {
                  onClose();
                  navigate('/configuracoes');
                }}
                className="w-full flex items-center px-6 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors font-semibold"
              >
                <Settings className="w-5 h-5 mr-4 text-gray-500" />
                Configurações
              </button>
            </li>
          </ul>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 text-rose-600 hover:bg-rose-50 px-4 py-3 rounded-xl transition-colors font-bold"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair do App</span>
          </button>
        </div>
      </div>
    </>
  );
};
