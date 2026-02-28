import type { ReactNode } from "react";

export function PageHeader({ title, description }: { title: ReactNode; description: string }) {
  return (
    <div className="mb-6 space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Admin</p>
      <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
