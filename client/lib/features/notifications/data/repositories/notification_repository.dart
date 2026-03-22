import 'package:teachtrack/core/network/api_client.dart';
import 'package:teachtrack/features/notifications/domain/models/notification_model.dart';

class NotificationRepository {
  final ApiClient _apiClient;

  NotificationRepository(this._apiClient);

  Future<TeacherNotificationsResponseModel> getNotifications({
    bool unreadOnly = false,
    int limit = 100,
  }) async {
    final query = <String, dynamic>{
      'limit': limit,
    };
    if (unreadOnly) {
      query['unread_only'] = true;
    }

    final response = await _apiClient.get(
      '/notifications',
      queryParameters: query,
    );
    final data = response.data;
    if (data is! Map<String, dynamic>) {
      return TeacherNotificationsResponseModel(
        total: 0,
        unread: 0,
        items: [],
      );
    }
    return TeacherNotificationsResponseModel.fromJson(data);
  }

  Future<TeacherNotificationModel> markRead(int notificationId) async {
    final response =
        await _apiClient.put('/notifications/$notificationId/read');
    final data = response.data;
    if (data is! Map<String, dynamic>) {
      throw Exception('Invalid mark-read response');
    }
    return TeacherNotificationModel.fromJson(data);
  }
}
