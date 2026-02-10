// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';
import 'package:teachtrack/main.dart';
import 'package:teachtrack/core/di/injection.dart' as di;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

void main() {
  setUpAll(() async {
    FlutterSecureStorage.setMockInitialValues({});
    // Avoid loading actual .env during tests if possible, or mock it
    dotenv.testLoad(fileInput: 'BASE_URL=http://localhost:8000');
    await di.init();
  });

  testWidgets('App smoke test - verifies login screen shows', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const TeachTrackApp());
    await tester.pump(const Duration(milliseconds: 1400));

    // Verify that our login screen text is present.
    expect(find.text('Sign In'), findsOneWidget);
    expect(find.text('Forgot Password?'), findsOneWidget);
  });
}
