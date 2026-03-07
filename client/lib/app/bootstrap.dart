import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/app/app.dart';
import 'package:teachtrack/app/widgets/foreground_task_listener.dart';
import 'package:teachtrack/core/di/injection.dart' as di;
import 'package:teachtrack/core/services/foreground_session_service.dart';
import 'package:teachtrack/core/theme/theme_provider.dart';
import 'package:teachtrack/features/auth/presentation/providers/auth_provider.dart';
import 'package:teachtrack/features/classroom/presentation/providers/classroom_provider.dart';
import 'package:teachtrack/features/notifications/presentation/providers/notification_provider.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';

final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();
  FlutterForegroundTask.initCommunicationPort();
  await ForegroundSessionService.initialize();

  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint("Firebase initialization failed: $e");
  }

  try {
    await dotenv.load(fileName: ".env");
  } catch (e) {
    debugPrint("Failed to load .env: $e");
  }

  try {
    await di.init();
  } catch (e) {
    debugPrint("Dependency injection failed: $e");
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => AuthProvider(di.sl(), di.sl())..checkAuth(),
        ),
        ChangeNotifierProvider(
          create: (_) => ClassroomProvider(di.sl()),
        ),
        ChangeNotifierProvider(
          create: (_) => SessionProvider(di.sl())..checkActiveSession(),
        ),
        ChangeNotifierProvider(
          create: (_) => NotificationProvider(di.sl())
            ..load(silent: true)
            ..startBackgroundPolling(),
        ),
        ChangeNotifierProvider(
          create: (_) => ThemeProvider(),
        ),
      ],
      child: ForegroundTaskListener(
        navigatorKey: appNavigatorKey,
        child: TeachTrackApp(navigatorKey: appNavigatorKey),
      ),
    ),
  );
}
