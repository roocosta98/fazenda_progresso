import { useState, useEffect } from 'react';
import { db } from '../db/offlineDB';
import { useLiveQuery } from 'dexie-react-hooks';

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

  // Simple mock function to sync data when online
  useEffect(() => {
    if (isOnline && pendingActions && pendingActions > 0) {
      const syncData = async () => {
        console.log(`Syncing ${pendingActions} actions to the server...`);
        // Mocking API call delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await db.syncQueue.clear();
        console.log('Sync complete!');
      };
      syncData();
    }
  }, [isOnline, pendingActions]);

  return { isOnline, pendingActions: pendingActions || 0 };
};
