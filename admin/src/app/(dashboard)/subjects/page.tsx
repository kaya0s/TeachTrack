"use client";

import { FormEvent, useEffect, useState } from "react";
import { BookOpen } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { assignSubjectTeacher, getSubjects, getTeachers } from "@/features/admin/api";
import type { AdminSubject, AdminTeacher } from "@/features/admin/types";
import { TeacherSelect } from "@/features/admin/components/teacher-select";

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
      <PageHeader title={<><BookOpen className="h-5 w-5" />Subjects</>} description="Assign subject ownership to teachers." />
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
                    <TD>
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                          {subject.teacher_profile_picture_url ? (
                            <img src={subject.teacher_profile_picture_url} alt={subject.teacher_username} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[8px] font-bold uppercase text-muted-foreground">
                              {subject.teacher_username === "unassigned" ? "?" : subject.teacher_username.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="truncate max-w-[120px]">{subject.teacher_username}</span>
                      </div>
                    </TD>
                    <TD>{subject.sections_count}</TD>
                    <TD>
                      <div className="flex gap-2">
                        <div className="w-[180px]">
                          <TeacherSelect
                            teachers={teachers}
                            value={selectedTeacherBySubject[subject.id] ?? subject.teacher_id ?? null}
                            onChange={(id) => {
                              setSelectedTeacherBySubject((prev) => ({
                                ...prev,
                                [subject.id]: id,
                              }));
                            }}
                            placeholder="Select teacher"
                            triggerClassName="!h-8"
                          />
                        </div>
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
