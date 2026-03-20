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
import { getSubjects } from "@/features/admin/api";
import type { AdminSubject } from "@/features/admin/types";

export default function SubjectsPage() {
  const { notify } = useToast();
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params = query ? `?q=${encodeURIComponent(query)}` : "";
      const subjectsRes = await getSubjects(params);
      setSubjects(subjectsRes.items);
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
      <PageHeader title={<><BookOpen className="h-5 w-5" />Subjects</>} description="Review subject metadata and section coverage." />
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
              <THead><TR><TH>ID</TH><TH>Subject</TH><TH>Code</TH><TH>Teacher</TH><TH>Sections</TH></TR></THead>
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
                            <img src={subject.teacher_profile_picture_url} alt={teacherName(subject)} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[8px] font-bold uppercase text-muted-foreground">
                              {subject.teacher_username === "unassigned" ? "?" : teacherName(subject).charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="truncate max-w-[120px]">{teacherName(subject)}</span>
                      </div>
                    </TD>
                    <TD>{subject.sections_count}</TD>
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
  const teacherName = (subject: AdminSubject) => subject.teacher_fullname?.trim() || subject.teacher_username;
