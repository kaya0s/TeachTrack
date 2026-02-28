"use client";

import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  return (
    <div className="space-y-4">
      <PageHeader title="Alerts" description="Review and resolve classroom behavior alerts." />
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
            <Table>
              <THead><TR><TH>ID</TH><TH>Teacher</TH><TH>Type</TH><TH>Message</TH><TH>Severity</TH><TH>Status</TH><TH>Action</TH></TR></THead>
              <TBody>
                {items.map((a) => (
                  <TR key={a.id}>
                    <TD>{a.id}</TD>
                    <TD>{a.teacher_username}</TD>
                    <TD>{a.alert_type}</TD>
                    <TD className="max-w-[420px] truncate">{a.message}</TD>
                    <TD><Badge tone={a.severity === "CRITICAL" ? "danger" : "warning"}>{a.severity}</Badge></TD>
                    <TD><Badge tone={a.is_read ? "default" : "warning"}>{a.is_read ? "Read" : "Unread"}</Badge></TD>
                    <TD>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={a.is_read}
                        onClick={async () => {
                          try {
                            await markAlertRead(a.id);
                            notify({ tone: "success", title: `Alert #${a.id} marked as read` });
                            await load();
                          } catch (err) {
                            notify({
                              tone: "danger",
                              title: "Failed to mark alert",
                              description: err instanceof Error ? err.message : "Please try again.",
                            });
                          }
                        }}
                      >
                        Mark read
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No alerts found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
