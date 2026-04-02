"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SectionsRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("focus", "section");
    const query = next.toString();
    router.replace(query ? `/subjects-and-sections?${query}` : "/subjects-and-sections");
  }, [router, searchParams]);

  return null;
}
