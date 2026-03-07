import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/features/auth/presentation/providers/auth_provider.dart';
import 'package:teachtrack/features/auth/presentation/screens/login_screen.dart';
import 'package:teachtrack/features/dashboard/presentation/screens/dashboard_screen.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';

class SplashGate extends StatefulWidget {
  const SplashGate({super.key});

  @override
  State<SplashGate> createState() => _SplashGateState();
}

class _SplashGateState extends State<SplashGate> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;
  late final Animation<double> _fade;
  bool _minDelayDone = false;
  AuthProvider? _auth;

  void _handleAuthChange() {
    final auth = _auth;
    if (auth == null || !mounted) return;
    final session = context.read<SessionProvider>();
    if (auth.isAuthenticated) {
      session.checkActiveSession();
    } else {
      session.clearSessionState();
    }
  }

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _scale = CurvedAnimation(parent: _controller, curve: Curves.easeOutBack);
    _fade = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _controller.forward();
    Future.delayed(const Duration(milliseconds: 1100), () {
      if (mounted) {
        setState(() => _minDelayDone = true);
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final auth = context.read<AuthProvider>();
    if (_auth != auth) {
      _auth?.removeListener(_handleAuthChange);
      _auth = auth;
      _auth?.addListener(_handleAuthChange);
    }
  }

  @override
  void dispose() {
    _auth?.removeListener(_handleAuthChange);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, child) {
        final ready = _minDelayDone && auth.status != AuthStatus.initial;
        if (!ready) {
          return Scaffold(
            body: Center(
              child: FadeTransition(
                opacity: _fade,
                child: ScaleTransition(
                  scale: _scale,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(18),
                        child: Image.asset(
                          'assets/images/ml_bg.png',
                          height: 96,
                          width: 96,
                          fit: BoxFit.cover,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        "TeachTrack",
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.6,
                            ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }

        return auth.isAuthenticated ? const DashboardScreen() : const LoginScreen();
      },
    );
  }
}

