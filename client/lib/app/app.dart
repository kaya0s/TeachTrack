import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/app/navigation/app_router.dart';
import 'package:teachtrack/app/widgets/splash_gate.dart';
import 'package:teachtrack/core/theme/app_theme.dart';
import 'package:teachtrack/core/theme/theme_provider.dart';

class TeachTrackApp extends StatelessWidget {
  const TeachTrackApp({super.key, required this.navigatorKey});

  final GlobalKey<NavigatorState> navigatorKey;

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
          navigatorKey: navigatorKey,
          onGenerateRoute: AppRouter.onGenerateRoute,
          home: const SplashGate(),
        );
      },
    );
  }
}
