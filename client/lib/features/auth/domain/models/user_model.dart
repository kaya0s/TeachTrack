class UserModel {
  final int id;
  final String? firstname;
  final String? lastname;
  final String? fullname;
  final int? age;
  final String email;
  final String? role;
  final String? profilePictureUrl;
  final bool isActive;
  final int? collegeId;
  final String? collegeName;
  final String? collegeLogoPath;
  final int? departmentId;
  final String? departmentName;
  final String? departmentCode;
  final String? departmentCoverImageUrl;

  UserModel({
    required this.id,
    this.firstname,
    this.lastname,
    this.fullname,
    this.age,
    required this.email,
    this.role,
    required this.isActive,
    this.profilePictureUrl,
    this.collegeId,
    this.collegeName,
    this.collegeLogoPath,
    this.departmentId,
    this.departmentName,
    this.departmentCode,
    this.departmentCoverImageUrl,
  });

  String get displayName {
    final full = fullname?.trim() ?? '';
    if (full.isNotEmpty) return full;
    final first = firstname?.trim() ?? '';
    final last = lastname?.trim() ?? '';
    final composed = [first, last].where((part) => part.isNotEmpty).join(' ');
    if (composed.isNotEmpty) return composed;
    return email;
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      firstname: json['firstname'] as String?,
      lastname: json['lastname'] as String?,
      fullname: json['fullname'] as String?,
      age: (json['age'] as num?)?.toInt(),
      email: json['email']?.toString() ?? '',
      role: json['role'] as String?,
      isActive: json['is_active'] == true,
      profilePictureUrl: json['profile_picture_url'] as String?,
      collegeId: (json['college_id'] as num?)?.toInt(),
      collegeName: json['college_name'] as String?,
      collegeLogoPath: json['college_logo_path'] as String?,
      departmentId: (json['department_id'] as num?)?.toInt(),
      departmentName: json['department_name'] as String?,
      departmentCode: json['department_code'] as String?,
      departmentCoverImageUrl: json['department_cover_image_url'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'firstname': firstname,
      'lastname': lastname,
      'fullname': fullname,
      'age': age,
      'email': email,
      'role': role,
      'is_active': isActive,
      'profile_picture_url': profilePictureUrl,
      'college_id': collegeId,
      'college_name': collegeName,
      'college_logo_path': collegeLogoPath,
      'department_id': departmentId,
      'department_name': departmentName,
      'department_code': departmentCode,
      'department_cover_image_url': departmentCoverImageUrl,
    };
  }
}

class TokenModel {
  final String accessToken;
  final String tokenType;

  TokenModel({required this.accessToken, required this.tokenType});

  factory TokenModel.fromJson(Map<String, dynamic> json) {
    return TokenModel(
      accessToken: (json['access_token'] as String?) ?? '',
      tokenType: (json['token_type'] as String?) ?? 'bearer',
    );
  }
}
