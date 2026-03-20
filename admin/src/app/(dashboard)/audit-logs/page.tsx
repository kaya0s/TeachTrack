"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, ChevronDown, Download, Filter, RefreshCw, ScrollText, Search, SortAsc, SortDesc } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
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

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function toCsvValue(value: unknown) {
  if (value === null || value === undefined) return "";
  const raw = typeof value === "string" ? value : JSON.stringify(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export default function AuditLogsPage() {
  const { notify } = useToast();
  const [items, setItems] = useState<AdminAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [actorUserId, setActorUserId] = useState("");
  const [entityId, setEntityId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortKey, setSortKey] = useState<"created_at" | "actor" | "action" | "entity">("created_at");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [selectedLog, setSelectedLog] = useState<AdminAuditLogEntry | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const currentActorUserId = useMemo(() => getCurrentActorUserId(), []);

  const query = "";

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

  const filteredItems = useMemo(() => {
    const a = action.trim().toLowerCase();
    const e = entityType.trim().toLowerCase();
    const actor = actorUserId.trim();
    const entId = entityId.trim();
    const from = fromDate ? new Date(fromDate).getTime() : null;
    const to = toDate ? new Date(toDate).getTime() : null;

    return items.filter((row) => {
      if (a && !row.action.toLowerCase().includes(a)) return false;
      if (e && !row.entity_type.toLowerCase().includes(e)) return false;
      if (actor && `${row.actor_user_id ?? ""}` !== actor) return false;
      if (entId && `${row.entity_id ?? ""}` !== entId) return false;
      if (from !== null) {
        const t = new Date(row.created_at).getTime();
        if (!Number.isNaN(t) && t < from) return false;
      }
      if (to !== null) {
        const t = new Date(row.created_at).getTime();
        if (!Number.isNaN(t) && t > to) return false;
      }
      return true;
    });
  }, [items, action, entityType, actorUserId, entityId, fromDate, toDate]);

  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    list.sort((a, b) => {
      let av = "";
      let bv = "";
      switch (sortKey) {
        case "actor":
          av = a.actor_username ?? "";
          bv = b.actor_username ?? "";
          break;
        case "action":
          av = a.action;
          bv = b.action;
          break;
        case "entity":
          av = `${a.entity_type} ${a.entity_id ?? ""}`;
          bv = `${b.entity_type} ${b.entity_id ?? ""}`;
          break;
        case "created_at":
        default:
          return sortDir === "asc"
            ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [filteredItems, sortKey, sortDir]);

  function handleExportCsv() {
    const headers = [
      "id",
      "created_at",
      "actor_user_id",
      "actor_username",
      "action",
      "entity_type",
      "entity_id",
      "ip_address",
      "user_agent",
      "details",
    ];
    const rows = sortedItems.map((row) => [
      row.id,
      row.created_at,
      row.actor_user_id ?? "",
      row.actor_username ?? "",
      row.action,
      row.entity_type,
      row.entity_id ?? "",
      row.ip_address ?? "",
      row.user_agent ?? "",
      row.details ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map(toCsvValue).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  function handleExportJson() {
    const blob = new Blob([JSON.stringify(sortedItems, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <PageHeader
          title={
            <>
              <ScrollText className="h-5 w-5" />Audit Logs
            </>
          }
          description="Track who did what across admin operations."
        />
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="default" className="rounded-full px-3 py-1 text-xs">
            Total: {items.length}
          </Badge>
          <Badge tone="success" className="rounded-full px-3 py-1 text-xs">
            Showing: {sortedItems.length}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" className="h-9 gap-2" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" className="h-9 gap-2" onClick={load}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Action (e.g. USER_UPDATE)" className="pl-9" />
            </div>
            <Input value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="Entity type (e.g. User)" />
            <Input value={actorUserId} onChange={(e) => setActorUserId(e.target.value)} placeholder="Actor user id" inputMode="numeric" />
            <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="Entity id" />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <div className="relative">
              <CalendarClock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="datetime-local" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="pl-9" />
            </div>
            <div className="relative">
              <CalendarClock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="datetime-local" value={toDate} onChange={(e) => setToDate(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full">
                <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 pr-8 text-sm"
                >
                  <option value="created_at">Sort by Time</option>
                  <option value="actor">Sort by Actor</option>
                  <option value="action">Sort by Action</option>
                  <option value="entity">Sort by Entity</option>
                </select>
              </div>
              <Button
                variant="outline"
                className="h-10 px-3"
                onClick={() => setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
              >
                {sortDir === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              variant="outline"
              className="h-10"
              onClick={() => {
                setAction("");
                setEntityType("");
                setActorUserId("");
                setEntityId("");
                setFromDate("");
                setToDate("");
              }}
            >
              Clear
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : sortedItems.length ? (
            <div className="rounded-2xl border border-border/70 overflow-hidden">
              <Table>
                <THead>
                  <TR>
                    <TH>ID</TH>
                    <TH>Time</TH>
                    <TH>Actor</TH>
                    <TH>Action</TH>
                    <TH>Entity</TH>
                    <TH>Details</TH>
                    <TH className="text-right">View</TH>
                  </TR>
                </THead>
                <TBody>
                  {sortedItems.map((row) => (
                    <TR
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setSelectedLog(row)}
                    >
                      <TD className="font-mono text-xs">{row.id}</TD>
                      <TD className="text-xs whitespace-nowrap">{formatTimestamp(row.created_at)}</TD>
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
                      <TD className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedLog(row);
                          }}
                        >
                          View
                        </Button>
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

      <Modal
        open={selectedLog !== null}
        onClose={() => setSelectedLog(null)}
        title="Audit Log Details"
        description={selectedLog ? `${selectedLog.action} • ${formatTimestamp(selectedLog.created_at)}` : undefined}
        className="max-w-2xl"
      >
        {selectedLog ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{selectedLog.action}</Badge>
                <Badge tone="default">{selectedLog.entity_type}</Badge>
                {selectedLog.entity_id ? <Badge tone="default">#{selectedLog.entity_id}</Badge> : null}
                {currentActorUserId !== null && selectedLog.actor_user_id === currentActorUserId ? (
                  <Badge tone="success">You</Badge>
                ) : null}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {selectedLog.actor_username ?? "-"} • {selectedLog.actor_user_id ?? "-"}
              </div>
            </div>

            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">IP Address</p>
                <p className="mt-2 font-medium">{selectedLog.ip_address ?? "-"}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">User Agent</p>
                <p className="mt-2 text-xs text-muted-foreground">{selectedLog.user_agent ?? "-"}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-background/60 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Details</p>
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
{selectedLog.details ? JSON.stringify(selectedLog.details, null, 2) : "No additional details."}
              </pre>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export Audit Logs"
        description="Download the filtered and sorted audit logs."
      >
        <div className="flex flex-col gap-3">
          <Button onClick={handleExportCsv} className="h-10">
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportJson} className="h-10">
            Export JSON
          </Button>
        </div>
      </Modal>
    </div>
  );
}
