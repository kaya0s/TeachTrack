"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Search, SortAsc, FileDown, FileText, FileSpreadsheet, ChevronDown, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

import { SessionTrendChart } from "@/components/session-trend-chart";
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
import { SearchBar } from "@/components/ui/search-bar";
import { getCurrentActorUserId } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

function teacherName(session: AdminSession): string {
  return session.teacher_fullname?.trim() || session.teacher_username;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "ended">("all");
  const [teacherFilter, setTeacherFilter] = useState<number | null>(null);
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [colleges, setColleges] = useState<AdminCollege[]>([]);
  const [majors, setMajors] = useState<AdminMajor[]>([]);
  const [collegeFilter, setCollegeFilter] = useState<number | null>(null);
  const [majorFilter, setMajorFilter] = useState<number | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const currentActorUserId = useMemo(() => getCurrentActorUserId(), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, activeRes, teachersRes] = await Promise.all([
        getSessions("?limit=500"),
        getSessions("?is_active=true&limit=50"),
        getTeachers("?limit=200")
      ]);
      setItems(allRes.items);
      setActiveItems(activeRes.items);
      setTeachers(teachersRes.items);

      const collegesRes = await getColleges("?limit=100");
      setColleges(collegesRes.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (collegeFilter) {
      getMajors(collegeFilter).then(res => setMajors(res.items));
    } else {
      setMajors([]);
      setMajorFilter(null);
    }
  }, [collegeFilter]);

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.teacher_username.toLowerCase().includes(q) ||
        (s.teacher_fullname ?? "").toLowerCase().includes(q) ||
        s.subject_name.toLowerCase().includes(q) ||
        s.section_name.toLowerCase().includes(q) ||
        s.id.toString().includes(q)
      );
    }

    // Status Filter
    if (statusFilter !== "all") {
      result = result.filter(s => statusFilter === "live" ? s.is_active : !s.is_active);
    }

    // Teacher Filter
    if (teacherFilter) {
      result = result.filter(s => s.teacher_id === teacherFilter);
    }

    // College Filter
    if (collegeFilter) {
      result = result.filter(s => s.college_id === collegeFilter);
    }

    // Major Filter
    if (majorFilter) {
      result = result.filter(s => s.major_id === majorFilter);
    }

    // Sort
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
  }, [items, searchQuery, sortBy, statusFilter, teacherFilter]);

  const engagementTone = (score: number) => {
    if (score >= 85) return "success";
    if (score >= 60) return "default";
    if (score >= 40) return "warning";
    return "danger";
  };

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
        description: getErrorMessage(error, "Please retry."),
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

  const exportCSV = () => {
    const headers = ["ID", "Teacher", "Subject", "Section", "Students", "Start Time", "End Time", "Engagement"];
    const rows = filteredAndSortedItems.map(s => [
      s.id,
      (currentActorUserId !== null && s.teacher_id === currentActorUserId) ? "You" : teacherName(s),
      s.subject_name,
      s.section_name,
      s.students_present,
      s.start_time ? new Date(s.start_time).toLocaleString() : "-",
      s.end_time ? new Date(s.end_time).toLocaleString() : "-",
      `${s.average_engagement}%`
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
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

        const tableData = filteredAndSortedItems.map(s => [
          s.id,
          (currentActorUserId !== null && s.teacher_id === currentActorUserId) ? "You" : teacherName(s),
          `${s.subject_name}\n(${s.section_name})`,
          s.students_present,
          `${new Date(s.start_time).toLocaleDateString()}\n${new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          `${s.average_engagement.toFixed(1)}%`
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
            5: { fontStyle: "bold", halign: "right" }
          }
        });

        doc.save(`sessions_report_${new Date().toISOString().split("T")[0]}.pdf`);
        setIsExportModalOpen(false);
      } catch (err) {
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
        <PageHeader title={<><BarChart3 className="h-5 w-5" />Sessions</>} description="Monitor live sessions and view intelligence details." />

        {!loading && activeItems.length ? (
          <Card>
            <CardHeader><CardTitle>Active sessions</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <THead><TR><TH>ID</TH><TH>Teacher</TH><TH>Subject</TH><TH>Section</TH><TH>Students</TH><TH>Engagement</TH></TR></THead>
                <TBody>
                  {activeItems.map((s) => (
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
                              <span className="text-[8px] font-bold uppercase text-muted-foreground">
                                {teacherName(s).charAt(0)}
                              </span>
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

        <Card className="border-none shadow-none bg-transparent">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <SearchBar
              placeholder="Search by teacher, subject or ID..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
            <div className="flex flex-wrap items-center gap-3">
              <div className="group relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-card border border-border/60 shadow-sm hover:border-primary/40 transition-all duration-200">
                <Filter className="h-3.5 w-3.5 text-muted-foreground/70 group-hover:text-primary transition-colors" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-black text-muted-foreground/50 tracking-wider leading-none mb-0.5">Status</span>
                  <div className="flex items-center">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer appearance-none"
                    >
                      <option value="all" className="bg-card">All Sessions</option>
                      <option value="live" className="bg-card">Live Only</option>
                      <option value="ended" className="bg-card">Ended Only</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="group relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-card border border-border/60 shadow-sm hover:border-primary/40 transition-all duration-200 min-w-[160px]">
                <div className="flex flex-col w-full">
                  <span className="text-[9px] uppercase font-black text-muted-foreground/50 tracking-wider leading-none mb-0.5">Teacher</span>
                  <div className="flex items-center justify-between w-full">
                    <TeacherSelect
                      teachers={teachers}
                      value={teacherFilter}
                      onChange={(id) => setTeacherFilter(id)}
                      placeholder="All Teachers"
                      triggerClassName="!h-4 border-none !px-0 bg-transparent !min-h-0 !text-xs !font-bold"
                      className="w-full"
                    />
                    {teacherFilter && (
                      <button
                        onClick={() => setTeacherFilter(null)}
                        className="text-[9px] font-black text-primary hover:text-primary/70 ml-2 uppercase tracking-tighter"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-card border border-border/60 shadow-sm hover:border-primary/40 transition-all duration-200">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-black text-muted-foreground/50 tracking-wider leading-none mb-0.5">College</span>
                  <div className="flex items-center">
                    <select
                      value={collegeFilter ?? "all"}
                      onChange={(e) => setCollegeFilter(e.target.value === "all" ? null : Number(e.target.value))}
                      className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer appearance-none"
                    >
                      <option value="all" className="bg-card">All Colleges</option>
                      {colleges.map(c => (
                        <option key={c.id} value={c.id} className="bg-card">{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {collegeFilter && (
                  <button onClick={() => setCollegeFilter(null)} className="ml-1 text-muted-foreground hover:text-primary">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {collegeFilter && (
                <div className="group relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-card border border-border/60 shadow-sm hover:border-primary/40 transition-all duration-200">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-black text-muted-foreground/50 tracking-wider leading-none mb-0.5">Major</span>
                    <div className="flex items-center">
                      <select
                        value={majorFilter ?? "all"}
                        onChange={(e) => setMajorFilter(e.target.value === "all" ? null : Number(e.target.value))}
                        className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer appearance-none"
                      >
                        <option value="all" className="bg-card">All Majors</option>
                        {majors.map(m => (
                          <option key={m.id} value={m.id} className="bg-card">{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {majorFilter && (
                    <button onClick={() => setMajorFilter(null)} className="ml-1 text-muted-foreground hover:text-primary">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}

              <div className="group relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-card border border-border/60 shadow-sm hover:border-indigo-500/40 transition-all duration-200">
                <SortAsc className="h-3.5 w-3.5 text-muted-foreground/70 group-hover:text-indigo-500 transition-colors" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-black text-muted-foreground/50 tracking-wider leading-none mb-0.5">Sorting</span>
                  <div className="flex items-center">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer appearance-none"
                    >
                      <option value="newest" className="bg-card text-foreground">Newest First</option>
                      <option value="oldest" className="bg-card text-foreground">Oldest First</option>
                      <option value="engagement-high" className="bg-card text-foreground">Highest Engagement</option>
                      <option value="engagement-low" className="bg-card text-foreground">Lowest Engagement</option>
                      <option value="students-most" className="bg-card text-foreground">Most Students</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pl-2 ml-auto border-l border-border/50">
                <Button variant="outline" size="sm" onClick={() => setIsExportModalOpen(true)} className="h-9 gap-2 border-primary/20 hover:border-primary/50 text-primary">
                  <FileDown className="h-4 w-4" />
                  <span className="text-xs font-bold">Export</span>
                </Button>
              </div>
            </div>
          </div>

          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 bg-card rounded-xl p-4 border border-border/50">
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : filteredAndSortedItems.length ? (
              <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
                <Table>
                  <THead className="bg-muted/30">
                    <TR>
                      <TH className="py-4">Session</TH>
                      <TH>Teacher</TH>
                      <TH>Subject & Section</TH>
                      <TH className="text-center">Students</TH>
                      <TH>Time Range</TH>
                      <TH className="text-right pr-6">Engagement</TH>
                      <TH>Status</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {filteredAndSortedItems.map((s) => (
                      <TR
                        key={s.id}
                        className="group cursor-pointer hover:bg-muted/40 transition-colors border-border/40"
                        role="button"
                        tabIndex={0}
                        onClick={() => openDetail(s.id)}
                      >
                        <TD className="py-4">
                          <span className="font-mono text-xs font-bold bg-muted px-2 py-1 rounded">#{s.id}</span>
                        </TD>
                        <TD>
                          <div className="flex items-center gap-3">
                            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                              {s.teacher_profile_picture_url ? (
                                <img src={s.teacher_profile_picture_url} alt={teacherName(s)} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold uppercase text-muted-foreground">
                                  {teacherName(s).charAt(0)}
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-sm">{currentActorUserId !== null && s.teacher_id === currentActorUserId ? "You" : teacherName(s)}</span>
                          </div>
                        </TD>
                        <TD>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{s.subject_name}</span>
                            <span className="text-xs text-muted-foreground">{s.section_name}</span>
                          </div>
                        </TD>
                        <TD className="text-center">
                          <span className="inline-flex items-center gap-1 text-sm font-medium">
                            {s.students_present}
                            <span className="text-[10px] text-muted-foreground font-normal">studs</span>
                          </span>
                        </TD>
                        <TD>
                          <div className="flex flex-col text-[11px] gap-0.5">
                            <span className="text-muted-foreground">Start: <span className="text-foreground font-medium">{fmt(s.start_time)}</span></span>
                            <span className="text-muted-foreground">End: <span className="text-foreground font-medium">{fmt(s.end_time)}</span></span>
                          </div>
                        </TD>
                        <TD className="text-right pr-6">
                          <div className={cn(
                            "inline-flex flex-col items-end px-3 py-1.5 rounded-lg border",
                            s.average_engagement >= 85 ? "border-success/40 bg-success/10 text-success" :
                              s.average_engagement >= 60 ? "border-primary/40 bg-primary/10 text-primary" :
                                s.average_engagement >= 40 ? "border-warning/40 bg-warning/10 text-warning" :
                                  "border-danger/40 bg-danger/10 text-danger"
                          )}>
                            <span className="text-sm font-black tracking-tighter leading-none">{s.average_engagement.toFixed(1)}%</span>
                            <span className="text-[9px] uppercase font-bold opacity-80 mt-0.5">Engagement</span>
                          </div>
                        </TD>
                        <TD>
                          <Badge tone={s.is_active ? "success" : "default"} className="uppercase text-[9px] font-bold tracking-wider">
                            {s.is_active ? "Live" : "Ended"}
                          </Badge>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-card rounded-xl border border-dashed border-border">
                <Search className="h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No sessions match your search.</p>
                <Button variant="ghost" onClick={() => setSearchQuery("")} className="mt-2 text-primary">Clear search</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Drawer
        open={isDetailOpen}
        onClose={closeDetail}
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
            className="flex flex-col items-center justify-center p-6 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/[0.02] transition-all group"
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <span className="font-bold text-sm">PDF Report</span>
            <span className="text-[10px] text-muted-foreground mt-1">Branded & Formatted</span>
          </button>

          <button
            onClick={exportCSV}
            className="flex flex-col items-center justify-center p-6 rounded-xl border border-border hover:border-success/50 hover:bg-success/[0.02] transition-all group"
          >
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="h-6 w-6 text-success" />
            </div>
            <span className="font-bold text-sm">CSV Spreadsheet</span>
            <span className="text-[10px] text-muted-foreground mt-1">Raw Data & Excel</span>
          </button>
        </div>
      </Modal>
    </>
  );
}
