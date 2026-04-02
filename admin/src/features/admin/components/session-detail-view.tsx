"use client";

import { useMemo, useState } from "react";
import { SessionTrendChart } from "@/components/session-trend-chart";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AdminSessionDetail } from "../types";

type BehaviorLogChartRow = {
    time: string;
    on_task: number;
    sleeping: number;
    using_phone: number;
    off_task: number;
    not_visible: number;
};

type BehaviorPieSlice = {
    label: string;
    value: number;
    color: string;
};

export function SessionDetailView({ detail }: { detail: AdminSessionDetail }) {
    const [hoveredLogRow, setHoveredLogRow] = useState<BehaviorLogChartRow | null>(null);
    const teacherDisplayName = detail.session.teacher_fullname?.trim() || detail.session.teacher_username;

    const detailDurationLabel = useMemo(() => {
        const start = new Date(detail.session.start_time).getTime();
        const end = new Date((detail.session.end_time ?? new Date().toISOString())).getTime();
        const diffMs = Math.max(0, end - start);
        const totalMinutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours <= 0) return `${minutes}m`;
        return `${hours}h ${minutes}m`;
    }, [detail]);

    const chartLogData = useMemo<BehaviorLogChartRow[]>(() => {
        return detail.logs.map((log) => ({
            time: new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            on_task: log.on_task,
            sleeping: log.sleeping,
            using_phone: log.using_phone,
            off_task: log.off_task,
            not_visible: log.not_visible,
        }));
    }, [detail]);

    const overallSessionBehaviorTotals = useMemo<BehaviorLogChartRow | null>(() => {
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
            }
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
    const behaviorPieSlices = useMemo<BehaviorPieSlice[]>(() => {
        if (!pieSource) return [];
        return [
            { label: "On task", value: pieSource.on_task, color: "hsl(var(--success))" },
            { label: "Sleeping", value: pieSource.sleeping, color: "hsl(var(--danger))" },
            { label: "Using phone", value: pieSource.using_phone, color: "hsl(var(--warning))" },
            { label: "Off task", value: pieSource.off_task, color: "hsl(var(--primary))" },
            { label: "Not visible", value: pieSource.not_visible, color: "#94a3b8" },
        ];
    }, [pieSource]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
                <div className="rounded-lg border border-border/70 bg-card/70 p-3">
                    <p className="text-xs text-muted-foreground">Teacher</p>
                    <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                            {detail.session.teacher_profile_picture_url ? (
                                <img src={detail.session.teacher_profile_picture_url} alt={teacherDisplayName} className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-[8px] font-bold uppercase text-muted-foreground">
                                    {teacherDisplayName.charAt(0)}
                                </span>
                            )}
                        </div>
                        <p className="font-medium">{teacherDisplayName}</p>
                    </div>
                </div>
                <div className="rounded-lg border border-border/70 bg-card/70 p-3"><p className="text-xs text-muted-foreground">Subject</p><p className="font-medium">{detail.session.subject_name}</p></div>
                <div className="rounded-lg border border-border/70 bg-card/70 p-3"><p className="text-xs text-muted-foreground">Section</p><p className="font-medium">{detail.session.section_name}</p></div>
                <div className="rounded-lg border border-border/70 bg-card/70 p-3"><p className="text-xs text-muted-foreground">Status</p><p className="font-medium font-semibold text-primary">{detail.session.is_active ? "Active" : "Completed"}</p></div>
                <div className="rounded-lg border border-border/70 bg-card/70 p-3"><p className="text-xs text-muted-foreground">Duration</p><p className="font-medium">{detailDurationLabel}</p></div>
                <div className="rounded-lg border border-border/70 bg-card/70 p-3"><p className="text-xs text-muted-foreground">Students present</p><p className="font-medium">{detail.session.students_present}</p></div>
                <div className="rounded-lg border border-border/70 bg-card/70 p-3"><p className="text-xs text-muted-foreground">Overall engagement</p><p className="font-medium">{detail.session.average_engagement.toFixed(2)}%</p></div>
                <div className="rounded-lg border border-border/70 bg-card/70 p-3"><p className="text-xs text-muted-foreground">Total behavior logs</p><p className="font-medium">{detail.total_logs}</p></div>
                <div className="rounded-lg border border-border/70 bg-card/70 p-3"><p className="text-xs text-muted-foreground">Metrics windows</p><p className="font-medium">{detail.metrics_rollup.length}</p></div>
                <div className="rounded-lg border border-border/70 bg-card/70 p-3"><p className="text-xs text-muted-foreground">Alerts (unread)</p><p className="font-medium font-semibold text-warning">{detail.total_alerts} ({detail.unread_alerts})</p></div>
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
                    onHoverRowChange={(row) => setHoveredLogRow(row as BehaviorLogChartRow | null)}
                    centerMode="mean"
                    smoothCurves
                    showPoints={false}
                    lines={[
                        { key: "on_task", label: "On task", colorClass: "bg-success", stroke: "hsl(var(--success))" },
                        { key: "sleeping", label: "Sleeping", colorClass: "bg-danger", stroke: "hsl(var(--danger))" },
                        { key: "using_phone", label: "Using Phone", colorClass: "bg-warning", stroke: "hsl(var(--warning))" },
                        { key: "off_task", label: "Off Task", colorClass: "bg-primary", stroke: "hsl(var(--primary))" },
                    ]}
                    heightClassName="h-72"
                />

                <SessionTrendChart
                    title="Engagement Score Over Time (per minute)"
                    data={detail.metrics_rollup.map(row => ({
                        time: new Date(row.window_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        engagement: row.engagement_score
                    }))}
                    xLabel={(row) => String(row.time)}
                    centerMode="mean"
                    smoothCurves
                    lines={[
                        { key: "engagement", label: "Engagement %", colorClass: "bg-primary", stroke: "hsl(var(--primary))" }
                    ]}
                    heightClassName="h-72"
                />
            </div>

            <div className="rounded-xl border border-border bg-card">
                <div className="border-b border-border px-4 py-3 bg-muted/20">
                    <h4 className="text-sm font-semibold">Behavior stream logs ({detail.logs.length} entries)</h4>
                </div>
                <div className="max-h-96 overflow-y-auto p-0">
                    {detail.logs.length ? (
                        <Table>
                            <THead className="sticky top-0 bg-card z-10 shadow-sm">
                                <TR><TH className="px-4">Time</TH><TH>Task</TH><TH>Sleep</TH><TH>Phone</TH><TH>Off Task</TH><TH>Invisible</TH><TH className="pr-4">Total</TH></TR>
                            </THead>
                            <TBody>
                                {[...detail.logs].reverse().map((log, idx) => (
                                    <TR key={`${log.timestamp}-${idx}`}>
                                        <TD className="px-4 text-xs font-mono">{new Date(log.timestamp).toLocaleTimeString()}</TD>
                                        <TD>{log.on_task}</TD>
                                        <TD>{log.sleeping}</TD>
                                        <TD>{log.using_phone}</TD>
                                        <TD>{log.off_task}</TD>
                                        <TD className="text-muted-foreground">{log.not_visible}</TD>
                                        <TD className="pr-4 font-semibold">{log.total_detected}</TD>
                                    </TR>
                                ))}
                            </TBody>
                        </Table>
                    ) : (
                        <p className="text-sm text-muted-foreground p-4">No behavior logs available for this session.</p>
                    )}
                </div>
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
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h4>
                <p className="text-sm font-semibold">{subtitle}</p>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-[240px_1fr] md:items-center">
                    <div className="mx-auto flex flex-col items-center">
                        <div className="relative h-56 w-56 rounded-full border border-border/40 shadow-inner transition-transform duration-300 hover:scale-[1.02]" style={{ background: pieBackground }}>
                            <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-card shadow-xl flex items-center justify-center flex-col z-10">
                                <p className="text-[10px] uppercase font-black text-muted-foreground leading-none mb-1">{totalLabel}</p>
                                <p className="text-2xl font-black tabular-nums tracking-tighter">{total.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        {slices.map((item) => {
                            const pct = total > 0 ? (Math.max(0, item.value) / total) * 100 : 0;
                            return (
                                <div key={item.label} className="group flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-3.5 py-1.5 transition-all hover:bg-muted/30 hover:border-border">
                                    <div className="flex items-center gap-2.5 mid-w-0 flex-1">
                                        <div className="h-2 w-2 shrink-0 rounded-full shadow-[0_0_8px] opacity-80" style={{ backgroundColor: item.color, color: item.color }} />
                                        <span className="text-[10px] font-bold uppercase tracking-tight text-foreground/80">{item.label}</span>
                                    </div>
                                    <div className="flex flex-col items-end leading-none ml-4">
                                        <p className="text-xs font-black tabular-nums">{item.value.toLocaleString()}</p>
                                        <p className="text-[9px] font-medium text-muted-foreground mt-0.5">{pct.toFixed(1)}%</p>
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
