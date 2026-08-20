import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
  confirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    message: string;
    resolver: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    message: '',
    resolver: null
  });

  const showToast = useCallback((message: any, type: ToastType = 'info', duration: number = 4000) => {
    // Ensure message is always a string
    let safeMessage: string;
    if (typeof message === 'string') {
      safeMessage = message;
    } else if (message === null || message === undefined) {
      safeMessage = 'No message provided';
    } else if (message && typeof message === 'object') {
      // If it's an error object
      if (message.message) {
        safeMessage = String(message.message);
      } else {
        safeMessage = JSON.stringify(message);
      }
    } else {
      safeMessage = String(message);
    }

    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast: Toast = { id, message: safeMessage, type, duration };

    setToasts(prev => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        message,
        resolver: resolve
      });
    });
  }, []);

  const handleConfirmResponse = useCallback((response: boolean) => {
    setConfirmState(prev => {
      if (prev.resolver) {
        prev.resolver(response);
      }
      return {
        isOpen: false,
        message: '',
        resolver: null
      };
    });
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast, confirm }}>
      {children}
      {confirmState.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 99999 }}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <p className="text-gray-800 mb-6 whitespace-pre-line">{confirmState.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handleConfirmResponse(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmResponse(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
