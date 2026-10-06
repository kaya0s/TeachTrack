class ApiDateUtils {
  static DateTime parse(String raw) {
    final parsed = DateTime.parse(raw.trim());
    return parsed.isUtc ? parsed.toLocal() : parsed;
  }
}
