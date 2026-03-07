import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/core/theme/theme_provider.dart';

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
        Positioned.fill(
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  isDark ? const Color(0xFF0B0F14) : const Color(0xFFF8FAFC),
                  isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                ],
              ),
            ),
          ),
        ),
        Positioned.fill(
          child: Container(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: const Alignment(0.7, -0.6),
                radius: 1.2,
                colors: [
                  (isDark ? Colors.white : Colors.black).withOpacity(0.06),
                  Colors.transparent,
                ],
              ),
            ),
          ),
        ),
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

