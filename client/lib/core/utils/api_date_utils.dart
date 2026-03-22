import 'package:intl/intl.dart';

class ApiDateUtils {
  static DateTime parse(String raw) {
    final value = raw.trim();
    final parsed = DateTime.parse(value);
    if (parsed.isUtc) return parsed.toLocal();

    // Backend timestamps without timezone are treated as Philippines local time
    // (UTC+8), then converted to device local time for consistent DateTime math.
    final philippinesLocalAsUtc = DateTime.utc(
      parsed.year,
      parsed.month,
      parsed.day,
      parsed.hour,
      parsed.minute,
      parsed.second,
      parsed.millisecond,
      parsed.microsecond,
    ).subtract(const Duration(hours: 8));
    return philippinesLocalAsUtc.toLocal();
  }
}
