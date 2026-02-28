"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { getToken } from "@/lib/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let token: string | null = null;
    try {
      token = getToken();
    } catch {
      token = null;
    }

    if (!token) {
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
      return;
    }

    setReady(true);
  }, [pathname]);

  if (!ready) {
    return (
      <div className="relative flex h-screen overflow-hidden bg-background">
        <aside className="h-screen w-72 border-r border-border/70 bg-card/75 p-4">
          <div className="mb-6 rounded-xl border border-border/60 bg-background/80 p-3">
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </aside>
        <div className="flex h-screen min-w-0 flex-1 flex-col">
          <header className="h-16 shrink-0 border-b border-border/70 bg-background/90 px-6 py-3">
            <Skeleton className="h-9 w-80" />
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-8">
            <div className="space-y-4">
              <Skeleton className="h-8 w-72" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </div>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={`row-${i}`} className="h-12 w-full" />
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
