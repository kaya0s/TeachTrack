"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Bell, CircleAlert, LayoutDashboard, Radio, RefreshCw, ShieldAlert, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Drawer } from "@/components/ui/drawer";
import { SessionDetailView } from "@/features/admin/components/session-detail-view";
import { getDashboard, getSessionDetail } from "@/features/admin/api";
import type { AdminSession, AdminSessionDetail, DashboardResponse } from "@/features/admin/types";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeSessionInView, setActiveSessionInView] = useState<AdminSession | null>(null);
  const [detail, setDetail] = useState<AdminSessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [syncingLive, setSyncingLive] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  const loadDashboard = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    await getDashboard()
      .then(setData)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load dashboard data.";
        setError(message);
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    loadDashboard(false);
  }, [loadDashboard]);

  const fetchSessionDetail = useCallback(async (sessionId: number, silent = false) => {
    if (silent) {
      setSyncingLive(true);
    } else {
      setLoadingDetail(true);
      setDetailError(null);
    }
    try {
      const res = await getSessionDetail(sessionId, "?minutes=180&logs_limit=250");
      setDetail(res);
      setLastRefreshAt(new Date());
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to load details.");
    } finally {
      setLoadingDetail(false);
      setSyncingLive(false);
    }
  }, []);

  async function openSessionDetail(session: AdminSession) {
    setActiveSessionInView(session);
    setDetail(null);
    setIsDetailOpen(true);
    await fetchSessionDetail(session.id, false);
  }

  useEffect(() => {
    if (!isDetailOpen || !activeSessionInView || !activeSessionInView.is_active) {
      return;
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchSessionDetail(activeSessionInView.id, true);
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [isDetailOpen, activeSessionInView, fetchSessionDetail]);


  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title={<><LayoutDashboard className="h-5 w-5" />Dashboard</>} description="Global classroom operations and health snapshot." />
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-9 w-20" /></CardContent>
            </Card>
          ))}
        </section>
        <Card>
          <CardContent className="space-y-3 pt-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = data.stats;

  return (
    <div className="space-y-6 transition-opacity duration-300">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PageHeader title={<><LayoutDashboard className="h-5 w-5" />Dashboard</>} description="Global classroom operations and health snapshot." />
        <Button variant="outline" onClick={() => loadDashboard(true)} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {data.active_sessions.length > 0 && (
        <Card className="border-success/30 bg-success/5 shadow-none overflow-hidden ring-1 ring-success/10 ">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-success/90">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  Live Classroom Activity
                </CardTitle>
                <CardDescription className="text-xs">
                  Real-time oversight of {data.active_sessions.length} running session{data.active_sessions.length > 1 ? "s" : ""}.
                </CardDescription>
              </div>
              <Badge tone="success" className="animate-in fade-in zoom-in duration-500 rounded-full px-3 h-7 text-[10px] font-bold uppercase tracking-wider">
                System Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-success/20 bg-background/40 overflow-hidden">
              <Table>
                <THead className="bg-success/5">
                  <TR className="border-success/10">
                    <TH className="py-3 px-4">Session</TH>
                    <TH className="py-3">Teacher</TH>
                    <TH className="py-3">Subject & Section</TH>
                    <TH className="py-3 text-center">Students</TH>
                    <TH className="py-3">Engagement</TH>
                    <TH className="py-3 text-right pr-6 px-4">Stream</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.active_sessions.map((s) => (
                    <TR
                      key={`active-${s.id}`}
                      className="group cursor-pointer hover:bg-success/[0.03] transition-all border-success/5"
                      onClick={() => openSessionDetail(s)}
                    >
                      <TD className="font-mono text-[10px] font-semibold text-muted-foreground px-4">#{s.id}</TD>
                      <TD>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-success/20 bg-background shadow-sm">
                            {s.teacher_profile_picture_url ? (
                              <img src={s.teacher_profile_picture_url} alt={s.teacher_username} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold uppercase text-success/60">
                                {s.teacher_username.charAt(0)}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-sm text-foreground/90">{s.teacher_username}</span>
                        </div>
                      </TD>
                      <TD>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-foreground">{s.subject_name}</span>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-tight">{s.section_name}</span>
                        </div>
                      </TD>
                      <TD className="font-semibold text-sm font-mono text-center">{s.students_present}</TD>
                      <TD>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 max-w-[100px] h-1.5 bg-muted/40 rounded-full overflow-hidden border border-border/5">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-700 ease-out",
                                s.average_engagement >= 80 ? 'bg-success' : s.average_engagement >= 50 ? 'bg-warning' : 'bg-danger'
                              )}
                              style={{ width: `${s.average_engagement}%` }}
                            />
                          </div>
                          <span className={cn(
                            "text-xs font-bold tabular-nums",
                            s.average_engagement >= 80 ? 'text-success' : s.average_engagement >= 50 ? 'text-warning' : 'text-danger'
                          )}>
                            {s.average_engagement}%
                          </span>
                        </div>
                      </TD>
                      <TD className="text-right pr-4 px-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 rounded-full p-0 border-success/20 text-success hover:bg-success hover:text-white transition-all shadow-sm"
                          onClick={(e) => { e.stopPropagation(); openSessionDetail(s); }}
                        >
                          <Radio className="h-4 w-4" />
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Total users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-3xl font-semibold tracking-tight">{stats.total_users}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Active sessions</CardTitle>
            <Activity className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent className="text-3xl font-semibold tracking-tight">{stats.active_sessions}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Unread alerts</CardTitle>
            <Bell className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent className="text-3xl font-semibold tracking-tight">{stats.unread_alerts}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Critical unread</CardTitle>
            <ShieldAlert className="h-4 w-4 text-danger" />
          </CardHeader>
          <CardContent className="text-3xl font-semibold tracking-tight">{stats.critical_unread_alerts}</CardContent>
        </Card>
      </section>


      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Recent sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent_sessions.length ? (
              <Table>
                <THead>
                  <TR><TH>ID</TH><TH>Teacher</TH><TH>Subject</TH><TH>Engagement</TH><TH>Status</TH></TR>
                </THead>
                <TBody>
                  {data.recent_sessions.map((s) => (
                    <TR
                      key={s.id}
                      className="cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => openSessionDetail(s)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openSessionDetail(s);
                        }
                      }}
                    >
                      <TD>{s.id}</TD>
                      <TD>
                        <div className="flex items-center gap-2">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                            {s.teacher_profile_picture_url ? (
                              <img src={s.teacher_profile_picture_url} alt={s.teacher_username} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[7px] font-bold uppercase text-muted-foreground">
                                {s.teacher_username.charAt(0)}
                              </span>
                            )}
                          </div>
                          <span>{s.teacher_username}</span>
                        </div>
                      </TD>
                      <TD>{s.subject_name}</TD>
                      <TD>{s.average_engagement}%</TD>
                      <TD><Badge tone={s.is_active ? "success" : "default"}>{s.is_active ? "Active" : "Ended"}</Badge></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No recent sessions.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleAlert className="h-4 w-4 text-warning" />
              Recent alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent_alerts.length ? (
              <div className="space-y-1">
                {data.recent_alerts.map((a) => (
                  <div
                    key={a.id}
                    className={`group relative flex items-center gap-4 rounded-xl border border-transparent p-3 transition-all duration-200 hover:border-border/60 hover:bg-muted/30 ${!a.is_read ? "bg-muted/10 font-medium" : ""
                      }`}
                  >
                    {!a.is_read && (
                      <div className="absolute -left-1 top-1/2 -translate-y-1/2">
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning shadow-[0_0_8px_hsl(var(--warning))]" />
                      </div>
                    )}

                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted ring-2 ring-transparent transition-all group-hover:ring-primary/20">
                      {a.teacher_profile_picture_url ? (
                        <img src={a.teacher_profile_picture_url} alt={a.teacher_username} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold uppercase text-muted-foreground">
                          {a.teacher_username.charAt(0)}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm tracking-tight">{a.teacher_username}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border uppercase ${a.severity === "CRITICAL"
                          ? "border-danger/20 bg-danger/5 text-danger"
                          : "border-warning/20 bg-warning/5 text-warning"
                          }`}>
                          {a.alert_type}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground truncate leading-relaxed">
                        {a.message}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 text-right">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(a.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Badge tone={a.is_read ? "default" : "warning"} className="h-4 text-[9px] uppercase px-1.5">
                        {a.is_read ? "Archived" : "New"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No recent alerts recorded.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <Drawer
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={activeSessionInView ? `Intelligence View #${activeSessionInView.id}` : "Session details"}
        description={activeSessionInView ? `${activeSessionInView.subject_name} • ${activeSessionInView.section_name}` : "Behavior analytics and historical data"}
        widthClassName="max-w-5xl"
      >
        {activeSessionInView?.is_active && (
          <div className="mb-4 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/50">
            <span className="inline-flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${syncingLive ? "bg-warning animate-pulse" : "bg-success"}`} />
              {syncingLive ? "Syncing live behavioral data..." : "Live synchronization active (3s)"}
            </span>
            <span>
              {lastRefreshAt ? `Last update: ${lastRefreshAt.toLocaleTimeString()}` : "Initializing stream..."}
            </span>
          </div>
        )}

        {loadingDetail && !detail ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            {detailError && (
              <p className="rounded-md border border-danger/20 bg-danger/5 p-3 text-xs text-danger font-medium">{detailError}</p>
            )}
            <SessionDetailView detail={detail} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Radio className="h-10 w-10 text-muted-foreground/20 animate-pulse mb-4" />
            <p className="text-sm text-muted-foreground font-medium">Connecting to session intelligence stream...</p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
