import 'package:dio/dio.dart';
import 'package:teachtrack/core/network/api_client.dart';
import 'package:teachtrack/features/classroom/domain/models/classroom_models.dart';

class ClassroomRepository {
  final ApiClient _apiClient;

  ClassroomRepository(this._apiClient);

  Future<List<SubjectModel>> getSubjects() async {
    final response = await _apiClient.get('/classroom/subjects');
    final data = response.data;
    if (data == null || data is! List) return [];
    return data
        .whereType<Map<String, dynamic>>()
        .map(SubjectModel.fromJson)
        .toList();
  }

  Future<List<CollegeModel>> getColleges() async {
    final response = await _apiClient.get('/classroom/colleges');
    final data = response.data;
    if (data == null || data is! List) return [];
    return data
        .whereType<Map<String, dynamic>>()
        .map(CollegeModel.fromJson)
        .toList();
  }

  Future<List<SectionModel>> getSections() async {
    final response = await _apiClient.get('/classroom/sections');
    final data = response.data;
    if (data == null || data is! List) return [];
    return data
        .whereType<Map<String, dynamic>>()
        .map(SectionModel.fromJson)
        .toList();
  }

  Future<List<DepartmentModel>> getDepartments() async {
    final response = await _apiClient.get('/classroom/departments');
    final data = response.data;
    if (data == null || data is! List) return [];
    return data
        .whereType<Map<String, dynamic>>()
        .map(DepartmentModel.fromJson)
        .toList();
  }

  Future<List<MajorModel>> getMajors() async {
    final response = await _apiClient.get('/classroom/majors');
    final data = response.data;
    if (data == null || data is! List) return [];
    return data
        .whereType<Map<String, dynamic>>()
        .map(MajorModel.fromJson)
        .toList();
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
    final data = response.data;
    if (data is! Map<String, dynamic>) {
      throw Exception('Invalid create subject response');
    }
    return SubjectModel.fromJson(data);
  }

  Future<SectionModel> createSection(int subjectId, String name) async {
    final response = await _apiClient.post(
      '/classroom/sections',
      data: {
        'subject_id': subjectId,
        'name': name,
      },
    );
    final data = response.data;
    if (data is! Map<String, dynamic>) {
      throw Exception('Invalid create section response');
    }
    return SectionModel.fromJson(data);
  }
}


