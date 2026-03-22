import 'package:get_it/get_it.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:teachtrack/core/network/api_client.dart';
import 'package:teachtrack/features/auth/data/repositories/auth_repository.dart';
import 'package:teachtrack/features/classroom/data/repositories/classroom_repository.dart';
import 'package:teachtrack/features/notifications/data/repositories/notification_repository.dart';
import 'package:teachtrack/features/session/data/repositories/session_repository.dart';
import 'package:teachtrack/app/bootstrap.dart' show appNavigatorKey;

final sl = GetIt.instance; // sl: Service Locator

Future<void> init() async {
  // Features - Repositories
  sl.registerLazySingleton(() => AuthRepository(sl()));
  sl.registerLazySingleton(() => ClassroomRepository(sl()));
  sl.registerLazySingleton(() => NotificationRepository(sl()));
  sl.registerLazySingleton(() => SessionRepository(sl()));

  // Core
  sl.registerLazySingleton(() => const FlutterSecureStorage());
  // Pass the global navigatorKey so AuthInterceptor can auto-redirect on 401
  sl.registerLazySingleton<ApiClient>(
    () => ApiClient(sl(), navigatorKey: appNavigatorKey),
  );
}
