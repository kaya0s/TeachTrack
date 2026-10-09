"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SessionTrendChart } from "@/components/session-trend-chart";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getSessionDetectorStreamUrl } from "../api";
import {
  AdminSessionDetail,
  DetectorStatus,
  SessionLogPoint,
  SessionModeEvent,
} from "../types";

type BehaviorLogChartRow = {
  time: string;
  on_task: number;
  sleeping: number;
  using_phone: number;
  off_task: number;
  not_visible: number;
};

type BehaviorStreamEntry =
  | { kind: "log"; timestamp: string; log: SessionLogPoint }
  | { kind: "mode"; timestamp: string; event: SessionModeEvent };

type BehaviorPieSlice = {
  label: string;
  value: number;
  color: string;
};

const behaviorColors = {
  onTask: "#2e7d32",
  sleeping: "#d32f2f",
  usingPhone: "#f57c00",
  offTask: "#6a1b9a",
  notVisible: "#9e9e9e",
};

export function SessionDetailView({
  detail,
  detectorStatus,
  showDetectorPreview = false,
}: {
  detail: AdminSessionDetail;
  detectorStatus?: DetectorStatus | null;
  showDetectorPreview?: boolean;
}) {
  const [hoveredLogRow, setHoveredLogRow] =
    useState<BehaviorLogChartRow | null>(null);
  const handleHoverRowChange = useCallback((row: BehaviorLogChartRow | null) => {
    setHoveredLogRow(row);
  }, []);
  const [previewStreamUrl, setPreviewStreamUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const teacherDisplayName =
    detail.session.teacher_fullname?.trim() || detail.session.teacher_username;

  useEffect(() => {
    if (!showDetectorPreview || !detail.session.is_active) {
      setPreviewStreamUrl(null);
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;

    const loadPreviewStream = async () => {
      try {
        setPreviewLoading(true);
        const streamUrl = await getSessionDetectorStreamUrl(detail.session.id);
        if (cancelled) return;
        setPreviewStreamUrl(streamUrl);
      } catch {
        if (!cancelled) setPreviewStreamUrl(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    };

    loadPreviewStream();
    return () => {
      cancelled = true;
    };
  }, [detail.session.id, detail.session.is_active, showDetectorPreview]);

  const exportSingleSessionPDF = () => {
    const { jsPDF } = require("jspdf");
    const autoTable = require("jspdf-autotable").default;
    const doc = new jsPDF({ orientation: "landscape" });
    const logoUrl = "/brand/logo.png";
    const title = `SESSION INTELLIGENCE REPORT - #${detail.session.id}`;
    const dateStr = `Generated on: ${new Date().toLocaleString()}`;

    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;

    // Function to get color based on engagement percentage
    const getEngagementColor = (engagement: number) => {
      if (engagement >= 80) return [34, 197, 94]; // green-500
      if (engagement >= 60) return [251, 191, 36]; // amber-500
      if (engagement >= 40) return [249, 115, 22]; // orange-500
      return [239, 68, 68]; // red-500
    };

    const img = new Image();
    img.src = logoUrl;
    img.onload = () => {
      // Square logo (40x40)
      doc.addImage(img, "PNG", centerX - 20, 10, 40, 40);
      doc.setFontSize(16);
      doc.text(title, centerX, 60, { align: "center" });
      doc.setFontSize(10);
      doc.text(dateStr, centerX, 67, { align: "center" });

      const engagementValue = detail.session.average_engagement.toFixed(2);
      const engagementColor = getEngagementColor(
        detail.session.average_engagement,
      );

      const sessionInfo = [
        ["Teacher", teacherDisplayName],
        ["Subject", detail.session.subject_name],
        ["Section", detail.session.section_name],
        ["Mode", detail.session.activity_mode],
        ["Start Time", new Date(detail.session.start_time).toLocaleString()],
        ["Total Logs", detail.total_logs.toString()],
        ["Overall Engagement", `${engagementValue}%`],
      ];

      autoTable(doc, {
        head: [["Summary Field", "Value"]],
        body: sessionInfo,
        startY: 75,
        theme: "grid",
        headStyles: { fillColor: [34, 197, 94] }, // Green header
        margin: { left: centerX - 60, right: centerX - 60 },
        didDrawCell: (data: any) => {
          // Color code the engagement row
          if (data.row.index === 6 && data.column.index === 1) {
            doc.setTextColor(
              engagementColor[0],
              engagementColor[1],
              engagementColor[2],
            );
            doc.setFont("helvetica", "bold");
          }
        },
      });

      const avgVisible =
        detail.session.on_task +
        detail.session.sleeping +
        detail.session.using_phone +
        detail.session.off_task;

      const visiblePct = (value: number) => {
        if (!avgVisible) return "-";
        return `${((value / avgVisible) * 100).toFixed(1)}%`;
      };

      const behaviorData = [
        [
          "On Task",
          detail.session.on_task.toFixed(2),
          visiblePct(detail.session.on_task),
        ],
        [
          "Sleeping",
          detail.session.sleeping.toFixed(2),
          visiblePct(detail.session.sleeping),
        ],
        [
          "Using Phone",
          detail.session.using_phone.toFixed(2),
          visiblePct(detail.session.using_phone),
        ],
        [
          "Off Task",
          detail.session.off_task.toFixed(2),
          visiblePct(detail.session.off_task),
        ],
        ["Not Visible", detail.session.not_visible.toFixed(2), "-"],
      ];

      autoTable(doc, {
        head: [["Behavior Type", "Average detections", "Avg % of visible"]],
        body: behaviorData,
        startY: doc.lastAutoTable.finalY + 10,
        theme: "striped",
        headStyles: { fillColor: [34, 197, 94] }, // Green header
        margin: { left: 40, right: 40 },
      });

      doc.save(`session_${detail.session.id}_report.pdf`);
    };
    img.onerror = () => {
      doc.setFontSize(18);
      doc.text(title, centerX, 20, { align: "center" });
      doc.save(`session_${detail.session.id}_report.pdf`);
    };
  };

  const detailDurationLabel = useMemo(() => {
    const start = new Date(detail.session.start_time).getTime();
    const end = new Date(
      detail.session.end_time ?? new Date().toISOString(),
    ).getTime();
    const diffMs = Math.max(0, end - start);
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  }, [detail]);

  const chartLogData = useMemo<BehaviorLogChartRow[]>(() => {
    return detail.logs.map((log) => ({
      time: new Date(log.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      on_task: log.on_task,
      sleeping: log.sleeping,
      using_phone: log.using_phone,
      off_task: log.off_task,
      not_visible: log.not_visible,
    }));
  }, [detail]);

  const overallSessionBehaviorTotals =
    useMemo<BehaviorLogChartRow | null>(() => {
      if (!detail.logs.length) return null;
      const totals = detail.logs.reduce(
        (acc, log) => {
          acc.on_task += log.on_task;
          acc.sleeping += log.sleeping;
          acc.using_phone += log.using_phone;
          acc.off_task += log.off_task;
          acc.not_visible += log.not_visible;
          return acc;
        },
        {
          on_task: 0,
          sleeping: 0,
          using_phone: 0,
          off_task: 0,
          not_visible: 0,
        },
      );
      return {
        time: "Overall session totals",
        on_task: totals.on_task,
        sleeping: totals.sleeping,
        using_phone: totals.using_phone,
        off_task: totals.off_task,
        not_visible: totals.not_visible,
      };
    }, [detail]);

  const pieSource = hoveredLogRow ?? overallSessionBehaviorTotals;
  const hasLiveDetectorPreview =
    showDetectorPreview && detail.session.is_active;
  const behaviorStream = useMemo<BehaviorStreamEntry[]>(() => {
    return [
      ...detail.logs.map((log) => ({
        kind: "log" as const,
        timestamp: log.timestamp,
        log,
      })),
      ...detail.mode_events.map((event) => ({
        kind: "mode" as const,
        timestamp: event.timestamp,
        event,
      })),
    ].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [detail.logs, detail.mode_events]);
  const behaviorPieSlices = useMemo<BehaviorPieSlice[]>(() => {
    if (!pieSource) return [];
    return [
      {
        label: "On task",
        value: pieSource.on_task,
        color: behaviorColors.onTask,
      },
      {
        label: "Sleeping",
        value: pieSource.sleeping,
        color: behaviorColors.sleeping,
      },
      {
        label: "Using phone",
        value: pieSource.using_phone,
        color: behaviorColors.usingPhone,
      },
      {
        label: "Off task",
        value: pieSource.off_task,
        color: behaviorColors.offTask,
      },
      {
        label: "Not visible",
        value: pieSource.not_visible,
        color: behaviorColors.notVisible,
      },
    ];
  }, [pieSource]);

  return (
    <div className="space-y-6">
      {detail.session.is_active && detectorStatus ? (
        <DetectorStatusBanner detectorStatus={detectorStatus} />
      ) : null}

      <div
        className={
          hasLiveDetectorPreview
            ? "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]"
            : "space-y-6"
        }
      >
        {hasLiveDetectorPreview ? (
          <div className="xl:sticky xl:top-0 xl:self-start">
            <DetectorPreviewPanel
              streamUrl={previewStreamUrl}
              loading={previewLoading}
            />
          </div>
        ) : null}

        <div className="space-y-6">
          <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Intelligence Snapshot
            </h3>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-2 border-primary/20 text-primary hover:bg-primary/5 shadow-sm"
              onClick={exportSingleSessionPDF}
            >
              <FileDown className="h-4 w-4" />
              Download PDF Report
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <div className="rounded-lg border border-border/70 bg-card/70 p-3">
              <p className="text-xs text-muted-foreground">Teacher</p>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                  {detail.session.teacher_profile_picture_url ? (
                    <img
                      src={detail.session.teacher_profile_picture_url}
                      alt={teacherDisplayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[8px] font-bold uppercase text-muted-foreground">
                      {teacherDisplayName.charAt(0)}
                    </span>
                  )}
                </div>
                <p className="font-medium">{teacherDisplayName}</p>
              </div>
            </div>
            <div className="rounded-lg border border-border/70 bg-card/70 p-3">
              <p className="text-xs text-muted-foreground">Subject</p>
              <p className="font-medium">{detail.session.subject_name}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-card/70 p-3">
              <p className="text-xs text-muted-foreground">Section</p>
              <p className="font-medium">{detail.session.section_name}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-card/70 p-3">
              <p className="text-xs text-muted-foreground">Status</p>
              <p
                className={
                  detail.session.is_active
                    ? "font-semibold text-success"
                    : "font-semibold text-muted-foreground"
                }
              >
                {detail.session.is_active ? "Active" : "Completed"}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-card/70 p-3">
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-medium">{detailDurationLabel}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-card/70 p-3">
              <p className="text-xs text-muted-foreground">Students present</p>
              <p className="font-medium">{detail.session.students_present}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-card/70 p-3">
              <p className="text-xs text-muted-foreground">
                Overall engagement
              </p>
              <p className="font-medium">
                {detail.session.average_engagement.toFixed(2)}%
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-card/70 p-3">
              <p className="text-xs text-muted-foreground">
                Total behavior logs
              </p>
              <p className="font-medium">{detail.total_logs}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-card/70 p-3">
              <p className="text-xs text-muted-foreground">Activity mode</p>
              <p className="font-medium font-bold text-primary uppercase">
                {detail.session.activity_mode}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-card/70 p-3">
              <p className="text-xs text-muted-foreground">Alerts (unread)</p>
              <p className="font-medium font-semibold text-warning">
                {detail.total_alerts} ({detail.unread_alerts})
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <BehaviorPieCard
              title="Behavior Distribution"
              subtitle={
                hoveredLogRow
                  ? `Log data at ${hoveredLogRow.time}`
                  : "Summary for the entire session"
              }
              slices={behaviorPieSlices}
              totalLabel={hoveredLogRow ? "Scan logs" : "Total logs"}
            />

            <SessionTrendChart
              title="Behavior Timeline"
              data={chartLogData}
              xLabel={(row) => String(row.time)}
              hoverMode="x-axis"
              showHoverLine
              onHoverRowChange={handleHoverRowChange}
              centerMode="mean"
              smoothCurves
              showPoints={false}
              lines={[
                {
                  key: "on_task",
                  label: "On task",
                  colorClass: "bg-[#2e7d32]",
                  stroke: behaviorColors.onTask,
                },
                {
                  key: "sleeping",
                  label: "Sleeping",
                  colorClass: "bg-[#d32f2f]",
                  stroke: behaviorColors.sleeping,
                },
                {
                  key: "using_phone",
                  label: "Using Phone",
                  colorClass: "bg-[#f57c00]",
                  stroke: behaviorColors.usingPhone,
                },
                {
                  key: "off_task",
                  label: "Off Task",
                  colorClass: "bg-[#6a1b9a]",
                  stroke: behaviorColors.offTask,
                },
              ]}
              heightClassName="h-72"
            />

            <SessionTrendChart
              title="Engagement Score Over Time (per minute)"
              data={detail.metrics_rollup.map((row) => ({
                time: new Date(row.window_start).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                engagement: row.engagement_score,
              }))}
              xLabel={(row) => String(row.time)}
              centerMode="mean"
              smoothCurves
              lines={[
                {
                  key: "engagement",
                  label: "Engagement %",
                  colorClass: "bg-primary",
                  stroke: "hsl(var(--primary))",
                },
              ]}
              heightClassName="h-72"
            />
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3 bg-muted/20">
              <h4 className="text-sm font-semibold">
                Behavior stream logs ({behaviorStream.length} entries)
              </h4>
            </div>
            <div className="max-h-96 overflow-y-auto p-0">
              {behaviorStream.length ? (
                <Table>
                  <THead className="sticky top-0 bg-card z-10 shadow-sm">
                    <TR>
                      <TH className="px-4">Time</TH>
                      <TH>Task</TH>
                      <TH>Sleep</TH>
                      <TH>Phone</TH>
                      <TH>Off Task</TH>
                      <TH>Invisible</TH>
                      <TH className="pr-4">Total</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {behaviorStream.map((entry, idx) =>
                      entry.kind === "mode" ? (
                        <TR
                          key={`${entry.timestamp}-mode-${idx}`}
                          className="bg-warning/5"
                        >
                          <TD
                            colSpan={7}
                            className="px-4 py-3 text-sm font-bold uppercase text-amber-700 dark:text-amber-300"
                          >
                            <ArrowLeftRight
                              className="mr-2 inline-block h-4 w-4 align-[-2px]"
                              aria-hidden="true"
                            />
                            {entry.event.message}
                            <span className="ml-3 text-xs font-mono font-normal text-muted-foreground">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                          </TD>
                        </TR>
                      ) : (
                        <TR key={`${entry.timestamp}-log-${idx}`}>
                          <TD className="px-4 text-xs font-mono">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </TD>
                          <TD>{entry.log.on_task}</TD>
                          <TD>{entry.log.sleeping}</TD>
                          <TD>{entry.log.using_phone}</TD>
                          <TD>{entry.log.off_task}</TD>
                          <TD className="text-muted-foreground">
                            {entry.log.not_visible}
                          </TD>
                          <TD className="pr-4 font-semibold">
                            {entry.log.total_detected}
                          </TD>
                        </TR>
                      ),
                    )}
                  </TBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground p-4">
                  No behavior logs available for this session.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetectorPreviewPanel({
  streamUrl,
  loading,
}: {
  streamUrl: string | null;
  loading: boolean;
}) {
  const [streamState, setStreamState] = useState<"connecting" | "live" | "error">(
    "connecting",
  );

  useEffect(() => {
    setStreamState("connecting");
  }, [streamUrl]);

  const displayState = !streamUrl && !loading ? "error" : streamState;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/10 px-5 py-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Live Camera Preview
        </h4>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${displayState === "live" ? "border-success/30 bg-success/10 text-success" : displayState === "error" ? "border-danger/30 bg-danger/10 text-danger" : "border-warning/30 bg-warning/10 text-warning"}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${displayState === "live" ? "bg-success animate-pulse" : displayState === "error" ? "bg-danger" : "bg-warning"}`}
          />
          {displayState === "live" ? "Live" : displayState === "error" ? "Unavailable" : "Connecting"}
        </span>
      </div>
      <div className="flex aspect-video items-center justify-center bg-muted/30">
        {streamUrl ? (
          <img
            src={streamUrl}
            alt="Live detector preview"
            className="h-full w-full object-contain"
            onLoad={() => setStreamState("live")}
            onError={() => setStreamState("error")}
          />
        ) : (
          <p className="text-sm font-medium text-muted-foreground">
            {loading
              ? "Connecting to camera preview..."
              : "Camera preview unavailable."}
          </p>
        )}
      </div>
    </div>
  );
}

function DetectorStatusBanner({
  detectorStatus,
}: {
  detectorStatus: DetectorStatus;
}) {
  const state = detectorStatus.state;
  const isWaiting =
    state === "waiting" ||
    state === "recovering" ||
    state === "initializing" ||
    state === "stopped";
  const message =
    state === "stopped"
      ? "Waiting for detector..."
      : detectorStatus.message;

  return (
    <div
      className={[
        "flex items-center gap-3 rounded-lg border px-4 py-3",
        isWaiting
          ? "border-warning/30 bg-warning/10 text-warning"
          : "border-success/30 bg-success/10 text-success",
      ].join(" ")}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/70">
        {isWaiting ? (
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Activity className="h-4 w-4" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
          Detection Status
        </p>
        <p className="text-sm font-bold text-foreground">{message}</p>
      </div>
    </div>
  );
}

function BehaviorPieCard({
  title,
  subtitle,
  slices,
  totalLabel,
}: {
  title: string;
  subtitle: string;
  slices: BehaviorPieSlice[];
  totalLabel: string;
}) {
  const total = slices.reduce((acc, item) => acc + Math.max(0, item.value), 0);

  let cursor = 0;
  const segments = slices.map((item) => {
    const value = Math.max(0, item.value);
    const start = total > 0 ? (cursor / total) * 360 : 0;
    cursor += value;
    const end = total > 0 ? (cursor / total) * 360 : 0;
    return `${item.color} ${start}deg ${end}deg`;
  });

  const pieBackground =
    total > 0
      ? `conic-gradient(from -90deg, ${segments.join(", ")})`
      : "conic-gradient(from -90deg, hsl(var(--muted)) 0deg 360deg)";

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border/50 bg-muted/10 px-5 py-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </h4>
        <p className="text-sm font-semibold">{subtitle}</p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[240px_1fr] md:items-center">
          <div className="mx-auto flex flex-col items-center">
            <div
              className="relative h-56 w-56 rounded-full border border-border/40 shadow-inner transition-transform duration-300 hover:scale-[1.02]"
              style={{ background: pieBackground }}
            >
              <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-card shadow-xl flex items-center justify-center flex-col z-10">
                <p className="text-[10px] uppercase font-black text-muted-foreground leading-none mb-1">
                  {totalLabel}
                </p>
                <p className="text-2xl font-black tabular-nums tracking-tighter">
                  {total.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            {slices.map((item) => {
              const pct =
                total > 0 ? (Math.max(0, item.value) / total) * 100 : 0;
              return (
                <div
                  key={item.label}
                  className="group flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-3.5 py-1.5 transition-all hover:bg-muted/30 hover:border-border"
                >
                  <div className="flex items-center gap-2.5 mid-w-0 flex-1">
                    <div
                      className="h-2 w-2 shrink-0 rounded-full shadow-[0_0_8px] opacity-80"
                      style={{ backgroundColor: item.color, color: item.color }}
                    />
                    <span className="text-[10px] font-bold uppercase tracking-tight text-foreground/80">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex flex-col items-end leading-none ml-4">
                    <p className="text-xs font-black tabular-nums">
                      {item.value.toLocaleString()}
                    </p>
                    <p className="text-[9px] font-medium text-muted-foreground mt-0.5">
                      {pct.toFixed(1)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
