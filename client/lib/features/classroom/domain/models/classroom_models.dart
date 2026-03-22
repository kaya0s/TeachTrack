class CollegeModel {
  final int id;
  final String name;
  final String? acronym;
  final String? logoPath;

  CollegeModel({
    required this.id,
    required this.name,
    this.acronym,
    this.logoPath,
  });

  factory CollegeModel.fromJson(Map<String, dynamic> json) {
    return CollegeModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: (json['name'] as String?) ?? '',
      acronym: json['acronym'] as String?,
      logoPath: json['logo_path'] as String?,
    );
  }
}

class SubjectModel {
  final int id;
  final String name;
  final int teacherId;
  final String? teacherUsername;
  final String? code;
  final String? description;
  final String? coverImageUrl;
  final int? collegeId;
  final String? collegeName;
  final String? collegeAcronym;
  final String? collegeLogoPath;
  final List<SectionModel> sections;

  SubjectModel({
    required this.id,
    required this.name,
    required this.teacherId,
    this.teacherUsername,
    this.code,
    this.description,
    this.coverImageUrl,
    this.collegeId,
    this.collegeName,
    this.collegeAcronym,
    this.collegeLogoPath,
    this.sections = const [],
  });

  factory SubjectModel.fromJson(Map<String, dynamic> json) {
    return SubjectModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: (json['name'] as String?) ?? '',
      teacherId: (json['teacher_id'] as num?)?.toInt() ?? 0,
      teacherUsername: json['teacher_username'] as String?,
      code: json['code'] as String?,
      description: json['description'] as String?,
      coverImageUrl: json['cover_image_url'] as String?,
      collegeId: (json['college_id'] as num?)?.toInt(),
      collegeName: json['college_name'] as String?,
      collegeAcronym: json['college_acronym'] as String?,
      collegeLogoPath: json['college_logo_path'] as String?,
      sections: (json['sections'] as List<dynamic>? ?? [])
          .map((e) => SectionModel.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
    );
  }
}

class SectionModel {
  final int id;
  final String name;
  final int subjectId;
  final int? teacherId;
  final String? teacherUsername;
  final int? collegeId;
  final String? collegeName;
  final String? collegeLogoPath;

  SectionModel({
    required this.id,
    required this.name,
    required this.subjectId,
    this.teacherId,
    this.teacherUsername,
    this.collegeId,
    this.collegeName,
    this.collegeLogoPath,
  });

  factory SectionModel.fromJson(Map<String, dynamic> json) {
    return SectionModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: (json['name'] as String?) ?? '',
      subjectId: (json['subject_id'] as num?)?.toInt() ?? 0,
      teacherId: (json['teacher_id'] as num?)?.toInt(),
      teacherUsername: json['teacher_username'] as String?,
      collegeId: (json['college_id'] as num?)?.toInt(),
      collegeName: json['college_name'] as String?,
      collegeLogoPath: json['college_logo_path'] as String?,
    );
  }
}
