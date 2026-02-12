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
  final DateTime startTime;
  final DateTime? endTime;
  final bool isActive;

  SessionModel({
    required this.id,
    required this.subjectId,
    required this.sectionId,
    required this.startTime,
    this.endTime,
    required this.isActive,
  });

  factory SessionModel.fromJson(Map<String, dynamic> json) {
    return SessionModel(
      id: json['id'],
      subjectId: json['subject_id'],
      sectionId: json['section_id'],
      startTime: DateTime.parse(json['start_time']),
      endTime:
          json['end_time'] != null ? DateTime.parse(json['end_time']) : null,
      isActive: json['is_active'],
    );
  }
}

class BehaviorLogModel {
  final int id;
  final DateTime timestamp;
  final int raisingHand;
  final int sleeping;
  final int writing;
  final int usingPhone;
  final int attentive;
  final int undetected;
  final int totalDetected;

  BehaviorLogModel({
    required this.id,
    required this.timestamp,
    required this.raisingHand,
    required this.sleeping,
    required this.writing,
    required this.usingPhone,
    required this.attentive,
    required this.undetected,
    required this.totalDetected,
  });

  factory BehaviorLogModel.fromJson(Map<String, dynamic> json) {
    return BehaviorLogModel(
      id: json['id'],
      timestamp: DateTime.parse(json['timestamp']),
      raisingHand: json['raising_hand'],
      sleeping: json['sleeping'],
      writing: json['writing'],
      usingPhone: json['using_phone'],
      attentive: json['attentive'],
      undetected: json['undetected'],
      totalDetected: json['total_detected']
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
    return AlertModel(
      id: json['id'],
      alertType: json['alert_type'],
      message: json['message'],
      triggeredAt: DateTime.parse(json['triggered_at']),
      isRead: json['is_read'],
    );
  }
}

class SessionMetricsModel {
  final int sessionId;
  final int totalLogs;
  final double averageEngagement;
  final List<BehaviorLogModel> recentLogs;
  final List<AlertModel> alerts;

  SessionMetricsModel({
    required this.sessionId,
    required this.totalLogs,
    required this.averageEngagement,
    required this.recentLogs,
    required this.alerts,
  });

  factory SessionMetricsModel.fromJson(Map<String, dynamic> json) {
    return SessionMetricsModel(
      sessionId: json['session_id'],
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
      startTime: DateTime.parse(json['start_time']),
      endTime:
          json['end_time'] != null ? DateTime.parse(json['end_time']) : null,
      isActive: json['is_active'],
      averageEngagement: (json['average_engagement'] as num).toDouble(),
    );
  }
}
