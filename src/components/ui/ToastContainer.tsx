import React from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToast, Toast } from '../../context/ToastContext';

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
};

const iconColorMap = {
  success: 'text-green-600',
  error: 'text-red-600',
  info: 'text-blue-600',
  warning: 'text-yellow-600',
};

export function ToastContainer() {
  const { toasts, hideToast } = useToast();

  return (
    <div className="fixed top-4 right-4 space-y-2 pointer-events-none" style={{ zIndex: 99999 }}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  try {
    const Icon = iconMap[toast.type] || Info;
    const message = toast.message;

    return (
      <div
        className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg min-w-[320px] max-w-md pointer-events-auto animate-slide-in ${colorMap[toast.type]}`}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColorMap[toast.type]}`} />
        <p className="flex-1 text-sm font-medium whitespace-pre-line">{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  } catch (error) {
    console.error('[ToastItem] Fatal error rendering toast:', error);
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg border shadow-lg min-w-[320px] max-w-md pointer-events-auto animate-slide-in bg-red-50 border-red-200 text-red-800">
        <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
        <p className="flex-1 text-sm font-medium">Error displaying notification</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }
}
