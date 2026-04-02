import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:teachtrack/core/auth/session_token_store.dart';

import 'package:teachtrack/features/auth/domain/models/user_model.dart';
import 'package:teachtrack/features/auth/data/repositories/auth_repository.dart';
import 'package:teachtrack/core/network/api_client.dart';

enum AuthStatus { authenticated, unauthenticated, authenticating, initial }

class AuthProvider extends ChangeNotifier {
  static const String _tokenKey = 'access_token';
  static const String _rememberMeKey = 'remember_me';
  static const String _rememberedEmailKey = 'remembered_email';

  final AuthRepository _authRepository;
  final FlutterSecureStorage _storage;

  UserModel? _user;
  AuthStatus _status = AuthStatus.initial;
  String? _error;
  String? _profileImagePath;
  bool _rememberMe = true;
  String? _rememberedEmail;

  AuthProvider(this._authRepository, this._storage);

  UserModel? get user => _user;
  AuthStatus get status => _status;
  String? get error => _error;
  bool get isAuthenticated => _status == AuthStatus.authenticated;
  String? get profileImagePath => _profileImagePath;
  bool get rememberMe => _rememberMe;
  String? get rememberedEmail => _rememberedEmail;
  bool get isLoading => _status == AuthStatus.authenticating;

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
    await _loadRememberMePrefs();
    final token =
        SessionTokenStore.token ?? await _storage.read(key: _tokenKey);
    if (token != null) {
      try {
        _user = await _authRepository.getMe();
        await _loadProfileImagePath();
        _status = AuthStatus.authenticated;
      } catch (e) {
        await _storage.delete(key: _tokenKey);
        SessionTokenStore.clear();
        _status = AuthStatus.unauthenticated;
      }
    } else {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<void> _loadRememberMePrefs() async {
    final rememberRaw = await _storage.read(key: _rememberMeKey);
    _rememberMe = rememberRaw == null ? true : rememberRaw == 'true';
    final remembered = await _storage.read(key: _rememberedEmailKey);
    _rememberedEmail =
        remembered?.trim().isNotEmpty == true ? remembered : null;
  }

  Future<void> _persistRememberMePrefs(String email, bool remember) async {
    await _storage.write(key: _rememberMeKey, value: remember.toString());
    if (remember) {
      await _storage.write(key: _rememberedEmailKey, value: email);
      _rememberedEmail = email;
    } else {
      await _storage.delete(key: _rememberedEmailKey);
      _rememberedEmail = null;
    }
  }

  Future<void> _persistToken(String token, {bool remember = true}) async {
    await _storage.write(key: _tokenKey, value: token);
    SessionTokenStore.setToken(token);
  }

  Future<bool> login(String email, String password, {bool? rememberMe}) async {
    _status = AuthStatus.authenticating;
    _error = null;
    notifyListeners();

    try {
      final shouldRemember = rememberMe ?? _rememberMe;
      _rememberMe = shouldRemember;
      final tokenData = await _authRepository.login(email, password);
      await _persistRememberMePrefs(email, shouldRemember);
      await _persistToken(tokenData.accessToken, remember: shouldRemember);
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

  Future<void> setRememberMe(bool value) async {
    _rememberMe = value;
    await _storage.write(key: _rememberMeKey, value: value.toString());
    if (!value) {
      await _storage.delete(key: _rememberedEmailKey);
      _rememberedEmail = null;
    }
    notifyListeners();
  }

  Future<void> logout() async {
    await _storage.delete(key: _tokenKey);
    SessionTokenStore.clear();
    _user = null;
    _profileImagePath = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  Future<bool> signInWithGoogle() async {
    _status = AuthStatus.authenticating;
    _error = null;
    notifyListeners();

    final googleSignIn = GoogleSignIn(
      serverClientId: dotenv.env['GOOGLE_WEB_CLIENT_ID'],
      scopes: ['email'],
    );

    try {
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
      if (tokenData.accessToken.trim().isEmpty) {
        throw ApiException("Google Sign-In failed: empty access token");
      }
      await _persistToken(tokenData.accessToken, remember: _rememberMe);
      _user = await _authRepository.getMe();
      await _persistRememberMePrefs(_user?.email ?? googleUser.email, _rememberMe);
      await _loadProfileImagePath();
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      try { await googleSignIn.signOut(); } catch (_) {}
      await _storage.delete(key: _tokenKey);
      SessionTokenStore.clear();
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    } catch (e) {
      _error = "Google Sign-In failed: $e";
      try { await googleSignIn.signOut(); } catch (_) {}
      await _storage.delete(key: _tokenKey);
      SessionTokenStore.clear();
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
    required String firstname,
    required String lastname,
    required String email,
  }) async {
    if (_user == null) return false;
    _status = AuthStatus.authenticating;
    _error = null;
    notifyListeners();

    try {
      _user = await _authRepository.updateMe(
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        email: email.trim(),
      );
      await _loadProfileImagePath();
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      _status = AuthStatus.authenticated;
      notifyListeners();
      return false;
    } catch (e) {
      _error = "Failed to update account";
      _status = AuthStatus.authenticated;
      notifyListeners();
      return false;
    }
  }

  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    _status = AuthStatus.authenticating;
    _error = null;
    notifyListeners();

    try {
      await _authRepository.changePassword(
        currentPassword: currentPassword,
        newPassword: newPassword,
      );
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      _status = AuthStatus.authenticated;
      notifyListeners();
      return false;
    } catch (e) {
      _error = "Failed to change password";
      _status = AuthStatus.authenticated;
      notifyListeners();
      return false;
    }
  }

  Future<void> setProfileImagePath(String path) async {
    if (_user == null) return;
    _profileImagePath = path;
    await _storage.write(key: _profileImageStorageKey(_user!.id), value: path);
    notifyListeners();
  }

  Future<bool> uploadProfilePicture(String filePath) async {
    if (_user == null) return false;
    _status = AuthStatus.authenticating;
    notifyListeners();

    try {
      final url = await _authRepository.uploadProfilePicture(filePath);
      _user = UserModel(
        id: _user!.id,
        firstname: _user!.firstname,
        lastname: _user!.lastname,
        fullname: _user!.fullname,
        age: _user!.age,
        email: _user!.email,
        role: _user!.role,
        isActive: _user!.isActive,
        profilePictureUrl: url,
        collegeId: _user!.collegeId,
        collegeName: _user!.collegeName,
        collegeLogoPath: _user!.collegeLogoPath,
        departmentId: _user!.departmentId,
        departmentName: _user!.departmentName,
        departmentCode: _user!.departmentCode,
        departmentCoverImageUrl: _user!.departmentCoverImageUrl,
      );
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } catch (e) {
      _error = "Failed to upload profile picture: $e";
      _status = AuthStatus.authenticated;
      notifyListeners();
      return false;
    }
  }

  Future<void> clearProfileImagePath() async {
    if (_user == null) return;
    _profileImagePath = null;
    await _storage.delete(key: _profileImageStorageKey(_user!.id));
    try {
      _user = await _authRepository.updateMe();
    } catch (e) {
      debugPrint("Server clear failed: $e");
    }
    notifyListeners();
  }
}
