import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../config/env_config.dart';
import 'interceptors.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  late final Dio _dio;
  final FlutterSecureStorage _storage;

  ApiClient(this._storage, {GlobalKey<NavigatorState>? navigatorKey}) {
    _dio = Dio(
      BaseOptions(
        baseUrl: EnvConfig.fullUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        contentType: Headers.jsonContentType,
      ),
    );
    _dio.interceptors
        .add(AuthInterceptor(_storage, navigatorKey: navigatorKey));
    _dio.interceptors
        .add(LogInterceptor(requestBody: true, responseBody: true));
  }

  Future<Response> get(String path,
      {Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.get(path, queryParameters: queryParameters);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Response> post(String path,
      {dynamic data, Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.post(path,
          data: data, queryParameters: queryParameters);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Response> put(String path,
      {dynamic data, Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.put(path, data: data, queryParameters: queryParameters);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Response> patch(String path,
      {dynamic data, Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.patch(path,
          data: data, queryParameters: queryParameters);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  dynamic _handleError(DioException e) {
    // 401 is already handled by AuthInterceptor (redirect + toast).
    String message = "Something went wrong";
    if (e.response != null) {
      final data = e.response?.data;
      if (data is Map) {
        message = data['detail']?.toString() ??
            "Server error: ${e.response?.statusCode}";
      } else {
        message = "Server error: ${e.response?.statusCode}";
      }
    } else {
      message = e.message ?? "Connection error";
    }
    return ApiException(message);
  }
}

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}
