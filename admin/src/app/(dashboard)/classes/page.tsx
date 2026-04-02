"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, BarChart3, BookOpen, Calendar, GraduationCap, Info, Layers3, PlusCircle, Search, Users, User, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { SessionDetailView } from "@/features/admin/components/session-detail-view";
import { createClass, deleteClass, getClasses, getSections, getSessionDetail, getSessions, getSubjects, getTeachers, updateClass } from "@/features/admin/api";
import { useAcademicFilters } from "@/features/admin/hooks/use-academic-filters";
import { useAcademicHierarchyOptions } from "@/features/admin/hooks/use-academic-hierarchy-options";
import type { AdminClassAssignment, AdminClassAssignmentStatus, AdminSection, AdminSession, AdminSessionDetail, AdminSubject, AdminTeacher } from "@/features/admin/types";
import { getErrorMessage } from "@/lib/errors";

type StatusFilter = "all" | "assigned" | "unassigned_teacher" | "needs_setup";

function parseStatusFilter(raw: string | null): StatusFilter {
  if (raw === "assigned" || raw === "unassigned_teacher" || raw === "needs_setup") return raw;
  return "all";
}

function teacherName(teacher: AdminClassAssignment["teacher"]): string {
  return teacher.fullname?.trim() || teacher.username || "Unassigned";
}

