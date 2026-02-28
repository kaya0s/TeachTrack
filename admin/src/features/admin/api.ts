"use client";

import { getToken } from "@/lib/auth";
import type {
  AdminAlert,
  AdminSection,
  AdminSessionDetail,
  AdminSession,
  AdminSubject,
  AdminTeacher,
  AdminUser,
  DashboardResponse,
  ModelSelectionResponse,
  PaginatedResponse,
  ServerLogEntry,
} from "@/features/admin/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (init.headers && typeof init.headers === "object" && !Array.isArray(init.headers)) {
    Object.assign(headers, init.headers as Record<string, string>);
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const body = await res.text();
    let message = body || "Request failed";
    try {
      const parsed = JSON.parse(body) as { detail?: string };
      if (parsed?.detail) {
        message = parsed.detail;
      }
    } catch {
      // Keep raw text response when body is not JSON.
    }

    if (res.status === 401) {
      const { clearToken } = await import("@/lib/auth");
      clearToken();
      if (typeof window !== "undefined") {
        sessionStorage.setItem("teachtrack_admin_auth_error", "Please login first to continue.");
        window.location.replace("/login");
      }
    }

    throw new Error(`HTTP ${res.status}: ${message}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export async function login(username: string, password: string): Promise<{ access_token: string }> {
  const body = new URLSearchParams();
  body.append("username", username);
  body.append("password", password);

  const res = await fetch(`${API_BASE}/login/access-token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body || "Invalid credentials"}`);
  }

  return res.json();
}

export async function loginWithGoogle(idToken: string): Promise<{ access_token: string }> {
  const res = await fetch(`${API_BASE}/login/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body || "Google login failed"}`);
  }

  return res.json();
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return request<{ message: string }>("/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function verifyResetCode(email: string, code: string): Promise<{ message: string }> {
  return request<{ message: string }>("/verify-reset-code", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

export function resetPasswordWithCode(
  email: string,
  code: string,
  newPassword: string
): Promise<{ message: string }> {
  return request<{ message: string }>("/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, code, new_password: newPassword }),
  });
}

export function getDashboard(): Promise<DashboardResponse> {
  return request<DashboardResponse>("/admin/dashboard");
}

export function getUsers(params = ""): Promise<PaginatedResponse<AdminUser>> {
  return request<PaginatedResponse<AdminUser>>(`/admin/users${params}`);
}

export function getTeachers(params = ""): Promise<PaginatedResponse<AdminTeacher>> {
  return request<PaginatedResponse<AdminTeacher>>(`/admin/teachers${params}`);
}

export function patchUser(userId: number, payload: Partial<AdminUser>): Promise<AdminUser> {
  return request<AdminUser>(`/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function resetPassword(userId: number, newPassword: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/admin/users/${userId}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ new_password: newPassword }),
  });
}

export function getSessions(params = ""): Promise<PaginatedResponse<AdminSession>> {
  return request<PaginatedResponse<AdminSession>>(`/admin/sessions${params}`);
}

export function forceStopSession(sessionId: number): Promise<unknown> {
  return request(`/admin/sessions/${sessionId}/force-stop`, { method: "POST" });
}

export function getSessionDetail(sessionId: number, params = ""): Promise<AdminSessionDetail> {
  return request<AdminSessionDetail>(`/admin/sessions/${sessionId}/detail${params}`);
}

export function getAlerts(params = ""): Promise<PaginatedResponse<AdminAlert>> {
  return request<PaginatedResponse<AdminAlert>>(`/admin/alerts${params}`);
}

export function markAlertRead(alertId: number): Promise<AdminAlert> {
  return request<AdminAlert>(`/admin/alerts/${alertId}/read`, { method: "PUT" });
}

export function getModels(): Promise<ModelSelectionResponse> {
  return request<ModelSelectionResponse>("/admin/models");
}

export function selectModel(file_name: string): Promise<ModelSelectionResponse> {
  return request<ModelSelectionResponse>("/admin/models/select", {
    method: "POST",
    body: JSON.stringify({ file_name }),
  });
}

export function getSubjects(params = ""): Promise<PaginatedResponse<AdminSubject>> {
  return request<PaginatedResponse<AdminSubject>>(`/admin/subjects${params}`);
}

export function createSubject(payload: {
  name: string;
  code?: string;
  description?: string;
  cover_image_url?: string;
}): Promise<AdminSubject> {
  return request<AdminSubject>("/admin/subjects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSubject(
  subjectId: number,
  payload: Partial<{ name: string; code: string; description: string; cover_image_url: string; teacher_id: number }>
): Promise<AdminSubject> {
  return request<AdminSubject>(`/admin/subjects/${subjectId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteSubject(subjectId: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/admin/subjects/${subjectId}`, {
    method: "DELETE",
  });
}

export function assignSubjectTeacher(subjectId: number, teacherId: number): Promise<AdminSubject> {
  return request<AdminSubject>(`/admin/subjects/${subjectId}/assign-teacher`, {
    method: "PUT",
    body: JSON.stringify({ teacher_id: teacherId }),
  });
}

export function getSections(params = ""): Promise<PaginatedResponse<AdminSection>> {
  return request<PaginatedResponse<AdminSection>>(`/admin/sections${params}`);
}

export function createSection(payload: { name: string; subject_id: number; teacher_id?: number }): Promise<AdminSection> {
  return request<AdminSection>("/admin/sections", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSection(
  sectionId: number,
  payload: Partial<{ name: string; subject_id: number; teacher_id: number }>
): Promise<AdminSection> {
  return request<AdminSection>(`/admin/sections/${sectionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteSection(sectionId: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/admin/sections/${sectionId}`, {
    method: "DELETE",
  });
}

export function createClass(payload: {
  subject_id?: number;
  subject_name?: string;
  subject_code?: string;
  section_name: string;
}): Promise<AdminSection> {
  return request<AdminSection>("/admin/classes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function assignSectionTeacher(sectionId: number, teacherId: number): Promise<AdminSection> {
  return request<AdminSection>(`/admin/sections/${sectionId}/assign-teacher`, {
    method: "PUT",
    body: JSON.stringify({ teacher_id: teacherId }),
  });
}

export async function uploadSubjectCoverImage(file: File): Promise<{ secure_url: string; public_id: string }> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/subjects/cover-image`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text();
    let message = body || "Upload failed";
    try {
      const parsed = JSON.parse(body) as { detail?: string };
      if (parsed?.detail) {
        message = parsed.detail;
      }
    } catch {
      // Keep raw text response when body is not JSON.
    }
    throw new Error(`HTTP ${res.status}: ${message}`);
  }

  return res.json();
}

export function getServerLogs(params = ""): Promise<PaginatedResponse<ServerLogEntry>> {
  return request<PaginatedResponse<ServerLogEntry>>(`/admin/server-logs${params}`);
}
