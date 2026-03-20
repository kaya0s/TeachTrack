"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { KeyRound, ShieldCheck, ShieldOff, UserPlus, Users, X } from "lucide-react";
import { AlertDialog } from "@/components/ui/alert-dialog";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { createTeacher, getColleges, getSections, getSubjects, getTeachers, patchUser, resetPassword } from "@/features/admin/api";
import type { AdminCollege, AdminSection, AdminSubject, AdminTeacher } from "@/features/admin/types";
import { SearchBar } from "@/components/ui/search-bar";
import { getCurrentActorUserId } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

function getTeacherDisplayName(teacher: AdminTeacher | null): string {
  if (!teacher) {
    return "Teacher";
  }
  const fullName = teacher.fullname?.trim();
  if (fullName) {
    return fullName;
  }
  return teacher.username;
}

function formatAddedOn(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

export default function TeachersPage() {
  const { notify } = useToast();
  const [items, setItems] = useState<AdminTeacher[]>([]);
  const [colleges, setColleges] = useState<AdminCollege[]>([]);
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCollegeFilter, setSelectedCollegeFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTeacher, setActiveTeacher] = useState<AdminTeacher | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [pendingActiveState, setPendingActiveState] = useState<boolean | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createFirstname, setCreateFirstname] = useState("");
  const [createLastname, setCreateLastname] = useState("");
  const [createAge, setCreateAge] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createCollegeId, setCreateCollegeId] = useState("");

  const currentActorUserId = getCurrentActorUserId();

  const assignmentsByTeacher = useMemo(() => {
    const subjectMap = new Map<number, AdminSubject[]>();
    const sectionMap = new Map<number, AdminSection[]>();

    subjects.forEach((subject) => {
      if (!subject.teacher_id) return;
      const existing = subjectMap.get(subject.teacher_id) ?? [];
      existing.push(subject);
      subjectMap.set(subject.teacher_id, existing);
    });

    sections.forEach((section) => {
      if (!section.teacher_id) return;
      const existing = sectionMap.get(section.teacher_id) ?? [];
      existing.push(section);
      sectionMap.set(section.teacher_id, existing);
    });

    return { subjectMap, sectionMap };
  }, [sections, subjects]);

  const filteredItems = useMemo(() => {
    if (selectedCollegeFilter === "all") return items;
    return items.filter((teacher) => teacher.college_id?.toString() === selectedCollegeFilter);
  }, [items, selectedCollegeFilter]);

  async function load() {
    setLoading(true);
    try {
      const params = query ? `?q=${encodeURIComponent(query)}` : "";
      const [teachersRes, subjectsRes, sectionsRes, collegesRes] = await Promise.all([
        getTeachers(params),
        getSubjects("?limit=500"),
        getSections("?limit=500"),
        getColleges("?limit=200"),
      ]);
      setItems(teachersRes.items);
      setSubjects(subjectsRes.items);
      setSections(sectionsRes.items);
      setColleges(collegesRes.items);
      setError(null);
    } catch (err) {
      const message = getErrorMessage(err, "Failed to load teachers");
      setError(message);
      notify({ tone: "danger", title: "Teachers load failed", description: message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await load();
  }

  function resetCreateForm() {
    setCreateFirstname("");
    setCreateLastname("");
    setCreateAge("");
    setCreateEmail("");
    setCreatePassword("");
    setCreateCollegeId("");
  }

  async function onCreateTeacher(e: FormEvent) {
    e.preventDefault();
    if (!createFirstname.trim() || !createLastname.trim() || !createAge.trim() || !createEmail.trim() || !createPassword || !createCollegeId) {
      notify({ tone: "danger", title: "Missing fields", description: "Please complete all required fields." });
      return;
    }

    const parsedAge = Number(createAge);
    if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      notify({ tone: "danger", title: "Invalid age", description: "Age must be a whole number from 1 to 120." });
      return;
    }

    if (createPassword.length < 8) {
      notify({ tone: "danger", title: "Weak password", description: "Password must be at least 8 characters long." });
      return;
    }

    setCreating(true);
    try {
      await createTeacher({
        firstname: createFirstname.trim(),
        lastname: createLastname.trim(),
        age: parsedAge,
        email: createEmail.trim(),
        password: createPassword,
        college_id: Number(createCollegeId),
      });
      notify({ tone: "success", title: "Teacher account created" });
      setCreateOpen(false);
      resetCreateForm();
      await load();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Create teacher failed",
        description: getErrorMessage(err, "Could not create teacher account."),
      });
    } finally {
      setCreating(false);
    }
  }

  function openTeacherDetails(teacher: AdminTeacher) {
    setActiveTeacher(teacher);
    setDetailsOpen(true);
  }

  function onInitiateToggleStatus(teacher: AdminTeacher) {
    setActiveTeacher(teacher);
    setPendingActiveState(!teacher.is_active);
    setConfirmStatusOpen(true);
  }

  async function onToggleTeacherStatus() {
    if (!activeTeacher) return;
    setResetting(true);
    try {
      await patchUser(activeTeacher.id, { is_active: pendingActiveState! });
      notify({
        tone: "success",
        title: `Teacher ${pendingActiveState ? "enabled" : "disabled"}`,
        description: getTeacherDisplayName(activeTeacher),
      });
      await load();
      setConfirmStatusOpen(false);
    } catch (err) {
      notify({
        tone: "danger",
        title: "Status update failed",
        description: getErrorMessage(err, "Could not update teacher status."),
      });
    } finally {
      setResetting(false);
    }
  }

  async function onResetTeacherPassword() {
    if (!activeTeacher || newPassword.length < 8) return;
    setResetting(true);
    try {
      await resetPassword(activeTeacher.id, newPassword);
      notify({
        tone: "success",
        title: "Temporary password set",
        description: `Teacher: ${getTeacherDisplayName(activeTeacher)}`,
      });
      setResetModalOpen(false);
      setNewPassword("");
    } catch (err) {
      notify({
        tone: "danger",
        title: "Password reset failed",
        description: getErrorMessage(err, "Could not reset password."),
      });
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={<><Users className="h-5 w-5" />Teachers</>} description="Manage teacher accounts and classroom access states." />
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Create Teacher
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="w-full max-w-lg">
              <SearchBar
                placeholder="Search teacher name, username, or email..."
                value={query}
                onChange={setQuery}
                onSubmit={onSearch}
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-2 py-1.5">
              <select
                value={selectedCollegeFilter}
                onChange={(e) => setSelectedCollegeFilter(e.target.value)}
                className="h-8 border-0 bg-transparent px-1 text-xs font-bold text-foreground outline-none"
              >
                <option value="all" className="bg-card text-foreground">All Colleges</option>
                {colleges.map((college) => (
                  <option key={college.id} value={college.id.toString()} className="bg-card text-foreground">
                    {college.name}
                  </option>
                ))}
              </select>
              {selectedCollegeFilter !== "all" ? (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => setSelectedCollegeFilter("all")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
          {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
            </div>
          ) : filteredItems.length ? (
            <Table>
              <THead><TR><TH className="w-16">ID</TH><TH className="w-10">Photo</TH><TH>Full Name</TH><TH>Email</TH><TH>College</TH><TH>Added On</TH><TH>Assignments</TH><TH>Status</TH></TR></THead>
              <TBody>
                {filteredItems.map((teacher) => {
                  const displayName = getTeacherDisplayName(teacher);
                  const subjectCount = assignmentsByTeacher.subjectMap.get(teacher.id)?.length ?? 0;
                  const sectionCount = assignmentsByTeacher.sectionMap.get(teacher.id)?.length ?? 0;
                  return (
                    <TR
                      key={teacher.id}
                      className="cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => openTeacherDetails(teacher)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openTeacherDetails(teacher);
                        }
                      }}
                    >
                      <TD className="font-mono text-xs">{teacher.id}</TD>
                      <TD>
                        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                          {teacher.profile_picture_url ? (
                            <img src={teacher.profile_picture_url} alt={displayName} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">
                              {displayName.charAt(0)}
                            </span>
                          )}
                        </div>
                      </TD>
                      <TD className="font-medium">{currentActorUserId !== null && teacher.id === currentActorUserId ? "You" : displayName}</TD>
                      <TD className="text-muted-foreground">{teacher.email}</TD>
                      <TD className="text-muted-foreground">{teacher.college_name || "-"}</TD>
                      <TD className="text-muted-foreground">{formatAddedOn(teacher.created_at)}</TD>
                      <TD>
                        <div className="flex gap-1.5">
                          <Badge tone={subjectCount > 0 ? "success" : "default"}>{subjectCount} subject{subjectCount === 1 ? "" : "s"}</Badge>
                          <Badge tone={sectionCount > 0 ? "success" : "default"}>{sectionCount} section{sectionCount === 1 ? "" : "s"}</Badge>
                        </div>
                      </TD>
                      <TD><Badge tone={teacher.is_active ? "success" : "danger"}>{teacher.is_active ? "Active" : "Disabled"}</Badge></TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No teachers found for the current filters.</p>
          )}
        </CardContent>
      </Card>

      <Modal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={activeTeacher ? `Teacher #${activeTeacher.id}` : "Teacher details"}
        description={activeTeacher ? `${currentActorUserId !== null && activeTeacher.id === currentActorUserId ? "You" : getTeacherDisplayName(activeTeacher)} • ${activeTeacher.email}` : ""}
      >
        {activeTeacher ? (
          <div className="space-y-4">
            {(() => {
              const teacherSubjects = assignmentsByTeacher.subjectMap.get(activeTeacher.id) ?? [];
              const teacherSections = assignmentsByTeacher.sectionMap.get(activeTeacher.id) ?? [];
              return (
                <>
            <div className="flex items-center gap-4 py-2">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-muted shadow-sm">
                {activeTeacher.profile_picture_url ? (
                  <img src={activeTeacher.profile_picture_url} alt={getTeacherDisplayName(activeTeacher)} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold uppercase text-muted-foreground">
                    {getTeacherDisplayName(activeTeacher).charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold">{getTeacherDisplayName(activeTeacher)}</h3>
                <p className="text-sm text-muted-foreground">{activeTeacher.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-md border border-border/70 bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">Assigned Subjects</p>
                <p className="font-medium">{teacherSubjects.length}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {teacherSubjects.slice(0, 3).map((subject) => subject.name).join(", ") || "No subject assignment yet"}
                </p>
              </div>
              <div className="rounded-md border border-border/70 bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">Assigned Sections</p>
                <p className="font-medium">{teacherSections.length}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {teacherSections.slice(0, 3).map((section) => `${section.subject_name} • ${section.name}`).join(", ") || "No section assignment yet"}
                </p>
              </div>
            </div>
            <div className="rounded-md border border-border/70 bg-background/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Assigned Sections (click to open)</p>
                <Badge tone={teacherSections.length > 0 ? "success" : "default"}>
                  {teacherSections.length}
                </Badge>
              </div>
              {teacherSections.length ? (
                <div className="flex flex-wrap gap-2">
                  {teacherSections.map((section) => (
                    <Link
                      key={section.id}
                      href={`/sections?q=${encodeURIComponent(section.name)}`}
                      className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      {section.subject_name} • {section.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No section assignment yet.</p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-md border border-border/70 bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">User ID</p>
                <p className="font-mono">{activeTeacher.id}</p>
              </div>
              <div className="rounded-md border border-border/70 bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">College</p>
                <p className="font-medium">{activeTeacher.college_name || "Not assigned"}</p>
              </div>
              <div className="rounded-md border border-border/70 bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${activeTeacher.is_active ? "bg-success" : "bg-danger"}`} />
                  <p className="font-medium">{activeTeacher.is_active ? "Active" : "Disabled"}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResetModalOpen(true)}>
                <KeyRound className="mr-2 h-4 w-4" />
                Reset password
              </Button>
              <Button onClick={() => onInitiateToggleStatus(activeTeacher)}>
                {activeTeacher.is_active ? <ShieldOff className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                {activeTeacher.is_active ? "Disable" : "Enable"}
              </Button>
            </div>
                </>
              );
            })()}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={resetModalOpen}
        onClose={() => {
          if (!resetting) {
            setResetModalOpen(false);
            setNewPassword("");
          }
        }}
        title="Reset Teacher Password"
        description={activeTeacher ? `Account: ${getTeacherDisplayName(activeTeacher)}` : ""}
        className="max-w-md"
      >
        <div className="space-y-6">
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 text-xs text-warning">
            <p className="font-semibold">Important Security Notice:</p>
            <p className="mt-1 opacity-90">Resetting a password is a critical action. The teacher will be forced to use this new password immediately.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium tracking-tight">Enter Temporary Password</label>
            <Input
              type="password"
              placeholder="Minimum 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-11 font-mono tracking-wider"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setResetModalOpen(false);
                setNewPassword("");
              }}
              disabled={resetting}
              className="font-medium"
            >
              Back to Details
            </Button>
            <Button
              onClick={() => setConfirmResetOpen(true)}
              disabled={resetting || newPassword.length < 8}
              className="px-6 font-semibold"
            >
              Update Password
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => {
          if (!creating) {
            setCreateOpen(false);
            resetCreateForm();
          }
        }}
        title="Create Teacher Account"
        description="Create a new teacher login managed by admin."
        className="max-w-lg"
      >
        <form className="space-y-4" onSubmit={onCreateTeacher}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">First Name</label>
              <Input value={createFirstname} onChange={(e) => setCreateFirstname(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Last Name</label>
              <Input value={createLastname} onChange={(e) => setCreateLastname(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Age</label>
            <Input type="number" min={1} max={120} value={createAge} onChange={(e) => setCreateAge(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">College</label>
            <select
              value={createCollegeId}
              onChange={(e) => setCreateCollegeId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              required
            >
              <option value="">Select college...</option>
              {colleges.map((college) => (
                <option key={college.id} value={college.id}>
                  {college.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create Teacher"}
            </Button>
          </div>
        </form>
      </Modal>

      <AlertDialog
        open={confirmStatusOpen}
        onClose={() => setConfirmStatusOpen(false)}
        onConfirm={onToggleTeacherStatus}
        title={pendingActiveState ? "Enable Teacher Account?" : "Disable Teacher Account?"}
        description={activeTeacher ? `Are you sure you want to ${pendingActiveState ? "enable" : "disable"} ${getTeacherDisplayName(activeTeacher)}? This will ${pendingActiveState ? "allow" : "prevent"} them from logging in and accessing their subjects.` : ""}
        confirmText={pendingActiveState ? "Enable Account" : "Disable Account"}
        variant={pendingActiveState ? "default" : "danger"}
        loading={resetting}
      />

      <AlertDialog
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={onResetTeacherPassword}
        title="Confirm Password Reset?"
        description="This will override the user's current password immediately. This action cannot be undone."
        confirmText="Confirm Reset"
        variant="danger"
        loading={resetting}
      />
    </div>
  );
}
