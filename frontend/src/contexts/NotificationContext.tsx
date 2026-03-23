"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { API_BASE, fetchWithAuth } from "../lib/api";
import { useAuth } from "./AuthContext";
import type { Notification } from "../lib/types";

type NotificationContextValue = {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();
  const token = auth?.token ?? null;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const fetchNotifications = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    if (!tokenRef.current) return;
    try {
      await fetchWithAuth(`${API_BASE}/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      /* ignore */
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!tokenRef.current) return;
    await fetchWithAuth(`${API_BASE}/notifications/read-all`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  // Fetch notifications + connect SSE when logged in
  useEffect(() => {
    if (!token) {
      setNotifications([]);
      return;
    }

    fetchNotifications();

    // SSE for real-time notifications
    let eventSource: EventSource | null = null;
    let closed = false;

    const connectSSE = async () => {
      if (closed) return;
      try {
        const res = await fetchWithAuth(`${API_BASE}/notifications/sse-ticket`, { method: "POST" });
        if (!res.ok || closed) return;
        const { ticket } = await res.json();
        if (!ticket || closed) return;
        eventSource = new EventSource(`${API_BASE}/notifications/stream?ticket=${encodeURIComponent(ticket)}`);
        eventSource.onmessage = (event) => {
          try {
            const notification = JSON.parse(event.data);
            setNotifications((prev) => [notification, ...prev]);
          } catch {
            /* ignore */
          }
        };
        eventSource.onerror = () => {
          eventSource?.close();
          if (!closed) {
            setTimeout(connectSSE, 5000);
          }
        };
      } catch {
        if (!closed) setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();
    return () => {
      closed = true;
      eventSource?.close();
    };
  }, [token, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, refetch: fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
