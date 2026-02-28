"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { AuthGuard } from "@/components/layout/auth-guard";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { getDashboard, getServerLogs, markAlertRead } from "@/features/admin/api";
import type { DashboardResponse, ServerLogEntry } from "@/features/admin/types";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { notify } = useToast();
  const [navLoading, setNavLoading] = useState(false);
  const [pulse, setPulse] = useState<DashboardResponse | null>(null);
  const [pulseLoading, setPulseLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [serverLogs, setServerLogs] = useState<ServerLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsLoadedOnce, setLogsLoadedOnce] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const navStartRef = useRef<number | null>(null);

  function startNavigationLoading() {
    navStartRef.current = Date.now();
    setNavLoading(true);
  }

  useEffect(() => {
    if (!navLoading) return;
    setNavLoading(false);
  }, [pathname, navLoading]);

  const loadPulse = useCallback(
    async (signal?: AbortSignal, silent = false) => {
      if (!silent) setPulseLoading(true);
      try {
        const data = await getDashboard();
        if (signal?.aborted) return;
        setPulse(data);
      } catch (error) {
        if (signal?.aborted) return;
        notify({
          tone: "danger",
          title: "Pulse refresh failed",
          description: error instanceof Error ? error.message : "Could not refresh dashboard pulse.",
        });
      } finally {
        if (!signal?.aborted && !silent) setPulseLoading(false);
      }
    },
    [notify]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadPulse(controller.signal);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadPulse(undefined, true);
      }
    }, 30000);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [loadPulse]);

  const notifications = useMemo(() => pulse?.recent_alerts ?? [], [pulse]);
  const unreadCount = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);
  const visibleLogs = useMemo(() => serverLogs.slice(-120).reverse(), [serverLogs]);

  const loadServerLogs = useCallback(
    async (silent = false) => {
      if (!silent) setLogsLoading(true);
      try {
        const response = await getServerLogs("?limit=120");
        setServerLogs(response.items);
        setLogsError(null);
        setLogsLoadedOnce(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not read server logs.";
        setLogsError(message);
        if (!silent) {
          notify({ tone: "danger", title: "Log stream connection failed", description: message });
        }
      } finally {
        if (!silent) setLogsLoading(false);
      }
    },
    [notify]
  );

  useEffect(() => {
    if (!logsOpen) return;
    loadServerLogs(false);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadServerLogs(true);
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [logsOpen, loadServerLogs]);

  const markOneNotificationRead = useCallback(
    async (id: number) => {
      try {
        await markAlertRead(id);
        setPulse((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            recent_alerts: prev.recent_alerts.map((alert) => (alert.id === id ? { ...alert, is_read: true } : alert)),
            stats: {
              ...prev.stats,
              unread_alerts: Math.max(0, prev.stats.unread_alerts - 1),
            },
          };
        });
        notify({ tone: "success", title: `Alert #${id} marked as read` });
      } catch (error) {
        notify({
          tone: "danger",
          title: "Failed to mark alert",
          description: error instanceof Error ? error.message : "Please try again.",
        });
      }
    },
    [notify]
  );

  const markAllNotificationsRead = useCallback(async () => {
    const unreadIds = notifications.filter((item) => !item.is_read).map((item) => item.id);
    if (!unreadIds.length) return;
    try {
      await Promise.all(unreadIds.map((id) => markAlertRead(id)));
      setPulse((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          recent_alerts: prev.recent_alerts.map((alert) => ({ ...alert, is_read: true })),
          stats: {
            ...prev.stats,
            unread_alerts: Math.max(0, prev.stats.unread_alerts - unreadIds.length),
            critical_unread_alerts: 0,
          },
        };
      });
      notify({ tone: "success", title: "All visible notifications marked as read" });
    } catch (error) {
      notify({
        tone: "danger",
        title: "Bulk action failed",
        description: error instanceof Error ? error.message : "Could not mark all notifications.",
      });
    }
  }, [notifications, notify]);

  return (
    <AuthGuard>
      <div className="relative flex h-screen overflow-hidden bg-background">
        <div className="relative z-10 h-screen shrink-0">
          <AppSidebar onNavigateStart={startNavigationLoading} />
        </div>
        <div className="relative z-10 flex h-screen min-w-0 flex-1 flex-col">
          <AppTopbar
            unreadCount={unreadCount}
            onOpenNotifications={() => setNotificationsOpen(true)}
            onOpenLogs={() => setLogsOpen(true)}
          />
          <main className="relative min-h-0 flex-1 overflow-y-auto p-6 lg:p-8">
            {/* Top Progress Bar for Navigation */}
            {navLoading && (
              <div className="fixed left-0 top-0 z-[100] h-1 w-full bg-primary/10 overflow-hidden">
                <div className="h-full bg-primary animate-progress-indefinite shadow-[0_0_8px_hsl(var(--primary))]" />
              </div>
            )}
            {children}
          </main>
        </div>
      </div>

      <Drawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title="Notifications"
        description="Recent alert activity from live classrooms."
        widthClassName="max-w-lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {unreadCount} unread of {notifications.length} shown
          </p>
          <Button size="sm" variant="outline" onClick={markAllNotificationsRead} disabled={!unreadCount}>
            Mark all read
          </Button>
        </div>

        {pulseLoading && !notifications.length ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : notifications.length ? (
          <div className="space-y-2">
            {notifications.map((item) => (
              <article key={item.id} className="rounded-lg border border-border bg-card p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium">{item.alert_type}</p>
                  <div className="flex items-center gap-2">
                    <Badge tone={item.severity === "CRITICAL" ? "danger" : "warning"}>{item.severity}</Badge>
                    <Badge tone={item.is_read ? "default" : "warning"}>{item.is_read ? "Read" : "Unread"}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{item.message}</p>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(item.triggered_at).toLocaleString()} | {item.teacher_username}
                  </p>
                  {!item.is_read ? (
                    <Button size="sm" variant="outline" onClick={() => markOneNotificationRead(item.id)}>
                      Mark read
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No notifications right now.</p>
        )}
      </Drawer>

      <Drawer
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
        title="Server Logs"
        description="Live backend logs from the admin server log buffer."
        widthClassName="max-w-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Polling every 5 seconds while this drawer is open.
          </p>
          <Button size="sm" variant="outline" onClick={() => loadServerLogs(false)} disabled={logsLoading}>
            Refresh
          </Button>
        </div>
        <div className="rounded-lg border border-border bg-black p-3 font-mono text-xs text-zinc-200">
          {logsLoading && !logsLoadedOnce ? (
            <p className="text-zinc-400">Connecting to log stream...</p>
          ) : logsError && !visibleLogs.length ? (
            <p className="text-red-300">Connection error: {logsError}</p>
          ) : visibleLogs.length ? (
            <ul className="space-y-1">
              {visibleLogs.map((log, index) => (
                <li key={`${log.timestamp}-${log.source}-${index}`} className="break-words">
                  <span className="text-zinc-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{" "}
                  <span
                    className={
                      log.level === "ERROR"
                        ? "text-red-400"
                        : log.level === "WARN"
                          ? "text-amber-300"
                          : "text-emerald-300"
                    }
                  >
                    {log.level}
                  </span>{" "}
                  <span className="text-sky-300">{log.source}</span>{" "}
                  <span className="text-zinc-400">request={log.request_id}</span> {log.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-zinc-400">Connected. No server logs have been emitted yet.</p>
          )}
        </div>
      </Drawer>
    </AuthGuard>
  );
}