function formatTimestamp(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

function statusMeta(status: AdminClassAssignmentStatus) {
  if (status === "assigned") return { label: "Assigned", tone: "success" as const };
  if (status === "unassigned_teacher") return { label: "No Teacher", tone: "warning" as const };
  return { label: "Invalid Mapping", tone: "danger" as const };
}

export default function ClassesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useToast();
  const { filters, setFilters, clearFilter, clearAll } = useAcademicFilters();
  const { colleges, departments, majors } = useAcademicHierarchyOptions(filters);

  const [items, setItems] = useState<AdminClassAssignment[]>([]);
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [queryInput, setQueryInput] = useState(() => searchParams.get("q") ?? "");
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [status, setStatus] = useState<StatusFilter>(() => parseStatusFilter(searchParams.get("status")));

  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createSectionId, setCreateSectionId] = useState("");
  const [createSubjectId, setCreateSubjectId] = useState("");
  const [createTeacherId, setCreateTeacherId] = useState("");

  const [active, setActive] = useState<AdminClassAssignment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [draftTeacherId, setDraftTeacherId] = useState("");
  const [draftSubjectId, setDraftSubjectId] = useState("");
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminClassAssignment | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [infoRow, setInfoRow] = useState<AdminClassAssignment | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [isSessionDetailOpen, setIsSessionDetailOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [sessionDetail, setSessionDetail] = useState<AdminSessionDetail | null>(null);
  const [loadingSessionDetail, setLoadingSessionDetail] = useState(false);

  const teacherFilterId = useMemo(() => {
    const raw = searchParams.get("teacher_id");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, [searchParams]);

  const sectionCatalog = useMemo(() => {
    const map = new Map<number, { id: number; name: string; major_id: number | null; department_id: number | null; major_name: string | null }>();
    for (const row of sections) {
      if (!map.has(row.id)) {
        map.set(row.id, {
          id: row.id,
          name: row.name,
          major_id: row.major_id ?? null,
          department_id: row.department_id ?? null,
          major_name: row.major_name ?? null,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [sections]);

  const selectedCreateSection = useMemo(
    () => (createSectionId ? sectionCatalog.find((row) => row.id === Number(createSectionId)) ?? null : null),
    [createSectionId, sectionCatalog],
  );

  const createMajorContext = useMemo(() => {
    return selectedCreateSection?.major_id ?? null;
  }, [selectedCreateSection?.major_id]);

  const createDeptContext = useMemo(() => {
    return selectedCreateSection?.department_id ?? null;
  }, [selectedCreateSection?.department_id]);

  const availableSubjectsForCreate = useMemo(() => {
    if (!createMajorContext) return subjects;
    return subjects.filter((row) => row.major_id === createMajorContext);
  }, [createMajorContext, subjects]);

  const availableTeachersForCreate = useMemo(() => {
    if (!createDeptContext) return teachers;
    return teachers.filter((row) => row.department_id === createDeptContext);
  }, [createDeptContext, teachers]);

  const detailSubjects = useMemo(() => {
    if (!active) return [];
    return subjects.filter((row) => row.major_id === active.section.major_id);
  }, [active, subjects]);

  const detailTeachers = useMemo(() => {
    if (!active || !active.section.department_id) return teachers;
    return teachers.filter((row) => row.department_id === active.section.department_id);
  }, [active, teachers]);

  const updateUrl = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      const q = next.toString();
      router.replace(q ? `/classes?${q}` : "/classes", { scroll: false });
    },
    [router, searchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const classParams: string[] = ["limit=1200"];
      if (query.trim()) classParams.push(`q=${encodeURIComponent(query.trim())}`);
      if (filters.college_id) classParams.push(`college_id=${filters.college_id}`);
      if (filters.department_id) classParams.push(`department_id=${filters.department_id}`);
      if (filters.major_id) classParams.push(`major_id=${filters.major_id}`);
      if (teacherFilterId) classParams.push(`teacher_id=${teacherFilterId}`);
      if (status !== "all") classParams.push(`status=${status}`);

      const scopeParams: string[] = ["limit=1200"];
      if (filters.college_id) scopeParams.push(`college_id=${filters.college_id}`);
      if (filters.department_id) scopeParams.push(`department_id=${filters.department_id}`);
      if (filters.major_id) scopeParams.push(`major_id=${filters.major_id}`);

      const [classesRes, sectionsRes, subjectsRes, teachersRes] = await Promise.all([
        getClasses(`?${classParams.join("&")}`),
        getSections(`?${scopeParams.join("&")}`),
        getSubjects(`?${scopeParams.join("&")}`),
        getTeachers("?limit=500"),
      ]);
      setItems(classesRes.items ?? []);
      setSections(sectionsRes.items ?? []);
      setSubjects(subjectsRes.items ?? []);
      setTeachers((teachersRes.items ?? []).filter((teacher: AdminTeacher) => teacher.is_active));
    } catch (err) {
      notify({
        tone: "danger",
        title: "Classes load failed",
        description: getErrorMessage(err, "Could not load classes."),
      });
    } finally {
      setLoading(false);
    }
  }, [filters.college_id, filters.department_id, filters.major_id, notify, query, status, teacherFilterId]);

  useEffect(() => {
    setQueryInput(searchParams.get("q") ?? "");
    setQuery(searchParams.get("q") ?? "");
    setStatus(parseStatusFilter(searchParams.get("status")));
  }, [searchParams]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = queryInput.trim();
    setQuery(trimmed);
    updateUrl({ q: trimmed || null });
  }

  function onStatusChange(next: StatusFilter) {
    setStatus(next);
    updateUrl({ status: next === "all" ? null : next });
  }

  function openDetails(row: AdminClassAssignment) {
    setActive(row);
    setDraftTeacherId(row.teacher.id ? String(row.teacher.id) : "");
    setDraftSubjectId(String(row.subject.id));
    setDetailsOpen(true);
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!createSectionId || !createSubjectId) {
      notify({ tone: "warning", title: "Incomplete selection", description: "Please select both a section and a subject." });
      return;
    }
    if (createTeacherId && createDeptContext !== null) {
      const selected = teachers.find((row) => row.id === Number(createTeacherId));
      if (!selected || selected.department_id !== createDeptContext) {
        notify({ tone: "warning", title: "Invalid teacher", description: "Teacher must belong to the section department." });
        return;
      }
    }

    const payload = {
      section_id: Number(createSectionId),
      subject_id: Number(createSubjectId),
      teacher_id: createTeacherId ? Number(createTeacherId) : undefined,
    };

    setCreateSaving(true);
    try {
      await createClass(payload);
      notify({ tone: "success", title: "Class assignment created" });
      setCreateOpen(false);
      setCreateSectionId("");
      setCreateSubjectId("");
      setCreateTeacherId("");
      await load();
    } catch (err) {
      notify({ tone: "danger", title: "Assignment failed", description: getErrorMessage(err, "Unable to create class assignment.") });
    } finally {
      setCreateSaving(false);
    }
  }

  async function onSaveTeacher() {
    if (!active) return;
    if (draftTeacherId && active.section.department_id !== null) {
      const selected = teachers.find((row) => row.id === Number(draftTeacherId));
      if (!selected || selected.department_id !== active.section.department_id) {
        notify({ tone: "warning", title: "Invalid teacher", description: "Teacher must belong to this section's department." });
        return;
      }
    }
    setSavingTeacher(true);
    try {
      const updated = await updateClass(active.id, { teacher_id: draftTeacherId ? Number(draftTeacherId) : null });
      setItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setActive(updated);
      notify({ tone: "success", title: "Teacher updated" });
    } catch (err) {
      notify({ tone: "danger", title: "Update failed", description: getErrorMessage(err, "Unable to update teacher assignment.") });
    } finally {
      setSavingTeacher(false);
    }
  }

  async function onSaveSubject() {
    if (!active || !draftSubjectId) return;
    const subjectId = Number(draftSubjectId);
    const selected = subjects.find((row) => row.id === subjectId);
    if (!selected || selected.major_id !== active.section.major_id) {
      notify({ tone: "warning", title: "Invalid subject", description: "Subject must belong to this section's major." });
      return;
    }
    setSavingSubject(true);
    try {
      const updated = await updateClass(active.id, { subject_id: subjectId });
      setItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setActive(updated);
      notify({ tone: "success", title: "Subject updated" });
    } catch (err) {
      notify({ tone: "danger", title: "Update failed", description: getErrorMessage(err, "Unable to update class subject.") });
    } finally {
      setSavingSubject(false);
    }
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteClass(deleteTarget.id);
      setItems((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      if (active?.id === deleteTarget.id) {
        setDetailsOpen(false);
        setActive(null);
      }
      setDeleteTarget(null);
      notify({ tone: "success", title: "Class unlinked" });
      await load();
    } catch (err) {
      notify({ tone: "danger", title: "Delete failed", description: getErrorMessage(err, "Unable to unlink class assignment.") });
    } finally {
      setDeleteLoading(false);
    }
  }

  async function openInfo(row: AdminClassAssignment) {
    setInfoRow(row);
    setIsInfoOpen(true);
    setLoadingSessions(true);
    setSessions([]);
    try {
      const res = await getSessions({ section_id: row.section.id, subject_id: row.subject.id });
      setSessions(res.items);
    } catch (err) {
      notify({ tone: "danger", title: "Failed to load sessions", description: getErrorMessage(err, "Could not fetch session history.") });
    } finally {
      setLoadingSessions(false);
    }
  }

  async function openSessionDetail(sessionId: number) {
    setSelectedSessionId(sessionId);
    setIsSessionDetailOpen(true);
    setLoadingSessionDetail(true);
    setSessionDetail(null);
    try {
      const res = await getSessionDetail(sessionId, "?minutes=120&logs_limit=100");
      setSessionDetail(res);
    } catch (err) {
      notify({ tone: "danger", title: "Failed to load session details", description: getErrorMessage(err, "Please try again.") });
    } finally {
      setLoadingSessionDetail(false);
    }
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PageHeader
            title={<><Layers3 className="h-5 w-5" />Classes</>}
            description="Manage section-subject-teacher assignments in one place."
          />
          <Button onClick={() => setCreateOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />New Class</Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0 text-primary">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Layers3 className="h-4 w-4" /> Class Assignments
              </CardTitle>
              {!loading && (
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                  Academic mappings for sections & subjects
                </p>
              )}
            </div>
            {!loading && (
              <div className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 shadow-sm transition-all hover:bg-primary/15">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary leading-none">
                  {items.length} {items.length === 1 ? 'Mapping' : 'Mappings'} Found
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <form onSubmit={onSearch} className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  value={queryInput}
                  onChange={(event) => setQueryInput(event.target.value)}
                  placeholder="Search section, subject, teacher, major, code..."
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="outline">Refresh</Button>
            </form>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              <select 
                className="h-10 rounded-md border border-input bg-background px-3 text-sm" 
                value={filters.college_id ?? ""} 
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : null;
                  setFilters({ college_id: value, department_id: null, major_id: null });
                }}
              >
                <option value="">All Colleges</option>
                {colleges.map((college) => (
                  <option key={college.id} value={college.id}>{college.name}</option>
                ))}
              </select>
              <select 
                className="h-10 rounded-md border border-input bg-background px-3 text-sm" 
                value={filters.department_id ?? ""} 
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : null;
                  setFilters({ department_id: value, major_id: null });
                }}
              >
                <option value="">All Departments</option>
                {departments.filter((row) => (filters.college_id ? row.college_id === filters.college_id : true)).map((row) => (
                  <option key={row.id} value={row.id}>{row.name}</option>
                ))}
              </select>
              <select 
                className="h-10 rounded-md border border-input bg-background px-3 text-sm" 
                value={filters.major_id ?? ""} 
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : null;
                  setFilters({ major_id: value });
                }}
              >
                <option value="">All Majors</option>
                {majors.filter((row) => (filters.department_id ? row.department_id === filters.department_id : true)).map((row) => (
                  <option key={row.id} value={row.id}>{row.code}</option>
                ))}
              </select>
              <select 
                className="h-10 rounded-md border border-input bg-background px-3 text-sm" 
                value={status} 
                onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
              >
                <option value="all">All Status</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned_teacher">Unassigned Teacher</option>
                <option value="needs_setup">Needs Setup</option>
              </select>
              <div className="flex items-center justify-between col-span-1 md:col-span-2 lg:col-span-5">
                <Button variant="ghost" className="text-xs h-8 px-2" onClick={() => { 
                  clearAll();
                  setStatus("all");
                  updateUrl({ q: null, status: null });
                }}>Clear filters</Button>
                {teacherFilterId ? (
                  <Badge tone="default" className="gap-1">
                    Teacher #{teacherFilterId}
                    <button type="button" onClick={() => updateUrl({ teacher_id: null })}><X className="h-3 w-3" /></button>
                  </Badge>
                ) : null}
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">{[1, 2, 3, 4].map((index) => <Skeleton key={index} className="h-11 w-full" />)}</div>
            ) : items.length ? (
              <Table>
                <THead>
                    <TR>
                      <TH><GraduationCap className="h-4 w-4 mr-2 inline" />Section</TH>
                      <TH><BookOpen className="h-4 w-4 mr-2 inline" />Subject</TH>
                      <TH><User className="h-4 w-4 mr-2 inline" />Teacher</TH>
                      <TH><Layers3 className="h-4 w-4 mr-2 inline" />Major / Dept</TH>
                      <TH><Info className="h-4 w-4 mr-2 inline" />Status</TH>
                      <TH><Calendar className="h-4 w-4 mr-2 inline" />Last Updated</TH>
                    </TR>
                </THead>
                <TBody>
                    {items.map((row) => {
                      const meta = statusMeta(row.status);
                      return (
                        <TR 
                          key={row.id} 
                          className="cursor-pointer hover:bg-muted/40 transition-colors group"
                          onClick={() => openInfo(row)}
                        >
                          <TD>
                            <p className="font-semibold group-hover:text-primary transition-colors">{row.section.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Y{row.section.year_level ?? "-"} / {row.section.section_code ?? "-"}
                            </p>
                          </TD>
                          <TD>
                            <p className="font-medium">{row.subject.name}</p>
                            <p className="text-xs text-muted-foreground">{row.subject.code ?? "No code"}</p>
                          </TD>
                          <TD>{teacherName(row.teacher)}</TD>
                          <TD>
                            <p className="text-sm">{row.section.major_name ?? "-"}</p>
                            <p className="text-xs text-muted-foreground">{row.section.department_name ?? "-"}</p>
                          </TD>
                          <TD><Badge tone={meta.tone}>{meta.label}</Badge></TD>
                          <TD className="text-xs text-muted-foreground">{formatTimestamp(row.updated_at)}</TD>
                        </TR>
                      );
                    })}
                </TBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                No classes found. Try adjusting filters or create a new class assignment.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={createOpen}
        onClose={() => !createSaving && setCreateOpen(false)}
        title="Create Class Assignment"
        description="Link an existing section to a subject and optional teacher."
        className="max-w-2xl"
      >
        <form className="space-y-4" onSubmit={onCreate}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Section</span>
              <select 
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" 
                value={createSectionId} 
                onChange={(event) => setCreateSectionId(event.target.value)}
                required
              >
                <option value="">-- Select Section --</option>
                {sectionCatalog.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Subject</span>
              <select 
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" 
                value={createSubjectId} 
                onChange={(event) => setCreateSubjectId(event.target.value)}
                required
              >
                <option value="">-- Select Subject --</option>
                {availableSubjectsForCreate.map((row) => <option key={row.id} value={row.id}>{row.code ? `[${row.code}] ${row.name}` : row.name}</option>)}
              </select>
            </label>
          </div>

          <label className="space-y-1 text-sm block">
            <span className="font-medium">Teacher (optional)</span>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={createTeacherId} onChange={(event) => setCreateTeacherId(event.target.value)}>
              <option value="">No teacher assigned</option>
              {availableTeachersForCreate.map((row) => (
                <option key={row.id} value={row.id}>{row.fullname?.trim() || row.username}</option>
              ))}
            </select>
          </label>

          <p className="text-xs text-muted-foreground bg-accent/30 p-2 rounded-md">
            Note: New sections and subjects can be managed in the <span className="font-semibold underline cursor-pointer" onClick={() => { setCreateOpen(false); router.push('/subjects-and-sections'); }}>Subjects & Sections</span> tab.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={createSaving}>Cancel</Button>
            <Button type="submit" disabled={createSaving}>{createSaving ? "Saving..." : "Create Assignment"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={active ? `${active.subject.name} • ${active.section.name}` : "Class"}
        description="Update teacher and subject assignments."
        className="max-w-2xl"
      >
        {active ? (
          <div className="space-y-3">
            <label className="space-y-1 text-sm">
              <span>Subject</span>
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={draftSubjectId} onChange={(event) => setDraftSubjectId(event.target.value)}>
                  <option value="">Select subject</option>
                  {detailSubjects.map((row) => <option key={row.id} value={row.id}>{row.code ?? row.name}</option>)}
                </select>
                <Button variant="outline" onClick={() => void onSaveSubject()} disabled={savingSubject || !draftSubjectId}>
                  {savingSubject ? "Saving..." : "Save Subject"}
                </Button>
              </div>
            </label>

            <label className="space-y-1 text-sm">
              <span>Teacher</span>
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={draftTeacherId} onChange={(event) => setDraftTeacherId(event.target.value)}>
                  <option value="">No teacher</option>
                  {detailTeachers.map((row) => <option key={row.id} value={row.id}>{row.fullname?.trim() || row.username}</option>)}
                </select>
                <Button variant="outline" onClick={() => void onSaveTeacher()} disabled={savingTeacher}>
                  {savingTeacher ? "Saving..." : "Save Teacher"}
                </Button>
              </div>
            </label>

            <div className="text-xs text-muted-foreground">
              Status: <span className="font-semibold">{statusMeta(active.status).label}</span> • Updated {formatTimestamp(active.updated_at)}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title={infoRow ? `${infoRow.subject.name} • ${infoRow.section.name}` : "Class Details"}
        description="View class information and session history."
        className="max-w-3xl"
      >
        {infoRow ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Teacher</p>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-background overflow-hidden">
                    {infoRow.teacher.profile_picture_url ? (
                      <img src={infoRow.teacher.profile_picture_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Users className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{teacherName(infoRow.teacher)}</p>
                    <p className="text-xs text-muted-foreground">{infoRow.section.department_name ?? "No department"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Major & Status</p>
                <div>
                  <p className="text-sm font-medium">{infoRow.section.major_name ?? "General"}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge tone={statusMeta(infoRow.status).tone}>{statusMeta(infoRow.status).label}</Badge>
                    <span className="text-[10px] text-muted-foreground">ID: #{infoRow.id}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Recent Sessions
                </h4>
                <p className="text-xs text-muted-foreground">{sessions.length} sessions found</p>
              </div>

              {loadingSessions ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : sessions.length ? (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <THead className="bg-muted/30">
                      <TR>
                        <TH className="py-2">Date</TH>
                        <TH className="py-2 text-center">Studs</TH>
                        <TH className="py-2 text-right">Engagement</TH>
                        <TH className="py-2 text-center">Status</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {sessions.map((s) => (
                        <TR 
                          key={s.id} 
                          className="cursor-pointer hover:bg-primary/[0.03] transition-colors"
                          onClick={() => openSessionDetail(s.id)}
                        >
                          <TD className="py-2.5">
                            <p className="text-xs font-semibold">{new Date(s.start_time).toLocaleDateString()}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </TD>
                          <TD className="py-2.5 text-center text-xs">{s.students_present}</TD>
                          <TD className="py-2.5 text-right font-mono text-xs font-bold">{s.average_engagement}%</TD>
                          <TD className="py-2.5 text-center">
                            <Badge tone={s.is_active ? "success" : "default"} className="text-[9px] px-1.5 py-0">
                              {s.is_active ? "Live" : "Ended"}
                            </Badge>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-lg bg-muted/10">
                  <BarChart3 className="h-8 w-8 text-muted-foreground/20 mb-2" />
                  <p className="text-xs text-muted-foreground">No sessions recorded for this class yet.</p>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
              <div className="flex flex-wrap gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setIsInfoOpen(false);
                    openDetails(infoRow);
                  }}
                >
                  <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
                  Manage Mapping
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-danger hover:bg-danger/[0.03] hover:border-danger/50"
                  onClick={() => {
                    setIsInfoOpen(false);
                    setDeleteTarget(infoRow);
                  }}
                >
                  Unlink Class
                </Button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setIsInfoOpen(false)}>Close</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Drawer
        open={isSessionDetailOpen}
        onClose={() => setIsSessionDetailOpen(false)}
        title={`Session Intelligence #${selectedSessionId ?? "-"}`}
        description="Automated behavior analysis and trend reporting."
        widthClassName="max-w-5xl"
      >
        {loadingSessionDetail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : sessionDetail ? (
          <SessionDetailView detail={sessionDetail} />
        ) : (
          <p className="text-sm text-muted-foreground">Unable to load session data.</p>
        )}
      </Drawer>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleteLoading && setDeleteTarget(null)}
        onConfirm={() => void onConfirmDelete()}
        loading={deleteLoading}
        title="Unlink class assignment"
        description={`Unlink "${deleteTarget?.subject.name ?? ""}" from "${deleteTarget?.section.name ?? ""}"?`}
        confirmText="Unlink"
        variant="danger"
      />
    </>
  );
}
