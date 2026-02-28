"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { getAlerts, markAlertRead } from "@/features/admin/api";
import type { AdminAlert } from "@/features/admin/types";

export default function AlertsPage() {
  const { notify } = useToast();
  const [items, setItems] = useState<AdminAlert[]>([]);
  const [severity, setSeverity] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeAlert, setActiveAlert] = useState<AdminAlert | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  async function load() {
    setLoading(true);
    const params = severity ? `?severity=${encodeURIComponent(severity)}` : "";
    try {
      const res = await getAlerts(params);
      setItems(res.items);
    } catch (err) {
      notify({
        tone: "danger",
        title: "Alerts load failed",
        description: err instanceof Error ? err.message : "Could not load alerts.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [severity]);

  function openAlertDetails(alert: AdminAlert) {
    setActiveAlert(alert);
    setDetailsOpen(true);
  }

  async function onMarkRead(alert: AdminAlert) {
    try {
      await markAlertRead(alert.id);
      notify({ tone: "success", title: `Alert #${alert.id} marked as read` });
      await load();
      setActiveAlert((prev) => (prev ? { ...prev, is_read: true } : prev));
    } catch (err) {
      notify({
        tone: "danger",
        title: "Failed to mark alert",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={<><Bell className="h-5 w-5" />Alerts</>} description="Review and resolve classroom behavior alerts." />
      <div className="flex gap-2">
        <Button size="sm" variant={severity === "" ? "default" : "outline"} onClick={() => setSeverity("")}>All</Button>
        <Button size="sm" variant={severity === "WARNING" ? "default" : "outline"} onClick={() => setSeverity("WARNING")}>Warning</Button>
        <Button size="sm" variant={severity === "CRITICAL" ? "default" : "outline"} onClick={() => setSeverity("CRITICAL")}>Critical</Button>
      </div>
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
            </div>
          ) : items.length ? (
            <div className="space-y-1">
              {items.map((a) => (
                <div
                  key={a.id}
                  className={`group relative flex items-center gap-4 rounded-xl border border-transparent p-4 transition-all duration-200 hover:border-border/60 hover:bg-muted/30 cursor-pointer ${!a.is_read ? "bg-muted/10 font-medium" : ""
                    }`}
                  onClick={() => openAlertDetails(a)}
                  role="button"
                  tabIndex={0}
                >
                  {!a.is_read && (
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning shadow-[0_0_8px_hsl(var(--warning))]" />
                    </div>
                  )}

                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted ring-2 ring-transparent transition-all group-hover:ring-primary/20">
                    {a.teacher_profile_picture_url ? (
                      <img src={a.teacher_profile_picture_url} alt={a.teacher_username} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold uppercase text-muted-foreground">
                        {a.teacher_username.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm tracking-tight">{a.teacher_username}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-bold ${a.severity === "CRITICAL"
                          ? "border-danger/20 bg-danger/5 text-danger"
                          : "border-warning/20 bg-warning/5 text-warning"
                        }`}>
                        {a.alert_type}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground truncate leading-relaxed">
                      {a.message}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 text-right ml-4">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-tight whitespace-nowrap">
                        {new Date(a.triggered_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs font-semibold whitespace-nowrap">
                        {new Date(a.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <Badge tone={a.is_read ? "default" : "warning"} className="h-5 text-[10px] uppercase font-bold px-2">
                      {a.is_read ? "Read" : "Unread"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No alerts found.</p>
          )}
        </CardContent>
      </Card>

      <Modal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={activeAlert ? `Alert #${activeAlert.id}` : "Alert details"}
        description={activeAlert ? `${activeAlert.alert_type} • ${activeAlert.teacher_username}` : ""}
      >
        {activeAlert ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-md border border-border/70 bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">Severity</p>
                <p className="font-medium">{activeAlert.severity}</p>
              </div>
              <div className="rounded-md border border-border/70 bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium">{activeAlert.is_read ? "Read" : "Unread"}</p>
              </div>
              <div className="rounded-md border border-border/70 bg-background/60 p-3 sm:col-span-2">
                <p className="text-xs text-muted-foreground">Message</p>
                <p className="font-medium">{activeAlert.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={activeAlert.is_read}
                onClick={() => onMarkRead(activeAlert)}
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark read
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
