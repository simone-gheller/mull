import { useState, useCallback, useEffect, useRef } from 'react';
import { Toast } from '@vextis/ui';
import { useTheme } from '@vextis/ui';
import { ToastContext } from '../hooks/useToast';

let _id = 0;

export function ToastProvider({ children }) {
  const { T } = useTheme();
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const closeToast = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 240);
  }, []);

  const toast = useCallback((msg, variant = 'success', sub, duration = 4200) => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, msg, sub, variant, duration, exiting: false }]);
    const timer = setTimeout(() => closeToast(id), duration);
    timers.current.set(id, timer);
  }, [closeToast]);

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach(timer => clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed',
        right: '24px',
        bottom: '24px',
        zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '8px',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            transform: t.exiting ? 'translateX(110%)' : 'translateX(0)',
            opacity: t.exiting ? 0 : 1,
            transition: 'transform 0.22s ease, opacity 0.22s ease',
            pointerEvents: 'auto',
          }}>
            <Toast
              T={T}
              variant={t.variant}
              msg={t.msg}
              sub={t.sub}
              duration={t.duration}
              onClose={() => closeToast(t.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
