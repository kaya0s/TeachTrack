import 'dart:io';

import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:teachtrack/features/classroom/domain/models/classroom_session_models.dart';

const String kForegroundSessionStartMsKey = 'sessionStartMs';
const String kForegroundSessionEngagementKey = 'engagementPercent';
const String kForegroundSessionIdKey = 'sessionId';
const String kForegroundStopActionId = 'stop_session';

@pragma('vm:entry-point')
void foregroundSessionStartCallback() {
  FlutterForegroundTask.setTaskHandler(SessionTaskHandler());
}

class ForegroundSessionService {
  static const int serviceId = 2601;
  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'teachtrack_session_channel',
        channelName: 'Active Classroom Session',
        channelDescription: 'Shows ongoing classroom session status.',
        channelImportance: NotificationChannelImportance.LOW,
        priority: NotificationPriority.LOW,
        onlyAlertOnce: true,
        playSound: false,
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: true,
        playSound: false,
      ),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.repeat(5000),
        autoRunOnBoot: false,
        allowWakeLock: false,
        allowWifiLock: false,
      ),
    );
  }

  static Future<void> startOrUpdate({
    required SessionModel session,
    SessionMetricsModel? metrics,
  }) async {
    await _ensureNotificationPermission();
    final engagement = metrics?.averageEngagement.round() ?? 0;
    await FlutterForegroundTask.saveData(
      key: kForegroundSessionStartMsKey,
      value: session.startTime.millisecondsSinceEpoch,
    );
    await FlutterForegroundTask.saveData(
      key: kForegroundSessionEngagementKey,
      value: engagement,
    );
    await FlutterForegroundTask.saveData(
      key: kForegroundSessionIdKey,
      value: session.id,
    );
    final isRunning = await FlutterForegroundTask.isRunningService;
    if (isRunning) {
      FlutterForegroundTask.sendDataToTask({
        kForegroundSessionEngagementKey: engagement,
        kForegroundSessionIdKey: session.id,
      });
    }

    final notificationText = _buildNotificationText(session.startTime, engagement);
    final notificationRoute = _buildNotificationRoute(session.id);
    const notificationButtons = [
      NotificationButton(id: kForegroundStopActionId, text: 'Stop Session'),
    ];

    if (isRunning) {
      await FlutterForegroundTask.updateService(
        notificationTitle: 'Session in progress',
        notificationText: notificationText,
        notificationButtons: notificationButtons,
        notificationInitialRoute: notificationRoute,
      );
      return;
    }

    await FlutterForegroundTask.startService(
      serviceId: serviceId,
      notificationTitle: 'Session in progress',
      notificationText: notificationText,
      notificationButtons: notificationButtons,
      notificationInitialRoute: notificationRoute,
      callback: foregroundSessionStartCallback,
    );
  }

  static Future<void> stop() async {
    if (await FlutterForegroundTask.isRunningService) {
      await FlutterForegroundTask.stopService();
    }
  }

  static String _buildNotificationRoute(int sessionId) {
    return '/monitoring?sessionId=$sessionId';
  }

  static String _buildNotificationText(DateTime startTime, int engagementPercent) {
    final elapsed = DateTime.now().difference(startTime);
    final formattedElapsed = _formatElapsed(elapsed);
    return 'Elapsed $formattedElapsed • Engagement $engagementPercent%';
  }

  static String _formatElapsed(Duration duration) {
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    final seconds = duration.inSeconds.remainder(60);
    if (hours > 0) {
      return '${hours.toString().padLeft(2, '0')}:'
          '${minutes.toString().padLeft(2, '0')}:'
          '${seconds.toString().padLeft(2, '0')}';
    }
    return '${minutes.toString().padLeft(2, '0')}:'
        '${seconds.toString().padLeft(2, '0')}';
  }

  static Future<void> _ensureNotificationPermission() async {
    if (!Platform.isAndroid) return;
    final status = await FlutterForegroundTask.checkNotificationPermission();
    if (status != NotificationPermission.granted) {
      await FlutterForegroundTask.requestNotificationPermission();
    }
  }
}

class SessionTaskHandler extends TaskHandler {
  DateTime? _startTime;
  int _engagementPercent = 0;
  int? _sessionId;

  @override
  Future<void> onStart(DateTime timestamp, TaskStarter starter) async {
    final startMs = await FlutterForegroundTask.getData<int>(key: kForegroundSessionStartMsKey);
    if (startMs != null) {
      _startTime = DateTime.fromMillisecondsSinceEpoch(startMs);
    } else {
      _startTime = timestamp;
    }
    final engagement = await FlutterForegroundTask.getData<int>(key: kForegroundSessionEngagementKey);
    if (engagement != null) {
      _engagementPercent = engagement;
    }
    _sessionId = await FlutterForegroundTask.getData<int>(key: kForegroundSessionIdKey);
    await _updateNotification();
  }

  @override
  Future<void> onRepeatEvent(DateTime timestamp) async {
    final engagement = await FlutterForegroundTask.getData<int>(key: kForegroundSessionEngagementKey);
    if (engagement != null) {
      _engagementPercent = engagement;
    }
    await _updateNotification();
  }

  @override
  void onReceiveData(Object data) {
    if (data is Map) {
      final engagement = data[kForegroundSessionEngagementKey];
      if (engagement is int) {
        _engagementPercent = engagement;
      }
      final sessionId = data[kForegroundSessionIdKey];
      if (sessionId is int) {
        _sessionId = sessionId;
      }
    }
  }

  @override
  void onNotificationButtonPressed(String id) {
    if (id == kForegroundStopActionId) {
      FlutterForegroundTask.sendDataToMain({'action': 'stop_session'});
    }
  }

  @override
  void onNotificationPressed() {
    FlutterForegroundTask.sendDataToMain({
      'action': 'open_session',
      'sessionId': _sessionId,
    });
  }

  @override
  Future<void> onDestroy(DateTime timestamp, bool isForeground) async {
    _startTime = null;
    _sessionId = null;
    _engagementPercent = 0;
  }

  Future<void> _updateNotification() async {
    final startTime = _startTime ?? DateTime.now();
    final elapsed = DateTime.now().difference(startTime);
    final formattedElapsed = ForegroundSessionService._formatElapsed(elapsed);
    final notificationText = 'Elapsed $formattedElapsed • Engagement $_engagementPercent%';
    final notificationRoute =
        _sessionId == null ? '/' : ForegroundSessionService._buildNotificationRoute(_sessionId!);
    await FlutterForegroundTask.updateService(
      notificationTitle: 'Session in progress',
      notificationText: notificationText,
      notificationButtons: const [
        NotificationButton(id: kForegroundStopActionId, text: 'Stop Session'),
      ],
      notificationInitialRoute: notificationRoute,
    );
  }
}


