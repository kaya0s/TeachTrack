import 'package:flutter/material.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:provider/provider.dart';

import 'package:teachtrack/core/services/foreground_session_service.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';

class ForegroundTaskListener extends StatefulWidget {
  final Widget child;
  final GlobalKey<NavigatorState> navigatorKey;

  const ForegroundTaskListener({
    super.key,
    required this.child,
    required this.navigatorKey,
  });

  @override
  State<ForegroundTaskListener> createState() => _ForegroundTaskListenerState();
}

class _ForegroundTaskListenerState extends State<ForegroundTaskListener> {
  @override
  void initState() {
    super.initState();
    FlutterForegroundTask.addTaskDataCallback(_handleTaskData);
  }

  @override
  void dispose() {
    FlutterForegroundTask.removeTaskDataCallback(_handleTaskData);
    super.dispose();
  }

  void _handleTaskData(Object data) {
    if (data is! Map) return;
    final action = data['action'];
    if (action == 'stop_session') {
      final session = context.read<SessionProvider>();
      session.stopServerDetector();
      session.stopSession();
      ForegroundSessionService.stop();
      widget.navigatorKey.currentState?.pushNamedAndRemoveUntil('/', (route) => false);
      return;
    }
    if (action == 'open_session') {
      final sessionId = data['sessionId'];
      if (sessionId is int) {
        widget.navigatorKey.currentState?.pushNamed('/monitoring?sessionId=$sessionId');
      }
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

