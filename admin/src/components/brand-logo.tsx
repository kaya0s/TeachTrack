"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

export function BrandLogo({ compact = false, className }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-border bg-card p-1">
        <Image src="/brand/logo.png" alt="TeachTrack Logo" fill sizes="40px" className="object-contain dark:hidden" />
        <Image src="/brand/logo_white.png" alt="TeachTrack Logo" fill sizes="40px" className="hidden object-contain dark:block" />
      </div>
      {!compact ? (
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">TeachTrack</p>
          <p className="text-sm font-semibold">Admin Console</p>
        </div>
      ) : null}
    </div>
  );
}
