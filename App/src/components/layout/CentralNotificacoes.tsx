import React from 'react';
import { X, Bell, Calendar, UserX, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/offlineDB';

interface CentralNotificacoesProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CentralNotificacoes: React.FC<CentralNotificacoesProps> = ({ isOpen, onClose }) => {
  const notificacoes = useLiveQuery(() => db.notificacoes.orderBy('timestamp').reverse().toArray());

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'viagem_reagendada': return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'viagem_cancelada': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'substituicao_motorista': return <UserX className="w-5 h-5 text-orange-500" />;
      default: return <Bell className="w-5 h-5 text-green-500" />;
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString('pt-BR');
  };

  const markAsRead = async (id?: number) => {
    if (id) {
      await db.notificacoes.update(id, { lida: true });
    }
  };

  const markAllAsRead = async () => {
    if (notificacoes) {
      const unread = notificacoes.filter(n => !n.lida).map(n => n.id!);
      if (unread.length > 0) {
        await Promise.all(unread.map(id => db.notificacoes.update(id, { lida: true })));
      }
    }
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
        className={`absolute top-0 right-0 h-full w-[300px] sm:w-[350px] bg-slate-50 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="bg-white p-5 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Bell className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-slate-800 font-bold text-lg">Notificações</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {(!notificacoes || notificacoes.length === 0) ? (
            <div className="text-center py-10 flex flex-col items-center">
              <CheckCircle2 className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium text-sm">Você não tem novas notificações.</p>
            </div>
          ) : (
            notificacoes.map(notif => (
              <div 
                key={notif.id} 
                onClick={() => markAsRead(notif.id)}
                className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                  notif.lida 
                    ? 'bg-white border-slate-200 opacity-75' 
                    : 'bg-green-50 border-green-200 shadow-sm'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`mt-0.5 p-1.5 rounded-lg ${notif.lida ? 'bg-slate-100' : 'bg-white'}`}>
                    {getIcon(notif.tipo)}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${notif.lida ? 'text-slate-600' : 'text-slate-900 font-semibold'}`}>
                      {notif.mensagem}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-wider">
                      {formatTime(notif.timestamp)}
                    </p>
                  </div>
                  {!notif.lida && (
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notificacoes && notificacoes.some(n => !n.lida) && (
          <div className="p-4 border-t border-slate-200 bg-white">
            <button 
              onClick={markAllAsRead}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
            >
              Marcar todas como lidas
            </button>
          </div>
        )}
      </div>
    </>
  );
};
