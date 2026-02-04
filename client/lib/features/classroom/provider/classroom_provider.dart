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
      final results = await Future.wait<dynamic>([
        _repository.getSubjects(),
        _repository.getSections(),
      ]);
      _subjects = results[0] as List<SubjectModel>;
      _sections = results[1] as List<SectionModel>;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> addSubject(String name, String? code) async {
    try {
      final subject = await _repository.createSubject(name, code);
      _subjects.add(subject);
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> addSection(String name) async {
    try {
      final section = await _repository.createSection(name);
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
