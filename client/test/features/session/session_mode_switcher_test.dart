import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:teachtrack/features/session/presentation/widgets/session_mode_switcher.dart';

void main() {
  testWidgets('SessionModeSwitcher renders Lecture and Exam segments',
      (WidgetTester tester) async {
    String selectedMode = 'LECTURE';

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SessionModeSwitcher(
            currentMode: selectedMode,
            isSwitching: false,
            onModeChanged: (mode) => selectedMode = mode,
          ),
        ),
      ),
    );

    expect(find.text('MONITORING MODE'), findsOneWidget);
    expect(find.text('STANDARD'), findsOneWidget);
    expect(find.text('Lecture'), findsOneWidget);
    expect(find.text('Exam'), findsOneWidget);
    expect(find.textContaining('EXAM TRACKING ACTIVE'), findsNothing);

    // Tap Exam mode
    await tester.tap(find.text('Exam'));
    await tester.pumpAndSettle();

    expect(selectedMode, 'EXAM');
  });

  testWidgets(
      'SessionModeSwitcher displays high vigilance and alert in EXAM mode',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SessionModeSwitcher(
            currentMode: 'EXAM',
            isSwitching: false,
            onModeChanged: (_) {},
          ),
        ),
      ),
    );

    expect(find.text('HIGH VIGILANCE'), findsOneWidget);
    expect(find.textContaining('EXAM TRACKING ACTIVE'), findsOneWidget);
  });

  testWidgets('SessionModeSwitcher displays switching state',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SessionModeSwitcher(
            currentMode: 'LECTURE',
            isSwitching: true,
            onModeChanged: (_) {},
          ),
        ),
      ),
    );

    expect(find.text('Switching…'), findsOneWidget);
  });
}
