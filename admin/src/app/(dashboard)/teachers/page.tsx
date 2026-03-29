"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookMarked, KeyRound, Search, ShieldCheck, ShieldOff, UserPlus, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CriticalActionModal } from "@/components/ui/critical-action-modal";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import {
  assignSectionTeacher,
  createTeacher,
  getColleges,
  getDepartments,
  getMajors,
  getSections,
  getSubjects,
  getTeachers,
  patchUser,
  resetPassword,
  unassignSectionTeacher,
} from "@/features/admin/api";
import type { AdminCollege, AdminDepartment, AdminMajor, AdminSection, AdminSubject, AdminTeacher } from "@/features/admin/types";
import { getCurrentActorUserId } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

function teacherName(teacher: AdminTeacher | null): string {
  if (!teacher) return "Teacher";
  return teacher.fullname?.trim() || teacher.username;
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
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [sections, setSections] = useState<AdminSection[]>([]);
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
    const subjectMap = new Map<number, AdminSubject[]>();
    const sectionMap = new Map<number, AdminSection[]>();
    const majorMap = new Map<number, Set<number>>();

    for (const subject of subjects) {
      if (!subject.teacher_id) continue;
      subjectMap.set(subject.teacher_id, [...(subjectMap.get(subject.teacher_id) ?? []), subject]);
      if (subject.major_id) {
        const set = majorMap.get(subject.teacher_id) ?? new Set<number>();
        set.add(subject.major_id);
        majorMap.set(subject.teacher_id, set);
      }
    }
    for (const section of sections) {
      if (!section.teacher_id) continue;
      sectionMap.set(section.teacher_id, [...(sectionMap.get(section.teacher_id) ?? []), section]);
      if (section.major_id) {
        const set = majorMap.get(section.teacher_id) ?? new Set<number>();
        set.add(section.major_id);
        majorMap.set(section.teacher_id, set);
      }
    }

    return { subjectMap, sectionMap, majorMap };
  }, [sections, subjects]);

  const filteredDepartments = useMemo(() => {
    if (!createCollegeId) return [];
    return departments.filter((department) => department.college_id === Number(createCollegeId));
  }, [createCollegeId, departments]);

  const candidateSections = useMemo(() => {
    if (!activeTeacher) return [];
    const q = assignmentQuery.trim().toLowerCase();
    return sections
      .filter((row) => (activeTeacher.department_id ? row.department_id === activeTeacher.department_id : true))
      .filter((row) => {
        if (!q) return true;
        return (
          row.name.toLowerCase().includes(q) ||
          row.subject_name.toLowerCase().includes(q) ||
          (row.major_name ?? "").toLowerCase().includes(q) ||
          (row.teacher_fullname ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aUnassigned = !a.teacher_id;
        const bUnassigned = !b.teacher_id;
        if (aUnassigned !== bUnassigned) return aUnassigned ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 80);
  }, [activeTeacher, assignmentQuery, sections]);

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
        const count = (assignmentMaps.subjectMap.get(teacher.id)?.length ?? 0) + (assignmentMaps.sectionMap.get(teacher.id)?.length ?? 0);
        return assignmentFilter === "assigned" ? count > 0 : count === 0;
      });
  }, [activeFilter, assignmentFilter, assignmentMaps.majorMap, assignmentMaps.sectionMap, assignmentMaps.subjectMap, collegeFilter, departmentFilter, items, majorFilter, query]);

  async function load() {
    setLoading(true);
    try {
      const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}&limit=600` : "?limit=600";
      const [teachersRes, subjectsRes, sectionsRes, collegesRes, departmentsRes, majorsRes] = await Promise.all([
        getTeachers(params),
        getSubjects("?limit=1200"),
        getSections("?limit=1200"),
        getColleges("?limit=500"),
        getDepartments(undefined, "?limit=1000"),
        getMajors(undefined, "?limit=1000"),
      ]);
      setItems(teachersRes.items ?? []);
      setSubjects(subjectsRes.items ?? []);
      setSections(sectionsRes.items ?? []);
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

  function openDetails(row: AdminTeacher) {
    setActiveTeacher(row);
    setDetailsOpen(true);
    setAssignmentQuery("");
  }

  async function handleAssignment(row: AdminSection) {
    if (!activeTeacher) return;
    const key = `${row.id}-${row.subject_id ?? "none"}`;
    setBusyAssign(key);
    try {
      if (row.teacher_id === activeTeacher.id) {
        await unassignSectionTeacher(row.id, row.subject_id ?? undefined);
      } else {
        await assignSectionTeacher(row.id, activeTeacher.id, row.subject_id ?? undefined);
      }
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
              <Button variant="ghost" onClick={() => { setCollegeFilter("all"); setDepartmentFilter("all"); setMajorFilter("all"); setActiveFilter("all"); setAssignmentFilter("all"); }}>Clear</Button>
            </div>

            {loading ? (
              <div className="space-y-2">{[1, 2, 3, 4].map((index) => <Skeleton key={index} className="h-11 w-full" />)}</div>
            ) : (
              <Table>
                <THead><TR><TH>ID</TH><TH>Name</TH><TH>Email</TH><TH>College</TH><TH>Department</TH><TH>Assignments</TH><TH>Status</TH></TR></THead>
                <TBody>
                  {filteredItems.map((row) => {
                    const subjectCount = assignmentMaps.subjectMap.get(row.id)?.length ?? 0;
                    const sectionCount = assignmentMaps.sectionMap.get(row.id)?.length ?? 0;
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
                        <TD><Badge tone={subjectCount + sectionCount > 0 ? "success" : "default"}>{subjectCount + sectionCount}</Badge></TD>
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
                <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Assigned Sections</p>
                <div className="mt-2 flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                  {(assignmentMaps.sectionMap.get(activeTeacher.id) ?? []).slice(0, 10).map((section) => (
                    <Link
                      key={`${section.id}-${section.subject_id ?? "none"}`}
                      href={`/sections?q=${encodeURIComponent(section.name)}`}
                      className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold"
                    >
                      <BookMarked className="mr-1 h-3 w-3" />
                      {section.subject_name} • {section.name}
                    </Link>
                  ))}
                  {(assignmentMaps.sectionMap.get(activeTeacher.id)?.length ?? 0) === 0 ? (
                    <p className="text-xs text-muted-foreground">No current section assignments.</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Assignment Console</p>
                  <p className="text-xs text-muted-foreground">Search sections and quickly assign or reassign this teacher.</p>
                </div>
                <Badge tone="default">{candidateSections.length} results</Badge>
              </div>

              <Input value={assignmentQuery} onChange={(event) => setAssignmentQuery(event.target.value)} placeholder="Search sections, subjects, or major..." />

              <div className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
                {candidateSections.map((row) => {
                  const key = `${row.id}-${row.subject_id ?? "none"}`;
                  const isOwned = row.teacher_id === activeTeacher.id;
                  return (
                    <div key={key} className="rounded-lg border border-border/60 bg-card/80 p-3 transition-colors hover:border-primary/40">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{row.subject_name} • {row.name}</p>
                          <p className="text-xs text-muted-foreground">{row.major_name ?? "-"} • {row.teacher_fullname ?? row.teacher_username}</p>
                        </div>
                        <Button size="sm" variant={isOwned ? "outline" : "default"} disabled={busyAssign === key} onClick={() => void handleAssignment(row)}>
                          {isOwned ? "Unassign" : row.teacher_id ? "Reassign" : "Assign"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {candidateSections.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/70 p-4 text-center text-sm text-muted-foreground">No matching sections found.</p>
                ) : null}
              </div>
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
    </>
  );
}

