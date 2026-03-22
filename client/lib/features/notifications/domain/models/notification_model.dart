DateTime _parseNotificationDateTime(String raw) {
  final parsed = DateTime.parse(raw);
  return parsed.isUtc ? parsed.toLocal() : parsed;
}

int _toInt(dynamic value, {int fallback = 0}) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

bool _toBool(dynamic value, {bool fallback = false}) {
  if (value is bool) return value;
  if (value is num) return value != 0;
  final raw = value?.toString().toLowerCase().trim();
  if (raw == 'true' || raw == '1') return true;
  if (raw == 'false' || raw == '0') return false;
  return fallback;
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
    final metadata = json['metadata_json'];
    final createdAtRaw = json['created_at'];
    final readAtRaw = json['read_at'];
    return TeacherNotificationModel(
      id: _toInt(json['id']),
      title: (json['title'] ?? '').toString(),
      body: (json['body'] ?? '').toString(),
      type: (json['type'] ?? 'GENERAL').toString(),
      metadataJson: metadata?.toString(),
      isRead: _toBool(json['is_read']),
      createdAt: createdAtRaw != null
          ? _parseNotificationDateTime(createdAtRaw.toString())
          : DateTime.now(),
      readAt: readAtRaw != null
          ? _parseNotificationDateTime(readAtRaw.toString())
          : null,
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

  factory TeacherNotificationsResponseModel.fromJson(
      Map<String, dynamic> json) {
    final rawItems = (json['items'] as List? ?? []);
    final items = <TeacherNotificationModel>[];
    for (final raw in rawItems) {
      if (raw is! Map<String, dynamic>) continue;
      try {
        items.add(TeacherNotificationModel.fromJson(raw));
      } catch (_) {
        // Skip malformed rows so one bad notification doesn't hide the whole feed.
      }
    }

    return TeacherNotificationsResponseModel(
      total: _toInt(json['total']),
      unread: _toInt(json['unread']),
      items: items,
    );
  }
}
