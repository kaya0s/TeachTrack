"use client";

import { useEffect, useMemo, useState } from "react";
import { ScrollText } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { getAuditLogs } from "@/features/admin/api";
import type { AdminAuditLogEntry } from "@/features/admin/types";
import { getCurrentActorUserId } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

function safeJsonPreview(value: unknown): string {
  if (!value) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

export default function AuditLogsPage() {
  const { notify } = useToast();
  const [items, setItems] = useState<AdminAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [actorUserId, setActorUserId] = useState("");
  const [entityId, setEntityId] = useState("");

  const currentActorUserId = useMemo(() => getCurrentActorUserId(), []);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (action.trim()) params.set("action", action.trim());
    if (entityType.trim()) params.set("entity_type", entityType.trim());
    if (actorUserId.trim()) params.set("actor_user_id", actorUserId.trim());
    if (entityId.trim()) params.set("entity_id", entityId.trim());
    const s = params.toString();
    return s ? `?${s}` : "";
  }, [action, entityType, actorUserId, entityId]);

  async function load() {
    setLoading(true);
    try {
      const res = await getAuditLogs(query);
      setItems(res.items);
    } catch (err) {
      notify({
        tone: "danger",
        title: "Audit logs load failed",
        description: getErrorMessage(err, "Could not load audit logs."),
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [query]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={
          <>
            <ScrollText className="h-5 w-5" />Audit Logs
          </>
        }
        description="Track who did what across admin operations."
      />

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Action (e.g. USER_UPDATE)" />
            <Input value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="Entity type (e.g. User)" />
            <Input value={actorUserId} onChange={(e) => setActorUserId(e.target.value)} placeholder="Actor user id" inputMode="numeric" />
            <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="Entity id" />
          </div>
          <div className="flex items-center justify-end">
            <Button size="sm" variant="outline" onClick={load}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : items.length ? (
            <div className="rounded-xl border border-border/70 overflow-hidden">
              <Table>
                <THead>
                  <TR>
                    <TH>ID</TH>
                    <TH>Time</TH>
                    <TH>Actor</TH>
                    <TH>Action</TH>
                    <TH>Entity</TH>
                    <TH>Details</TH>
                  </TR>
                </THead>
                <TBody>
                  {items.map((row) => (
                    <TR key={row.id} className="hover:bg-muted/30">
                      <TD className="font-mono text-xs">{row.id}</TD>
                      <TD className="text-xs whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</TD>
                      <TD className="text-xs">
                        <span className="font-medium">
                          {currentActorUserId !== null && row.actor_user_id === currentActorUserId
                            ? "You"
                            : (row.actor_username ?? "-")}
                        </span>
                      </TD>
                      <TD>
                        <Badge>{row.action}</Badge>
                      </TD>
                      <TD className="text-xs">
                        <span className="font-medium">{row.entity_type}</span>
                        {row.entity_id ? <span className="text-muted-foreground"> #{row.entity_id}</span> : null}
                      </TD>
                      <TD className="text-xs text-muted-foreground max-w-[520px] truncate">
                        {safeJsonPreview(row.details)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No audit logs found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
