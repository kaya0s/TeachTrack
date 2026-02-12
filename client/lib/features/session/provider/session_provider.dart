import 'package:flutter/material.dart';
import '../../../data/models/classroom_session_models.dart';
import '../../../data/repositories/session_repository.dart';
import 'dart:async';
import '../../../core/services/foreground_session_service.dart';

class SessionProvider extends ChangeNotifier {
  final SessionRepository _repository;

  SessionProvider(this._repository);

  SessionModel? _activeSession;
  SessionMetricsModel? _metrics;
  bool _isLoading = false;
  String? _error;
  Timer? _metricsTimer;
  List<SessionSummaryModel> _history = [];
  bool _historyLoading = false;
  String? _historyError;

  SessionModel? get activeSession => _activeSession;
  SessionMetricsModel? get metrics => _metrics;
  bool get isLoading => _isLoading;
  String? get error => _error;
  List<SessionSummaryModel> get history => _history;
  bool get historyLoading => _historyLoading;
  String? get historyError => _historyError;

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

  Future<bool> startSession(int subjectId, int sectionId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      _activeSession = await _repository.startSession(subjectId, sectionId);
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

  void clearSessionState() {
    _activeSession = null;
    _metrics = null;
    _metricsTimer?.cancel();
    _isLoading = false;
    _error = null;
    _history = [];
    _historyLoading = false;
    _historyError = null;
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
    if (_activeSession == null) return;
    try {
      _metrics = await _repository.getSessionMetrics(_activeSession!.id);
      await ForegroundSessionService.startOrUpdate(
        session: _activeSession!,
        metrics: _metrics,
      );
      notifyListeners();
    } catch (e) {
      debugPrint("Error fetching metrics: $e");
    }
  }

  Future<void> fetchSessionHistory({bool includeActive = false}) async {
    _historyLoading = true;
    _historyError = null;
    notifyListeners();
    try {
      _history = await _repository.getSessionHistory(includeActive: includeActive);
    } catch (e) {
      _historyError = e.toString();
    } finally {
      _historyLoading = false;
      notifyListeners();
    }
  }

  Future<void> startServerDetector() async {
    if (_activeSession == null) return;
    try {
      await _repository.startServerDetector(_activeSession!.id);
    } catch (e) {
      debugPrint("Error starting server detector: $e");
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

  @override
  void dispose() {
    _metricsTimer?.cancel();
    super.dispose();
  }
}
