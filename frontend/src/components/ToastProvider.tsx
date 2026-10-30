import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { ToastContext, type ToastApi, type ToastOptions, type ToastVariant } from '../context/ToastContext';

interface ToastItem extends ToastOptions {
  id: number;
  variant: ToastVariant;
}

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 3500,
  info: 3500,
  error: 6000,
};

const MAX_VISIBLE = 5;

const variantStyles: Record<ToastVariant, { accent: string; icon: ReactNode }> = {
  success: {
    accent: 'bg-emerald-500',
    icon: <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />,
  },
  error: {
    accent: 'bg-red-600',
    icon: <XCircle size={20} className="text-red-600 dark:text-red-500 shrink-0" />,
  },
  info: {
    accent: 'bg-sky-500',
    icon: <Info size={20} className="text-sky-600 dark:text-sky-400 shrink-0" />,
  },
};

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false);
  const { accent, icon } = variantStyles[toast.variant];

  useEffect(() => {
    const enter = requestAnimationFrame(() => setVisible(true));
    const leave = setTimeout(() => setVisible(false), toast.duration);
    const remove = setTimeout(() => onDismiss(toast.id), (toast.duration ?? 0) + 200);
    return () => {
      cancelAnimationFrame(enter);
      clearTimeout(leave);
      clearTimeout(remove);
    };
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-slate-200 dark:border-[#272b30] bg-light-surface dark:bg-[#16181c] py-3.5 pl-4 pr-10 shadow-xl transition-all duration-200 ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${accent}`} />
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900 dark:text-white">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 whitespace-pre-line break-words text-xs font-medium text-slate-600 dark:text-[#8b949e]">
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="absolute right-2.5 top-2.5 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((variant: ToastVariant, title: string, description?: string) => {
    const toast: ToastItem = {
      id: nextId.current++,
      variant,
      title,
      description,
      duration: DEFAULT_DURATION[variant],
    };
    setToasts((current) => [...current, toast].slice(-MAX_VISIBLE));
  }, []);

  const api = useMemo<ToastApi>(() => ({
    success: (title, description) => push('success', title, description),
    error: (title, description) => push('error', title, description),
    info: (title, description) => push('info', title, description),
    dismiss,
  }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(380px,calc(100vw-2.5rem))] flex-col gap-2.5">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
