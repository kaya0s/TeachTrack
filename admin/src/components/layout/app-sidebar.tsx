"use client";

import { useEffect } from "react";
import { BarChart3, BookOpen, Cog, Database, LayoutDashboard, LifeBuoy, ScrollText, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sessions", label: "Sessions", icon: BarChart3 },
  { href: "/teachers", label: "Teachers", icon: Users },
  { href: "/classes", label: "Classes", icon: BookOpen },
  { href: "/models", label: "Models", icon: BookOpen },
  { href: "/audit-logs", label: "Audit Logs", icon: ScrollText },
  { href: "/backup", label: "Backup", icon: Database },
  { href: "/settings", label: "Settings", icon: Cog },
];

export function AppSidebar({ onNavigateStart }: { onNavigateStart?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    for (const item of items) {
      router.prefetch(item.href);
    }
  }, [router]);

  return (
    <aside className="flex flex-col h-screen w-72 border-r border-border bg-background px-4 py-5">
      <div className="mb-6 rounded-xl border border-border bg-card p-3">
        <BrandLogo />
      </div>
      <nav className="space-y-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onClick={() => {
                if (item.href !== pathname) {
                  onNavigateStart?.();
                }
              }}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-6 flex flex-col gap-2">
        <Link
          href="/support"
          prefetch
          onClick={() => {
            if ("/support" !== pathname) {
              onNavigateStart?.();
            }
          }}
          className={cn(
            "flex w-fit items-center gap-2 px-3 py-1.5 text-xs transition-colors rounded-md",
            pathname === "/support"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          <LifeBuoy className="h-3.5 w-3.5" />
          Support Helpdesk
        </Link>
        <div className="px-3 text-[10px] leading-relaxed text-muted-foreground/60">
          Built for classroom operations, metrics, and live intervention.
        </div>
      </div>
    </aside>
  );
}
