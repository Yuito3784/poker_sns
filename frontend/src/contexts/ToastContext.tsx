"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-20 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-[slideUp_0.3s_ease-out] rounded px-4 py-2 text-sm font-medium backdrop-blur-sm"
            style={{
              background: toast.type === "success"
                ? "rgba(201,168,76,0.95)"
                : toast.type === "error"
                  ? "rgba(176,48,48,0.95)"
                  : "rgba(26,34,24,0.95)",
              color: toast.type === "success" ? "#0d1009" : "#ddd6c8",
              border: toast.type === "success"
                ? "1px solid rgba(201,168,76,0.5)"
                : toast.type === "error"
                  ? "1px solid rgba(176,48,48,0.4)"
                  : "1px solid #2a3828",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
