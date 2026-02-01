import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../data/models/user_model.dart';
import '../../../data/repositories/auth_repository.dart';
import '../../../core/api/api_client.dart';

enum AuthStatus { authenticated, unauthenticated, authenticating, initial }

class AuthProvider extends ChangeNotifier {
  final AuthRepository _authRepository;
  final FlutterSecureStorage _storage;

  UserModel? _user;
  AuthStatus _status = AuthStatus.initial;
  String? _error;

  AuthProvider(this._authRepository, this._storage);

  UserModel? get user => _user;
  AuthStatus get status => _status;
  String? get error => _error;
  bool get isAuthenticated => _status == AuthStatus.authenticated;

  Future<void> checkAuth() async {
    final token = await _storage.read(key: 'access_token');
    if (token != null) {
      try {
        _user = await _authRepository.getMe();
        _status = AuthStatus.authenticated;
      } catch (e) {
        await _storage.delete(key: 'access_token');
        _status = AuthStatus.unauthenticated;
      }
    } else {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<bool> login(String username, String password) async {
    _status = AuthStatus.authenticating;
    _error = null;
    notifyListeners();

    try {
      final tokenData = await _authRepository.login(username, password);
      await _storage.write(key: 'access_token', value: tokenData.accessToken);
      _user = await _authRepository.getMe();
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    } catch (e) {
      _error = "An unexpected error occurred";
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register(String username, String email, String password) async {
    _status = AuthStatus.authenticating;
    _error = null;
    notifyListeners();

    try {
      await _authRepository.register(
        username: username,
        email: email,
        password: password,
      );
      // After registration, we could auto-login or redirect to login.
      // For simplicity, let's login directly if registration is successful.
      return await login(username, password);
    } on ApiException catch (e) {
      _error = e.message;
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    } catch (e) {
      _error = "Registration failed";
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: 'access_token');
    _user = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  Future<bool> signInWithGoogle() async {
    _status = AuthStatus.authenticating;
    _error = null;
    notifyListeners();

    try {
      // TODO: Implement Google Sign-In logic
      // For now, simulate a delay
      await Future.delayed(const Duration(seconds: 1));
      _error = "Google Sign-In not implemented yet";
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    } catch (e) {
      _error = "Google Sign-In failed";
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    }
  }
}
