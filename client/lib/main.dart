import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'core/di/injection.dart' as di;
import 'core/theme/app_theme.dart';
import 'core/theme/theme_provider.dart';
import 'features/auth/provider/auth_provider.dart';
import 'core/widgets/splash_gate.dart';

import 'features/classroom/provider/classroom_provider.dart';
import 'features/session/provider/session_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
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
          create: (_) => ThemeProvider(),
        ),
      ],
      child: const TeachTrackApp(),
    ),
  );
}

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
          home: const SplashGate(),
        );
      },
    );
  }
}
