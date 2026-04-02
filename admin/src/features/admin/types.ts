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
  department_id: number | null;
  department_name: string | null;
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
  major_id: number | null;
  major_name: string | null;
  department_id: number | null;
  department_name: string | null;
  college_id: number | null;
  college_name: string | null;
  created_at: string | null;
};

export type AdminCollege = {
  id: number;
  name: string;
  acronym: string | null;
  logo_path: string | null;
  majors: AdminMajor[];
  created_at: string | null;
};

export type AdminCollegeTeacher = {
  id: number;
  fullname: string | null;
  email: string;
  profile_picture_url: string | null;
};

export type AdminCollegeDetails = {
  id: number;
  name: string;
  acronym: string | null;
  logo_path: string | null;
  teachers_count: number;
  teachers: AdminCollegeTeacher[];
  departments_count: number;
  departments: AdminDepartment[];
  total_sessions: number;
  active_sessions: number;
  avg_sessions_per_teacher: number;
  majors_count: number;
  majors: AdminMajor[];
};

export type AdminMajor = {
  id: number;
  department_id: number;
  department_name: string | null;
  college_id: number;
  college_name: string | null;
  name: string;
  code: string;
  cover_image_url: string | null;
  created_at: string | null;
};

export type AdminDepartment = {
  id: number;
  college_id: number;
  college_name: string | null;
  name: string;
  code: string | null;
  cover_image_url: string | null;
  created_at: string | null;
};

export type AdminMediaUploadResponse = {
  secure_url: string;
  public_id: string;
};

export type AdminAcademicDatePreset = "today" | "last_7_days" | "last_30_days";

export type AdminAcademicFilters = {
  college_id?: number | null;
  department_id?: number | null;
  major_id?: number | null;
  section_id?: number | null;
  subject_id?: number | null;
  date_from?: string | null; // YYYY-MM-DD
  date_to?: string | null; // YYYY-MM-DD
  date_preset?: AdminAcademicDatePreset | null;
  activity_mode?: string | null;
};

export type AdminSection = {
  id: number;
  name: string;
  subject_id: number | null;
  subject_name: string;
  major_id?: number | null;
  major_name?: string | null;
  department_id?: number | null;
  department_name?: string | null;
  year_level?: number | null;
  section_code?: string | null;
  section_letter?: string | null;
  teacher_id: number | null;
  teacher_username: string;
  teacher_fullname: string | null;
  teacher_profile_picture_url: string | null;
  created_at: string | null;
};

export type AdminClassAssignmentStatus = "assigned" | "unassigned_teacher" | "invalid_mapping";

export type AdminClassSectionRef = {
  id: number;
  name: string;
  major_id: number | null;
  major_name: string | null;
  department_id: number | null;
  department_name: string | null;
  year_level: number | null;
  section_code: string | null;
};

export type AdminClassSubjectRef = {
  id: number;
  name: string;
  code: string | null;
  major_id: number | null;
  major_name: string | null;
};

export type AdminClassTeacherRef = {
  id: number | null;
  fullname: string | null;
  username: string | null;
  department_id: number | null;
  profile_picture_url: string | null;
};

export type AdminClassAssignment = {
  id: number;
  section: AdminClassSectionRef;
  subject: AdminClassSubjectRef;
  teacher: AdminClassTeacherRef;
  status: AdminClassAssignmentStatus;
  created_at: string | null;
  updated_at: string | null;
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
  activity_mode: string;
  on_task: number;
  sleeping: number;
  using_phone: number;
  off_task: number;
  not_visible: number;
  college_id?: number | null;
  college_name?: string | null;
  department_id?: number | null;
  department_name?: string | null;
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
  using_phone: number;
  off_task: number;
  not_visible: number;
  total_detected: number;
};

export type SessionMetricPoint = {
  window_start: string;
  window_end: string;
  on_task_avg: number;
  using_phone_avg: number;
  sleeping_avg: number;
  off_task_avg: number;
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
  models: ModelOption[];
};

export type AdminDetectionBox = {
  box: [number, number, number, number];
  label: string;
  confidence: number;
};

export type AdminTestDetectionResponse = {
  detections: AdminDetectionBox[];
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

export type AdminWeightsSet = {
  on_task: number;
  using_phone: number;
  sleeping: number;
  off_task: number;
  not_visible: number;
};

export type AdminSettings = {
  detection: {
    detect_interval_seconds: number;
    detector_heartbeat_timeout_seconds: number;
    server_camera_enabled: boolean;
    server_camera_preview: boolean;
    server_camera_index: number;
    detection_confidence_threshold: number;
    detection_imgsz: number;
    alert_cooldown_minutes: number;
  };
  engagement_weights: {
    LECTURE: AdminWeightsSet;
    STUDY: AdminWeightsSet;
    COLLABORATION: AdminWeightsSet;
    EXAM: AdminWeightsSet;
  };
  exam_proctoring: {
    phone_count_threshold: number;
    off_task_count_threshold: number;
  };
  admin_ops: {
    enable_admin_log_stream: boolean;
  };
  security: {
    access_token_expire_minutes: number;
  };
  integrations: {
    cloudinary_configured: boolean;
    mail_configured: boolean;
  };
};

export type AdminSettingsUpdate = {
  detection?: Partial<AdminSettings["detection"]>;
  engagement_weights?: Partial<AdminSettings["engagement_weights"]>;
  admin_ops?: Partial<AdminSettings["admin_ops"]>;
  exam_proctoring?: Partial<AdminSettings["exam_proctoring"]>;
  security?: Partial<AdminSettings["security"]>;
  reset?: boolean;
  confirm_password?: string;
};

export type AdminBackupRun = {
  id: number;
  status: "running" | "success" | "failed";
  filename: string | null;
  file_size_bytes: number | null;
  drive_file_id: string | null;
  drive_link: string | null;
  created_at: string;
  completed_at: string | null;
  created_by: number | null;
  error_message: string | null;
};
