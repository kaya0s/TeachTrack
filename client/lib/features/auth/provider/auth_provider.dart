import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

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
  String? _profileImagePath;

  AuthProvider(this._authRepository, this._storage);

  UserModel? get user => _user;
  AuthStatus get status => _status;
  String? get error => _error;
  bool get isAuthenticated => _status == AuthStatus.authenticated;
  String? get profileImagePath => _profileImagePath;

  String _profileImageStorageKey(int userId) => 'profile_image_path_$userId';

  Future<void> _loadProfileImagePath() async {
    if (_user == null) {
      _profileImagePath = null;
      return;
    }
    _profileImagePath = await _storage.read(
      key: _profileImageStorageKey(_user!.id),
    );
  }

  Future<void> checkAuth() async {
    final token = await _storage.read(key: 'access_token');
    if (token != null) {
      try {
        _user = await _authRepository.getMe();
        await _loadProfileImagePath();
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
      await _loadProfileImagePath();
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
    _profileImagePath = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  Future<bool> signInWithGoogle() async {
    _status = AuthStatus.authenticating;
    _error = null;
    notifyListeners();

    try {
      final googleSignIn = GoogleSignIn(
        serverClientId: dotenv.env['GOOGLE_WEB_CLIENT_ID'],
        scopes: ['email'],
      );
      final GoogleSignInAccount? googleUser = await googleSignIn.signIn();
      if (googleUser == null) {
        _status = AuthStatus.unauthenticated;
        notifyListeners();
        return false;
      }

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final String? idToken = googleAuth.idToken;

      if (idToken == null) {
        _error = "Could not get ID token from Google";
        _status = AuthStatus.unauthenticated;
        notifyListeners();
        return false;
      }

      final tokenData = await _authRepository.loginWithGoogle(idToken);
      await _storage.write(key: 'access_token', value: tokenData.accessToken);
      _user = await _authRepository.getMe();
      await _loadProfileImagePath();
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } catch (e) {
      _error = "Google Sign-In failed: $e";
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    }
  }

  Future<bool> forgotPassword(String email) async {
    try {
      await _authRepository.forgotPassword(email);
      return true;
    } catch (e) {
      _error = "Failed to send reset code: $e";
      return false;
    }
  }

  Future<bool> verifyResetCode(String email, String code) async {
    try {
      await _authRepository.verifyResetCode(email, code);
      return true;
    } catch (e) {
      _error = "Invalid or expired code";
      return false;
    }
  }

  Future<bool> resetPassword(String email, String code, String newPassword) async {
    try {
      await _authRepository.resetPassword(email, code, newPassword);
      return true;
    } catch (e) {
      _error = "Failed to reset password: $e";
      return false;
    }
  }

  Future<bool> updateAccount({
    required String username,
    required String email,
  }) async {
    if (_user == null) return false;
    _error = null;
    notifyListeners();

    try {
      _user = await _authRepository.updateMe(
        username: username.trim(),
        email: email.trim(),
      );
      await _loadProfileImagePath();
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _error = "Failed to update account";
      notifyListeners();
      return false;
    }
  }

  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    _error = null;
    notifyListeners();

    try {
      await _authRepository.changePassword(
        currentPassword: currentPassword,
        newPassword: newPassword,
      );
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _error = "Failed to change password";
      notifyListeners();
      return false;
    }
  }

  Future<void> setProfileImagePath(String path) async {
    if (_user == null) return;
    _profileImagePath = path;
    await _storage.write(
      key: _profileImageStorageKey(_user!.id),
      value: path,
    );
    notifyListeners();
  }

  Future<void> clearProfileImagePath() async {
    if (_user == null) return;
    _profileImagePath = null;
    await _storage.delete(key: _profileImageStorageKey(_user!.id));
    notifyListeners();
  }
}
