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
}
