export type AdminUser = {
  id: number;
  firstname: string | null;
  lastname: string | null;
  fullname: string | null;
  age: number | null;
  email: string;
  username: string;
  role: string | null;
  is_active: boolean;
  is_superuser: boolean;
  profile_picture_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AdminTeacher = {
  id: number;
  firstname: string | null;
  lastname: string | null;
  fullname: string | null;
  age: number | null;
  email: string;
  username: string;
  role: string | null;
  is_active: boolean;
  profile_picture_url: string | null;
  college_id: number | null;
  college_name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AdminSubject = {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  cover_image_url: string | null;
  teacher_id: number | null;
  teacher_username: string;
  teacher_fullname: string | null;
  teacher_profile_picture_url: string | null;
  section_id?: number | null;
  section_name?: string | null;
  sections_count: number;
  section_names: string[];
  college_id: number | null;
  college_name: string | null;
  created_at: string | null;
};

export type AdminCollege = {
  id: number;
  name: string;
  logo_path: string | null;
  created_at: string | null;
};

export type AdminMajor = {
  id: number;
  college_id: number;
  name: string;
  code: string;
  created_at: string | null;
};

export type AdminSectionPoolItem = {
  id: number;
  name: string;
  subject_id?: number | null;
  subject_name?: string | null;
  teacher_id?: number | null;
  teacher_username?: string | null;
  teacher_fullname?: string | null;
  major_name?: string | null;
  subjects_count?: number;
  subject_names?: string[];
  major_id: number | null;
  year_level: number | null;
  section_letter: string | null;
  created_at: string | null;
};

export type AdminSection = {
  id: number;
  name: string;
  subject_id: number | null;
  subject_name: string;
  major_id?: number | null;
  year_level?: number | null;
  section_letter?: string | null;
  teacher_id: number | null;
  teacher_username: string;
  teacher_fullname: string | null;
  teacher_profile_picture_url: string | null;
  created_at: string | null;
};

export type AdminSession = {
  id: number;
  teacher_id: number;
  teacher_username: string;
  teacher_fullname: string | null;
  subject_id: number;
  subject_name: string;
  section_id: number;
  section_name: string;
  students_present: number;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  teacher_profile_picture_url: string | null;
  average_engagement: number;
  college_id?: number | null;
  college_name?: string | null;
  major_id?: number | null;
  major_name?: string | null;
};

export type AdminAlert = {
  id: number;
  session_id: number;
  teacher_id: number;
  teacher_username: string;
  teacher_fullname: string | null;
  teacher_profile_picture_url: string | null;
  alert_type: string;
  message: string;
  severity: "WARNING" | "CRITICAL";
  is_read: boolean;
  triggered_at: string;
  updated_at: string | null;
};

export type DashboardResponse = {
  stats: {
    total_users: number;
    active_users: number;
    total_teachers: number;
    total_subjects: number;
    total_sections: number;
    active_sessions: number;
    unread_alerts: number;
    critical_unread_alerts: number;
  };
  active_sessions: AdminSession[];
  recent_sessions: AdminSession[];
  recent_alerts: AdminAlert[];
};

export type SessionLogPoint = {
  timestamp: string;
  on_task: number;
  sleeping: number;
  writing: number;
  using_phone: number;
  disengaged_posture: number;
  not_visible: number;
  total_detected: number;
};

export type SessionMetricPoint = {
  window_start: string;
  window_end: string;
  on_task_avg: number;
  phone_avg: number;
  sleeping_avg: number;
  writing_avg: number;
  disengaged_posture_avg: number;
  not_visible_avg: number;
  engagement_score: number;
};

export type AdminSessionDetail = {
  session: AdminSession;
  total_logs: number;
  total_alerts: number;
  unread_alerts: number;
  logs: SessionLogPoint[];
  metrics_rollup: SessionMetricPoint[];
};

export type ModelOption = {
  file_name: string;
  is_current: boolean;
};

export type ModelSelectionResponse = {
  current_model_file: string;
  models: ModelOption[];
};

export type ServerLogEntry = {
  timestamp: string;
  level: string;
  source: string;
  request_id: string;
  message: string;
};

export type AdminAuditLogEntry = {
  id: number;
  actor_user_id: number | null;
  actor_username: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type PaginatedResponse<T> = {
  total: number;
  items: T[];
};
