"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownUp,
  BookOpen,
  Calendar,
  CheckCircle,
  CircleAlert,
  LayoutDashboard,
  List,
  Radio,
  RefreshCw,
  Search,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  Filter,
  Zap,
  BarChart3,
  Award,
  ChevronRight,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Drawer } from "@/components/ui/drawer";
import { SessionDetailView } from "@/features/admin/components/session-detail-view";
import { getDashboard, getSessionDetail, getColleges, getDepartments } from "@/features/admin/api";
import type {
  AdminSession,
  AdminSessionDetail,
  DashboardResponse,
  AdminCollege,
  AdminDepartment,
} from "@/features/admin/types";
import { cn } from "@/lib/utils";
import { getCurrentActorUserId } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

function teacherName(session: AdminSession): string {
  return session.teacher_fullname?.trim() || session.teacher_username;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeSessionInView, setActiveSessionInView] =
    useState<AdminSession | null>(null);
  const [detail, setDetail] = useState<AdminSessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [syncingLive, setSyncingLive] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  const [isTeacherOpen, setIsTeacherOpen] = useState(false);
  const [activeTeacherId, setActiveTeacherId] = useState<number | null>(null);

  const [analyticsQuery, setAnalyticsQuery] = useState("");
  const [teacherSort, setTeacherSort] = useState<"avg_desc" | "avg_asc">(
    "avg_desc"
  );
  const [sectionSort, setSectionSort] = useState<"avg_desc" | "avg_asc">(
    "avg_desc"
  );
  const [analyticsView, setAnalyticsView] = useState<"teachers" | "sections">(
    "teachers"
  );
  const [engagementPreset, setEngagementPreset] = useState<
    "all" | "high" | "low"
  >("all");
  const [minEngagement, setMinEngagement] = useState("");
  const [maxEngagement, setMaxEngagement] = useState("");

  const [colleges, setColleges] = useState<AdminCollege[]>([]);
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>("all");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("all");
  const [activityModeFilter, setActivityModeFilter] = useState<string>("all");


  const currentActorUserId = useMemo(() => getCurrentActorUserId(), []);

  const loadDashboard = useCallback(
    async (silent = false, autoPoll = false) => {
      if (!autoPoll) {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
      }

      const filters = {
        college_id: selectedCollegeId !== "all" ? Number(selectedCollegeId) : undefined,
        department_id: selectedDepartmentId !== "all" ? Number(selectedDepartmentId) : undefined,
        activity_mode: activityModeFilter !== "all" ? activityModeFilter : undefined,
      };

      await getDashboard(filters)
        .then(setData)
        .catch((err: unknown) => {
          if (!autoPoll) {
            const message = getErrorMessage(err, "Failed to load dashboard data.");
            setError(message);
          }
        })
        .finally(() => {
          if (!autoPoll) {
            setLoading(false);
            setRefreshing(false);
          }
        });
    },
    [selectedCollegeId, selectedDepartmentId, activityModeFilter]
  );

  useEffect(() => {
    loadDashboard(false, false);

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadDashboard(false, true);
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [loadDashboard]);

  useEffect(() => {
    getColleges().then((res) => setColleges(res.items));
  }, []);

  useEffect(() => {
    if (selectedCollegeId !== "all") {
      getDepartments(Number(selectedCollegeId)).then((res) => setDepartments(res.items));
    } else {
      setDepartments([]);
      setSelectedDepartmentId("all");
    }
  }, [selectedCollegeId]);


  const fetchSessionDetail = useCallback(
    async (sessionId: number, silent = false) => {
      if (silent) {
        setSyncingLive(true);
      } else {
        setLoadingDetail(true);
        setDetailError(null);
      }
      try {
        const res = await getSessionDetail(
          sessionId,
          "?minutes=180&logs_limit=250"
        );
        setDetail(res);
        setLastRefreshAt(new Date());
      } catch (err) {
        setDetailError(getErrorMessage(err, "Failed to load details."));
      } finally {
        setLoadingDetail(false);
        setSyncingLive(false);
      }
    },
    []
  );

  async function openSessionDetail(session: AdminSession) {
    setActiveSessionInView(session);
    setDetail(null);
    setIsDetailOpen(true);
    await fetchSessionDetail(session.id, false);
  }

  useEffect(() => {
    if (
      !isDetailOpen ||
      !activeSessionInView ||
      !activeSessionInView.is_active
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchSessionDetail(activeSessionInView.id, true);
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [isDetailOpen, activeSessionInView, fetchSessionDetail]);

  const analyticsSessions = useMemo(() => {
    const byId = new Map<number, AdminSession>();
    const sessions = [
      ...(data?.active_sessions ?? []),
      ...(data?.recent_sessions ?? []),
    ];
    for (const s of sessions) {
      byId.set(s.id, s);
    }
    return Array.from(byId.values());
  }, [data?.active_sessions, data?.recent_sessions]);

  const filteredAnalyticsSessions = useMemo(() => {
    const min = minEngagement.trim() ? Number(minEngagement) : null;
    const max = maxEngagement.trim() ? Number(maxEngagement) : null;

    return analyticsSessions.filter((s) => {
      const score = s.average_engagement ?? 0;
      if (engagementPreset === "high" && score < 80) return false;
      if (engagementPreset === "low" && score >= 50) return false;
      if (min !== null && Number.isFinite(min) && score < min) return false;
      if (max !== null && Number.isFinite(max) && score > max) return false;

      if (selectedCollegeId !== "all" && s.college_id !== Number(selectedCollegeId)) return false;
      if (selectedDepartmentId !== "all" && s.department_id !== Number(selectedDepartmentId)) return false;
      if (activityModeFilter !== "all" && s.activity_mode !== activityModeFilter) return false;

      return true;
    });
  }, [analyticsSessions, engagementPreset, minEngagement, maxEngagement, selectedCollegeId, selectedDepartmentId, activityModeFilter]);

  const teacherAnalytics = useMemo(() => {
    const q = analyticsQuery.trim().toLowerCase();
    const agg = new Map<
      number,
      {
        teacher_id: number;
        teacher_username: string;
        teacher_fullname: string | null;
        profile_picture_url: string | null;
        sessions: number;
        students: number;
        avg_engagement: number;
      }
    >();

    for (const s of filteredAnalyticsSessions) {
      if (q) {
        const hay =
          `${teacherName(s)} ${s.subject_name} ${s.section_name}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      const existing = agg.get(s.teacher_id) ?? {
        teacher_id: s.teacher_id,
        teacher_username: s.teacher_username,
        teacher_fullname: s.teacher_fullname ?? null,
        profile_picture_url: s.teacher_profile_picture_url ?? null,
        sessions: 0,
        students: 0,
        avg_engagement: 0,
      };
      const nextSessions = existing.sessions + 1;
      const nextStudents = existing.students + (s.students_present ?? 0);
      const nextAvg =
        (existing.avg_engagement * existing.sessions +
          (s.average_engagement ?? 0)) /
        nextSessions;
      agg.set(s.teacher_id, {
        ...existing,
        teacher_username: existing.teacher_username || s.teacher_username,
        teacher_fullname: existing.teacher_fullname || s.teacher_fullname || null,
        profile_picture_url: existing.profile_picture_url ?? s.teacher_profile_picture_url ?? null,
        sessions: nextSessions,
        students: nextStudents,
        avg_engagement: nextAvg,
      });
    }

    const rows = Array.from(agg.values());
    rows.sort((a, b) =>
      teacherSort === "avg_desc"
        ? b.avg_engagement - a.avg_engagement
        : a.avg_engagement - b.avg_engagement
    );
    return rows;
  }, [analyticsQuery, filteredAnalyticsSessions, teacherSort]);

  const sectionAnalytics = useMemo(() => {
    const q = analyticsQuery.trim().toLowerCase();
    const agg = new Map<
      number,
      {
        section_id: number;
        section_name: string;
        subject_name: string;
        sessions: number;
        students: number;
        avg_engagement: number;
      }
    >();

    for (const s of filteredAnalyticsSessions) {
      if (q) {
        const hay =
          `${teacherName(s)} ${s.subject_name} ${s.section_name}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      const existing = agg.get(s.section_id) ?? {
        section_id: s.section_id,
        section_name: s.section_name,
        subject_name: s.subject_name,
        sessions: 0,
        students: 0,
        avg_engagement: 0,
      };
      const nextSessions = existing.sessions + 1;
      const nextStudents = existing.students + (s.students_present ?? 0);
      const nextAvg =
        (existing.avg_engagement * existing.sessions +
          (s.average_engagement ?? 0)) /
        nextSessions;
      agg.set(s.section_id, {
        ...existing,
        section_name: existing.section_name || s.section_name,
        subject_name: existing.subject_name || s.subject_name,
        sessions: nextSessions,
        students: nextStudents,
        avg_engagement: nextAvg,
      });
    }

    const rows = Array.from(agg.values());
    rows.sort((a, b) =>
      sectionSort === "avg_desc"
        ? b.avg_engagement - a.avg_engagement
        : a.avg_engagement - b.avg_engagement
    );
    return rows;
  }, [analyticsQuery, filteredAnalyticsSessions, sectionSort]);

  const analyticsKpis = useMemo(() => {
    if (!filteredAnalyticsSessions.length) {
      return {
        sessions: 0,
        students: 0,
        avgEngagement: 0,
        highEngagementSessions: 0,
        lowEngagementSessions: 0,
      };
    }
    let students = 0;
    let totalEngagement = 0;
    let high = 0;
    let low = 0;
    for (const s of filteredAnalyticsSessions) {
      students += s.students_present ?? 0;
      totalEngagement += s.average_engagement ?? 0;
      if ((s.average_engagement ?? 0) >= 80) high += 1;
      if ((s.average_engagement ?? 0) < 50) low += 1;
    }
    return {
      sessions: filteredAnalyticsSessions.length,
      students,
      avgEngagement: totalEngagement / filteredAnalyticsSessions.length,
      highEngagementSessions: high,
      lowEngagementSessions: low,
    };
  }, [filteredAnalyticsSessions]);

  const activeTeacherRow = useMemo(() => {
    if (activeTeacherId === null) return null;
    return teacherAnalytics.find((t) => t.teacher_id === activeTeacherId) ?? null;
  }, [activeTeacherId, teacherAnalytics]);

  const activeTeacherSessions = useMemo(() => {
    if (activeTeacherId === null) return [];
    return filteredAnalyticsSessions
      .filter((s) => s.teacher_id === activeTeacherId)
      .slice()
      .sort((a, b) => b.id - a.id);
  }, [activeTeacherId, filteredAnalyticsSessions]);

  const activeTeacherStats = useMemo(() => {
    if (activeTeacherId === null || activeTeacherSessions.length === 0) {
      return {
        sessions: 0,
        students: 0,
        avgEngagement: 0,
        bestEngagement: 0,
        worstEngagement: 0,
        buckets: { high: 0, mid: 0, low: 0 },
        topSections: [] as Array<{ label: string; sessions: number; avg: number }>,
      };
    }

    let students = 0;
    let totalEngagement = 0;
    let best = -Infinity;
    let worst = Infinity;
    const buckets = { high: 0, mid: 0, low: 0 };

    const bySection = new Map<string, { label: string; sessions: number; avg: number }>();

    for (const s of activeTeacherSessions) {
      students += s.students_present ?? 0;
      const score = s.average_engagement ?? 0;
      totalEngagement += score;
      best = Math.max(best, score);
      worst = Math.min(worst, score);

      if (score >= 80) buckets.high += 1;
      else if (score >= 50) buckets.mid += 1;
      else buckets.low += 1;

      const key = `${s.subject_name} • ${s.section_name}`;
      const existing = bySection.get(key) ?? { label: key, sessions: 0, avg: 0 };
      const nextSessions = existing.sessions + 1;
      const nextAvg = (existing.avg * existing.sessions + score) / nextSessions;
      bySection.set(key, { label: key, sessions: nextSessions, avg: nextAvg });
    }

    const topSections = Array.from(bySection.values())
      .sort((a, b) => b.sessions - a.sessions || b.avg - a.avg)
      .slice(0, 5);

    return {
      sessions: activeTeacherSessions.length,
      students,
      avgEngagement: totalEngagement / activeTeacherSessions.length,
      bestEngagement: Number.isFinite(best) ? best : 0,
      worstEngagement: Number.isFinite(worst) ? worst : 0,
      buckets,
      topSections,
    };
  }, [activeTeacherId, activeTeacherSessions]);

  const openTeacherDetail = useCallback((teacherId: number) => {
    setActiveTeacherId(teacherId);
    setIsTeacherOpen(true);
  }, []);

  function PieChart({
    values,
    colors,
    size = 140,
    strokeWidth = 14,
  }: {
    values: number[];
    colors: string[];
    size?: number;
    strokeWidth?: number;
  }) {
    const total = values.reduce((acc, v) => acc + v, 0);
    const r = (size - strokeWidth) / 2;
    const c = size / 2;
    const circumference = 2 * Math.PI * r;
    let offset = 0;

    if (!total) {
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
        </svg>
      );
    }

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${c} ${c})`}>
          {values.map((v, idx) => {
            const frac = v / total;
            const dash = frac * circumference;
            const dashOffset = circumference - offset;
            offset += dash;
            return (
              <circle
                key={idx}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={colors[idx]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="butt"
              />
            );
          })}
        </g>
      </svg>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={
            <>
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </>
          }
          description="Global classroom operations and health snapshot."
        />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="space-y-3 pt-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={
            <>
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </>
          }
          description="Global classroom operations and health snapshot."
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CircleAlert className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold">Not Found</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md text-center">
              {error || "Unable to load dashboard data. Please try refreshing the page."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => loadDashboard(false, false)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kpiCards = [
    {
      label: "Sessions Analyzed",
      value: analyticsKpis.sessions,
      icon: <BarChart3 className="h-4 w-4" />,
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
    },
    {
      label: "Avg Engagement",
      value: `${analyticsKpis.avgEngagement.toFixed(1)}%`,
      icon: <Zap className="h-4 w-4" />,
      color:
        analyticsKpis.avgEngagement >= 80
          ? "text-success"
          : analyticsKpis.avgEngagement >= 50
            ? "text-warning"
            : "text-danger",
      bg:
        analyticsKpis.avgEngagement >= 80
          ? "bg-success/10"
          : analyticsKpis.avgEngagement >= 50
            ? "bg-warning/10"
            : "bg-danger/10",
      border:
        analyticsKpis.avgEngagement >= 80
          ? "border-success/20"
          : analyticsKpis.avgEngagement >= 50
            ? "border-warning/20"
            : "border-danger/20",
    },
    {
      label: "High Engagement",
      value: analyticsKpis.highEngagementSessions,
      icon: <TrendingUp className="h-4 w-4" />,
      color: "text-success",
      bg: "bg-success/10",
      border: "border-success/20",
      sub: "≥ 80%",
    },
    {
      label: "Low Engagement",
      value: analyticsKpis.lowEngagementSessions,
      icon: <TrendingDown className="h-4 w-4" />,
      color: "text-danger",
      bg: "bg-danger/10",
      border: "border-danger/20",
      sub: "< 50%",
    },
  ];

  return (
    <div className="space-y-6 transition-opacity duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PageHeader
          title={
            <>
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </>
          }
          description="Global classroom operations and health snapshot."
        />
        <Button
          variant="outline"
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card
            key={kpi.label}
            className={cn("border transition-all hover:shadow-md", kpi.border)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground truncate">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-black tracking-tight">{kpi.value}</p>
                  {kpi.sub && (
                    <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
                  )}
                </div>
                <div
                  className={cn(
                    "shrink-0 rounded-lg p-2 border",
                    kpi.bg,
                    kpi.border,
                    kpi.color
                  )}
                >
                  {kpi.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live Sessions Banner */}
      {data.active_sessions.length > 0 && (
        <Card className="border-success/30 bg-success/5 shadow-none overflow-hidden ring-1 ring-success/10">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-success/90">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  Live Classroom Activity
                </CardTitle>
                <CardDescription className="text-xs">
                  Real-time oversight of {data.active_sessions.length} running
                  session{data.active_sessions.length > 1 ? "s" : ""}.
                </CardDescription>
              </div>
              <Badge
                tone="success"
                className="animate-in fade-in zoom-in duration-500 rounded-full px-3 h-7 text-[10px] font-bold uppercase tracking-wider"
              >
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
                    <TH className="py-3 text-center">Mode</TH>
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
                      <TD className="font-mono text-[10px] font-semibold text-muted-foreground px-4">
                        #{s.id}
                      </TD>
                      <TD>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-success/20 bg-background shadow-sm">
                            {s.teacher_profile_picture_url ? (
                              <img
                                src={s.teacher_profile_picture_url}
                                alt={teacherName(s)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] font-bold uppercase text-success/60">
                                {teacherName(s).charAt(0)}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-sm text-foreground/90">
                            {currentActorUserId !== null &&
                              s.teacher_id === currentActorUserId
                              ? "You"
                              : teacherName(s)}
                          </span>
                        </div>
                      </TD>
                      <TD>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-foreground">
                            {s.subject_name}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-tight">
                            {s.section_name}
                          </span>
                        </div>
                      </TD>
                      <TD className="font-semibold text-sm font-mono text-center">
                        {s.students_present}
                      </TD>
                      <TD className="text-center">
                        <Badge tone="default" className="text-[10px] uppercase font-bold border-border/60">
                          {s.activity_mode}
                        </Badge>
                      </TD>
                      <TD>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 max-w-[100px] h-1.5 bg-muted/40 rounded-full overflow-hidden border border-border/5">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-700 ease-out",
                                s.average_engagement >= 80
                                  ? "bg-success"
                                  : s.average_engagement >= 50
                                    ? "bg-warning"
                                    : "bg-danger"
                              )}
                              style={{ width: `${s.average_engagement}%` }}
                            />
                          </div>
                          <span
                            className={cn(
                              "text-xs font-bold tabular-nums",
                              s.average_engagement >= 80
                                ? "text-success"
                                : s.average_engagement >= 50
                                  ? "text-warning"
                                  : "text-danger"
                            )}
                          >
                            {s.average_engagement}%
                          </span>
                        </div>
                      </TD>
                      <TD className="text-right pr-4 px-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 rounded-full p-0 border-success/20 text-success hover:bg-success hover:text-white transition-all shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSessionDetail(s);
                          }}
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

      {/* Analytics Section Label */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 mb-1">
        <div className="flex items-center gap-2">
          <CircleAlert className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-bold tracking-tight">Reports & Analytics</h3>
          <p className="text-[10px] text-muted-foreground font-medium hidden sm:block">
            — Computed from live + recent sessions.
          </p>
        </div>

        {!loading && (
          <div className="ml-auto px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 shadow-sm transition-all hover:bg-primary/20">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary leading-none">
              {filteredAnalyticsSessions.length} sessions analyzed
            </p>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
        {/* Row 1: Search + View toggle + Sort */}
        <div className="flex flex-col gap-2 px-4 pt-3 pb-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/40">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={analyticsQuery}
              onChange={(e) => setAnalyticsQuery(e.target.value)}
              placeholder="Search teacher / subject / section…"
              className="pl-9 pr-9 h-9 text-sm"
            />
            {analyticsQuery.trim() && (
              <button
                type="button"
                onClick={() => setAnalyticsQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* View toggle + Sort */}
          <div className="flex items-center gap-2">
            {/* View pill toggle */}
            <div className="flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5 gap-0.5">
              <Button
                size="sm"
                variant={analyticsView === "teachers" ? "default" : "ghost"}
                onClick={() => setAnalyticsView("teachers")}
                className="h-7 px-3 text-xs rounded-md"
              >
                <Users className="mr-1.5 h-3.5 w-3.5" />
                Teachers
              </Button>
              <Button
                size="sm"
                variant={analyticsView === "sections" ? "default" : "ghost"}
                onClick={() => setAnalyticsView("sections")}
                className="h-7 px-3 text-xs rounded-md"
              >
                <List className="mr-1.5 h-3.5 w-3.5" />
                Sections
              </Button>
            </div>

            {/* Sort */}
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() =>
                analyticsView === "teachers"
                  ? setTeacherSort((prev) =>
                    prev === "avg_desc" ? "avg_asc" : "avg_desc"
                  )
                  : setSectionSort((prev) =>
                    prev === "avg_desc" ? "avg_asc" : "avg_desc"
                  )
              }
            >
              <ArrowDownUp className="h-3.5 w-3.5" />
              {analyticsView === "teachers"
                ? teacherSort === "avg_desc"
                  ? "High → Low"
                  : "Low → High"
                : sectionSort === "avg_desc"
                  ? "High → Low"
                  : "Low → High"}
            </Button>
          </div>
        </div>

        {/* Row 2: Preset chips + College/Department dropdowns + Engagement range */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 bg-muted/10">
          {/* Engagement presets */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
              Engagement
            </span>
            {(["all", "high", "low"] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => setEngagementPreset(preset)}
                className={cn(
                  "h-6 rounded-full px-2.5 text-[11px] font-semibold transition-all border",
                  engagementPreset === preset
                    ? preset === "high"
                      ? "bg-success/15 border-success/40 text-success"
                      : preset === "low"
                        ? "bg-danger/15 border-danger/40 text-danger"
                        : "bg-primary/10 border-primary/30 text-primary"
                    : "bg-transparent border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {preset === "all" ? "All" : preset === "high" ? "High ≥80%" : "Low <50%"}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-border/50 hidden sm:block" />

          {/* College + Department dropdowns */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              College
            </span>
            <select
              className="h-7 rounded-lg border border-border/60 bg-background px-2 text-[11px] font-medium outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
              value={selectedCollegeId}
              onChange={(e) => {
                setSelectedCollegeId(e.target.value);
                setSelectedDepartmentId("all");
              }}
            >
              <option value="all">All</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {selectedCollegeId !== "all" && (
              <>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Department
                </span>
                <select
                  className="h-7 rounded-lg border border-border/60 bg-background px-2 text-[11px] font-medium outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                >
                  <option value="all">All</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
              </>
            )}
          </div>

          <div className="h-4 w-px bg-border/50 hidden sm:block" />

          {/* Activity Mode filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-0.5">
              Type
            </span>
            <select
              className="h-7 rounded-lg border border-border/60 bg-background px-2 text-[11px] font-medium outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
              value={activityModeFilter}
              onChange={(e) => setActivityModeFilter(e.target.value)}
            >
              <option value="all">All Modes</option>
              <option value="LECTURE">Lecture</option>
              <option value="STUDY">Study</option>
              <option value="COLLABORATION">Collaboration</option>
            </select>
          </div>

          <div className="h-4 w-px bg-border/50 hidden sm:block" />

          {/* Engagement range */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Range
            </span>
            <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-1">
              <Input
                value={minEngagement}
                onChange={(e) => setMinEngagement(e.target.value)}
                placeholder="Min"
                inputMode="numeric"
                className="h-5 w-12 border-none bg-transparent p-0 text-xs font-bold focus-visible:ring-0"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <Input
                value={maxEngagement}
                onChange={(e) => setMaxEngagement(e.target.value)}
                placeholder="Max"
                inputMode="numeric"
                className="h-5 w-12 border-none bg-transparent p-0 text-xs font-bold focus-visible:ring-0"
              />
              <span className="text-[10px] text-muted-foreground font-medium">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column content area */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Left: Analytics Results */}
        <div>
          {analyticsView === "teachers" ? (
            <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Top Teachers — Avg Engagement
                  </p>
                </div>
                <Badge tone="default" className="text-[10px]">{teacherAnalytics.length}</Badge>
              </div>
              <Table>
                <THead className="bg-muted/20">
                  <TR>
                    <TH className="text-[10px] uppercase tracking-wider">Teacher</TH>
                    <TH className="text-right text-[10px] uppercase tracking-wider">Avg</TH>
                    <TH className="text-right text-[10px] uppercase tracking-wider">Sessions</TH>
                  </TR>
                </THead>
                <TBody>
                  {teacherAnalytics.length === 0 ? (
                    <TR>
                      <TD colSpan={3} className="py-8 text-center text-xs text-muted-foreground">
                        No results match your filters.
                      </TD>
                    </TR>
                  ) : (
                    teacherAnalytics.slice(0, 12).map((row) => (
                      <TR
                        key={`t-${row.teacher_id}`}
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => openTeacherDetail(row.teacher_id)}
                      >
                        <TD className="text-xs font-medium">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted">
                                {row.profile_picture_url ? (
                                  <img
                                    src={row.profile_picture_url}
                                    alt={row.teacher_fullname ?? row.teacher_username}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                    {(row.teacher_fullname ?? row.teacher_username).charAt(0)}
                                  </span>
                                )}
                              </div>
                              <span>
                                {currentActorUserId !== null &&
                                  row.teacher_id === currentActorUserId
                                  ? "You"
                                  : (row.teacher_fullname ?? row.teacher_username)}
                              </span>
                            </div>
                            <div className="hidden sm:block h-1.5 w-24 rounded-full bg-muted/40 overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{
                                  width: `${Math.min(100, Math.max(0, row.avg_engagement))}%`,
                                }}
                              />
                            </div>
                          </div>
                        </TD>
                        <TD className="text-right text-xs font-mono">
                          {row.avg_engagement.toFixed(1)}%
                        </TD>
                        <TD className="text-right text-xs font-mono">
                          {row.sessions}
                        </TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <List className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Top Sections — Avg Engagement
                  </p>
                </div>
                <Badge tone="default" className="text-[10px]">{sectionAnalytics.length}</Badge>
              </div>
              <Table>
                <THead className="bg-muted/20">
                  <TR>
                    <TH className="text-[10px] uppercase tracking-wider">Section</TH>
                    <TH className="text-right text-[10px] uppercase tracking-wider">Avg</TH>
                    <TH className="text-right text-[10px] uppercase tracking-wider">Sessions</TH>
                  </TR>
                </THead>
                <TBody>
                  {sectionAnalytics.length === 0 ? (
                    <TR>
                      <TD colSpan={3} className="py-8 text-center text-xs text-muted-foreground">
                        No results match your filters.
                      </TD>
                    </TR>
                  ) : (
                    sectionAnalytics.slice(0, 12).map((row) => (
                      <TR
                        key={`s-${row.section_id}`}
                        className="hover:bg-muted/30"
                      >
                        <TD className="text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex flex-col leading-tight">
                              <span className="font-medium">{row.section_name}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {row.subject_name}
                              </span>
                            </div>
                            <div className="hidden sm:block h-1.5 w-24 rounded-full bg-muted/40 overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{
                                  width: `${Math.min(100, Math.max(0, row.avg_engagement))}%`,
                                }}
                              />
                            </div>
                          </div>
                        </TD>
                        <TD className="text-right text-xs font-mono">
                          {row.avg_engagement.toFixed(1)}%
                        </TD>
                        <TD className="text-right text-xs font-mono">
                          {row.sessions}
                        </TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </div>
          )}
        </div>

        {/* Right: Recent Sessions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-bold tracking-tight">Recent Sessions</h3>
          </div>
          {data.recent_sessions.length ? (
            <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden shadow-sm">
              <Table>
                <THead className="bg-muted/30">
                  <TR>
                    <TH className="py-2.5 text-[10px] uppercase tracking-wider">Session</TH>
                    <TH className="text-[10px] uppercase tracking-wider">Teacher</TH>
                    <TH className="text-[10px] uppercase tracking-wider">Subject & Section</TH>
                    <TH className="text-center text-[10px] uppercase tracking-wider">Studs</TH>
                    <TH className="text-[10px] uppercase tracking-wider">Engagement</TH>
                    <TH className="text-right pr-6 text-[10px] uppercase tracking-wider">Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.recent_sessions.map((s) => (
                    <TR
                      key={s.id}
                      className="group cursor-pointer hover:bg-muted/40 transition-colors border-border/40"
                      onClick={() => openSessionDetail(s)}
                    >
                      <TD className="py-2">
                        <span className="font-mono text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded">
                          #{s.id}
                        </span>
                      </TD>
                      <TD>
                        <div className="flex items-center gap-2">
                          <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted">
                            {s.teacher_profile_picture_url ? (
                              <img
                                src={s.teacher_profile_picture_url}
                                alt={teacherName(s)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                {teacherName(s).charAt(0)}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-xs">
                            {currentActorUserId !== null &&
                              s.teacher_id === currentActorUserId
                              ? "You"
                              : teacherName(s)}
                          </span>
                        </div>
                      </TD>
                      <TD>
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium text-xs">{s.subject_name}</span>
                          <span className="text-[9px] text-muted-foreground">{s.section_name}</span>
                        </div>
                      </TD>
                      <TD className="text-center">
                        <span className="text-xs font-medium">{s.students_present}</span>
                      </TD>
                      <TD>
                        <div
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold",
                            s.average_engagement >= 85
                              ? "border-success/40 bg-success/10 text-success"
                              : s.average_engagement >= 60
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : s.average_engagement >= 40
                                  ? "border-warning/40 bg-warning/10 text-warning"
                                  : "border-danger/40 bg-danger/10 text-danger"
                          )}
                        >
                          {s.average_engagement.toFixed(0)}%
                        </div>
                      </TD>
                      <TD className="text-right pr-6">
                        <Badge
                          tone={s.is_active ? "success" : "default"}
                          className={cn("h-4 text-[9px] px-1.5 uppercase font-bold tracking-wider", s.is_active && "bg-success text-white")}
                        >
                          {s.is_active ? "Live" : "Ended"}
                        </Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground px-1">
              No recent sessions.
            </p>
          )}
        </div>
      </div>

      {/* Session Detail Drawer */}
      <Drawer
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={
          activeSessionInView
            ? `Intelligence View #${activeSessionInView.id}`
            : "Session details"
        }
        description={
          activeSessionInView
            ? `${activeSessionInView.subject_name} • ${activeSessionInView.section_name}`
            : "Behavior analytics and historical data"
        }
        widthClassName="max-w-5xl"
      >
        {activeSessionInView?.is_active && (
          <div className="mb-4 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/50">
            <span className="inline-flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${syncingLive ? "bg-warning animate-pulse" : "bg-success"}`}
              />
              {syncingLive
                ? "Syncing live behavioral data..."
                : "Live synchronization active (3s)"}
            </span>
            <span>
              {lastRefreshAt
                ? `Last update: ${lastRefreshAt.toLocaleTimeString()}`
                : "Initializing stream..."}
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
              <p className="rounded-md border border-danger/20 bg-danger/5 p-3 text-xs text-danger font-medium">
                {detailError}
              </p>
            )}
            <SessionDetailView detail={detail} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Radio className="h-10 w-10 text-muted-foreground/20 animate-pulse mb-4" />
            <p className="text-sm text-muted-foreground font-medium">
              Connecting to session intelligence stream...
            </p>
          </div>
        )}
      </Drawer>

      <Drawer
        open={isTeacherOpen}
        onClose={() => setIsTeacherOpen(false)}
        title=""
        description=""
        widthClassName="max-w-4xl"
      >
        <div className="space-y-6">
          <div className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="relative">
                <div className="h-20 w-20 overflow-hidden rounded-xl border border-border bg-muted">
                  {activeTeacherRow?.profile_picture_url ? (
                    <img
                      src={activeTeacherRow.profile_picture_url}
                      alt={activeTeacherRow.teacher_fullname ?? activeTeacherRow.teacher_username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
                      {(activeTeacherRow?.teacher_fullname ?? activeTeacherRow?.teacher_username ?? "?").charAt(0)}
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-2 -right-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card shadow-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                </span>
              </div>

              <div className="flex-1 space-y-3">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {activeTeacherRow
                    ? currentActorUserId !== null &&
                      activeTeacherRow.teacher_id === currentActorUserId
                      ? "You"
                      : (activeTeacherRow.teacher_fullname ?? activeTeacherRow.teacher_username)
                    : "Teacher"}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="default" className="gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {activeTeacherStats.sessions} session
                    {activeTeacherStats.sessions === 1 ? "" : "s"}
                  </Badge>
                  <Badge tone="default" className="gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {activeTeacherStats.students} students
                  </Badge>
                  <Badge tone="default" className="gap-1.5">
                    <Award className="h-3.5 w-3.5" />
                    {activeTeacherStats.avgEngagement.toFixed(1)}% avg engagement
                  </Badge>
                </div>
              </div>

              <div className="lg:text-right">
                <p className="text-3xl font-semibold">
                  {activeTeacherStats.avgEngagement.toFixed(0)}%
                </p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Overall Score
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">Best</span>
                </div>
                <p className="text-2xl font-semibold">
                  {activeTeacherStats.bestEngagement.toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Peak performance</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">Average</span>
                </div>
                <p className="text-2xl font-semibold">
                  {activeTeacherStats.avgEngagement.toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Consistent level</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between text-muted-foreground">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">Lowest</span>
                </div>
                <p className="text-2xl font-semibold">
                  {activeTeacherStats.worstEngagement.toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Needs attention</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">Total</span>
                </div>
                <p className="text-2xl font-semibold">
                  {activeTeacherStats.buckets.high +
                    activeTeacherStats.buckets.mid +
                    activeTeacherStats.buckets.low}
                </p>
                <p className="text-xs text-muted-foreground">Sessions tracked</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-background p-4 text-center">
              <p className="text-2xl font-semibold">{activeTeacherStats.buckets.high}</p>
              <p className="mt-1 text-xs text-muted-foreground">High (80%+)</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-success"
                  style={{
                    width: `${(activeTeacherStats.buckets.high /
                      Math.max(
                        1,
                        activeTeacherStats.buckets.high +
                        activeTeacherStats.buckets.mid +
                        activeTeacherStats.buckets.low
                      )) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background p-4 text-center">
              <p className="text-2xl font-semibold">{activeTeacherStats.buckets.mid}</p>
              <p className="mt-1 text-xs text-muted-foreground">Medium (50-79%)</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-warning"
                  style={{
                    width: `${(activeTeacherStats.buckets.mid /
                      Math.max(
                        1,
                        activeTeacherStats.buckets.high +
                        activeTeacherStats.buckets.mid +
                        activeTeacherStats.buckets.low
                      )) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background p-4 text-center">
              <p className="text-2xl font-semibold">{activeTeacherStats.buckets.low}</p>
              <p className="mt-1 text-xs text-muted-foreground">Low (&lt;50%)</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-danger"
                  style={{
                    width: `${(activeTeacherStats.buckets.low /
                      Math.max(
                        1,
                        activeTeacherStats.buckets.high +
                        activeTeacherStats.buckets.mid +
                        activeTeacherStats.buckets.low
                      )) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Top Performing Classes</h3>
                <p className="text-sm text-muted-foreground">
                  Classes with most sessions and highest engagement
                </p>
              </div>
              <Badge tone="default" className="text-xs">
                {activeTeacherStats.topSections.length}
              </Badge>
            </div>
            {activeTeacherStats.topSections.length ? (
              activeTeacherStats.topSections.map((row, index) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-sm font-semibold text-primary">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{row.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.sessions} session{row.sessions === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{row.avg.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">avg engagement</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <BookOpen className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p className="text-sm">No sessions match your current filters.</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Recent Sessions</h3>
                <p className="text-sm text-muted-foreground">
                  Latest teaching activities and performance
                </p>
              </div>
              <Badge tone="default" className="text-xs">
                {activeTeacherSessions.slice(0, 6).length}
              </Badge>
            </div>
            {activeTeacherSessions.slice(0, 6).length ? (
              activeTeacherSessions.slice(0, 6).map((s) => (
                <button
                  key={`t-s-${s.id}`}
                  type="button"
                  onClick={() => openSessionDetail(s)}
                  className="group w-full rounded-xl border border-border bg-background p-4 text-left transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {s.subject_name} - {s.section_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Session #{s.id} - {s.students_present ?? 0} students
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                          s.average_engagement >= 85
                            ? "border-success/35 bg-success/10 text-success"
                            : s.average_engagement >= 60
                              ? "border-primary/35 bg-primary/10 text-primary"
                              : s.average_engagement >= 40
                                ? "border-warning/35 bg-warning/10 text-warning"
                                : "border-danger/35 bg-danger/10 text-danger"
                        )}
                      >
                        {s.average_engagement.toFixed(0)}%
                      </span>
                      {s.is_active ? (
                        <Badge tone="success" className="gap-1 text-[10px] uppercase">
                          <Zap className="h-3 w-3" />
                          Live
                        </Badge>
                      ) : null}
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Calendar className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p className="text-sm">No sessions match your current filters.</p>
              </div>
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
}
