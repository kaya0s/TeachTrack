"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Database,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Clock,
  User,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Hash,
  Calendar,
  FileIcon,
  HardDrive
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { getBackups, runBackup } from "@/features/admin/api";
import { AdminBackupRun } from "@/features/admin/types";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

export default function BackupPage() {
  const [backups, setBackups] = useState<AdminBackupRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<AdminBackupRun | null>(null);

  const fetchBackups = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getBackups();
      setBackups(data);

      // Check if any run is still "running"
      const isAnyRunning = data.some((b: AdminBackupRun) => b.status === "running");
      setRunning(isAnyRunning);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load backup history."));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  // Polling while running
  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      fetchBackups(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [running, fetchBackups]);

  const handleRunBackup = async () => {
    setRunning(true);
    setError(null);
    try {
      await runBackup();
      await fetchBackups(true);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to start backup process."));
      setRunning(false);
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return {
        date: date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
        time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      };
    } catch (e) {
      return { date: dateStr, time: '' };
    }
  };

  const lastBackup = backups[0];
  const totalRuns = backups.length;
  const successfulRuns = backups.filter((b: AdminBackupRun) => b.status === "success").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title={
            <>
              <Database className="h-5 w-5" /> Backup History
            </>
          }
          description="Manage and monitor system database backups stored on Google Drive."
        />
        <Button
          onClick={handleRunBackup}
          disabled={running}
          className="shadow-lg transition-all active:scale-95"
        >
          {running ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Backup...
            </>
          ) : (
            <>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Run Manual Backup
            </>
          )}
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
          <CardContent className="flex items-center gap-3 p-4 text-red-800 dark:text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div className="text-sm font-medium">{error}</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto hover:bg-red-100 dark:hover:bg-red-900/20"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Backups</p>
              <p className="text-2xl font-black">{totalRuns}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Successful</p>
              <p className="text-2xl font-black">{successfulRuns}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-2xl",
              lastBackup?.status === "success" ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" :
                lastBackup?.status === "failed" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                  "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
            )}>
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Last Run Status</p>
              <p className="text-lg font-black capitalize">
                {lastBackup ? lastBackup.status : "No runs yet"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border overflow-hidden">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Recent Backup Runs</CardTitle>
              <CardDescription className="text-xs">History of manual database dump and cloud uploads.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchBackups()} disabled={loading}>
              <RefreshCw className={cn("h-3.5 w-3.5 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead className="bg-muted/10">
              <TR>
                <TH className="py-4 font-bold text-xs">Created At</TH>
                <TH className="py-4 font-bold text-xs">Filename</TH>
                <TH className="py-4 font-bold text-xs">Size</TH>
                <TH className="py-4 font-bold text-xs">Actor</TH>
                <TH className="py-4 font-bold text-xs text-right">Link</TH>
                <TH className="py-4 font-bold text-xs text-right pr-6">Status</TH>
              </TR>
            </THead>
            <TBody>
              {loading && backups.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-xs font-semibold text-muted-foreground">Retrieving history...</span>
                    </div>
                  </TD>
                </TR>
              ) : backups.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Database className="h-10 w-10 mb-2 opacity-10" />
                      <p className="text-sm italic">No backup records found.</p>
                    </div>
                  </TD>
                </TR>
              ) : backups.map((run) => {
                const { date, time } = formatDate(run.created_at);
                return (
                  <TR
                    key={run.id}
                    className="group hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedBackup(run)}
                  >
                    <TD>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{date}</span>
                        <span className="text-[10px] text-muted-foreground">{time}</span>
                      </div>
                    </TD>
                    <TD className="text-[11px] font-mono text-muted-foreground">
                      {run.filename || "—"}
                    </TD>
                    <TD className="text-xs font-bold tabular-nums">
                      {formatSize(run.file_size_bytes)}
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {run.created_by ? `User #${run.created_by}` : "System"}
                        </span>
                      </div>
                    </TD>
                    <TD className="text-right">
                      {run.drive_link ? (
                        <div className="flex items-center justify-end gap-2">
                          <img src="https://logo.svgcdn.com/logos/google-drive.png" alt="Drive" className="h-4 w-4 opacity-80 group-hover:opacity-100 transition-opacity" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                            title="Open in Google Drive"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(run.drive_link!, "_blank");
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : run.status === "failed" ? (
                        <span className="text-[10px] font-bold text-muted-foreground/30 px-2 uppercase">Failed</span>
                      ) : (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto text-muted-foreground/30" />
                      )}
                    </TD>
                    <TD className="text-right pr-6">
                      <Badge
                        className={cn(
                          "capitalize rounded-full px-2.5 py-0.5 text-[9px] font-black tracking-tight",
                          run.status === "success" ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" :
                            run.status === "failed" ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" :
                              "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 animate-pulse"
                        )}
                        tone="default"
                      >
                        {run.status === "running" ? "Backing up..." : run.status}
                      </Badge>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-muted/10 border-dashed border-2">
        <CardContent className="p-4 flex items-start gap-4">
          <div className="mt-1 p-2 rounded-xl bg-background border shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold leading-none">Security Note</h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed max-w-2xl">
              All backups are encrypted in transit and stored in a private GCP-managed Drive folder.
              The backup process uses <code className="bg-muted px-1 rounded-sm text-[9px] font-bold uppercase">mysqldump</code> with safe credential handoff
              and GZIP compression for maximum efficiency. Only verified Superusers can trigger or view these records.
            </p>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={!!selectedBackup}
        onClose={() => setSelectedBackup(null)}
        title="Backup Details"
        description="Detailed information about this specific backup run."
        className="max-w-md"
      >
        {selectedBackup && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Badge
                className={cn(
                  "capitalize rounded-full px-3 py-1 text-[10px] font-black tracking-tight",
                  selectedBackup.status === "success" ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" :
                    selectedBackup.status === "failed" ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" :
                      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 animate-pulse"
                )}
              >
                {selectedBackup.status === "running" ? "Backing up..." : selectedBackup.status}
              </Badge>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase opacity-50">
                <Hash className="h-3 w-3" />
                Run #{selectedBackup.id}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Created
                </p>
                <div className="text-xs font-semibold leading-none">
                  <p>{formatDate(selectedBackup.created_at).date}</p>
                  <p className="text-[10px] text-muted-foreground font-normal mt-0.5">{formatDate(selectedBackup.created_at).time}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3" /> Completed
                </p>
                {selectedBackup.completed_at ? (
                  <div className="text-xs font-semibold leading-none">
                    <p>{formatDate(selectedBackup.completed_at).date}</p>
                    <p className="text-[10px] text-muted-foreground font-normal mt-0.5">{formatDate(selectedBackup.completed_at).time}</p>
                  </div>
                ) : (
                  <p className="text-xs font-medium text-muted-foreground">In progress...</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <FileIcon className="h-3 w-3" /> File Information
              </p>
              <div className="p-3 rounded-lg border bg-muted/30 break-all space-y-2">
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground/60 uppercase">Filename</p>
                  <p className="text-xs font-mono">{selectedBackup.filename || "—"}</p>
                </div>
                <div className="flex items-center justify-between border-t border-border/50 pt-2">
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground/60 uppercase">Size</p>
                    <p className="text-xs font-bold">{formatSize(selectedBackup.file_size_bytes)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground/60 uppercase text-right">Triggered By</p>
                    <p className="text-xs font-bold text-right">{selectedBackup.created_by ? `User #${selectedBackup.created_by}` : "System"}</p>
                  </div>
                </div>
              </div>
            </div>

            {selectedBackup.error_message && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3" /> Execution Error
                </p>
                <div className="p-3.5 rounded-xl bg-red-50/50 dark:bg-red-900/10 border border-red-200/50 dark:border-red-800/20 shadow-inner">
                  <p className="text-[11px] text-red-800 dark:text-red-400 font-medium leading-relaxed whitespace-pre-wrap break-words italic selection:bg-red-200">
                    {selectedBackup.error_message}
                  </p>
                </div>
              </div>
            )}

            {selectedBackup.drive_link && (
              <Button
                className="w-full shadow-md"
                onClick={() => window.open(selectedBackup.drive_link!, "_blank")}
              >
                <img src="https://logo.svgcdn.com/logos/google-drive.png" alt="Drive" className="h-4 w-4 mr-2" />
                View in Google Drive
              </Button>
            )}

            <Button variant="outline" className="w-full" onClick={() => setSelectedBackup(null)}>
              Close Details
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
