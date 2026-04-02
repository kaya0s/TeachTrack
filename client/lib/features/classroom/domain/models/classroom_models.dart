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

class DepartmentModel {
  final int id;
  final int collegeId;
  final String name;
  final String? code;
  final String? coverImageUrl;

  DepartmentModel({
    required this.id,
    required this.collegeId,
    required this.name,
    this.code,
    this.coverImageUrl,
  });

  factory DepartmentModel.fromJson(Map<String, dynamic> json) {
    return DepartmentModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      collegeId: (json['college_id'] as num?)?.toInt() ?? 0,
      name: (json['name'] as String?) ?? '',
      code: json['code'] as String?,
      coverImageUrl: json['cover_image_url'] as String?,
    );
  }
}

class MajorModel {
  final int id;
  final int departmentId;
  final String name;
  final String code;
  final String? coverImageUrl;

  MajorModel({
    required this.id,
    required this.departmentId,
    required this.name,
    required this.code,
    this.coverImageUrl,
  });

  factory MajorModel.fromJson(Map<String, dynamic> json) {
    return MajorModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      departmentId: (json['department_id'] as num?)?.toInt() ?? 0,
      name: (json['name'] as String?) ?? '',
      code: (json['code'] as String?) ?? '',
      coverImageUrl: json['cover_image_url'] as String?,
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
  final int? departmentId;
  final String? departmentName;
  final String? departmentCode;
  final String? departmentCoverImageUrl;
  final int? majorId;
  final String? majorName;
  final String? majorCode;
  final String? majorCoverImageUrl;
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
    this.departmentId,
    this.departmentName,
    this.departmentCode,
    this.departmentCoverImageUrl,
    this.majorId,
    this.majorName,
    this.majorCode,
    this.majorCoverImageUrl,
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
      departmentId: (json['department_id'] as num?)?.toInt(),
      departmentName: json['department_name'] as String?,
      departmentCode: json['department_code'] as String?,
      departmentCoverImageUrl: json['department_cover_image_url'] as String?,
      majorId: (json['major_id'] as num?)?.toInt(),
      majorName: json['major_name'] as String?,
      majorCode: json['major_code'] as String?,
      majorCoverImageUrl: json['major_cover_image_url'] as String?,
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
