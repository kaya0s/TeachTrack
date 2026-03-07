import 'package:flutter/material.dart';
import 'package:teachtrack/app/widgets/splash_gate.dart';
import 'package:teachtrack/features/session/presentation/screens/monitoring_screen.dart';

class AppRouter {
  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
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
}
