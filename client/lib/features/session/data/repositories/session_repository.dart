import 'package:teachtrack/core/network/api_client.dart';
import 'package:teachtrack/features/classroom/domain/models/classroom_models.dart';
import 'package:teachtrack/features/session/domain/models/session_models.dart';

class SessionRepository {
  final ApiClient _apiClient;

  SessionRepository(this._apiClient);

  Future<SessionModel> startSession(
    int subjectId,
    int sectionId,
    int studentsPresent, {
    String? activityMode,
  }) async {
    final response = await _apiClient.post(
      '/sessions/start',
      data: {
        'subject_id': subjectId,
        'section_id': sectionId,
        'students_present': studentsPresent,
        'activity_mode': activityMode ?? 'LECTURE',
      },
    );
    final data = response.data;
    if (data is! Map<String, dynamic>) {
      throw Exception('Invalid session response');
    }
    return SessionModel.fromJson(data);
  }

  Future<SessionModel> stopSession(int sessionId) async {
    final response = await _apiClient.post('/sessions/$sessionId/stop');
    final data = response.data;
    if (data is! Map<String, dynamic>) {
      throw Exception('Invalid session response');
    }
    return SessionModel.fromJson(data);
  }

  Future<SessionModel?> getActiveSession() async {
    try {
      final response = await _apiClient.get('/sessions/active');
      final data = response.data;
      if (data == null || data is! Map<String, dynamic>) return null;
      return SessionModel.fromJson(data);
    } catch (e) {
      return null;
    }
  }

  Future<SessionMetricsModel> getSessionMetrics(int sessionId) async {
    final response = await _apiClient.get('/sessions/$sessionId/metrics');
    final data = response.data;
    if (data is! Map<String, dynamic>) {
      throw Exception('Invalid metrics response');
    }
    return SessionMetricsModel.fromJson(data);
  }

  Future<List<SessionSummaryModel>> getSessionHistory(
      {bool includeActive = false, int limit = 50}) async {
    final response = await _apiClient.get(
      '/sessions',
      queryParameters: {
        'include_active': includeActive,
        'limit': limit,
      },
    );
    final data = response.data;
    if (data == null || data is! List) return [];
    return data
        .whereType<Map<String, dynamic>>()
        .map(SessionSummaryModel.fromJson)
        .toList();
  }

  Future<void> startServerDetector(int sessionId) async {
    await _apiClient.post('/sessions/$sessionId/detector/start');
  }

  Future<void> stopServerDetector(int sessionId) async {
    await _apiClient.post('/sessions/$sessionId/detector/stop');
  }

  Future<void> heartbeatServerDetector(int sessionId) async {
    await _apiClient.post('/sessions/$sessionId/detector/heartbeat');
  }

  Future<MlModelSelectionModel> getAvailableModels() async {
    final response = await _apiClient.get('/models');
    final data = response.data;
    if (data is! Map<String, dynamic>) {
      throw Exception('Invalid models response');
    }
    return MlModelSelectionModel.fromJson(data);
  }

  Future<MlModelSelectionModel> selectModel(String fileName) async {
    final response = await _apiClient.post(
      '/models/select',
      data: {'file_name': fileName},
    );
    final data = response.data;
    if (data is! Map<String, dynamic>) {
      throw Exception('Invalid model selection response');
    }
    return MlModelSelectionModel.fromJson(data);
  }
}


