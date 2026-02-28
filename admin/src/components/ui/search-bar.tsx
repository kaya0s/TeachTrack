"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit?: (e: React.FormEvent) => void;
    placeholder?: string;
    className?: string;
}

export function SearchBar({
    value,
    onChange,
    onSubmit,
    placeholder = "Search...",
    className
}: SearchBarProps) {
    const inputEl = (
        <div className={cn("relative flex-1 max-w-md", className)}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="pl-10 h-11 bg-card border-border/50 shadow-sm rounded-xl focus-visible:ring-primary/20 transition-all"
            />
        </div>
    );

    if (onSubmit) {
        return (
            <form onSubmit={onSubmit} className="flex flex-1 items-center gap-2 max-w-md">
                {inputEl}
                <Button variant="outline" type="submit" className="h-11 px-6 rounded-xl font-bold shadow-sm whitespace-nowrap">
                    Search
                </Button>
            </form>
        );
    }

    return inputEl;
}
