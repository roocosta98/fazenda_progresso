import React from 'react';
import { X, User, Map, RefreshCw, Settings, LogOut, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNovaSolicitacao?: () => void;
}

export const MenuDrawer: React.FC<MenuDrawerProps> = ({ isOpen, onClose, onOpenNovaSolicitacao }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    onClose();
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
        <div className="bg-emerald-600 p-6 flex flex-col items-start justify-end h-[160px] relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-inner mb-3">
            <User className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-white font-bold text-lg leading-tight">Carlos Silva</h2>
          <p className="text-emerald-100 text-sm font-medium">Motorista (Mat. 9021)</p>
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
            {onOpenNovaSolicitacao && (
              <li>
                <button 
                  onClick={() => {
                    onClose();
                    onOpenNovaSolicitacao();
                  }} 
                  className="w-full flex items-center px-6 py-4 text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 transition-colors font-bold"
                >
                  <PlusCircle className="w-5 h-5 mr-4 text-emerald-600" />
                  Nova Solicitação
                </button>
              </li>
            )}
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
