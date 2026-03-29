"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  List,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { getSessionDetail, getSessions, getTeachers, getColleges, getMajors } from "@/features/admin/api";
import type { AdminSession, AdminSessionDetail, AdminTeacher, AdminCollege, AdminMajor } from "@/features/admin/types";
import { TeacherSelect } from "@/features/admin/components/teacher-select";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { SessionDetailView } from "@/features/admin/components/session-detail-view";
import { getCurrentActorUserId } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

function teacherName(session: AdminSession): string {
  return session.teacher_fullname?.trim() || session.teacher_username;
}

function fmt(dt: string | null): string {
  if (!dt) return "-";
  return new Date(dt).toLocaleString();
}

type DropdownOption<T extends string | number> = {
  value: T;
  label: string;
};

type PillDropdownProps<T extends string | number> = {
  icon: ReactNode;
  label: string;
  value: T;
  options: ReadonlyArray<DropdownOption<T>>;
  onChange: (value: T) => void;
  disabled?: boolean;
  widthClassName?: string;
  align?: "left" | "right";
};

function PillDropdown<T extends string | number>({
  icon,
  label,
  value,
  options,
  onChange,
  disabled = false,
  widthClassName = "min-w-[180px]",
  align = "left",
}: PillDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function onDocumentClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", widthClassName)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-xl border border-border/60 bg-background px-2.5 text-left transition-colors",
          "hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span className="text-muted-foreground">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="truncate text-xs font-semibold text-foreground">{selected?.label ?? "-"}</p>
        </div>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute top-11 z-[120] max-h-72 overflow-y-auto rounded-xl border border-border/70 bg-card p-1.5 shadow-xl",
            widthClassName,
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent",
                )}
              >
                <span className="truncate">{option.label}</span>
                {isActive ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function SessionsPage() {
  const { notify } = useToast();
  const [items, setItems] = useState<AdminSession[]>([]);
  const [activeItems, setActiveItems] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminSessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"teachers" | "sections">("teachers");
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "ended">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "engagement-high" | "engagement-low" | "students-most">("engagement-high");
  const [engagementPreset, setEngagementPreset] = useState<"all" | "high" | "low">("all");
  const [minEngagement, setMinEngagement] = useState("");
  const [maxEngagement, setMaxEngagement] = useState("");

  const [teacherFilter, setTeacherFilter] = useState<number | null>(null);
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [colleges, setColleges] = useState<AdminCollege[]>([]);
  const [majors, setMajors] = useState<AdminMajor[]>([]);
  const [collegeFilter, setCollegeFilter] = useState<number | null>(null);
  const [majorFilter, setMajorFilter] = useState<number | null>(null);

  const currentActorUserId = useMemo(() => getCurrentActorUserId(), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, activeRes, teachersRes, collegesRes] = await Promise.all([
        getSessions("?limit=500"),
        getSessions("?is_active=true&limit=50"),
        getTeachers("?limit=300"),
        getColleges("?limit=100"),
      ]);
      setItems(allRes.items);
      setActiveItems(activeRes.items);
      setTeachers(teachersRes.items);
      setColleges(collegesRes.items);
    } catch (error) {
      notify({
        tone: "danger",
        title: "Load failed",
        description: getErrorMessage(error, "Unable to load sessions."),
      });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (collegeFilter) {
      getMajors(collegeFilter)
        .then((res) => setMajors(res.items))
        .catch(() => setMajors([]));
    } else {
      setMajors([]);
      setMajorFilter(null);
    }
  }, [collegeFilter]);

  const applyFilters = useCallback(
    (source: AdminSession[]) => {
      let result = [...source];

      const query = searchQuery.trim().toLowerCase();
      if (query) {
        result = result.filter((s) => {
          const teacherFields = `${s.teacher_username} ${(s.teacher_fullname ?? "")}`.toLowerCase();
          const sectionFields = `${s.subject_name} ${s.section_name}`.toLowerCase();
          const scopeMatch = viewMode === "teachers" ? teacherFields.includes(query) : sectionFields.includes(query);
          return scopeMatch || teacherFields.includes(query) || sectionFields.includes(query) || s.id.toString().includes(query);
        });
      }

      if (statusFilter !== "all") {
        result = result.filter((s) => (statusFilter === "live" ? s.is_active : !s.is_active));
      }

      if (teacherFilter) {
        result = result.filter((s) => s.teacher_id === teacherFilter);
      }

      if (collegeFilter) {
        result = result.filter((s) => s.college_id === collegeFilter);
      }

      if (majorFilter) {
        result = result.filter((s) => s.major_id === majorFilter);
      }

      if (engagementPreset === "high") {
        result = result.filter((s) => s.average_engagement >= 80);
      }
      if (engagementPreset === "low") {
        result = result.filter((s) => s.average_engagement < 50);
      }

      const min = minEngagement.trim() ? Number(minEngagement) : null;
      const max = maxEngagement.trim() ? Number(maxEngagement) : null;
      if (min !== null && Number.isFinite(min)) {
        result = result.filter((s) => s.average_engagement >= min);
      }
      if (max !== null && Number.isFinite(max)) {
        result = result.filter((s) => s.average_engagement <= max);
      }

      result.sort((a, b) => {
        switch (sortBy) {
          case "newest":
            return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
          case "oldest":
            return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
          case "engagement-high":
            return b.average_engagement - a.average_engagement;
          case "engagement-low":
            return a.average_engagement - b.average_engagement;
          case "students-most":
            return b.students_present - a.students_present;
          default:
            return 0;
        }
      });

      return result;
    },
    [searchQuery, viewMode, statusFilter, teacherFilter, collegeFilter, majorFilter, engagementPreset, minEngagement, maxEngagement, sortBy],
  );

  const filteredAndSortedItems = useMemo(() => applyFilters(items), [items, applyFilters]);

  const filteredActiveItems = useMemo(
    () => applyFilters(activeItems).filter((row) => row.is_active).slice(0, 8),
    [activeItems, applyFilters],
  );

  const statusOptions = useMemo(
    () =>
      [
        { value: "all", label: "All Sessions" },
        { value: "live", label: "Live Only" },
        { value: "ended", label: "Ended Only" },
      ],
    [],
  );

  const sortOptions = useMemo(
    () =>
      [
        { value: "engagement-high", label: "High -> Low" },
        { value: "engagement-low", label: "Low -> High" },
        { value: "newest", label: "Newest First" },
        { value: "oldest", label: "Oldest First" },
        { value: "students-most", label: "Most Students" },
      ],
    [],
  );

  const collegeOptions = useMemo(
    () => [{ value: "all" as const, label: "All Colleges" }, ...colleges.map((college) => ({ value: college.id, label: college.name }))],
    [colleges],
  );

  const majorOptions = useMemo(
    () => [{ value: "all" as const, label: "All Majors" }, ...majors.map((major) => ({ value: major.id, label: major.name }))],
    [majors],
  );

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTeacherFilter(null);
    setCollegeFilter(null);
    setMajorFilter(null);
    setSortBy("engagement-high");
    setEngagementPreset("all");
    setMinEngagement("");
    setMaxEngagement("");
    setViewMode("teachers");
  };

  const openDetail = useCallback(
    async (sessionId: number) => {
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
          description: getErrorMessage(error, "Please retry."),
        });
      } finally {
        setLoadingDetail(false);
      }
    },
    [notify],
  );

  const exportCSV = () => {
    const headers = ["ID", "Teacher", "Subject", "Section", "Students", "Start Time", "End Time", "Engagement"];
    const rows = filteredAndSortedItems.map((s) => [
      s.id,
      currentActorUserId !== null && s.teacher_id === currentActorUserId ? "You" : teacherName(s),
      s.subject_name,
      s.section_name,
      s.students_present,
      s.start_time ? new Date(s.start_time).toLocaleString() : "-",
      s.end_time ? new Date(s.end_time).toLocaleString() : "-",
      `${s.average_engagement}%`,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sessions_report_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportModalOpen(false);
  };

  const exportPDF = () => {
    if (typeof window === "undefined") return;
    const doc = new jsPDF();
    const logoUrl = "/brand/logo.png";
    const title = "TEACHTRACK SESSION INTELLIGENCE REPORT";
    const dateStr = `Generated on: ${new Date().toLocaleString()}`;

    const img = new Image();
    img.src = logoUrl;
    img.onload = () => {
      try {
        doc.addImage(img, "PNG", 85, 10, 40, 15);

        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40);
        doc.text(title, 105, 35, { align: "center" });

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(dateStr, 105, 42, { align: "center" });

        const tableData = filteredAndSortedItems.map((s) => [
          s.id,
          currentActorUserId !== null && s.teacher_id === currentActorUserId ? "You" : teacherName(s),
          `${s.subject_name}\n(${s.section_name})`,
          s.students_present,
          `${new Date(s.start_time).toLocaleDateString()}\n${new Date(s.start_time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          `${s.average_engagement.toFixed(1)}%`,
        ]);

        autoTable(doc, {
          head: [["ID", "Teacher", "Subject & Section", "Studs", "Start Time", "Engagement"]],
          body: tableData,
          startY: 50,
          theme: "striped",
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 10, fontStyle: "bold" },
          bodyStyles: { fontSize: 9 },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          columnStyles: {
            5: { fontStyle: "bold", halign: "right" },
          },
        });

        doc.save(`sessions_report_${new Date().toISOString().split("T")[0]}.pdf`);
        setIsExportModalOpen(false);
      } catch {
        doc.save(`sessions_report_${new Date().toISOString().split("T")[0]}.pdf`);
        setIsExportModalOpen(false);
      }
    };
    img.onerror = () => {
      doc.setFontSize(18);
      doc.text(title, 105, 20, { align: "center" });
      doc.save(`sessions_report_${new Date().toISOString().split("T")[0]}.pdf`);
    };
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title={
            <>
              <BarChart3 className="h-5 w-5" />
              Sessions
            </>
          }
          description="Monitor live sessions and view intelligence details."
        />

        {!loading && filteredActiveItems.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Active sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <THead>
                  <TR>
                    <TH>ID</TH>
                    <TH>Teacher</TH>
                    <TH>Subject</TH>
                    <TH>Section</TH>
                    <TH>Students</TH>
                    <TH>Engagement</TH>
                  </TR>
                </THead>
                <TBody>
                  {filteredActiveItems.map((s) => (
                    <TR
                      key={`active-${s.id}`}
                      className="cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => openDetail(s.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openDetail(s.id);
                        }
                      }}
                    >
                      <TD>{s.id}</TD>
                      <TD>
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                            {s.teacher_profile_picture_url ? (
                              <img src={s.teacher_profile_picture_url} alt={teacherName(s)} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[8px] font-bold uppercase text-muted-foreground">{teacherName(s).charAt(0)}</span>
                            )}
                          </div>
                          <span>{currentActorUserId !== null && s.teacher_id === currentActorUserId ? "You" : teacherName(s)}</span>
                        </div>
                      </TD>
                      <TD>{s.subject_name}</TD>
                      <TD>{s.section_name}</TD>
                      <TD>{s.students_present}</TD>
                      <TD>{s.average_engagement}%</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}

        <Card className="overflow-visible border-border/70 bg-card/40">
          <div className="space-y-3 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={viewMode === "teachers" ? "Search teacher / subject / section..." : "Search section / subject / teacher..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 rounded-xl border-border/60 bg-background pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-xl border border-border/60 bg-background p-1">
                  <Button
                    size="sm"
                    variant={viewMode === "teachers" ? "default" : "ghost"}
                    className="h-7 rounded-lg text-xs"
                    onClick={() => setViewMode("teachers")}
                  >
                    <Users className="mr-1.5 h-3.5 w-3.5" />
                    Teachers
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "sections" ? "default" : "ghost"}
                    className="h-7 rounded-lg text-xs"
                    onClick={() => setViewMode("sections")}
                  >
                    <List className="mr-1.5 h-3.5 w-3.5" />
                    Sections
                  </Button>
                </div>

                <PillDropdown
                  icon={<ArrowDownUp className="h-3.5 w-3.5" />}
                  label="Sorting"
                  value={sortBy}
                  options={sortOptions}
                  onChange={(value) => setSortBy(value as typeof sortBy)}
                  widthClassName="min-w-[190px]"
                  align="right"
                />

                <Button variant="outline" size="sm" onClick={() => setIsExportModalOpen(true)} className="h-8 gap-1.5">
                  <FileDown className="h-3.5 w-3.5" />
                  Export
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Engagement</span>
              {(["all", "high", "low"] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setEngagementPreset(preset)}
                  className={cn(
                    "h-7 rounded-full border px-3 text-[11px] font-semibold transition-all",
                    engagementPreset === preset
                      ? preset === "high"
                        ? "border-success/40 bg-success/10 text-success"
                        : preset === "low"
                          ? "border-danger/40 bg-danger/10 text-danger"
                          : "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {preset === "all" ? "All" : preset === "high" ? "High >=80%" : "Low <50%"}
                </button>
              ))}

              <div className="mx-1 hidden h-4 w-px bg-border/60 sm:block" />

              <PillDropdown
                icon={<List className="h-3.5 w-3.5" />}
                label="Status"
                value={statusFilter}
                options={statusOptions}
                onChange={(value) => setStatusFilter(value as typeof statusFilter)}
                widthClassName="min-w-[170px]"
              />

              <PillDropdown
                icon={<GraduationCap className="h-3.5 w-3.5" />}
                label="College"
                value={collegeFilter ?? "all"}
                options={collegeOptions}
                onChange={(value) => {
                  setCollegeFilter(value === "all" ? null : Number(value));
                  setMajorFilter(null);
                }}
                widthClassName="min-w-[210px]"
              />

              {collegeFilter ? (
                <PillDropdown
                  icon={<BookOpen className="h-3.5 w-3.5" />}
                  label="Major"
                  value={majorFilter ?? "all"}
                  options={majorOptions}
                  onChange={(value) => setMajorFilter(value === "all" ? null : Number(value))}
                  widthClassName="min-w-[210px]"
                />
              ) : null}

              <div className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background px-2.5 py-1">
                <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="min-w-[180px]">
                  <TeacherSelect
                    teachers={teachers}
                    value={teacherFilter}
                    onChange={setTeacherFilter}
                    placeholder="All Teachers"
                    triggerClassName="!h-6 border-none !px-0 bg-transparent !min-h-0 !text-xs !font-semibold"
                  />
                </div>
                {teacherFilter ? (
                  <button type="button" onClick={() => setTeacherFilter(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background px-2.5 py-1">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={minEngagement}
                  onChange={(e) => setMinEngagement(e.target.value)}
                  placeholder="Min"
                  inputMode="numeric"
                  className="h-6 w-14 border-none bg-transparent p-0 text-xs font-semibold focus-visible:ring-0"
                />
                <span className="text-xs text-muted-foreground">-</span>
                <Input
                  value={maxEngagement}
                  onChange={(e) => setMaxEngagement(e.target.value)}
                  placeholder="Max"
                  inputMode="numeric"
                  className="h-6 w-14 border-none bg-transparent p-0 text-xs font-semibold focus-visible:ring-0"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>

              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAllFilters}>
                Clear all
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {collegeFilter ? (
                <Badge tone="default" className="gap-1">
                  {colleges.find((c) => c.id === collegeFilter)?.name ?? "College"}
                  <button type="button" onClick={() => setCollegeFilter(null)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ) : null}
              {majorFilter ? (
                <Badge tone="default" className="gap-1">
                  {majors.find((m) => m.id === majorFilter)?.code ?? "Major"}
                  <button type="button" onClick={() => setMajorFilter(null)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ) : null}
              {teacherFilter ? (
                <Badge tone="default" className="gap-1">
                  {teachers.find((t) => t.id === teacherFilter)?.fullname ?? "Teacher"}
                  <button type="button" onClick={() => setTeacherFilter(null)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ) : null}
            </div>
          </div>
        </Card>

        <Card className="border-none bg-transparent shadow-none">
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 rounded-xl border border-border/50 bg-card p-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : filteredAndSortedItems.length ? (
              <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
                <Table>
                  <THead className="bg-muted/30">
                    <TR>
                      <TH className="py-4">Session</TH>
                      <TH>Teacher</TH>
                      <TH>Subject & Section</TH>
                      <TH className="text-center">Students</TH>
                      <TH>Time Range</TH>
                      <TH className="pr-6 text-right">Engagement</TH>
                      <TH>Status</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {filteredAndSortedItems.map((s) => (
                      <TR
                        key={s.id}
                        className="group cursor-pointer border-border/40 transition-colors hover:bg-muted/40"
                        role="button"
                        tabIndex={0}
                        onClick={() => openDetail(s.id)}
                      >
                        <TD className="py-4">
                          <span className="rounded bg-muted px-2 py-1 font-mono text-xs font-bold">#{s.id}</span>
                        </TD>
                        <TD>
                          <div className="flex items-center gap-3">
                            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted ring-2 ring-transparent transition-all group-hover:ring-primary/20">
                              {s.teacher_profile_picture_url ? (
                                <img src={s.teacher_profile_picture_url} alt={teacherName(s)} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold uppercase text-muted-foreground">{teacherName(s).charAt(0)}</span>
                              )}
                            </div>
                            <span className="text-sm font-semibold">{currentActorUserId !== null && s.teacher_id === currentActorUserId ? "You" : teacherName(s)}</span>
                          </div>
                        </TD>
                        <TD>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{s.subject_name}</span>
                            <span className="text-xs text-muted-foreground">{s.section_name}</span>
                          </div>
                        </TD>
                        <TD className="text-center">
                          <span className="inline-flex items-center gap-1 text-sm font-medium">
                            {s.students_present}
                            <span className="text-[10px] font-normal text-muted-foreground">studs</span>
                          </span>
                        </TD>
                        <TD>
                          <div className="flex flex-col gap-0.5 text-[11px]">
                            <span className="text-muted-foreground">
                              Start: <span className="font-medium text-foreground">{fmt(s.start_time)}</span>
                            </span>
                            <span className="text-muted-foreground">
                              End: <span className="font-medium text-foreground">{fmt(s.end_time)}</span>
                            </span>
                          </div>
                        </TD>
                        <TD className="pr-6 text-right">
                          <div
                            className={cn(
                              "inline-flex flex-col items-end rounded-lg border px-3 py-1.5",
                              s.average_engagement >= 85
                                ? "border-success/40 bg-success/10 text-success"
                                : s.average_engagement >= 60
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : s.average_engagement >= 40
                                    ? "border-warning/40 bg-warning/10 text-warning"
                                    : "border-danger/40 bg-danger/10 text-danger",
                            )}
                          >
                            <span className="text-sm font-black leading-none tracking-tighter">{s.average_engagement.toFixed(1)}%</span>
                            <span className="mt-0.5 text-[9px] font-bold uppercase opacity-80">Engagement</span>
                          </div>
                        </TD>
                        <TD>
                          <Badge tone={s.is_active ? "success" : "default"} className="text-[9px] font-bold uppercase tracking-wider">
                            {s.is_active ? "Live" : "Ended"}
                          </Badge>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20">
                <Search className="mb-3 h-10 w-10 text-muted-foreground/20" />
                <p className="text-sm font-medium text-muted-foreground">No sessions match your current filters.</p>
                <Button variant="ghost" onClick={clearAllFilters} className="mt-2 text-primary">
                  Clear filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Drawer
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Intelligence View #${selectedSessionId ?? "-"}`}
        description="Detailed behavior analytics and historical trends."
        widthClassName="max-w-5xl"
      >
        {loadingDetail ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : detail ? (
          <SessionDetailView detail={detail} />
        ) : (
          <p className="text-sm text-muted-foreground">No detail available.</p>
        )}
      </Drawer>

      <Modal
        open={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Session Intelligence"
        description="Choose your preferred format for the filtered sessions dataset."
        className="max-w-md"
      >
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={exportPDF}
            className="group flex flex-col items-center justify-center rounded-xl border border-border p-6 transition-all hover:border-primary/50 hover:bg-primary/[0.02]"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 transition-transform group-hover:scale-110">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <span className="text-sm font-bold">PDF Report</span>
            <span className="mt-1 text-[10px] text-muted-foreground">Branded & Formatted</span>
          </button>

          <button
            onClick={exportCSV}
            className="group flex flex-col items-center justify-center rounded-xl border border-border p-6 transition-all hover:border-success/50 hover:bg-success/[0.02]"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 transition-transform group-hover:scale-110">
              <FileSpreadsheet className="h-6 w-6 text-success" />
            </div>
            <span className="text-sm font-bold">CSV Spreadsheet</span>
            <span className="mt-1 text-[10px] text-muted-foreground">Raw Data & Excel</span>
          </button>
        </div>
      </Modal>
    </>
  );
}

