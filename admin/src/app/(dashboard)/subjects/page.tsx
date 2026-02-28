"use client";

import { FormEvent, useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { assignSubjectTeacher, getSubjects, getTeachers } from "@/features/admin/api";
import type { AdminSubject, AdminTeacher } from "@/features/admin/types";

export default function SubjectsPage() {
  const { notify } = useToast();
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [query, setQuery] = useState("");
  const [selectedTeacherBySubject, setSelectedTeacherBySubject] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params = query ? `?q=${encodeURIComponent(query)}` : "";
      const [subjectsRes, teachersRes] = await Promise.all([getSubjects(params), getTeachers("?limit=200")]);
      setSubjects(subjectsRes.items);
      setTeachers(teachersRes.items.filter((teacher) => teacher.is_active));
    } catch (err) {
      notify({
        tone: "danger",
        title: "Subjects load failed",
        description: err instanceof Error ? err.message : "Could not load subjects.",
      });
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

  return (
    <div className="space-y-4">
      <PageHeader title="Subjects" description="Assign subject ownership to teachers." />
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={onSearch} className="mb-4 flex gap-2">
            <Input placeholder="Search subject name or code" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Button variant="outline" type="submit">Search</Button>
          </form>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
            </div>
          ) : subjects.length ? (
            <Table>
              <THead><TR><TH>ID</TH><TH>Subject</TH><TH>Code</TH><TH>Teacher</TH><TH>Sections</TH><TH>Assign</TH></TR></THead>
              <TBody>
                {subjects.map((subject) => (
                  <TR key={subject.id}>
                    <TD>{subject.id}</TD>
                    <TD>{subject.name}</TD>
                    <TD>{subject.code ?? "-"}</TD>
                    <TD>{subject.teacher_username}</TD>
                    <TD>{subject.sections_count}</TD>
                    <TD>
                      <div className="flex gap-2">
                        <select
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                          value={selectedTeacherBySubject[subject.id] ?? subject.teacher_id ?? ""}
                          onChange={(e) => {
                            setSelectedTeacherBySubject((prev) => ({
                              ...prev,
                              [subject.id]: Number(e.target.value),
                            }));
                          }}
                        >
                          <option value="" disabled>Select teacher</option>
                          {teachers.map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>{teacher.username}</option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const teacherId = selectedTeacherBySubject[subject.id] ?? subject.teacher_id;
                            if (!teacherId) return;
                            try {
                              await assignSubjectTeacher(subject.id, teacherId);
                              notify({ tone: "success", title: `Subject ${subject.name} assigned` });
                              await load();
                            } catch (err) {
                              notify({
                                tone: "danger",
                                title: "Assignment failed",
                                description: err instanceof Error ? err.message : "Could not assign teacher.",
                              });
                            }
                          }}
                        >
                          Assign
                        </Button>
                      </div>
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
    </div>
  );
}
