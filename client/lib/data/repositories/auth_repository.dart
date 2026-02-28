import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../models/user_model.dart';

class AuthRepository {
  final ApiClient _apiClient;

  AuthRepository(this._apiClient);

  Future<TokenModel> login(String username, String password) async {
    // FastAPI's OAuth2PasswordRequestForm expects data as form-data (application/x-www-form-urlencoded)
    final formData = FormData.fromMap({
      'username': username,
      'password': password,
    });

    final response = await _apiClient.post(
      '/login/access-token',
      data: formData,
    );
    return TokenModel.fromJson(response.data);
  }

  Future<UserModel> register({
    required String username,
    required String email,
    required String password,
  }) async {
    final response = await _apiClient.post(
      '/register',
      data: {
        'username': username,
        'email': email,
        'password': password,
        'is_active': true,
      },
    );
    return UserModel.fromJson(response.data);
  }

  Future<UserModel> getMe() async {
    final response = await _apiClient.get('/users/me');
    return UserModel.fromJson(response.data);
  }

  Future<UserModel> updateMe({
    String? username,
    String? email,
  }) async {
    final payload = <String, dynamic>{};
    if (username != null) payload['username'] = username;
    if (email != null) payload['email'] = email;

    final response = await _apiClient.patch(
      '/users/me',
      data: payload,
    );
    return UserModel.fromJson(response.data);
  }

  Future<String> uploadProfilePicture(String filePath) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath),
    });

    final response = await _apiClient.post(
      '/users/me/profile-picture',
      data: formData,
    );
    return response.data['profile_picture_url'];
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _apiClient.post(
      '/users/me/change-password',
      data: {
        'current_password': currentPassword,
        'new_password': newPassword,
      },
    );
  }

  Future<TokenModel> loginWithGoogle(String idToken) async {
    final response = await _apiClient.post(
      '/login/google',
      data: {'id_token': idToken},
    );
    return TokenModel.fromJson(response.data);
  }

  Future<void> forgotPassword(String email) async {
    await _apiClient.post(
      '/forgot-password',
      data: {'email': email},
    );
  }

  Future<void> verifyResetCode(String email, String code) async {
    await _apiClient.post(
      '/verify-reset-code',
      data: {
        'email': email,
        'code': code,
      },
    );
  }

  Future<void> resetPassword(String email, String code, String newPassword) async {
    await _apiClient.post(
      '/reset-password',
      data: {
        'email': email,
        'code': code,
        'new_password': newPassword,
      },
    );
  }
}
