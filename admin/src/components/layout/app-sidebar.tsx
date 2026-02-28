"use client";

import { useEffect } from "react";
import { BarChart3, Bell, BookOpen, Cog, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teachers", label: "Teachers", icon: Users },
  { href: "/classes", label: "Classes", icon: BookOpen },
  { href: "/sessions", label: "Sessions", icon: BarChart3 },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/models", label: "Models", icon: BookOpen },
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
    <aside className="h-screen w-72 border-r border-border bg-background px-4 py-5">
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
      <div className="mt-6 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
        Built for classroom operations, metrics, and live intervention.
      </div>
    </aside>
  );
}
