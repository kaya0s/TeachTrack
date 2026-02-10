import 'package:get_it/get_it.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../api/api_client.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/classroom_repository.dart';
import '../../data/repositories/session_repository.dart';

final sl = GetIt.instance; // sl: Service Locator

Future<void> init() async {
  // Features - Repositories
  sl.registerLazySingleton(() => AuthRepository(sl()));
  sl.registerLazySingleton(() => ClassroomRepository(sl()));
  sl.registerLazySingleton(() => SessionRepository(sl()));

  // Core
  sl.registerLazySingleton(() => const FlutterSecureStorage());
  sl.registerLazySingleton(() => ApiClient(sl()));
}
