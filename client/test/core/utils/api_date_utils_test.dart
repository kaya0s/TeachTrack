import 'package:flutter_test/flutter_test.dart';
import 'package:teachtrack/core/utils/api_date_utils.dart';

void main() {
  group('ApiDateUtils.parse', () {
    test('preserves timezone-naive API timestamps as local wall time', () {
      final parsed = ApiDateUtils.parse('2026-10-06T12:30:00');
      final expected = DateTime.parse('2026-10-06T12:30:00');

      expect(parsed, expected);
      expect(parsed.isUtc, isFalse);
    });

    test('converts UTC API timestamps to the device timezone', () {
      final parsed = ApiDateUtils.parse('2026-10-06T04:30:00Z');
      final expected = DateTime.parse('2026-10-06T04:30:00Z').toLocal();

      expect(parsed, expected);
      expect(parsed.isUtc, isFalse);
    });

    test('preserves explicit offset instants', () {
      final parsed = ApiDateUtils.parse('2026-10-06T12:30:00+08:00');
      final expected =
          DateTime.parse('2026-10-06T12:30:00+08:00').toLocal();

      expect(parsed, expected);
    });
  });
}
