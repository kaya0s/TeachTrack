"use client";

import { httpRequest } from "@/lib/utils";

// Types
import type {
  AdminCollege,
  AdminCollegeTeacher,
  AdminCollegeDetails,
  AdminMajor,
  AdminAlert,
  AdminSection,
  AdminSectionPoolItem,
  AdminSessionDetail,
  AdminSession,
  AdminSubject,
  AdminTeacher,
  AdminUser,
  DashboardResponse,
  ModelSelectionResponse,
  PaginatedResponse,
  AdminAuditLogEntry,
  ServerLogEntry,
  AdminSettings,
  AdminSettingsUpdate,
  AdminBackupRun,
} from "@/features/admin/types";

export type {
  AdminCollege,
  AdminCollegeTeacher,
  AdminCollegeDetails,
  AdminMajor,
  AdminAlert,
  AdminSection,
  AdminSectionPoolItem,
  AdminSessionDetail,
  AdminSession,
  AdminSubject,
  AdminTeacher,
  AdminUser,
  DashboardResponse,
  ModelSelectionResponse,
  PaginatedResponse,
  AdminAuditLogEntry,
  ServerLogEntry,
  AdminSettings,
  AdminSettingsUpdate,
  AdminBackupRun,
};

// Auth endpoints
export async function login(username: string, password: string) {
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);
  return httpRequest("/login/access-token", {
    method: "POST",
    body: formData,
  });
}

export async function loginWithGoogle(idToken: string) {
  return httpRequest("/login/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });
}

export async function forgotPassword(email: string) {
  return httpRequest("/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function verifyResetCode(email: string, code: string) {
  return httpRequest("/verify-reset-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
}

export async function resetPasswordWithCode(email: string, code: string, newPassword: string) {
  return httpRequest("/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, new_password: newPassword }),
  });
}

// Admin endpoints
export async function getDashboard() {
  return httpRequest("/admin/dashboard");
}

export async function getUsers(params = "") {
  return httpRequest(`/admin/users${params}`);
}

export async function getTeachers(params = "") {
  return httpRequest(`/admin/teachers${params}`);
}

export async function createTeacher(payload: any) {
  return httpRequest("/admin/teachers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function patchUser(userId: number, payload: any) {
  return httpRequest(`/admin/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function resetPassword(userId: number, newPassword: string) {
  return httpRequest(`/admin/users/${userId}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_password: newPassword }),
  });
}

// Session endpoints
export async function getSessions(params = "") {
  return httpRequest(`/admin/sessions${params}`);
}

export async function forceStopSession(sessionId: number) {
  return httpRequest(`/admin/sessions/${sessionId}/force-stop`, {
    method: "POST",
  });
}

export async function getSessionDetail(sessionId: number, params = "") {
  return httpRequest(`/admin/sessions/${sessionId}/detail${params}`);
}

// College & Major endpoints
export async function getColleges(params = "") {
  return httpRequest(`/admin/colleges${params}`);
}

export async function createCollege(payload: any) {
  return httpRequest("/admin/colleges", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateCollege(collegeId: number, payload: any) {
  return httpRequest(`/admin/colleges/${collegeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteCollege(collegeId: number) {
  return httpRequest(`/admin/colleges/${collegeId}`, {
    method: "DELETE",
  });
}

export async function getCollegeDetails(collegeId: number): Promise<AdminCollegeDetails> {
  return httpRequest(`/admin/colleges/${collegeId}`);
}

export async function getMajors(collegeId?: number, params = "") {
  if (collegeId) {
    // Add college_id as a query parameter instead of in the path
    const separator = params ? '&' : '?';
    return httpRequest(`/admin/majors?college_id=${collegeId}${params ? separator + params.slice(1) : ''}`);
  }
  return httpRequest(`/admin/majors${params}`);
}

// Subject endpoints
export async function getSubjects(params = "") {
  return httpRequest(`/admin/subjects${params}`);
}

export async function createSubject(payload: any) {
  return httpRequest("/admin/subjects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateSubject(subjectId: number, payload: any) {
  return httpRequest(`/admin/subjects/${subjectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteSubject(subjectId: number) {
  return httpRequest(`/admin/subjects/${subjectId}`, {
    method: "DELETE",
  });
}

export async function assignSubjectTeacher(subjectId: number, teacherId: number) {
  return httpRequest(`/admin/subjects/${subjectId}/assign-teacher`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teacher_id: teacherId }),
  });
}

export async function uploadSubjectCoverImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return httpRequest("/admin/subjects/upload-cover", {
    method: "POST",
    body: formData,
  });
}

// Section endpoints
export async function getSections(params = "") {
  return httpRequest(`/admin/sections${params}`);
}


export async function createSection(payload: any) {
  return httpRequest("/admin/sections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateSection(sectionId: number, payload: any) {
  return httpRequest(`/admin/sections/${sectionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteSection(sectionId: number) {
  return httpRequest(`/admin/sections/${sectionId}`, {
    method: "DELETE",
  });
}

export async function assignSectionTeacher(sectionId: number, teacherId: number) {
  return httpRequest(`/admin/sections/${sectionId}/assign-teacher`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teacher_id: teacherId }),
  });
}

export async function unassignSectionTeacher(sectionId: number) {
  return httpRequest(`/admin/sections/${sectionId}/unassign-teacher`, {
    method: "PUT",
  });
}

// Class endpoints
export async function createClass(payload: any) {
  return httpRequest("/admin/classes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// Alert endpoints
export async function getAlerts(params = "") {
  return httpRequest(`/admin/alerts${params}`);
}

export async function markAlertRead(alertId: number) {
  return httpRequest(`/admin/alerts/${alertId}/mark-read`, {
    method: "POST",
  });
}

// Model endpoints
export async function getModels() {
  return httpRequest("/admin/models");
}

export async function selectModel(file_name: string) {
  return httpRequest("/admin/models/select", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_name }),
  });
}

// Logging endpoints
export async function getServerLogs(params = "") {
  return httpRequest(`/admin/server-logs${params}`);
}

export async function getAuditLogs(params = "") {
  return httpRequest(`/admin/audit-logs${params}`);
}

// Settings endpoints
export async function getSettings() {
  return httpRequest("/admin/settings");
}

export async function updateSettings(payload: any) {
  return httpRequest("/admin/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// Backup endpoints
export async function getBackups(params = ""): Promise<AdminBackupRun[]> {
  return httpRequest(`/admin/backups${params}`);
}

export async function runBackup(): Promise<AdminBackupRun> {
  return httpRequest("/admin/backups", {
    method: "POST",
  });
}

export async function getBackupStatus(backupId: number): Promise<AdminBackupRun> {
  return httpRequest(`/admin/backups/${backupId}`);
}
