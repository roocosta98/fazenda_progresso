import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, populateInitialData } from '../db/offlineDB';
import { ViagemCard } from '../components/common/ViagemCard';
import { WifiOff, Activity, Menu, Bell, Plus } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { MenuDrawer } from '../components/layout/MenuDrawer';
import { CentralNotificacoes } from '../components/layout/CentralNotificacoes';

type Tab = 'A_EXECUTAR' | 'CONCLUIDAS' | 'TODAS';

export const MinhasViagens: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('A_EXECUTAR');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificacoesOpen, setIsNotificacoesOpen] = useState(false);
  const { isOnline } = useOfflineSync();

  // Initialize DB data once
  useEffect(() => {
    populateInitialData();
  }, []);

  const viagens = useLiveQuery(() => db.viagens.orderBy('sequencia').toArray());
  const notificacoes = useLiveQuery(() => db.notificacoes.toArray());
  const unreadCount = notificacoes?.filter(n => !n.lida).length || 0;

  if (!viagens) return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin text-green-500"><Activity size={48} /></div>
    </div>
  );

  const filteredViagens = viagens.filter(v => {
    if (activeTab === 'A_EXECUTAR') return v.status === 'agendada' || v.status === 'em_execucao';
    if (activeTab === 'CONCLUIDAS') return v.status === 'concluida';
    return true;
  });

  const pendentes = viagens.filter(v => v.status !== 'concluida').length;

  return (
    <>
      <MenuDrawer 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        onOpenNovaSolicitacao={() => navigate('/nova-solicitacao')}
      />
      <CentralNotificacoes isOpen={isNotificacoesOpen} onClose={() => setIsNotificacoesOpen(false)} />
      
      <div className="flex flex-col min-h-screen bg-gray-50 pb-24 w-full overflow-x-hidden relative">
        
        {/* Premium Header */}
        <div className="bg-gradient-to-br from-green-700 via-green-600 to-green-800 pt-10 pb-5 rounded-b-[32px] shadow-xl shadow-green-900/10 z-10 sticky top-0">
          
          <div className="px-5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setIsMenuOpen(true)}
                  className="p-2 -ml-2 text-white/90 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <Menu className="w-7 h-7" />
                </button>
                <div>
                  <p className="text-green-100 text-xs font-bold uppercase tracking-wider mb-0.5">Bom dia, Motorista</p>
                  <h1 className="text-2xl font-black text-white tracking-tight leading-none">Carlos Silva</h1>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Notification Bell */}
                <button 
                  onClick={() => setIsNotificacoesOpen(true)}
                  className="relative p-2 text-white/90 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <Bell className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-green-700 animate-pulse"></span>
                  )}
                </button>
                
                {/* Avatar Profile */}
                <div 
                  className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/30 shadow-inner cursor-pointer active:scale-95 transition-transform"
                  onClick={() => setIsMenuOpen(true)}
                >
                  <img 
                    src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                    alt="Carlos" 
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
            </div>

            {/* Status and Action Row */}
            <div className="flex items-center justify-between space-x-3 mb-2">
              
              {/* Online/Offline Status Indicator */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl py-3 px-4 flex-1 border border-white/20 flex flex-col justify-center">
                <p className="text-green-100 text-[10px] uppercase font-bold tracking-wider mb-1">Status de Rede</p>
                <div className="flex items-center">
                  {isOnline ? (
                    <><span className="w-2.5 h-2.5 rounded-full bg-green-400 mr-2 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span> <span className="text-white font-bold text-sm">Conectado</span></>
                  ) : (
                    <><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 mr-2 shadow-[0_0_8px_rgba(250,204,21,0.8)]"></span> <span className="text-white font-bold text-sm">Offline</span></>
                  )}
                </div>
              </div>

              {/* Viagens Pendentes */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl py-3 px-4 flex-1 border border-white/20 flex flex-col items-center justify-center">
                <p className="text-green-100 text-[10px] uppercase font-bold tracking-wider mb-0.5">Pendentes</p>
                <p className="text-white text-2xl font-black">{pendentes}</p>
              </div>

              {/* Botão Abrir Solicitação Direct */}
            </div>
          </div>

          {/* Tabs Inside Header */}
          <div className="flex space-x-2 mt-4 px-5 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setActiveTab('A_EXECUTAR')}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === 'A_EXECUTAR'
                  ? 'bg-white text-green-800 shadow-sm'
                  : 'bg-white/10 text-green-50 hover:bg-white/20'
              }`}
            >
              A Executar
            </button>
            <button
              onClick={() => setActiveTab('CONCLUIDAS')}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === 'CONCLUIDAS'
                  ? 'bg-white text-green-800 shadow-sm'
                  : 'bg-white/10 text-green-50 hover:bg-white/20'
              }`}
            >
              Concluídas
            </button>
            <button
              onClick={() => setActiveTab('TODAS')}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === 'TODAS'
                  ? 'bg-white text-green-800 shadow-sm'
                  : 'bg-white/10 text-green-50 hover:bg-white/20'
              }`}
            >
              Todas
            </button>
          </div>
        </div>

        {/* Offline Banner Fix */}
        {!isOnline && (
          <div className="mt-4 mx-5 bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start space-x-3 shadow-sm">
            <WifiOff className="text-yellow-600 w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800 font-medium leading-relaxed">
              Você está sem internet. Suas ações serão sincronizadas quando reconectar.
            </p>
          </div>
        )}

        {/* List */}
        <div className="flex-1 px-4 py-6">
          {filteredViagens.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 font-medium">Nenhuma viagem encontrada.</p>
            </div>
          ) : (
            filteredViagens.map(viagem => (
              <ViagemCard key={viagem.idOS} viagem={viagem} />
            ))
          )}
        </div>

        {/* Floating Action Button (FAB) para Nova Solicitação */}
        <button
          onClick={() => navigate('/nova-solicitacao')}
          className="fixed bottom-6 right-[max(1.25rem,calc((100vw-430px)/2+1.25rem))] w-14 h-14 min-w-14 min-h-14 max-w-14 max-h-14 aspect-square p-0 bg-green-600 hover:bg-green-700 text-white rounded-[9999px] shadow-xl shadow-green-900/30 border border-white/30 flex shrink-0 items-center justify-center active:scale-90 transition-all z-30"
          title="Nova Solicitação"
        >
          <Plus className="w-7 h-7" strokeWidth={3} />
        </button>

      </div>
    </>
  );
};
