import { useState, useCallback } from 'react';

interface ToastState {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({
      visible: true,
      message,
      type,
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const toastFn = useCallback(
    (options: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => {
      const message = options.description || options.title || '';
      const type = options.variant === 'destructive' ? 'error' : 'info';
      showToast(message, type);
    },
    [showToast]
  );

  return {
    toast,
    showToast,
    hideToast,
    toast: toastFn,
  };
}


