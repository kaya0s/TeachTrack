import 'package:flutter/material.dart';
import 'package:teachtrack/features/session/domain/models/session_models.dart';
import 'package:teachtrack/features/session/data/repositories/session_repository.dart';
import 'dart:async';
import 'package:teachtrack/core/services/foreground_session_service.dart';

class SessionProvider extends ChangeNotifier {
  final SessionRepository _repository;

  SessionProvider(this._repository);

  SessionModel? _activeSession;
  SessionMetricsModel? _metrics;
  bool _isLoading = false;
  bool _isSwitchingMode = false;
  bool _metricsRequestInFlight = false;
  String? _error;
  Timer? _metricsTimer;
  List<SessionSummaryModel> _history = [];
  bool _historyLoading = false;
  String? _historyError;
  final Map<int, SessionMetricsModel> _historyMetricsCache = {};
  final Map<int, SessionSummaryModel> _sessionSummaryCache = {};
  List<MlModelOptionModel> _availableModels = [];
  String? _currentModelFile;
  bool _modelsLoading = false;
  String? _modelsError;

  SessionModel? get activeSession => _activeSession;
  SessionMetricsModel? get metrics => _metrics;
  bool get isLoading => _isLoading;
  bool get isSwitchingMode => _isSwitchingMode;
  String? get error => _error;
  List<SessionSummaryModel> get history => _history;
  bool get historyLoading => _historyLoading;
  String? get historyError => _historyError;
  List<MlModelOptionModel> get availableModels => _availableModels;
  String? get currentModelFile => _currentModelFile;
  bool get modelsLoading => _modelsLoading;
  String? get modelsError => _modelsError;

