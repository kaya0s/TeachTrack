import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getToken, clearToken } from "./auth";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function httpRequest(url: string, options: RequestInit = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1";
  const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;
  
  const token = getToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  // Normalize body and set Content-Type when appropriate
  let body: any = options.body;
  if (body && !headers.has("Content-Type")) {
    if (body instanceof FormData || body instanceof URLSearchParams || body instanceof Blob) {
      // Let the browser set the correct Content-Type for these types
    } else if (typeof body === "object") {
      body = JSON.stringify(body);
      headers.set("Content-Type", "application/json");
    } else if (typeof body === "string") {
      headers.set("Content-Type", "application/json");
    }
  }
  
  const response = await fetch(fullUrl, {
    ...options,
    headers,
    body,
  });
  
  if (!response.ok) {
    // If unauthorized or forbidden, clear token and redirect to login
    if (response.status === 401 || response.status === 403) {
      clearToken();
      if (typeof window !== "undefined") {
        const loginUrl = "/login";
        try {
          window.location.href = loginUrl;
        } catch {
          // ignore
        }
      }
      throw new Error("Not authenticated");
    }

    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json() as any;
      errorMessage = errorData?.message || errorData?.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  
  return response.json();
}
