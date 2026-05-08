import { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from '@mull/ui';
import { useTheme } from '@mull/ui';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

let _id = 0;

export function ToastProvider({ children }) {
  const { T } = useTheme();
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, variant = 'success', sub) => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, msg, sub, variant, exiting: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    }, 2700);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px',
        zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '8px',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            transform: t.exiting ? 'translateX(110%)' : 'translateX(0)',
            opacity: t.exiting ? 0 : 1,
            transition: 'transform 0.28s ease, opacity 0.28s ease',
            pointerEvents: 'auto',
          }}>
            <Toast T={T} variant={t.variant} msg={t.msg} sub={t.sub} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
