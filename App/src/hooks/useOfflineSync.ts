import { useState, useEffect } from 'react';
import { db } from '../db/offlineDB';
import { useLiveQuery } from 'dexie-react-hooks';
import { api } from '../services/api';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  
  // Observe changes in the syncQueue
  const pendingActions = useLiveQuery(() => db.syncQueue.count(), []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Drena a fila de sync quando volta a conexão. CRIAR_CHECKLIST chama o endpoint real
  // (App/api/checklist/criar.ts, grava nas tabelas ChecklistAtividade/Item no SQL Server);
  // os demais tipos (viagem) ainda não têm backend real integrado nesta entrega — mantém o
  // comportamento anterior (mock) pra não regredir o fluxo de viagens já existente.
  useEffect(() => {
    if (isOnline && pendingActions && pendingActions > 0) {
      const syncData = async () => {
        const acoes = await db.syncQueue.toArray();
        for (const acao of acoes) {
          try {
            if (acao.type === 'CRIAR_CHECKLIST') {
              await api.criarChecklist(acao.payload);
              if (acao.payload?.checklistLocalId) {
                await db.checklists.update(acao.payload.checklistLocalId, { sincronizado: true });
              }
            } else {
              await new Promise((resolve) => setTimeout(resolve, 300));
            }
            if (acao.id !== undefined) await db.syncQueue.delete(acao.id);
          } catch (error) {
            console.error('Erro ao sincronizar ação da fila:', acao.type, error);
            // deixa na fila pra tentar de novo na próxima vez que ficar online
          }
        }
      };
      syncData();
    }
  }, [isOnline, pendingActions]);

  return { isOnline, pendingActions: pendingActions || 0 };
};
