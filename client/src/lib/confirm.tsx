import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface ConfirmContextType {
  confirm: (message: string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [resolver, setResolver] = useState<((result: boolean) => void) | null>(null);

  const confirm = useCallback((msg: string) => {
    setMessage(msg);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handle = (result: boolean) => {
    setOpen(false);
    setMessage('');
    if (resolver) resolver(result);
    setResolver(null);
  };

  const contextValue = useMemo(() => ({ confirm }), [confirm]);
  return (
    <ConfirmContext.Provider value={contextValue}>
      {children}
      {open && (
        <div className="confirm-backdrop">
          <div className="confirm-dialog">
            <p>{message}</p>
            <div className="confirm-actions">
              <button onClick={() => handle(true)} autoFocus>Yes</button>
              <button onClick={() => handle(false)}>No</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}
