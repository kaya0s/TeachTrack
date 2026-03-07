import 'package:dio/dio.dart';
import 'package:teachtrack/core/network/api_client.dart';
import 'package:teachtrack/features/classroom/domain/models/classroom_session_models.dart';

class ClassroomRepository {
  final ApiClient _apiClient;

  ClassroomRepository(this._apiClient);

  Future<List<SubjectModel>> getSubjects() async {
    final response = await _apiClient.get('/classroom/subjects');
    final List<dynamic> data = response.data;
    return data.map((json) => SubjectModel.fromJson(json)).toList();
  }

  Future<List<SectionModel>> getSections() async {
    final response = await _apiClient.get('/classroom/sections');
    final List<dynamic> data = response.data;
    return data.map((json) => SectionModel.fromJson(json)).toList();
  }

  Future<String> uploadSubjectCoverImage(String filePath) async {
    final fileName = filePath.split(RegExp(r'[\\/]')).last;
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath, filename: fileName),
    });
    final response = await _apiClient.post(
      '/classroom/subjects/cover-image',
      data: formData,
    );

    final secureUrl = (response.data as Map<String, dynamic>)['secure_url'];
    if (secureUrl is! String || secureUrl.isEmpty) {
      throw Exception('Cover image upload failed: missing secure_url');
    }
    return secureUrl;
  }

  Future<SubjectModel> createSubject({
    required String name,
    String? code,
    String? description,
    String? coverImageUrl,
  }) async {
    final response = await _apiClient.post(
      '/classroom/subjects',
      data: {
        'name': name,
        'code': code,
        'description': description,
        'cover_image_url': coverImageUrl,
      },
    );
    return SubjectModel.fromJson(response.data);
  }

  Future<SectionModel> createSection(int subjectId, String name) async {
    final response = await _apiClient.post(
      '/classroom/sections',
      data: {
        'subject_id': subjectId,
        'name': name,
      },
    );
    return SectionModel.fromJson(response.data);
  }
}


