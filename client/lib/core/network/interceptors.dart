import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/core/auth/session_token_store.dart';
import 'package:teachtrack/features/auth/presentation/providers/auth_provider.dart';
import 'package:teachtrack/app/widgets/splash_gate.dart';

class AuthInterceptor extends Interceptor {
  final FlutterSecureStorage storage;
  final GlobalKey<NavigatorState>? navigatorKey;

  AuthInterceptor(this.storage, {this.navigatorKey});

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token =
        SessionTokenStore.token ?? await storage.read(key: 'access_token');
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    return handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      final path = err.requestOptions.path;
      // Do not trigger session expiration flow if the 401 is an explicit login failure
      if (!path.contains('/login')) {
        final ctx = navigatorKey?.currentContext;
        bool wasAuthenticated = false;

        if (ctx != null) {
          try {
            final authProvider = ctx.read<AuthProvider>();
            wasAuthenticated = authProvider.isAuthenticated;
            // 1. Clear stored credentials and reset state
            authProvider.logout();
          } catch (_) {
            // Fallback: manually clear if provider access fails
            storage.delete(key: 'access_token');
            SessionTokenStore.clear();
          }
        } else {
          storage.delete(key: 'access_token');
          SessionTokenStore.clear();
        }

        // 2. ONLY show toast if they were actually logged in before.
        // This prevents the toast on app startup during the initial checkAuth().
        if (wasAuthenticated) {
          Fluttertoast.showToast(
            msg: 'Your session has expired. Please sign in again.',
            backgroundColor: Colors.redAccent,
            textColor: Colors.white,
            gravity: ToastGravity.BOTTOM,
            toastLength: Toast.LENGTH_LONG,
          );
        }

        // 3. Navigate to SplashGate to properly rebuild the nav state
        navigatorKey?.currentState?.pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const SplashGate()),
          (_) => false,
        );
      }
    }
    return handler.next(err);
  }
}
