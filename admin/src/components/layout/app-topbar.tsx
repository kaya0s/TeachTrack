"use client";

import { Bell, CalendarDays, LogOut, TerminalSquare } from "lucide-react";
import { useRouter } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { clearToken } from "@/lib/auth";

type AppTopbarProps = {
  unreadCount?: number;
  onOpenNotifications?: () => void;
  onOpenLogs?: () => void;
};

export function AppTopbar({ unreadCount = 0, onOpenNotifications, onOpenLogs }: AppTopbarProps) {
  const router = useRouter();
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur">
      <div className="flex items-center gap-4">
        <BrandLogo compact className="md:hidden" />
        <div>
          <p className="text-sm font-semibold tracking-tight">Operational monitoring and controls</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" /> {today}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onOpenLogs}
          aria-label="Open server logs"
          title="Server logs"
        >
          <TerminalSquare className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onOpenNotifications}
          className="relative"
          aria-label="Open notifications"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-danger-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
        <ThemeToggle />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            clearToken();
            router.replace("/login");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
