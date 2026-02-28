import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../../data/models/notification_model.dart';
import '../../../data/repositories/notification_repository.dart';

class NotificationProvider extends ChangeNotifier {
  final NotificationRepository _repository;
  Timer? _pollTimer;

  bool _isLoading = false;
  String? _error;
  int _unreadCount = 0;
  bool _showUnreadOnly = false;
  List<TeacherNotificationModel> _items = [];

  NotificationProvider(this._repository);

  bool get isLoading => _isLoading;
  String? get error => _error;
  int get unreadCount => _unreadCount;
  bool get showUnreadOnly => _showUnreadOnly;
  List<TeacherNotificationModel> get items => _items;

  Future<void> load({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      notifyListeners();
    }
    try {
      final data = await _repository.getNotifications(unreadOnly: _showUnreadOnly);
      _items = data.items;
      _unreadCount = data.unread;
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void setUnreadOnly(bool value) {
    if (_showUnreadOnly == value) return;
    _showUnreadOnly = value;
    load();
  }

  Future<void> markAsRead(int id) async {
    try {
      final updated = await _repository.markRead(id);
      _items = _items.map((item) => item.id == id ? updated : item).toList();
      _unreadCount = _items.where((item) => !item.isRead).length;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  void startRealtimePolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      load(silent: true);
    });
  }

  void stopRealtimePolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }
}
