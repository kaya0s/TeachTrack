import '../../core/api/api_client.dart';
import '../models/classroom_session_models.dart';

class SessionRepository {
  final ApiClient _apiClient;

  SessionRepository(this._apiClient);

  Future<SessionModel> startSession(
    int subjectId,
    int sectionId,
    int studentsPresent,
  ) async {
    final response = await _apiClient.post(
      '/sessions/start',
      data: {
        'subject_id': subjectId,
        'section_id': sectionId,
        'students_present': studentsPresent,
      },
    );
    return SessionModel.fromJson(response.data);
  }

  Future<SessionModel> stopSession(int sessionId) async {
    final response = await _apiClient.post('/sessions/$sessionId/stop');
    return SessionModel.fromJson(response.data);
  }

  Future<SessionModel?> getActiveSession() async {
    try {
      final response = await _apiClient.get('/sessions/active');
      return SessionModel.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  Future<SessionMetricsModel> getSessionMetrics(int sessionId) async {
    final response = await _apiClient.get('/sessions/$sessionId/metrics');
    return SessionMetricsModel.fromJson(response.data);
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
    return (response.data as List)
        .map((e) => SessionSummaryModel.fromJson(e))
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
    return MlModelSelectionModel.fromJson(response.data);
  }

  Future<MlModelSelectionModel> selectModel(String fileName) async {
    final response = await _apiClient.post(
      '/models/select',
      data: {'file_name': fileName},
    );
    return MlModelSelectionModel.fromJson(response.data);
  }
}
