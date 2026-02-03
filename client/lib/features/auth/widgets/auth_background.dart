import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/theme_provider.dart';

class AuthBackground extends StatelessWidget {
  final Widget child;
  final bool showBackButton;

  const AuthBackground({
    super.key,
    required this.child,
    this.showBackButton = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Stack(
      children: [
        // Background Image
        Positioned.fill(
          child: Image.asset(
            'assets/images/ml_bg.png',
            fit: BoxFit.cover,
          ),
        ),
        // Gradient Overlay
        Positioned.fill(
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  (isDark ? theme.scaffoldBackgroundColor : Colors.white).withOpacity(0.7),
                  (isDark ? theme.scaffoldBackgroundColor : Colors.white).withOpacity(0.9),
                  isDark ? theme.scaffoldBackgroundColor : Colors.white,
                ],
                stops: const [0.0, 0.4, 0.8],
              ),
            ),
          ),
        ),
        // Content
        Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            leading: showBackButton
                ? IconButton(
                    icon: Icon(Icons.arrow_back, color: isDark ? Colors.white : Colors.black87),
                    onPressed: () => Navigator.pop(context),
                  )
                : null,
            actions: [
              Consumer<ThemeProvider>(
                builder: (context, themeProvider, child) {
                  return IconButton(
                    icon: Icon(
                      themeProvider.isDarkMode ? Icons.light_mode : Icons.dark_mode,
                      color: themeProvider.isDarkMode ? Colors.white : Colors.black87,
                    ),
                    onPressed: () {
                      themeProvider.toggleTheme(!themeProvider.isDarkMode);
                    },
                  );
                },
              ),
              const SizedBox(width: 8),
            ],
          ),
          body: child,
        ),
      ],
    );
  }
}
