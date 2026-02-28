"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { SessionTrendChart } from "@/components/session-trend-chart";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { getSessionDetail, getSessions } from "@/features/admin/api";
import type { AdminSession, AdminSessionDetail } from "@/features/admin/types";

export default function SessionsPage() {
  const { notify } = useToast();
  const [items, setItems] = useState<AdminSession[]>([]);
  const [activeItems, setActiveItems] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminSessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, activeRes] = await Promise.all([getSessions(), getSessions("?is_active=true&limit=50")]);
      setItems(allRes.items);
      setActiveItems(activeRes.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = useCallback(async (sessionId: number) => {
    setSelectedSessionId(sessionId);
    setIsDetailOpen(true);
    setLoadingDetail(true);
    try {
      const res = await getSessionDetail(sessionId, "?minutes=180&logs_limit=200");
      setDetail(res);
    } catch (error) {
      notify({
        tone: "danger",
        title: "Failed to load details",
        description: error instanceof Error ? error.message : "Please retry.",
      });
    } finally {
      setLoadingDetail(false);
    }
  }, [notify]);

  function closeDetail() {
    setIsDetailOpen(false);
  }

  function fmt(dt: string | null): string {
    if (!dt) return "-";
    return new Date(dt).toLocaleString();
  }

  const chartRollupData = useMemo(() => {
    if (!detail) return [];
    return detail.metrics_rollup.map((m) => ({
      time: new Date(m.window_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      engagement_score: m.engagement_score,
      on_task_avg: m.on_task_avg,
      sleeping_avg: m.sleeping_avg,
      phone_avg: m.phone_avg,
    }));
  }, [detail]);

  const chartLogData = useMemo(() => {
    if (!detail) return [];
    return detail.logs.map((log) => ({
      time: new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      on_task: log.on_task,
      sleeping: log.sleeping,
      using_phone: log.using_phone,
      disengaged_posture: log.disengaged_posture,
    }));
  }, [detail]);

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Sessions" description="Monitor live sessions and view intelligence details." />

        {!loading && activeItems.length ? (
          <Card>
            <CardHeader><CardTitle>Active sessions</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <THead><TR><TH>ID</TH><TH>Teacher</TH><TH>Subject</TH><TH>Section</TH><TH>Students</TH><TH>Engagement</TH><TH>Action</TH></TR></THead>
                <TBody>
                  {activeItems.map((s) => (
                    <TR key={`active-${s.id}`}>
                      <TD>{s.id}</TD>
                      <TD>{s.teacher_username}</TD>
                      <TD>{s.subject_name}</TD>
                      <TD>{s.section_name}</TD>
                      <TD>{s.students_present}</TD>
                      <TD>{s.average_engagement}%</TD>
                      <TD>
                        <Button size="sm" variant="outline" onClick={() => openDetail(s.id)}>Details</Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="pt-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
              </div>
            ) : items.length ? (
              <Table>
                <THead><TR><TH>ID</TH><TH>Teacher</TH><TH>Subject</TH><TH>Section</TH><TH>Students</TH><TH>Start</TH><TH>End</TH><TH>Engagement</TH><TH>Status</TH><TH>Action</TH></TR></THead>
                <TBody>
                  {items.map((s) => (
                    <TR key={s.id}>
                      <TD>{s.id}</TD>
                      <TD>{s.teacher_username}</TD>
                      <TD>{s.subject_name}</TD>
                      <TD>{s.section_name}</TD>
                      <TD>{s.students_present}</TD>
                      <TD>{fmt(s.start_time)}</TD>
                      <TD>{fmt(s.end_time)}</TD>
                      <TD>{s.average_engagement}%</TD>
                      <TD><Badge tone={s.is_active ? "success" : "default"}>{s.is_active ? "Active" : "Ended"}</Badge></TD>
                      <TD>
                        <Button size="sm" variant="outline" onClick={() => openDetail(s.id)}>Details</Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No sessions found.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Drawer
        open={isDetailOpen}
        onClose={closeDetail}
        title={`Details: #${selectedSessionId ?? "-"}`}
        description="Session intelligence and behavior analytics."
        widthClassName="max-w-5xl"
      >
        {loadingDetail ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-border/70 bg-card/70 p-3"><p className="text-xs text-muted-foreground">Teacher</p><p className="font-medium">{detail.session.teacher_username}</p></div>
              <div className="rounded-lg border border-border/70 bg-card/70 p-3"><p className="text-xs text-muted-foreground">Students present</p><p className="font-medium">{detail.session.students_present}</p></div>
              <div className="rounded-lg border border-border/70 bg-card/70 p-3"><p className="text-xs text-muted-foreground">Behavior logs</p><p className="font-medium">{detail.total_logs}</p></div>
              <div className="rounded-lg border border-border/70 bg-card/70 p-3"><p className="text-xs text-muted-foreground">Alerts (unread)</p><p className="font-medium">{detail.total_alerts} ({detail.unread_alerts})</p></div>
            </div>

            <SessionTrendChart
              title="Engagement rollup (hover points)"
              data={chartRollupData}
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
              title="Behavior logs timeline (hover points)"
              data={chartLogData}
              xLabel={(row) => String(row.time)}
              yMax={detail.session.students_present}
              lines={[
                { key: "on_task", label: "On task", colorClass: "bg-success", stroke: "hsl(var(--success))" },
                { key: "sleeping", label: "Sleeping", colorClass: "bg-danger", stroke: "hsl(var(--danger))" },
                { key: "using_phone", label: "Phone", colorClass: "bg-warning", stroke: "hsl(var(--warning))" },
                { key: "disengaged_posture", label: "Disengaged", colorClass: "bg-primary", stroke: "hsl(var(--primary))" },
              ]}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No detail available.</p>
        )}
      </Drawer>
    </>
  );
}
