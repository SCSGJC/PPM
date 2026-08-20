import { useEffect, useState } from 'react';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  pendingChanges: number;
}

export function useOfflineSync() {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSync: null,
    pendingChanges: 0,
  });

  useEffect(() => {
    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isOnline: true }));
      syncPendingChanges();
    };

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncPendingChanges = async () => {
    const pendingKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('pending_sync_')) {
        pendingKeys.push(key);
      }
    }

    if (pendingKeys.length === 0) return;

    setStatus((prev) => ({ ...prev, isSyncing: true, pendingChanges: pendingKeys.length }));

    for (const key of pendingKeys) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsedData = JSON.parse(data);
          console.log('Syncing pending change:', parsedData);
          localStorage.removeItem(key);
        }
      } catch (err) {
        console.error('Failed to sync change:', err);
      }
    }

    setStatus((prev) => ({
      ...prev,
      isSyncing: false,
      lastSync: new Date(),
      pendingChanges: 0,
    }));
  };

  const queueChange = (type: string, data: unknown) => {
    const key = `pending_sync_${Date.now()}_${Math.random()}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        type,
        data,
        timestamp: new Date().toISOString(),
      })
    );
    setStatus((prev) => ({ ...prev, pendingChanges: prev.pendingChanges + 1 }));
  };

  return {
    ...status,
    syncNow: syncPendingChanges,
    queueChange,
  };
}
