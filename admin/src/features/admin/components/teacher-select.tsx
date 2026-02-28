"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminTeacher } from "../types";

interface TeacherSelectProps {
    teachers: AdminTeacher[];
    value: number | null;
    onChange: (id: number) => void;
    placeholder?: string;
    className?: string;
    triggerClassName?: string;
}

export function TeacherSelect({
    teachers,
    value,
    onChange,
    placeholder = "Select a teacher",
    className,
    triggerClassName,
}: TeacherSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedTeacher = teachers.find((t) => t.id === value);

    const filteredTeachers = teachers.filter((t) =>
        t.username.toLowerCase().includes(query.toLowerCase()) ||
        t.email.toLowerCase().includes(query.toLowerCase())
    );

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            <button
                type="button"
                className={cn(
                    "flex min-h-[2.25rem] w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-1.5 text-sm ring-offset-background transition-all hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    isOpen && "ring-2 ring-ring ring-offset-2",
                    triggerClassName
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2.5 truncate">
                    {selectedTeacher ? (
                        <>
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                                {selectedTeacher.profile_picture_url ? (
                                    <img
                                        src={selectedTeacher.profile_picture_url}
                                        alt={selectedTeacher.username}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                        {selectedTeacher.username.charAt(0)}
                                    </span>
                                )}
                            </div>
                            <span className="font-medium">{selectedTeacher.username}</span>
                        </>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                </div>
                <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-72 overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="sticky top-0 z-10 border-b border-border bg-card/95 p-2 backdrop-blur-md">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <input
                                className="h-9 w-full rounded-md border-0 bg-muted/50 pl-8 pr-3 text-sm focus:ring-1 focus:ring-primary/30 outline-none"
                                placeholder="Search teachers..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto p-1 custom-scrollbar">
                        {filteredTeachers.length ? (
                            filteredTeachers.map((teacher) => (
                                <button
                                    key={teacher.id}
                                    type="button"
                                    className={cn(
                                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all hover:bg-accent",
                                        value === teacher.id && "bg-primary/10 text-primary font-medium"
                                    )}
                                    onClick={() => {
                                        onChange(teacher.id);
                                        setIsOpen(false);
                                        setQuery("");
                                    }}
                                >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                                        {teacher.profile_picture_url ? (
                                            <img
                                                src={teacher.profile_picture_url}
                                                alt={teacher.username}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-xs font-bold uppercase text-muted-foreground">
                                                {teacher.username.charAt(0)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold">{teacher.username}</p>
                                        <p className="truncate text-[10px] text-muted-foreground">{teacher.email}</p>
                                    </div>
                                    {value === teacher.id && (
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <p className="text-xs font-medium text-muted-foreground">No teachers found.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
