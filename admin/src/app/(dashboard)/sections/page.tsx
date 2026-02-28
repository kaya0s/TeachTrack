"use client";

import { FormEvent, useEffect, useState } from "react";
import { Layers3 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { assignSectionTeacher, getSections, getTeachers } from "@/features/admin/api";
import type { AdminSection, AdminTeacher } from "@/features/admin/types";

export default function SectionsPage() {
  const { notify } = useToast();
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [query, setQuery] = useState("");
  const [selectedTeacherBySection, setSelectedTeacherBySection] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params = query ? `?q=${encodeURIComponent(query)}` : "";
      const [sectionsRes, teachersRes] = await Promise.all([getSections(params), getTeachers("?limit=200")]);
      setSections(sectionsRes.items);
      setTeachers(teachersRes.items.filter((teacher) => teacher.is_active));
    } catch (err) {
      notify({
        tone: "danger",
        title: "Sections load failed",
        description: err instanceof Error ? err.message : "Could not load sections.",
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
      <PageHeader title={<><Layers3 className="h-5 w-5" />Sections</>} description="Assign class sections to teachers." />
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={onSearch} className="mb-4 flex gap-2">
            <Input placeholder="Search section name" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Button variant="outline" type="submit">Search</Button>
          </form>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
            </div>
          ) : sections.length ? (
            <Table>
              <THead><TR><TH>ID</TH><TH>Section</TH><TH>Subject</TH><TH>Teacher</TH><TH>Assign</TH></TR></THead>
              <TBody>
                {sections.map((section) => (
                  <TR key={section.id}>
                    <TD>{section.id}</TD>
                    <TD>{section.name}</TD>
                    <TD>{section.subject_name}</TD>
                    <TD>{section.teacher_username}</TD>
                    <TD>
                      <div className="flex gap-2">
                        <select
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                          value={selectedTeacherBySection[section.id] ?? section.teacher_id ?? ""}
                          onChange={(e) => {
                            setSelectedTeacherBySection((prev) => ({
                              ...prev,
                              [section.id]: Number(e.target.value),
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
                            const teacherId = selectedTeacherBySection[section.id] ?? section.teacher_id;
                            if (!teacherId) return;
                            try {
                              await assignSectionTeacher(section.id, teacherId);
                              notify({ tone: "success", title: `Section ${section.name} assigned` });
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
            <p className="text-sm text-muted-foreground">No sections found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
