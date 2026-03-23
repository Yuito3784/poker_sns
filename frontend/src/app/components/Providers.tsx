"use client";

import { AuthProvider } from "../../contexts/AuthContext";
import { NotificationProvider } from "../../contexts/NotificationContext";
import { ToastProvider } from "../../contexts/ToastContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
