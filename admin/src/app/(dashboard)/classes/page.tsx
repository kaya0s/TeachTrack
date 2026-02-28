"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import {
  assignSectionTeacher,
  createClass,
  createSection,
  createSubject,
  deleteSection,
  deleteSubject,
  getSections,
  getSubjects,
  getTeachers,
  updateSection,
  updateSubject,
} from "@/features/admin/api";
import type { AdminSection, AdminSubject, AdminTeacher } from "@/features/admin/types";

type ModalMode = "create" | "edit";

export default function ClassesPage() {
  const { notify } = useToast();
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [subjectModalMode, setSubjectModalMode] = useState<ModalMode>("create");
  const [editingSubject, setEditingSubject] = useState<AdminSubject | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");

  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [sectionModalMode, setSectionModalMode] = useState<ModalMode>("create");
  const [editingSection, setEditingSection] = useState<AdminSection | null>(null);
  const [sectionName, setSectionName] = useState("");
  const [sectionSubjectId, setSectionSubjectId] = useState<number | null>(null);

  const [classModalOpen, setClassModalOpen] = useState(false);
  const [newClassSubjectId, setNewClassSubjectId] = useState<number | null>(null);
  const [newClassSubjectName, setNewClassSubjectName] = useState("");
  const [newClassSubjectCode, setNewClassSubjectCode] = useState("");
  const [newClassSectionName, setNewClassSectionName] = useState("");

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningSection, setAssigningSection] = useState<AdminSection | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [subjectActionsModalOpen, setSubjectActionsModalOpen] = useState(false);
  const [sectionActionsModalOpen, setSectionActionsModalOpen] = useState(false);
  const [activeSubject, setActiveSubject] = useState<AdminSubject | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection | null>(null);

  const filteredSubjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((item) => item.name.toLowerCase().includes(q) || (item.code ?? "").toLowerCase().includes(q));
  }, [query, subjects]);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter((item) => item.name.toLowerCase().includes(q) || item.subject_name.toLowerCase().includes(q));
  }, [query, sections]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subjectsRes, sectionsRes, teachersRes] = await Promise.all([
        getSubjects("?limit=200"),
        getSections("?limit=200"),
        getTeachers("?limit=200"),
      ]);
      setSubjects(subjectsRes.items);
      setSections(sectionsRes.items);
      setTeachers(teachersRes.items.filter((item) => item.is_active));
    } catch (err) {
      notify({
        tone: "danger",
        title: "Load failed",
        description: err instanceof Error ? err.message : "Could not load classes data.",
      });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  function resetSubjectForm() {
    setSubjectName("");
    setSubjectCode("");
    setSubjectDescription("");
  }

  function resetSectionForm() {
    setSectionName("");
    setSectionSubjectId(subjects[0]?.id ?? null);
  }

  function openSubjectCreate() {
    setSubjectModalMode("create");
    setEditingSubject(null);
    resetSubjectForm();
    setSubjectModalOpen(true);
  }

  function openSubjectEdit(item: AdminSubject) {
    setSubjectModalMode("edit");
    setEditingSubject(item);
    setSubjectName(item.name);
    setSubjectCode(item.code ?? "");
    setSubjectDescription(item.description ?? "");
    setSubjectModalOpen(true);
  }

  function openSectionCreate() {
    setSectionModalMode("create");
    setEditingSection(null);
    setSectionName("");
    setSectionSubjectId(subjects[0]?.id ?? null);
    setSectionModalOpen(true);
  }

  function openSectionEdit(item: AdminSection) {
    setSectionModalMode("edit");
    setEditingSection(item);
    setSectionName(item.name);
    setSectionSubjectId(item.subject_id);
    setSectionModalOpen(true);
  }

  async function onSubjectSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (subjectModalMode === "create") {
        await createSubject({
          name: subjectName.trim(),
          code: subjectCode.trim() || undefined,
          description: subjectDescription.trim() || undefined,
        });
        notify({ tone: "success", title: "Subject created" });
      } else if (editingSubject) {
        await updateSubject(editingSubject.id, {
          name: subjectName.trim(),
          code: subjectCode.trim() || "",
          description: subjectDescription.trim() || "",
        });
        notify({ tone: "success", title: "Subject updated" });
      }
      setSubjectModalOpen(false);
      await load();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Subject save failed",
        description: err instanceof Error ? err.message : "Could not save subject.",
      });
    }
  }

  async function onSectionSubmit(e: FormEvent) {
    e.preventDefault();
    if (!sectionSubjectId) return;
    try {
      if (sectionModalMode === "create") {
        await createSection({
          name: sectionName.trim(),
          subject_id: sectionSubjectId,
        });
        notify({ tone: "success", title: "Section created" });
      } else if (editingSection) {
        await updateSection(editingSection.id, {
          name: sectionName.trim(),
          subject_id: sectionSubjectId,
        });
        notify({ tone: "success", title: "Section updated" });
      }
      setSectionModalOpen(false);
      await load();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Section save failed",
        description: err instanceof Error ? err.message : "Could not save section.",
      });
    }
  }

  async function onClassCreateSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await createClass({
        subject_id: newClassSubjectId ?? undefined,
        subject_name: newClassSubjectId ? undefined : newClassSubjectName.trim(),
        subject_code: newClassSubjectId ? undefined : (newClassSubjectCode.trim() || undefined),
        section_name: newClassSectionName.trim(),
      });
      notify({ tone: "success", title: "Class created", description: "Assign a teacher next." });
      setClassModalOpen(false);
      setNewClassSubjectId(null);
      setNewClassSubjectName("");
      setNewClassSubjectCode("");
      setNewClassSectionName("");
      await load();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Class creation failed",
        description: err instanceof Error ? err.message : "Could not create class.",
      });
    }
  }

  async function onAssignConfirm() {
    if (!assigningSection || !selectedTeacherId) return;
    try {
      await assignSectionTeacher(assigningSection.id, selectedTeacherId);
      notify({ tone: "success", title: "Class assigned to teacher" });
      setAssignModalOpen(false);
      setAssigningSection(null);
      await load();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Assignment failed",
        description: err instanceof Error ? err.message : "Could not assign teacher.",
      });
    }
  }

  async function onDeleteSubject(item: AdminSubject) {
    try {
      await deleteSubject(item.id);
      notify({ tone: "success", title: "Subject deleted" });
      setSubjectActionsModalOpen(false);
      setActiveSubject(null);
      await load();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Could not delete subject.",
      });
    }
  }

  async function onDeleteSection(item: AdminSection) {
    try {
      await deleteSection(item.id);
      notify({ tone: "success", title: "Section deleted" });
      setSectionActionsModalOpen(false);
      setActiveSection(null);
      await load();
    } catch (err) {
      notify({
        tone: "danger",
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Could not delete section.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Classes" description="Manage subjects, sections, and teacher assignment in one workspace." />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <Input
          placeholder="Search subject or section"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" onClick={openSubjectCreate}>New Subject</Button>
        <Button variant="outline" onClick={openSectionCreate}>New Section</Button>
        <Button onClick={() => setClassModalOpen(true)}>Create Class</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Subjects</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : filteredSubjects.length ? (
              <Table>
                <THead><TR><TH>Name</TH><TH>Code</TH><TH>Teacher</TH><TH>Actions</TH></TR></THead>
                <TBody>
                  {filteredSubjects.map((item) => (
                    <TR key={item.id}>
                      <TD>{item.name}</TD>
                      <TD>{item.code ?? "-"}</TD>
                      <TD>{item.teacher_username}</TD>
                      <TD>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActiveSubject(item);
                            setSubjectActionsModalOpen(true);
                          }}
                        >
                          Actions
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No subjects found.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Sections (Classes)</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : filteredSections.length ? (
              <Table>
                <THead><TR><TH>Section</TH><TH>Subject</TH><TH>Teacher</TH><TH>Actions</TH></TR></THead>
                <TBody>
                  {filteredSections.map((item) => (
                    <TR key={item.id}>
                      <TD>{item.name}</TD>
                      <TD>{item.subject_name}</TD>
                      <TD>{item.teacher_username}</TD>
                      <TD>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActiveSection(item);
                            setSectionActionsModalOpen(true);
                          }}
                        >
                          Actions
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No sections found.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        title={subjectModalMode === "create" ? "Create Subject" : "Edit Subject"}
        description="Keep subject definitions clear and reusable."
      >
        <form className="space-y-3" onSubmit={onSubjectSubmit}>
          <Input placeholder="Subject name" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} required />
          <Input placeholder="Code (optional)" value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} />
          <Input placeholder="Description (optional)" value={subjectDescription} onChange={(e) => setSubjectDescription(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setSubjectModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Subject</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={sectionModalOpen}
        onClose={() => setSectionModalOpen(false)}
        title={sectionModalMode === "create" ? "Create Section" : "Edit Section"}
        description="Sections are the class groups assigned to teachers."
      >
        <form className="space-y-3" onSubmit={onSectionSubmit}>
          <Input placeholder="Section name" value={sectionName} onChange={(e) => setSectionName(e.target.value)} required />
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={sectionSubjectId ?? ""}
            onChange={(e) => setSectionSubjectId(Number(e.target.value))}
            required
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setSectionModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Section</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={classModalOpen}
        onClose={() => setClassModalOpen(false)}
        title="Create Class"
        description="Create a subject-section class in one flow."
      >
        <form className="space-y-3" onSubmit={onClassCreateSubmit}>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={newClassSubjectId ?? ""}
            onChange={(e) => setNewClassSubjectId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Create with new subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          {!newClassSubjectId ? (
            <>
              <Input
                placeholder="New subject name"
                value={newClassSubjectName}
                onChange={(e) => setNewClassSubjectName(e.target.value)}
                required
              />
              <Input
                placeholder="New subject code (optional)"
                value={newClassSubjectCode}
                onChange={(e) => setNewClassSubjectCode(e.target.value)}
              />
            </>
          ) : null}
          <Input
            placeholder="Section name"
            value={newClassSectionName}
            onChange={(e) => setNewClassSectionName(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setClassModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Class</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Class To Teacher"
        description={assigningSection ? `${assigningSection.subject_name} - ${assigningSection.name}` : ""}
      >
        <div className="space-y-3">
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedTeacherId ?? ""}
            onChange={(e) => setSelectedTeacherId(Number(e.target.value))}
          >
            <option value="">Select a teacher</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>{teacher.username}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
            <Button onClick={onAssignConfirm} disabled={!selectedTeacherId}>Confirm Assignment</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={subjectActionsModalOpen}
        onClose={() => setSubjectActionsModalOpen(false)}
        title="Subject Actions"
        description={activeSubject ? activeSubject.name : ""}
      >
        <div className="space-y-2">
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={() => {
              if (!activeSubject) return;
              setSubjectActionsModalOpen(false);
              openSubjectEdit(activeSubject);
            }}
          >
            Edit Subject
          </Button>
          <Button
            className="w-full justify-start"
            variant="danger"
            onClick={() => {
              if (!activeSubject) return;
              onDeleteSubject(activeSubject);
            }}
          >
            Delete Subject
          </Button>
        </div>
      </Modal>

      <Modal
        open={sectionActionsModalOpen}
        onClose={() => setSectionActionsModalOpen(false)}
        title="Class Actions"
        description={activeSection ? `${activeSection.subject_name} - ${activeSection.name}` : ""}
      >
        <div className="space-y-2">
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={() => {
              if (!activeSection) return;
              setSectionActionsModalOpen(false);
              openSectionEdit(activeSection);
            }}
          >
            Edit Section
          </Button>
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={() => {
              if (!activeSection) return;
              setSectionActionsModalOpen(false);
              setAssigningSection(activeSection);
              setSelectedTeacherId(activeSection.teacher_id);
              setAssignModalOpen(true);
            }}
          >
            Assign Teacher
          </Button>
          <Button
            className="w-full justify-start"
            variant="danger"
            onClick={() => {
              if (!activeSection) return;
              onDeleteSection(activeSection);
            }}
          >
            Delete Section
          </Button>
        </div>
      </Modal>
    </div>
  );
}
