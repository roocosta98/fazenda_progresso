import { X, Server, MessageCircle, Map as MapIcon } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface LogIntegracoesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogIntegracoesModal = ({ isOpen, onClose }: LogIntegracoesModalProps) => {
  const { notificacoes } = useAppContext();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center space-x-2">
            <Server className="text-gray-500" size={20} />
            <h3 className="text-lg font-bold text-gray-900">Logs de Integração</h3>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
          {/* Static Mock Logs based on PRD */}
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-sm">
            <div className="flex items-center space-x-2 text-brand-primary font-bold mb-1">
              <Server size={14} /> <span>Sankhya ERP API</span>
            </div>
            <p className="text-gray-600 font-mono text-xs break-words">
              [STATUS 200] OS-2026-0042 integrada com sucesso. ID Sankhya #89412.
            </p>
          </div>
          
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-sm">
            <div className="flex items-center space-x-2 text-green-600 font-bold mb-1">
              <MessageCircle size={14} /> <span>WhatsApp Meta Official API</span>
            </div>
            <p className="text-gray-600 font-mono text-xs break-words">
              [ENVIADO] Notificação disparada para Motorista Carlos (5511999999999) e Solicitante João.
            </p>
          </div>
          
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-sm border-l-4 border-l-blue-500">
            <div className="flex items-center space-x-2 text-blue-600 font-bold mb-1">
              <MapIcon size={14} /> <span>GPS Sync Telemetria</span>
            </div>
            <p className="text-gray-600 font-mono text-xs break-words">
              [RECEBIDO] Posição atualizada da OS-2026-0042. Rota: Lote 12.
            </p>
          </div>

          {/* Dynamic Context Notifications */}
          {notificacoes.map(notif => (
            <div key={notif.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-sm">
              <div className="flex items-center space-x-2 text-gray-700 font-bold mb-1">
                {notif.tipo === 'whatsapp' ? <MessageCircle size={14} className="text-green-500" /> : <Server size={14} className="text-gray-500" />}
                <span className="capitalize">{notif.tipo}</span>
              </div>
              <p className="text-gray-600 font-mono text-xs break-words">
                {notif.mensagem}
              </p>
              <p className="text-gray-400 text-[10px] mt-2 text-right">{new Date(notif.data).toLocaleTimeString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
