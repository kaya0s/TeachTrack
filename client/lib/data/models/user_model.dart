class UserModel {
  final int id;
  final String email;
  final String username;
  final String? profilePictureUrl;
  final bool isActive;

  UserModel({
    required this.id,
    required this.email,
    required this.username,
    required this.isActive,
    this.profilePictureUrl,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'],
      email: json['email'],
      username: json['username'],
      isActive: json['is_active'] ?? true,
      profilePictureUrl: json['profile_picture_url'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'username': username,
      'is_active': isActive,
      'profile_picture_url': profilePictureUrl,
    };
  }
}

class TokenModel {
  final String accessToken;
  final String tokenType;

  TokenModel({required this.accessToken, required this.tokenType});

  factory TokenModel.fromJson(Map<String, dynamic> json) {
    return TokenModel(
      accessToken: json['access_token'],
      tokenType: json['token_type'],
    );
  }
}
