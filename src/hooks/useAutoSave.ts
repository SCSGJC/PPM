import { useEffect, useRef, useState } from 'react';

export interface UseAutoSaveOptions {
  interval?: number;
  onSave: (data: unknown) => Promise<void>;
  enabled?: boolean;
}

export function useAutoSave<T>(data: T, options: UseAutoSaveOptions) {
  const { interval = 30000, onSave, enabled = true } = options;
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<number>();
  const previousDataRef = useRef<string>();

  useEffect(() => {
    if (!enabled) return;

    const currentData = JSON.stringify(data);

    if (previousDataRef.current && previousDataRef.current !== currentData) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(async () => {
        setIsSaving(true);
        setError(null);
        try {
          await onSave(data);
          setLastSaved(new Date());
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Auto-save failed'));
        } finally {
          setIsSaving(false);
        }
      }, interval);
    }

    previousDataRef.current = currentData;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, interval, onSave, enabled]);

  const saveNow = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(data);
      setLastSaved(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Save failed'));
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    lastSaved,
    isSaving,
    error,
    saveNow,
  };
}
