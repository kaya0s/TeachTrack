import 'package:teachtrack/core/utils/api_date_utils.dart';

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
    final startRaw = json['start_time'];
    final endRaw = json['end_time'];
    return SessionModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      subjectId: (json['subject_id'] as num?)?.toInt() ?? 0,
      sectionId: (json['section_id'] as num?)?.toInt() ?? 0,
      studentsPresent: (json['students_present'] as num?)?.toInt() ?? 1,
      startTime: startRaw != null
          ? ApiDateUtils.parse(startRaw.toString())
          : DateTime.now(),
      endTime: endRaw != null ? ApiDateUtils.parse(endRaw.toString()) : null,
      isActive: json['is_active'] == true,
    );
  }
}

class BehaviorLogModel {
  final int id;
  final DateTime timestamp;
  final int onTask;
  final int sleeping;
  final int usingPhone;
  final int offTask;
  final int notVisible;
  final int totalDetected;

  BehaviorLogModel({
    required this.id,
    required this.timestamp,
    required this.onTask,
    required this.sleeping,
    required this.usingPhone,
    required this.offTask,
    required this.notVisible,
    required this.totalDetected,
  });

  factory BehaviorLogModel.fromJson(Map<String, dynamic> json) {
    final ts = json['timestamp'];
    return BehaviorLogModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      timestamp: ts != null
          ? ApiDateUtils.parse(ts.toString())
          : DateTime.now(),
      onTask: (json['on_task'] as num?)?.toInt() ?? 0,
      sleeping: (json['sleeping'] as num?)?.toInt() ?? 0,
      usingPhone: (json['using_phone'] as num?)?.toInt() ?? 0,
      offTask: (json['off_task'] as num?)?.toInt() ?? 0,
      notVisible: (json['not_visible'] as num?)?.toInt() ?? 0,
      totalDetected: (json['total_detected'] as num?)?.toInt() ?? 0,
    );
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
    final triggeredAtRaw = json['triggered_at'];
    return AlertModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      alertType: (json['alert_type'] as String?) ?? '',
      message: (json['message'] as String?) ?? '',
      triggeredAt: triggeredAtRaw != null
          ? ApiDateUtils.parse(triggeredAtRaw.toString())
          : DateTime.now(),
      isRead: json['is_read'] == true,
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
    final recentLogsRaw = json['recent_logs'] as List<dynamic>? ?? [];
    final alertsRaw = json['alerts'] as List<dynamic>? ?? [];
    return SessionMetricsModel(
      sessionId: (json['session_id'] as num?)?.toInt() ?? 0,
      studentsPresent: (json['students_present'] as num?)?.toInt() ?? 1,
      totalLogs: (json['total_logs'] as num?)?.toInt() ?? 0,
      averageEngagement:
          (json['average_engagement'] as num?)?.toDouble() ?? 0.0,
      recentLogs: recentLogsRaw
          .whereType<Map<String, dynamic>>()
          .map(BehaviorLogModel.fromJson)
          .toList(),
      alerts: alertsRaw
          .whereType<Map<String, dynamic>>()
          .map(AlertModel.fromJson)
          .toList(),
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
    final startRaw = json['start_time'];
    final endRaw = json['end_time'];
    return SessionSummaryModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      subjectId: (json['subject_id'] as num?)?.toInt() ?? 0,
      sectionId: (json['section_id'] as num?)?.toInt() ?? 0,
      subjectName: (json['subject_name'] as String?) ?? '',
      sectionName: (json['section_name'] as String?) ?? '',
      startTime: startRaw != null
          ? ApiDateUtils.parse(startRaw.toString())
          : DateTime.now(),
      endTime:
          endRaw != null ? ApiDateUtils.parse(endRaw.toString()) : null,
      isActive: json['is_active'] == true,
      averageEngagement:
          (json['average_engagement'] as num?)?.toDouble() ?? 0.0,
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
      fileName: (json['file_name'] as String?) ?? '',
      isCurrent: json['is_current'] == true,
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
    final modelsRaw = json['models'] as List<dynamic>? ?? [];
    return MlModelSelectionModel(
      currentModelFile: (json['current_model_file'] as String?) ?? '',
      models: modelsRaw
          .whereType<Map<String, dynamic>>()
          .map(MlModelOptionModel.fromJson)
          .toList(),
    );
  }
}
