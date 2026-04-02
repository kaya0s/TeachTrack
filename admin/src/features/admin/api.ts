"use client";

import { httpRequest } from "@/lib/utils";

// Types
import type {
  AdminCollege,
  AdminCollegeTeacher,
  AdminCollegeDetails,
  AdminMajor,
  AdminDepartment,
  AdminAcademicFilters,
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
  AdminAuditLogEntry,
  ServerLogEntry,
  AdminSettings,
  AdminSettingsUpdate,
  AdminBackupRun,
  AdminMediaUploadResponse,
  AdminClassAssignment,
} from "@/features/admin/types";

export type {
  AdminCollege,
  AdminCollegeTeacher,
  AdminCollegeDetails,
  AdminMajor,
  AdminDepartment,
  AdminAcademicFilters,
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
  AdminAuditLogEntry,
  ServerLogEntry,
  AdminSettings,
  AdminSettingsUpdate,
  AdminBackupRun,
  AdminMediaUploadResponse,
  AdminClassAssignment,
};

function toQueryString(params: Record<string, string | number | boolean | null | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export function buildAcademicFilterQuery(filters: AdminAcademicFilters = {}): string {
  return toQueryString({
    college_id: filters.college_id ?? undefined,
    department_id: filters.department_id ?? undefined,
    major_id: filters.major_id ?? undefined,
    section_id: filters.section_id ?? undefined,
    subject_id: filters.subject_id ?? undefined,
    date_from: filters.date_from ?? undefined,
    date_to: filters.date_to ?? undefined,
    activity_mode: filters.activity_mode ?? undefined,
  });
}

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
export async function getDashboard(filters?: AdminAcademicFilters) {
  const query = filters ? buildAcademicFilterQuery(filters) : "";
  return httpRequest(`/admin/dashboard${query}`);
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
    suppressAuthRedirect: true,
  });
}

export async function resetPassword(userId: number, newPassword: string, confirmPassword: string) {
  return httpRequest(`/admin/users/${userId}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_password: newPassword, confirm_password: confirmPassword }),
    suppressAuthRedirect: true,
  });
}

// Session endpoints
export async function getSessions(params: string | AdminAcademicFilters = "") {
  const query = typeof params === "string" ? params : buildAcademicFilterQuery(params);
  return httpRequest(`/admin/sessions${query}`);
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

export async function deleteCollege(collegeId: number, confirmPassword: string) {
  return httpRequest(`/admin/colleges/${collegeId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm_password: confirmPassword }),
    suppressAuthRedirect: true,
  });
}

export async function getCollegeDetails(collegeId: number): Promise<AdminCollegeDetails> {
  return httpRequest(`/admin/colleges/${collegeId}`);
}

export async function getMajors(collegeId?: number, params = "", departmentId?: number) {
  const query: string[] = [];
  if (collegeId) query.push(`college_id=${collegeId}`);
  if (departmentId) query.push(`department_id=${departmentId}`);

  if (query.length > 0) {
    const base = `/admin/majors?${query.join("&")}`;
    if (params) {
      const suffix = params.startsWith("?") ? params.slice(1) : params;
      return httpRequest(`${base}&${suffix}`);
    }
    return httpRequest(base);
  }
  return httpRequest(`/admin/majors${params}`);
}

export async function createMajor(payload: any) {
  return httpRequest("/admin/majors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateMajor(majorId: number, payload: any) {
  return httpRequest(`/admin/majors/${majorId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteMajor(majorId: number, confirmPassword: string) {
  return httpRequest(`/admin/majors/${majorId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm_password: confirmPassword }),
    suppressAuthRedirect: true,
  });
}

export async function getDepartments(collegeId?: number, params = "") {
  if (collegeId) {
    const suffix = params ? (params.startsWith("?") ? params.slice(1) : params) : "";
    return httpRequest(`/admin/departments?college_id=${collegeId}${suffix ? `&${suffix}` : ""}`);
  }
  return httpRequest(`/admin/departments${params}`);
}

export async function createDepartment(payload: any) {
  return httpRequest("/admin/departments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateDepartment(departmentId: number, payload: any) {
  return httpRequest(`/admin/departments/${departmentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteDepartment(departmentId: number, confirmPassword: string) {
  return httpRequest(`/admin/departments/${departmentId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm_password: confirmPassword }),
    suppressAuthRedirect: true,
  });
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

export async function deleteSubject(subjectId: number, confirmPassword: string) {
  return httpRequest(`/admin/subjects/${subjectId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm_password: confirmPassword }),
    suppressAuthRedirect: true,
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
export async function getSections(params: string | AdminAcademicFilters = "") {
  const query = typeof params === "string" ? params : buildAcademicFilterQuery(params);
  return httpRequest(`/admin/sections${query}`);
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

export async function deleteSection(sectionId: number, confirmPassword: string) {
  return httpRequest(`/admin/sections/${sectionId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm_password: confirmPassword }),
    suppressAuthRedirect: true,
  });
}

export async function assignSectionTeacher(sectionId: number, teacherId: number, subjectId?: number | null) {
  return httpRequest(`/admin/sections/${sectionId}/assign-teacher`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teacher_id: teacherId, subject_id: subjectId ?? undefined }),
  });
}

export async function unassignSectionTeacher(sectionId: number, subjectId?: number | null) {
  const params = subjectId ? `?subject_id=${subjectId}` : "";
  return httpRequest(`/admin/sections/${sectionId}/unassign-teacher${params}`, {
    method: "PUT",
  });
}

export async function uploadAdminMedia(file: File, entity: "college" | "department" | "major" | "subject"): Promise<AdminMediaUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("entity", entity);
  return httpRequest("/admin/media/upload", {
    method: "POST",
    body: formData,
  });
}

// Class endpoints
export async function getClasses(params: string | AdminAcademicFilters = "") {
  const query = typeof params === "string" ? params : buildAcademicFilterQuery(params);
  return httpRequest(`/admin/classes${query}`);
}

export async function createClass(payload: any): Promise<AdminClassAssignment> {
  return httpRequest("/admin/classes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateClass(classAssignmentId: number, payload: any): Promise<AdminClassAssignment> {
  return httpRequest(`/admin/classes/${classAssignmentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteClass(classAssignmentId: number) {
  return httpRequest(`/admin/classes/${classAssignmentId}`, {
    method: "DELETE",
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
    suppressAuthRedirect: true,
  });
}

export async function testDetection(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return httpRequest("/admin/settings/test-detection", {
    method: "POST",
    body: formData,
  });
}

// Backup endpoints
export async function getBackups(params = ""): Promise<AdminBackupRun[]> {
  return httpRequest(`/admin/backups${params}`, { suppressAuthRedirect: true });
}

export async function runBackup(): Promise<AdminBackupRun> {
  return httpRequest("/admin/backups", {
    method: "POST",
    suppressAuthRedirect: true,
  });
}

export async function getBackupStatus(backupId: number): Promise<AdminBackupRun> {
  return httpRequest(`/admin/backups/${backupId}`, { suppressAuthRedirect: true });
}
