"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookMarked, Building2, ChevronDown, GraduationCap, KeyRound, Mail, Search, ShieldCheck, ShieldOff, User, UserPlus, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CriticalActionModal } from "@/components/ui/critical-action-modal";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import {
  createTeacher,
  getClasses,
  getColleges,
  getDepartments,
  getMajors,
  getSessions,
  getSessionDetail,
  getTeachers,
  patchUser,
  resetPassword,
  updateClass,
} from "@/features/admin/api";
import type { AdminClassAssignment, AdminCollege, AdminDepartment, AdminMajor, AdminSession, AdminSessionDetail, AdminTeacher } from "@/features/admin/types";
import { getCurrentActorUserId } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { Drawer } from "@/components/ui/drawer";
import { SessionDetailView } from "@/features/admin/components/session-detail-view";

function teacherName(teacher: { fullname?: string | null; username?: string | null } | null): string {
  if (!teacher) return "Teacher";
  return teacher.fullname?.trim() || teacher.username || "Unassigned";
}

function teacherInitials(teacher: AdminTeacher): string {
  const name = teacherName(teacher).trim();
  if (!name) return "T";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

type ActiveFilter = "all" | "active" | "disabled";
type AssignmentFilter = "all" | "assigned" | "unassigned";

export default function TeachersPage() {
  const { notify } = useToast();
  const currentActorUserId = getCurrentActorUserId();

  const [items, setItems] = useState<AdminTeacher[]>([]);
  const [colleges, setColleges] = useState<AdminCollege[]>([]);
  const [classes, setClasses] = useState<AdminClassAssignment[]>([]);
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [majors, setMajors] = useState<AdminMajor[]>([]);

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [majorFilter, setMajorFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");

  const [activeTeacher, setActiveTeacher] = useState<AdminTeacher | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [teacherSessions, setTeacherSessions] = useState<AdminSession[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Session Detail Drawer State
  const [isSessionDrawerOpen, setIsSessionDrawerOpen] = useState(false);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<AdminSessionDetail | null>(null);
  const [loadingSessionDetail, setLoadingSessionDetail] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createCollegeId, setCreateCollegeId] = useState("");
  const [createDepartmentId, setCreateDepartmentId] = useState("");

  const [assignmentQuery, setAssignmentQuery] = useState("");
  const [busyAssign, setBusyAssign] = useState<string | null>(null);

  const [resetOpen, setResetOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [pendingActiveState, setPendingActiveState] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const assignmentMaps = useMemo(() => {
    const classMap = new Map<number, AdminClassAssignment[]>();
    const majorMap = new Map<number, Set<number>>();

    for (const assignment of classes) {
      const teacherId = assignment.teacher.id;
      if (!teacherId) continue;
      classMap.set(teacherId, [...(classMap.get(teacherId) ?? []), assignment]);
      if (assignment.section.major_id) {
        const set = majorMap.get(teacherId) ?? new Set<number>();
        set.add(assignment.section.major_id);
        majorMap.set(teacherId, set);
      }
    }

    return { classMap, majorMap };
  }, [classes]);

  const filteredDepartments = useMemo(() => {
    if (!createCollegeId) return [];
    return departments.filter((department) => department.college_id === Number(createCollegeId));
  }, [createCollegeId, departments]);

  const candidateClasses = useMemo(() => {
    if (!activeTeacher) return [];
    const q = assignmentQuery.trim().toLowerCase();
    return classes
      .filter((row) => (activeTeacher.department_id ? row.section.department_id === activeTeacher.department_id : true))
      .filter((row) => {
        if (!q) return true;
        return (
          row.section.name.toLowerCase().includes(q) ||
          row.subject.name.toLowerCase().includes(q) ||
          (row.section.major_name ?? "").toLowerCase().includes(q) ||
          teacherName(row.teacher).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aUnassigned = !a.teacher.id;
        const bUnassigned = !b.teacher.id;
        if (aUnassigned !== bUnassigned) return aUnassigned ? -1 : 1;
        return a.section.name.localeCompare(b.section.name);
      })
      .slice(0, 80);
  }, [activeTeacher, assignmentQuery, classes]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((teacher) => {
        if (!q) return true;
        return (
          (teacher.fullname ?? "").toLowerCase().includes(q) ||
          teacher.username.toLowerCase().includes(q) ||
          teacher.email.toLowerCase().includes(q)
        );
      })
      .filter((teacher) => (collegeFilter === "all" ? true : teacher.college_id === Number(collegeFilter)))
      .filter((teacher) => (departmentFilter === "all" ? true : teacher.department_id === Number(departmentFilter)))
      .filter((teacher) => (majorFilter === "all" ? true : assignmentMaps.majorMap.get(teacher.id)?.has(Number(majorFilter))))
      .filter((teacher) => {
        if (activeFilter === "all") return true;
        return activeFilter === "active" ? teacher.is_active : !teacher.is_active;
      })
      .filter((teacher) => {
        if (assignmentFilter === "all") return true;
        const count = assignmentMaps.classMap.get(teacher.id)?.length ?? 0;
        return assignmentFilter === "assigned" ? count > 0 : count === 0;
      });
  }, [activeFilter, assignmentFilter, assignmentMaps.classMap, assignmentMaps.majorMap, collegeFilter, departmentFilter, items, majorFilter, query]);

  async function load() {
    setLoading(true);
    try {
      const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}&limit=600` : "?limit=600";
      const [teachersRes, classesRes, collegesRes, departmentsRes, majorsRes] = await Promise.all([
        getTeachers(params),
        getClasses("?limit=1200"),
        getColleges("?limit=500"),
        getDepartments(undefined, "?limit=1000"),
        getMajors(undefined, "?limit=1000"),
      ]);
      setItems(teachersRes.items ?? []);
      setClasses(classesRes.items ?? []);
      setColleges(collegesRes.items ?? []);
      setDepartments(departmentsRes.items ?? []);
      setMajors(majorsRes.items ?? []);
    } catch (err) {
      notify({ tone: "danger", title: "Teachers load failed", description: getErrorMessage(err, "Unable to load teachers.") });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!createCollegeId || filteredDepartments.some((row) => row.id === Number(createDepartmentId))) return;
    setCreateDepartmentId("");
  }, [createCollegeId, createDepartmentId, filteredDepartments]);

  async function onCreateTeacher(event: FormEvent) {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !age.trim() || !email.trim() || !password || !createCollegeId || !createDepartmentId) {
      notify({ tone: "danger", title: "Missing fields", description: "Complete all required fields." });
      return;
    }

    const parsedAge = Number(age);
    if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      notify({ tone: "danger", title: "Invalid age", description: "Age must be between 1 and 120." });
      return;
    }

    setCreating(true);
    try {
      await createTeacher({
        firstname: firstName.trim(),
        lastname: lastName.trim(),
        age: parsedAge,
        email: email.trim(),
        password,
        college_id: Number(createCollegeId),
        department_id: Number(createDepartmentId),
      });
      setCreateOpen(false);
      setFirstName("");
      setLastName("");
      setAge("");
      setEmail("");
      setPassword("");
      setCreateCollegeId("");
      setCreateDepartmentId("");
      notify({ tone: "success", title: "Teacher account created" });
      await load();
    } catch (err) {
      notify({ tone: "danger", title: "Create failed", description: getErrorMessage(err, "Could not create teacher.") });
    } finally {
      setCreating(false);
    }
  }

  async function openDetails(row: AdminTeacher) {
    setActiveTeacher(row);
    setDetailsOpen(true);
    setAssignmentQuery("");
    setTeacherSessions([]);
    setLoadingStats(true);
    try {
      const res = await getSessions(`?teacher_id=${row.id}&limit=100`);
      setTeacherSessions(res.items ?? []);
    } catch (err) {
      console.error("Failed to load teacher sessions", err);
    } finally {
      setLoadingStats(false);
    }
  }

  async function handleSessionClick(sessionId: number) {
    setIsSessionDrawerOpen(true);
    setLoadingSessionDetail(true);
    try {
      const res = await getSessionDetail(sessionId, "?minutes=180&logs_limit=200");
      setSelectedSessionDetail(res);
    } catch (err) {
      notify({ tone: "danger", title: "Failed to load session details", description: getErrorMessage(err, "Unable to load session details.") });
    } finally {
      setLoadingSessionDetail(false);
    }
  }

  async function handleAssignment(row: AdminClassAssignment) {
    if (!activeTeacher) return;
    const key = String(row.id);
    setBusyAssign(key);
    try {
      await updateClass(row.id, { teacher_id: row.teacher.id === activeTeacher.id ? null : activeTeacher.id });
      await load();
    } catch (err) {
      notify({ tone: "danger", title: "Assignment failed", description: getErrorMessage(err, "Unable to update assignment.") });
    } finally {
      setBusyAssign(null);
    }
  }

  async function onConfirmStatus(passwordValue: string) {
    if (!activeTeacher || pendingActiveState === null) return;
    setSaving(true);
    try {
      await patchUser(activeTeacher.id, { is_active: pendingActiveState, confirm_password: passwordValue });
      setConfirmStatusOpen(false);
      await load();
    } catch (err) {
      notify({ tone: "danger", title: "Status update failed", description: getErrorMessage(err, "Unable to update status.") });
    } finally {
      setSaving(false);
    }
  }

  async function onConfirmReset(passwordValue: string) {
    if (!activeTeacher) return;
    if (tempPassword.length < 8) {
      notify({ tone: "danger", title: "Weak temporary password", description: "Minimum 8 characters." });
      return;
    }

    setSaving(true);
    try {
      await resetPassword(activeTeacher.id, tempPassword, passwordValue);
      setConfirmResetOpen(false);
      setResetOpen(false);
      setTempPassword("");
      notify({ tone: "success", title: "Temporary password updated" });
    } catch (err) {
      notify({ tone: "danger", title: "Password reset failed", description: getErrorMessage(err, "Unable to reset password.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader title={<><Users className="h-5 w-5" />Teachers</>} description="Manage teachers, hierarchy ownership, and assignment workflow." />
          <Button onClick={() => setCreateOpen(true)}><UserPlus className="mr-2 h-4 w-4" />Create Teacher</Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0 text-primary">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="h-4 w-4" /> Faculty Directory
              </CardTitle>
              {!loading && (
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                  Records of all registered educators
                </p>
              )}
            </div>
            {!loading && (
              <div className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 shadow-sm transition-all hover:bg-primary/15">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary leading-none">
                  {filteredItems.length} {filteredItems.length === 1 ? 'Teacher' : 'Teachers'} Found
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <form onSubmit={(event) => { event.preventDefault(); void load(); }} className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input ref={searchInputRef} className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search teachers..." />
              </div>
              <Button type="submit" variant="outline">Refresh</Button>
            </form>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={collegeFilter} onChange={(event) => { setCollegeFilter(event.target.value); setDepartmentFilter("all"); }}>
                <option value="all">All Colleges</option>
                {colleges.map((college) => (
                  <option key={college.id} value={college.id}>{college.name}</option>
                ))}
              </select>
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
                <option value="all">All Departments</option>
                {departments.filter((row) => (collegeFilter === "all" ? true : row.college_id === Number(collegeFilter))).map((row) => (
                  <option key={row.id} value={row.id}>{row.name}</option>
                ))}
              </select>
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={majorFilter} onChange={(event) => setMajorFilter(event.target.value)}>
                <option value="all">All Majors</option>
                {majors.filter((row) => (departmentFilter === "all" ? true : row.department_id === Number(departmentFilter))).map((row) => (
                  <option key={row.id} value={row.id}>{row.code}</option>
                ))}
              </select>
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={assignmentFilter} onChange={(event) => setAssignmentFilter(event.target.value as AssignmentFilter)}>
                <option value="all">All Assignment States</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as ActiveFilter)}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
              <div className="flex items-center justify-between col-span-1 md:col-span-2 lg:col-span-6">
                <Button variant="ghost" className="text-xs h-8 px-2" onClick={() => { setCollegeFilter("all"); setDepartmentFilter("all"); setMajorFilter("all"); setActiveFilter("all"); setAssignmentFilter("all"); }}>Clear filters</Button>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">{[1, 2, 3, 4].map((index) => <Skeleton key={index} className="h-11 w-full" />)}</div>
            ) : (
              <Table>
                <THead><TR><TH>ID</TH><TH><User className="h-4 w-4 mr-2 inline" />Name</TH><TH><Mail className="h-4 w-4 mr-2 inline" />Email</TH><TH><Building2 className="h-4 w-4 mr-2 inline" />College</TH><TH><GraduationCap className="h-4 w-4 mr-2 inline" />Department</TH><TH><BookMarked className="h-4 w-4 mr-2 inline" />Assignments</TH><TH><ShieldCheck className="h-4 w-4 mr-2 inline" />Status</TH></TR></THead>
                <TBody>
                  {filteredItems.map((row) => {
                    const classCount = assignmentMaps.classMap.get(row.id)?.length ?? 0;
                    return (
                      <TR key={row.id} className="cursor-pointer" onClick={() => openDetails(row)}>
                        <TD>{row.id}</TD>
                        <TD>
                          <div className="flex items-center gap-2">
                            <div className="h-9 w-9 overflow-hidden rounded-full border border-border bg-muted">
                              {row.profile_picture_url ? (
                                <img src={row.profile_picture_url} alt={teacherName(row)} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                                  {teacherInitials(row)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{teacherName(row)}</p>
                              {currentActorUserId === row.id ? <p className="text-[11px] text-muted-foreground">You</p> : null}
                            </div>
                          </div>
                        </TD>
                        <TD>{row.email}</TD>
                        <TD>{row.college_name ?? "-"}</TD>
                        <TD>{row.department_name ?? "-"}</TD>
                        <TD><Badge tone={classCount > 0 ? "success" : "default"}>{classCount}</Badge></TD>
                        <TD><Badge tone={row.is_active ? "success" : "danger"}>{row.is_active ? "Active" : "Disabled"}</Badge></TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)} title={activeTeacher ? `Teacher #${activeTeacher.id}` : "Teacher details"} description={activeTeacher ? activeTeacher.email : ""} className="max-w-4xl">
        {activeTeacher ? (
          <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
            <div className="rounded-2xl border border-border/70 bg-gradient-to-b from-primary/10 via-background to-background p-4">
              <div className="flex flex-col items-center text-center">
                <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-background bg-muted shadow-sm">
                  {activeTeacher.profile_picture_url ? (
                    <img src={activeTeacher.profile_picture_url} alt={teacherName(activeTeacher)} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-black uppercase text-muted-foreground">
                      {teacherName(activeTeacher).charAt(0)}
                    </div>
                  )}
                </div>
                <p className="mt-3 text-base font-semibold">{teacherName(activeTeacher)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{activeTeacher.department_name ?? "No department"}</p>
                <p className="text-xs text-muted-foreground">{activeTeacher.college_name ?? "No college"}</p>
                <Badge tone={activeTeacher.is_active ? "success" : "danger"} className="mt-3">{activeTeacher.is_active ? "Active" : "Disabled"}</Badge>
              </div>

              <div className="mt-4 space-y-2">
                <Button className="w-full justify-center" variant="outline" onClick={() => setResetOpen(true)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Reset Password
                </Button>
                <Button className="w-full justify-center" onClick={() => { setPendingActiveState(!activeTeacher.is_active); setConfirmStatusOpen(true); }}>
                  {activeTeacher.is_active ? <ShieldOff className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  {activeTeacher.is_active ? "Disable Account" : "Enable Account"}
                </Button>
              </div>

              <div className="mt-4 rounded-xl border border-border/60 bg-card/70 p-3">
                <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Assigned Classes</p>
                <div className="mt-2 flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                  {(assignmentMaps.classMap.get(activeTeacher.id) ?? []).slice(0, 10).map((assignment) => (
                    <Link
                      key={assignment.id}
                      href={`/classes?teacher_id=${activeTeacher.id}&q=${encodeURIComponent(assignment.section.name)}`}
                      className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold"
                    >
                      <BookMarked className="mr-1 h-3 w-3" />
                      {assignment.subject.name} - {assignment.section.name}
                    </Link>
                  ))}
                  {(assignmentMaps.classMap.get(activeTeacher.id)?.length ?? 0) === 0 ? (
                    <p className="text-xs text-muted-foreground">No current class assignments.</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/60 p-5">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-lg font-bold tracking-tight text-foreground">Teacher Performance Analytics</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Historical session data and engagement metrics.</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm border border-primary/20">
                  <Users className="h-5 w-5" />
                </div>
              </div>

              {loadingStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
                  </div>
                  <Skeleton className="h-48 rounded-xl" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Sessions</p>
                      <p className="mt-2 text-2xl font-black text-primary leading-none">{teacherSessions.length}</p>
                      <p className="mt-1.5 text-[10px] font-medium text-muted-foreground/60 italic">Total classes monitored</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm border-l-4 border-l-success">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Avg Engagement</p>
                      <p className="mt-2 text-2xl font-black text-success leading-none">
                        {teacherSessions.length > 0
                          ? (teacherSessions.reduce((acc: number, s: AdminSession) => acc + s.average_engagement, 0) / teacherSessions.length).toFixed(1)
                          : "0.0"}%
                      </p>
                      <p className="mt-1.5 text-[10px] font-medium text-muted-foreground/60 italic">Weighted performance</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Students Mentored</p>
                      <p className="mt-2 text-2xl font-black text-foreground leading-none">
                        {teacherSessions.reduce((acc: number, s: AdminSession) => acc + (s.students_present || 0), 0)}
                      </p>
                      <p className="mt-1.5 text-[10px] font-medium text-muted-foreground/60 italic">Accumulated reach</p>
                    </div>
                  </div>

                  {/* Integrated Activity List */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
                        Activity Stream
                        <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                        Last 5 Sessions
                      </h5>
                    </div>

                    <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
                      {teacherSessions.slice(0, 5).map(session => {
                        const engagement = session.average_engagement;
                        const colorClass = engagement >= 85 ? "text-success bg-success/10 border-success/20" 
                                         : engagement >= 65 ? "text-primary bg-primary/10 border-primary/20"
                                         : "text-warning bg-warning/10 border-warning/20";
                        
                        return (
                          <div 
                             key={session.id} 
                             onClick={() => handleSessionClick(session.id)}
                             className="block group cursor-pointer"
                          >
                             <div className="flex items-center justify-between p-3 rounded-2xl border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all duration-200">
                                <div className="flex items-center gap-4 min-w-0">
                                   <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-transparent transition-colors ${colorClass}`}>
                                      <BookMarked className="h-5 w-5" />
                                   </div>
                                   <div className="min-w-0">
                                      <p className="text-sm font-bold truncate text-foreground group-hover:text-primary transition-colors">{session.subject_name}</p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                         <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/70">{session.section_name}</span>
                                         <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/50" />
                                         <span className="text-[9px] font-bold text-muted-foreground/60">{new Date(session.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                      </div>
                                   </div>
                                </div>
                                <div className="flex items-center gap-4 pl-4 border-l border-border/10 ml-4 shrink-0">
                                   <div className="text-right">
                                     <div className={`text-xs font-black tabular-nums ${engagement >= 85 ? 'text-success' : engagement >= 65 ? 'text-primary' : 'text-warning'}`}>{engagement.toFixed(1)}%</div>
                                     <div className="text-[8px] text-muted-foreground uppercase font-black tracking-tight">{session.students_present} Detected</div>
                                   </div>
                                   <ChevronDown className="-rotate-90 h-4 w-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                                </div>
                             </div>
                          </div>
                        );
                      })}
                      {teacherSessions.length === 0 && (
                        <div className="py-16 text-center border-2 border-dashed border-border/40 rounded-3xl bg-muted/5">
                          <p className="text-sm text-muted-foreground font-semibold italic">Teacher has not initiated any behavior monitoring sessions yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={createOpen} onClose={() => !creating && setCreateOpen(false)} title="Create Teacher Account" description="Create a teacher account with college and department ownership." className="max-w-xl">
        <form className="space-y-3" onSubmit={onCreateTeacher}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="First Name" required />
            <Input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Last Name" required />
          </div>
          <Input type="number" value={age} onChange={(event) => setAge(event.target.value)} placeholder="Age" min={1} max={120} required />
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" required />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={createCollegeId} onChange={(event) => { setCreateCollegeId(event.target.value); setCreateDepartmentId(""); }} required>
              <option value="">Select college</option>
              {colleges.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={createDepartmentId} onChange={(event) => setCreateDepartmentId(event.target.value)} disabled={!createCollegeId} required>
              <option value="">Select department</option>
              {filteredDepartments.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </div>
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button type="submit" disabled={creating}>{creating ? "Creating..." : "Create Teacher"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={resetOpen} onClose={() => !saving && setResetOpen(false)} title="Reset Teacher Password" description={activeTeacher ? `Account: ${teacherName(activeTeacher)}` : ""} className="max-w-md">
        <div className="space-y-4">
          <Input type="password" value={tempPassword} onChange={(event) => setTempPassword(event.target.value)} placeholder="Temporary password (min 8 chars)" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setResetOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={() => setConfirmResetOpen(true)} disabled={saving || tempPassword.length < 8}>Continue</Button>
          </div>
        </div>
      </Modal>

      <CriticalActionModal
        open={confirmStatusOpen}
        onClose={() => !saving && setConfirmStatusOpen(false)}
        onConfirm={onConfirmStatus}
        loading={saving}
        title={pendingActiveState ? "Enable teacher account" : "Disable teacher account"}
        description={activeTeacher ? `This will ${pendingActiveState ? "allow" : "prevent"} ${teacherName(activeTeacher)} from logging in.` : "Confirm account state change."}
        confirmText={pendingActiveState ? "Enable Account" : "Disable Account"}
      />

      <CriticalActionModal
        open={confirmResetOpen}
        onClose={() => !saving && setConfirmResetOpen(false)}
        onConfirm={onConfirmReset}
        loading={saving}
        title="Confirm teacher password reset"
        description="This action immediately overrides the teacher's current password."
        confirmText="Reset Password"
      />

      <Drawer
        open={isSessionDrawerOpen}
        onClose={() => setIsSessionDrawerOpen(false)}
        title="Session Intelligence View"
        description="Detailed behavior analytics and historical trends."
        widthClassName="max-w-5xl"
      >
        {loadingSessionDetail ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : selectedSessionDetail ? (
          <SessionDetailView detail={selectedSessionDetail} />
        ) : (
          <p className="text-sm text-muted-foreground">No detail available.</p>
        )}
      </Drawer>
    </>
  );
}
