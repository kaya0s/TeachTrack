import '../../core/api/api_client.dart';
import '../models/classroom_session_models.dart';

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

  Future<SubjectModel> createSubject(String name, String? code) async {
    final response = await _apiClient.post(
      '/classroom/subjects',
      data: {
        'name': name,
        'code': code,
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
