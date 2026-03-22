import 'package:dio/dio.dart';
import 'package:teachtrack/core/network/api_client.dart';
import 'package:teachtrack/features/auth/domain/models/user_model.dart';

class AuthRepository {
  final ApiClient _apiClient;

  AuthRepository(this._apiClient);

  Future<TokenModel> login(String email, String password) async {
    // FastAPI's OAuth2PasswordRequestForm expects data as form-data (application/x-www-form-urlencoded)
    final formData = FormData.fromMap({
      'username': email,
      'password': password,
    });

    final response = await _apiClient.post(
      '/login/access-token',
      data: formData,
    );
    final data = response.data;
    if (data is! Map<String, dynamic>) {
      throw Exception('Invalid login response');
    }
    return TokenModel.fromJson(data);
  }

  Future<UserModel> getMe() async {
    final response = await _apiClient.get('/users/me');
    final data = response.data;
    if (data is! Map<String, dynamic>) {
      throw Exception('Invalid user response');
    }
    return UserModel.fromJson(data);
  }

  Future<UserModel> updateMe({
    String? firstname,
    String? lastname,
    String? email,
  }) async {
    final payload = <String, dynamic>{};
    if (firstname != null) payload['firstname'] = firstname;
    if (lastname != null) payload['lastname'] = lastname;
    if (email != null) payload['email'] = email;

    final response = await _apiClient.patch(
      '/users/me',
      data: payload,
    );
    final data = response.data;
    if (data is! Map<String, dynamic>) {
      throw Exception('Invalid user response');
    }
    return UserModel.fromJson(data);
  }

  Future<String> uploadProfilePicture(String filePath) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath),
    });

    final response = await _apiClient.post(
      '/users/me/profile-picture',
      data: formData,
    );
    final data = response.data;
    if (data is Map<String, dynamic>) {
      final url = data['profile_picture_url'];
      if (url is String) return url;
    }
    throw Exception('Invalid profile picture response');
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
    final data = response.data;
    if (data is! Map<String, dynamic>) {
      throw Exception('Invalid login response');
    }
    return TokenModel.fromJson(data);
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


