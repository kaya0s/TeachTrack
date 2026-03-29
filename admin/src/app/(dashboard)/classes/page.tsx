"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ClassesRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    router.replace(query ? `/sections?${query}` : "/sections");
  }, [router, searchParams]);

  return null;
}