  Future<void> checkActiveSession() async {
    _isLoading = true;
    notifyListeners();
    try {
      _activeSession = await _repository.getActiveSession();
      if (_activeSession != null) {
        startMetricsPolling();
        await ForegroundSessionService.startOrUpdate(session: _activeSession!);
      } else {
        _metrics = null;
        _metricsTimer?.cancel();
        await ForegroundSessionService.stop();
      }
    } catch (e) {
      _error = e.toString();
      _activeSession = null;
      _metrics = null;
      _metricsTimer?.cancel();
      await ForegroundSessionService.stop();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> startSession(
    int subjectId,
    int sectionId,
    int studentsPresent,
    String? activityMode,
  ) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      _activeSession = await _repository.startSession(
        subjectId,
        sectionId,
        studentsPresent,
        activityMode: activityMode,
      );
      startMetricsPolling();
      await ForegroundSessionService.startOrUpdate(session: _activeSession!);
      return true;
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> stopSession() async {
    if (_activeSession == null) return;
    try {
      await _repository.stopSession(_activeSession!.id);
      _activeSession = null;
      _metrics = null;
      _metricsTimer?.cancel();
      await ForegroundSessionService.stop();
      await fetchSessionHistory(includeActive: false);
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<bool> switchSessionMode(String activityMode, {String? reason}) async {
    final activeSession = _activeSession;
    if (activeSession == null || activeSession.activityMode == activityMode) {
      return true;
    }

    _isSwitchingMode = true;
    _error = null;
    notifyListeners();
    try {
      final updatedMode = await _repository.switchSessionMode(
        activeSession.id,
        activityMode,
        reason: reason,
      );
      _activeSession = activeSession.copyWith(activityMode: updatedMode);
      await ForegroundSessionService.startOrUpdate(session: _activeSession!);
      return true;
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      _isSwitchingMode = false;
      notifyListeners();
    }
  }

  void clearSessionState() {
    _activeSession = null;
    _metrics = null;
    _metricsTimer?.cancel();
    _isLoading = false;
    _isSwitchingMode = false;
    _metricsRequestInFlight = false;
    _error = null;
    _history = [];
    _historyLoading = false;
    _historyError = null;
    _historyMetricsCache.clear();
    _sessionSummaryCache.clear();
    _availableModels = [];
    _currentModelFile = null;
    _modelsLoading = false;
    _modelsError = null;
    ForegroundSessionService.stop();
    notifyListeners();
  }

  void startMetricsPolling() {
    _metricsTimer?.cancel();
    fetchMetrics(); // Initial fetch
    _metricsTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      fetchMetrics();
    });
  }

  Future<void> fetchMetrics() async {
    final activeSession = _activeSession;
    if (activeSession == null || _metricsRequestInFlight) return;

    _metricsRequestInFlight = true;
    try {
      final metrics = await _repository.getSessionMetrics(activeSession.id);
      if (_activeSession?.id != activeSession.id) return;
      _metrics = metrics;
      await ForegroundSessionService.startOrUpdate(
        session: _activeSession!,
        metrics: _metrics,
      );
      notifyListeners();
    } catch (e) {
      debugPrint("Error fetching metrics: $e");
    } finally {
      _metricsRequestInFlight = false;
    }
  }

  Future<void> fetchSessionHistory({bool includeActive = false}) async {
    _historyLoading = true;
    _historyError = null;
    notifyListeners();
    try {
      _history =
          await _repository.getSessionHistory(includeActive: includeActive);
    } catch (e) {
      _historyError = e.toString();
    } finally {
      _historyLoading = false;
      notifyListeners();
    }
  }

  SessionMetricsModel? getCachedSessionMetrics(int sessionId) {
    return _historyMetricsCache[sessionId];
  }

  Future<SessionMetricsModel> fetchSessionMetricsById(
    int sessionId, {
    bool forceRefresh = false,
  }) async {
    if (!forceRefresh && _historyMetricsCache.containsKey(sessionId)) {
      return _historyMetricsCache[sessionId]!;
    }
    final metrics = await _repository.getSessionMetrics(sessionId);
    _historyMetricsCache[sessionId] = metrics;
    return metrics;
  }

  Future<SessionSummaryModel> fetchSessionSummaryById(
    int sessionId, {
    bool forceRefresh = false,
  }) async {
    if (!forceRefresh && _sessionSummaryCache.containsKey(sessionId)) {
      return _sessionSummaryCache[sessionId]!;
    }
    final summary = await _repository.getSessionSummary(sessionId);
    _sessionSummaryCache[sessionId] = summary;
    return summary;
  }

  Future<List<AlertModel>> fetchTeacherAlerts({
    int limit = 50,
    bool unreadOnly = false,
  }) async {
    return _repository.listTeacherAlerts(limit: limit, unreadOnly: unreadOnly);
  }

  Future<void> startServerDetector() async {
    if (_activeSession == null) return;
    try {
      await _repository.startServerDetector(_activeSession!.id);
    } catch (e) {
      debugPrint("Error starting server detector: $e");
    }
  }

  Future<void> warmupLiveMonitoring({
    int maxSeconds = 6,
    int pollIntervalMs = 700,
  }) async {
    if (_activeSession == null) return;

    await startServerDetector();

    final deadline = DateTime.now().add(Duration(seconds: maxSeconds));
    while (DateTime.now().isBefore(deadline)) {
      try {
        await fetchMetrics();
      } catch (_) {}

      final m = _metrics;
      if (m != null && (m.totalLogs > 0 || m.recentLogs.isNotEmpty)) {
        return;
      }
      await Future.delayed(Duration(milliseconds: pollIntervalMs));
    }
  }

  Future<void> stopServerDetector() async {
    if (_activeSession == null) return;
    try {
      await _repository.stopServerDetector(_activeSession!.id);
    } catch (e) {
      debugPrint("Error stopping server detector: $e");
    }
  }

  Future<void> heartbeatServerDetector() async {
    if (_activeSession == null) return;
    try {
      await _repository.heartbeatServerDetector(_activeSession!.id);
    } catch (e) {
      debugPrint("Error heartbeating server detector: $e");
    }
  }

  Future<void> fetchAvailableModels() async {
    _modelsLoading = true;
    _modelsError = null;
    notifyListeners();
    try {
      final result = await _repository.getAvailableModels();
      _availableModels = result.models;
      _currentModelFile = result.currentModelFile;
    } catch (e) {
      _modelsError = e.toString();
    } finally {
      _modelsLoading = false;
      notifyListeners();
    }
  }

  Future<bool> selectModel(String fileName) async {
    _modelsLoading = true;
    _modelsError = null;
    notifyListeners();
    try {
      final result = await _repository.selectModel(fileName);
      _availableModels = result.models;
      _currentModelFile = result.currentModelFile;
      return true;
    } catch (e) {
      _modelsError = e.toString();
      return false;
    } finally {
      _modelsLoading = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _metricsTimer?.cancel();
    super.dispose();
  }
}
