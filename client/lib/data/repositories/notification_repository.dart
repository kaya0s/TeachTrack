import '../../core/api/api_client.dart';
import '../models/notification_model.dart';

class NotificationRepository {
  final ApiClient _apiClient;

  NotificationRepository(this._apiClient);

  Future<TeacherNotificationsResponseModel> getNotifications({
    bool unreadOnly = false,
    int limit = 40,
  }) async {
    final response = await _apiClient.get(
      '/notifications',
      queryParameters: {
        'unread_only': unreadOnly,
        'limit': limit,
      },
    );
    return TeacherNotificationsResponseModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<TeacherNotificationModel> markRead(int notificationId) async {
    final response = await _apiClient.put('/notifications/$notificationId/read');
    return TeacherNotificationModel.fromJson(response.data as Map<String, dynamic>);
  }
}
