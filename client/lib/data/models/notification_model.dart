DateTime _parseNotificationDateTime(String raw) {
  final parsed = DateTime.parse(raw);
  return parsed.isUtc ? parsed.toLocal() : parsed;
}

class TeacherNotificationModel {
  final int id;
  final String title;
  final String body;
  final String type;
  final String? metadataJson;
  final bool isRead;
  final DateTime createdAt;
  final DateTime? readAt;

  TeacherNotificationModel({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    this.metadataJson,
    required this.isRead,
    required this.createdAt,
    this.readAt,
  });

  factory TeacherNotificationModel.fromJson(Map<String, dynamic> json) {
    return TeacherNotificationModel(
      id: json['id'],
      title: json['title'],
      body: json['body'],
      type: json['type'] ?? 'GENERAL',
      metadataJson: json['metadata_json'],
      isRead: json['is_read'] ?? false,
      createdAt: _parseNotificationDateTime(json['created_at']),
      readAt: json['read_at'] != null ? _parseNotificationDateTime(json['read_at']) : null,
    );
  }
}

class TeacherNotificationsResponseModel {
  final int total;
  final int unread;
  final List<TeacherNotificationModel> items;

  TeacherNotificationsResponseModel({
    required this.total,
    required this.unread,
    required this.items,
  });

  factory TeacherNotificationsResponseModel.fromJson(Map<String, dynamic> json) {
    return TeacherNotificationsResponseModel(
      total: json['total'] ?? 0,
      unread: json['unread'] ?? 0,
      items: (json['items'] as List? ?? [])
          .map((item) => TeacherNotificationModel.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}
