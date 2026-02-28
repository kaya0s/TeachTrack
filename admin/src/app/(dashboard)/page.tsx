"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Bell, CircleAlert, Radio, RefreshCw, ShieldAlert, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { SessionTrendChart } from "@/components/session-trend-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getDashboard, getSessionDetail } from "@/features/admin/api";
import type { AdminSession, AdminSessionDetail, DashboardResponse } from "@/features/admin/types";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liveModalOpen, setLiveModalOpen] = useState(false);
  const [liveSession, setLiveSession] = useState<AdminSession | null>(null);
  const [liveDetail, setLiveDetail] = useState<AdminSessionDetail | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const [syncingLive, setSyncingLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [lastLiveRefreshAt, setLastLiveRefreshAt] = useState<Date | null>(null);

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

  const fetchLiveDetail = useCallback(async (sessionId: number, silent = false) => {
    if (silent) {
      setSyncingLive(true);
    } else {
      setLoadingLive(true);
      setLiveError(null);
    }
    try {
      const detail = await getSessionDetail(sessionId, "?minutes=180&logs_limit=250");
      setLiveDetail(detail);
      setLastLiveRefreshAt(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load live detail.";
      setLiveError(message);
    } finally {
      setLoadingLive(false);
      setSyncingLive(false);
    }
  }, []);

  async function openLiveModal(session: AdminSession) {
    setLiveSession(session);
    setLiveDetail(null);
    setLiveModalOpen(true);
    await fetchLiveDetail(session.id, false);
  }

  useEffect(() => {
    if (!liveModalOpen || !liveSession) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchLiveDetail(liveSession.id, true);
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [liveModalOpen, liveSession, fetchLiveDetail]);

  const liveRollupData = useMemo(() => {
    if (!liveDetail) return [];
    return liveDetail.metrics_rollup.map((m) => ({
      time: new Date(m.window_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      engagement_score: m.engagement_score,
      on_task_avg: m.on_task_avg,
      sleeping_avg: m.sleeping_avg,
      phone_avg: m.phone_avg,
    }));
  }, [liveDetail]);

  const liveLogsData = useMemo(() => {
    if (!liveDetail) return [];
    return liveDetail.logs.map((log) => ({
      time: new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      on_task: log.on_task,
      sleeping: log.sleeping,
      using_phone: log.using_phone,
      disengaged_posture: log.disengaged_posture,
    }));
  }, [liveDetail]);

  const latestBehavior = useMemo(() => {
    if (!liveDetail?.logs.length) return null;
    return liveDetail.logs[liveDetail.logs.length - 1];
  }, [liveDetail]);

  const recentBehaviorRows = useMemo(() => {
    if (!liveDetail?.logs.length) return [];
    return [...liveDetail.logs].slice(-12).reverse();
  }, [liveDetail]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Global classroom operations and health snapshot." />
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
        <PageHeader title="Dashboard" description="Global classroom operations and health snapshot." />
        <Button variant="outline" onClick={() => loadDashboard(true)} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

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

      {data.active_sessions.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-success" />
              Active Sessions Live
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {data.active_sessions.length} live session{data.active_sessions.length > 1 ? "s" : ""} running now.
            </p>
          </CardHeader>
        </Card>
      ) : null}

      {data.active_sessions.length ? (
        <Card>
          <CardHeader><CardTitle>Active sessions now</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR><TH>ID</TH><TH>Teacher</TH><TH>Subject</TH><TH>Section</TH><TH>Students</TH><TH>Engagement</TH><TH>Status</TH><TH>Live</TH></TR>
              </THead>
              <TBody>
                {data.active_sessions.map((s) => (
                  <TR key={`active-${s.id}`}>
                    <TD>{s.id}</TD>
                    <TD>{s.teacher_username}</TD>
                    <TD>{s.subject_name}</TD>
                    <TD>{s.section_name}</TD>
                    <TD>{s.students_present}</TD>
                    <TD>{s.average_engagement}%</TD>
                    <TD><Badge tone="success">Active</Badge></TD>
                    <TD>
                      <Button size="sm" variant="outline" onClick={() => openLiveModal(s)}>Live</Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-between gap-3 pt-4 text-sm text-muted-foreground">
            <span>No active sessions now.</span>
            <Button size="sm" variant="outline" onClick={() => loadDashboard(true)} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}

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
                    <TR key={s.id}>
                      <TD>{s.id}</TD>
                      <TD>{s.teacher_username}</TD>
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
              <Table>
                <THead>
                  <TR><TH>ID</TH><TH>Teacher</TH><TH>Type</TH><TH>Severity</TH><TH>Status</TH></TR>
                </THead>
                <TBody>
                  {data.recent_alerts.map((a) => (
                    <TR key={a.id}>
                      <TD>{a.id}</TD>
                      <TD>{a.teacher_username}</TD>
                      <TD>{a.alert_type}</TD>
                      <TD><Badge tone={a.severity === "CRITICAL" ? "danger" : "warning"}>{a.severity}</Badge></TD>
                      <TD><Badge tone={a.is_read ? "default" : "warning"}>{a.is_read ? "Read" : "Unread"}</Badge></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No recent alerts.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <Modal
        open={liveModalOpen}
        onClose={() => setLiveModalOpen(false)}
        title={liveSession ? `Live Session #${liveSession.id}` : "Live Session"}
        description={liveSession ? `${liveSession.subject_name} - ${liveSession.section_name}` : ""}
        className="max-h-[90vh] max-w-6xl overflow-y-auto"
      >
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${syncingLive ? "bg-warning animate-pulse" : "bg-success"}`} />
            {syncingLive ? "Syncing live data..." : "Live sync active (3s)"}
          </span>
          <span>
            {lastLiveRefreshAt ? `Last refresh: ${lastLiveRefreshAt.toLocaleTimeString()}` : "Waiting for first refresh..."}
          </span>
        </div>
        {loadingLive ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : liveDetail ? (
          <div className="space-y-4">
            {liveError ? (
              <p className="rounded-md border border-danger/40 bg-danger/10 p-2 text-xs text-danger">{liveError}</p>
            ) : null}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border/70 bg-card/70 p-3">
                <p className="text-xs text-muted-foreground">Teacher</p>
                <p className="font-medium">{liveDetail.session.teacher_username}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-card/70 p-3">
                <p className="text-xs text-muted-foreground">Students Present</p>
                <p className="font-medium">{liveDetail.session.students_present}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-card/70 p-3">
                <p className="text-xs text-muted-foreground">Average Engagement</p>
                <p className="font-medium">{liveDetail.session.average_engagement}%</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-card/70 p-3">
                <p className="text-xs text-muted-foreground">Start Time</p>
                <p className="font-medium">{new Date(liveDetail.session.start_time).toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-card/70 p-3">
                <p className="text-xs text-muted-foreground">Behavior Logs</p>
                <p className="font-medium">{liveDetail.total_logs}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-card/70 p-3">
                <p className="text-xs text-muted-foreground">Alerts (Unread)</p>
                <p className="font-medium">{liveDetail.total_alerts} ({liveDetail.unread_alerts})</p>
              </div>
            </div>

            {latestBehavior ? (
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/70 bg-card/70 p-3 md:grid-cols-4 xl:grid-cols-7">
                <div><p className="text-[11px] text-muted-foreground">On task</p><p className="text-lg font-semibold">{latestBehavior.on_task}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Sleeping</p><p className="text-lg font-semibold">{latestBehavior.sleeping}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Writing</p><p className="text-lg font-semibold">{latestBehavior.writing}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Phone</p><p className="text-lg font-semibold">{latestBehavior.using_phone}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Disengaged</p><p className="text-lg font-semibold">{latestBehavior.disengaged_posture}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Not visible</p><p className="text-lg font-semibold">{latestBehavior.not_visible}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Detected</p><p className="text-lg font-semibold">{latestBehavior.total_detected}</p></div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No behavior points yet for this live session.</p>
            )}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SessionTrendChart
                title="Engagement Rollup"
                data={liveRollupData}
                xLabel={(row) => String(row.time)}
                yMax={100}
                lines={[
                  { key: "engagement_score", label: "Engagement %", colorClass: "bg-primary", stroke: "hsl(var(--primary))" },
                  { key: "on_task_avg", label: "On task avg", colorClass: "bg-success", stroke: "hsl(var(--success))" },
                  { key: "sleeping_avg", label: "Sleeping avg", colorClass: "bg-danger", stroke: "hsl(var(--danger))" },
                  { key: "phone_avg", label: "Phone avg", colorClass: "bg-warning", stroke: "hsl(var(--warning))" },
                ]}
              />

              <SessionTrendChart
                title="Behavior Timeline"
                data={liveLogsData}
                xLabel={(row) => String(row.time)}
                yMax={liveDetail.session.students_present}
                lines={[
                  { key: "on_task", label: "On task", colorClass: "bg-success", stroke: "hsl(var(--success))" },
                  { key: "sleeping", label: "Sleeping", colorClass: "bg-danger", stroke: "hsl(var(--danger))" },
                  { key: "using_phone", label: "Phone", colorClass: "bg-warning", stroke: "hsl(var(--warning))" },
                  { key: "disengaged_posture", label: "Disengaged", colorClass: "bg-primary", stroke: "hsl(var(--primary))" },
                ]}
              />
            </div>

            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h4 className="text-sm font-semibold">Behavior Logs Stream (Latest 12)</h4>
              </div>
              <div className="max-h-64 overflow-y-auto p-3">
                {recentBehaviorRows.length ? (
                  <Table>
                    <THead>
                      <TR><TH>Time</TH><TH>On Task</TH><TH>Sleep</TH><TH>Write</TH><TH>Phone</TH><TH>Disengaged</TH><TH>Not Visible</TH><TH>Total</TH></TR>
                    </THead>
                    <TBody>
                      {recentBehaviorRows.map((log, idx) => (
                        <TR key={`${log.timestamp}-${idx}`}>
                          <TD>{new Date(log.timestamp).toLocaleTimeString()}</TD>
                          <TD>{log.on_task}</TD>
                          <TD>{log.sleeping}</TD>
                          <TD>{log.writing}</TD>
                          <TD>{log.using_phone}</TD>
                          <TD>{log.disengaged_posture}</TD>
                          <TD>{log.not_visible}</TD>
                          <TD>{log.total_detected}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No behavior logs yet.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No session detail available.</p>
        )}
      </Modal>
    </div>
  );
}
