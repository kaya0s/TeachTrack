class ApiDateUtils {
  static DateTime parse(String raw) {
    final value = raw.trim();
  
    final tzIndicator = RegExp(r'[zZ]|[+\-]\d{2}:?\d{2}');
    if (tzIndicator.hasMatch(value)) {
      final parsed = DateTime.parse(value);
      return parsed.isUtc ? parsed.toLocal() : parsed;
    }

    final parsed = DateTime.parse(value);
    final asUtcInstant = DateTime.utc(
      parsed.year,
      parsed.month,
      parsed.day,
      parsed.hour,
      parsed.minute,
      parsed.second,
      parsed.millisecond,
      parsed.microsecond,
    ).subtract(const Duration(hours: 8));
    return asUtcInstant.toLocal();
  }
}
