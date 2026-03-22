import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'dart:io';

class EnvConfig {
  static String get baseUrl {
    String url = dotenv.get('BASE_URL', fallback: '127.0.0.1:8000').trim();

    // Ensure it has a scheme
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://$url';
    }

    // Auto-adjust for Android Emulator if host is localhost
    if (Platform.isAndroid &&
        (url.contains('127.0.0.1') || url.contains('localhost'))) {
      return url
          .replaceAll('127.0.0.1', '10.0.2.2')
          .replaceAll('localhost', '10.0.2.2');
    }
    return url;
  }

  static String get apiVersion =>
      dotenv.get('API_VERSION', fallback: '/api/v1');

  static String get fullUrl => '$baseUrl$apiVersion';
}
