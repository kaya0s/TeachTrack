import 'package:flutter/material.dart';
import '../../../data/models/classroom_session_models.dart';
import '../../../data/repositories/classroom_repository.dart';

class ClassroomProvider extends ChangeNotifier {
  final ClassroomRepository _repository;

  ClassroomProvider(this._repository);

  List<SubjectModel> _subjects = [];
  List<SectionModel> _sections = [];
  bool _isLoading = false;
  String? _error;

  List<SubjectModel> get subjects => _subjects;
  List<SectionModel> get sections => _sections;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchClassroomData() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _subjects = await _repository.getSubjects();
      try {
        _sections = await _repository.getSections();
      } catch (e) {
        debugPrint("Error fetching sections: $e");
        _error = "Sections Error: $e";
      }
    } catch (e) {
      debugPrint("Error fetching subjects: $e");
      _error = "Subjects Error: $e";
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> addSubject({
    required String name,
    String? code,
    String? description,
    String? coverImagePath,
  }) async {
    try {
      String? uploadedCoverImageUrl;
      if (coverImagePath != null && coverImagePath.isNotEmpty) {
        uploadedCoverImageUrl =
            await _repository.uploadSubjectCoverImage(coverImagePath);
      }

      final subject = await _repository.createSubject(
        name: name,
        code: code,
        description: description,
        coverImageUrl: uploadedCoverImageUrl,
      );
      _subjects.add(subject);
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> addSection(int subjectId, String name) async {
    try {
      final section = await _repository.createSection(subjectId, name);
      // Find subject and add section to it
      final subjectIndex = _subjects.indexWhere((s) => s.id == subjectId);
      if (subjectIndex != -1) {
        final subject = _subjects[subjectIndex];
        _subjects[subjectIndex] = SubjectModel(
          id: subject.id,
          name: subject.name,
          code: subject.code,
          description: subject.description,
          coverImageUrl: subject.coverImageUrl,
          sections: [...subject.sections, section],
        );
      }
      _sections.add(section);
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
}
