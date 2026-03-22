import 'package:flutter/material.dart';
import 'package:teachtrack/features/classroom/domain/models/classroom_models.dart';
import 'package:teachtrack/features/classroom/data/repositories/classroom_repository.dart';

class ClassroomProvider extends ChangeNotifier {
  final ClassroomRepository _repository;

  ClassroomProvider(this._repository);

  List<SubjectModel> _subjects = [];
  List<SectionModel> _sections = [];
  List<CollegeModel> _colleges = [];
  bool _isLoading = false;
  String? _error;

  List<SubjectModel> get subjects => _subjects;
  List<SectionModel> get sections => _sections;
  List<CollegeModel> get colleges => _colleges;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchClassroomData() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      try {
        _colleges = await _repository.getColleges();
      } catch (e) {
        debugPrint("Error fetching colleges: $e");
      }

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
}
