DateTime _parseApiDateTime(String raw) {
  final value = raw.trim();
  final parsed = DateTime.parse(value);
  if (parsed.isUtc) return parsed.toLocal();

  // Backend timestamps without timezone are treated as Philippines local time
  // (UTC+8), then converted to device local time for consistent DateTime math.
  final philippinesLocalAsUtc = DateTime.utc(
    parsed.year,
    parsed.month,
    parsed.day,
    parsed.hour,
    parsed.minute,
    parsed.second,
    parsed.millisecond,
    parsed.microsecond,
  ).subtract(const Duration(hours: 8));
  return philippinesLocalAsUtc.toLocal();
}

class SubjectModel {
  final int id;
  final String name;
  final String? code;
  final String? description;
  final String? coverImageUrl;
  final List<SectionModel> sections;

  SubjectModel({
    required this.id,
    required this.name,
    this.code,
    this.description,
    this.coverImageUrl,
    this.sections = const [],
  });

  factory SubjectModel.fromJson(Map<String, dynamic> json) {
    return SubjectModel(
      id: json['id'],
      name: json['name'],
      code: json['code'],
      description: json['description'],
      coverImageUrl: json['cover_image_url'],
      sections: (json['sections'] as List? ?? [])
          .map((e) => SectionModel.fromJson(e))
          .toList(),
    );
  }
}

class SectionModel {
  final int id;
  final String name;
  final int subjectId;

  SectionModel({required this.id, required this.name, required this.subjectId});

  factory SectionModel.fromJson(Map<String, dynamic> json) {
    return SectionModel(
      id: json['id'],
      name: json['name'],
      subjectId: json['subject_id'] ?? 0,
    );
  }
}

class SessionModel {
  final int id;
  final int subjectId;
  final int sectionId;
  final int studentsPresent;
  final DateTime startTime;
  final DateTime? endTime;
  final bool isActive;

  SessionModel({
    required this.id,
    required this.subjectId,
    required this.sectionId,
    required this.studentsPresent,
    required this.startTime,
    this.endTime,
    required this.isActive,
  });

  factory SessionModel.fromJson(Map<String, dynamic> json) {
    return SessionModel(
      id: json['id'],
      subjectId: json['subject_id'],
      sectionId: json['section_id'],
      studentsPresent: json['students_present'] ?? 1,
      startTime: _parseApiDateTime(json['start_time']),
      endTime:
          json['end_time'] != null ? _parseApiDateTime(json['end_time']) : null,
      isActive: json['is_active'],
    );
  }
}

class BehaviorLogModel {
  final int id;
  final DateTime timestamp;
  final int onTask;
  final int sleeping;
  final int writing;
  final int usingPhone;
  final int disengagedPosture;
  final int notVisible;
  final int totalDetected;

  BehaviorLogModel({
    required this.id,
    required this.timestamp,
    required this.onTask,
    required this.sleeping,
    required this.writing,
    required this.usingPhone,
    required this.disengagedPosture,
    required this.notVisible,
    required this.totalDetected,
  });

  factory BehaviorLogModel.fromJson(Map<String, dynamic> json) {
    return BehaviorLogModel(
        id: json['id'],
        timestamp: _parseApiDateTime(json['timestamp']),
        onTask: json['on_task'],
        sleeping: json['sleeping'],
        writing: json['writing'],
        usingPhone: json['using_phone'],
        disengagedPosture: json['disengaged_posture'],
        notVisible: json['not_visible'],
        totalDetected: json['total_detected']);
  }
}

class AlertModel {
  final int id;
  final String alertType;
  final String message;
  final DateTime triggeredAt;
  final bool isRead;

  AlertModel({
    required this.id,
    required this.alertType,
    required this.message,
    required this.triggeredAt,
    required this.isRead,
  });

  factory AlertModel.fromJson(Map<String, dynamic> json) {
    return AlertModel(
      id: json['id'],
      alertType: json['alert_type'],
      message: json['message'],
      triggeredAt: _parseApiDateTime(json['triggered_at']),
      isRead: json['is_read'],
    );
  }
}

class SessionMetricsModel {
  final int sessionId;
  final int studentsPresent;
  final int totalLogs;
  final double averageEngagement;
  final List<BehaviorLogModel> recentLogs;
  final List<AlertModel> alerts;

  SessionMetricsModel({
    required this.sessionId,
    required this.studentsPresent,
    required this.totalLogs,
    required this.averageEngagement,
    required this.recentLogs,
    required this.alerts,
  });

  factory SessionMetricsModel.fromJson(Map<String, dynamic> json) {
    return SessionMetricsModel(
      sessionId: json['session_id'],
      studentsPresent: json['students_present'] ?? 1,
      totalLogs: json['total_logs'],
      averageEngagement: (json['average_engagement'] as num).toDouble(),
      recentLogs: (json['recent_logs'] as List)
          .map((e) => BehaviorLogModel.fromJson(e))
          .toList(),
      alerts:
          (json['alerts'] as List).map((e) => AlertModel.fromJson(e)).toList(),
    );
  }
}

class SessionSummaryModel {
  final int id;
  final int subjectId;
  final int sectionId;
  final String subjectName;
  final String sectionName;
  final DateTime startTime;
  final DateTime? endTime;
  final bool isActive;
  final double averageEngagement;

  SessionSummaryModel({
    required this.id,
    required this.subjectId,
    required this.sectionId,
    required this.subjectName,
    required this.sectionName,
    required this.startTime,
    this.endTime,
    required this.isActive,
    required this.averageEngagement,
  });

  factory SessionSummaryModel.fromJson(Map<String, dynamic> json) {
    return SessionSummaryModel(
      id: json['id'],
      subjectId: json['subject_id'],
      sectionId: json['section_id'],
      subjectName: json['subject_name'],
      sectionName: json['section_name'],
      startTime: _parseApiDateTime(json['start_time']),
      endTime:
          json['end_time'] != null ? _parseApiDateTime(json['end_time']) : null,
      isActive: json['is_active'],
      averageEngagement: (json['average_engagement'] as num).toDouble(),
    );
  }
}

class MlModelOptionModel {
  final String fileName;
  final bool isCurrent;

  MlModelOptionModel({
    required this.fileName,
    required this.isCurrent,
  });

  factory MlModelOptionModel.fromJson(Map<String, dynamic> json) {
    return MlModelOptionModel(
      fileName: json['file_name'],
      isCurrent: json['is_current'] ?? false,
    );
  }

  String get displayName => fileName
      .replaceAll(RegExp(r'\.pt$', caseSensitive: false), '')
      .replaceAll('_', ' ');
}

class MlModelSelectionModel {
  final String currentModelFile;
  final List<MlModelOptionModel> models;

  MlModelSelectionModel({
    required this.currentModelFile,
    required this.models,
  });

  factory MlModelSelectionModel.fromJson(Map<String, dynamic> json) {
    return MlModelSelectionModel(
      currentModelFile: json['current_model_file'],
      models: (json['models'] as List)
          .map((e) => MlModelOptionModel.fromJson(e))
          .toList(),
    );
  }
}
