import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'core/di/injection.dart' as di;
import 'core/theme/app_theme.dart';
import 'core/theme/theme_provider.dart';
import 'features/auth/provider/auth_provider.dart';
import 'core/widgets/splash_gate.dart';
import 'core/services/foreground_session_service.dart';
import 'core/widgets/foreground_task_listener.dart';

import 'features/classroom/provider/classroom_provider.dart';
import 'features/dashboard/provider/notification_provider.dart';
import 'features/session/provider/session_provider.dart';
import 'features/session/screens/monitoring_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  FlutterForegroundTask.initCommunicationPort();
  await ForegroundSessionService.initialize();
  
  // Initialize Firebase (optional)
  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint("Firebase initialization failed: $e");
  }
  
  // Load environment variables
  try {
    await dotenv.load(fileName: ".env");
  } catch (e) {
    debugPrint("Failed to load .env: $e");
  }
  
  // Initialize dependency injection
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
        child: const TeachTrackApp(),
      ),
    ),
  );
}

final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

class TeachTrackApp extends StatelessWidget {
  const TeachTrackApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, child) {
        return MaterialApp(
          title: 'TeachTrack',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: themeProvider.themeMode,
          navigatorKey: appNavigatorKey,
          onGenerateRoute: _onGenerateRoute,
          home: const SplashGate(),
        );
      },
    );
  }
}

Route<dynamic> _onGenerateRoute(RouteSettings settings) {
  final name = settings.name;
  if (name == null || name == '/') {
    return MaterialPageRoute(builder: (_) => const SplashGate());
  }
  final uri = Uri.tryParse(name);
  if (uri != null && uri.path == '/monitoring') {
    final sessionId = int.tryParse(uri.queryParameters['sessionId'] ?? '');
    if (sessionId != null) {
      return MaterialPageRoute(
        builder: (_) => MonitoringScreen(sessionId: sessionId),
        settings: settings,
      );
    }
  }
  return MaterialPageRoute(builder: (_) => const SplashGate());
}
