import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/features/classroom/presentation/providers/classroom_provider.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';
import 'package:teachtrack/features/session/presentation/screens/monitoring_screen.dart';


import '../widgets/no_active_session_view.dart';
import '../widgets/start_session_bottom_sheet.dart';

class ActiveSessionsTab extends StatefulWidget {
  const ActiveSessionsTab({super.key});

  @override
  State<ActiveSessionsTab> createState() => _ActiveSessionsTabState();
}

class _ActiveSessionsTabState extends State<ActiveSessionsTab>
    with WidgetsBindingObserver {
  
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final session = context.read<SessionProvider>();
      session.checkActiveSession();
      if (context.read<ClassroomProvider>().subjects.isEmpty) {
        context.read<ClassroomProvider>().fetchClassroomData();
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      final session = context.read<SessionProvider>();
      session.checkActiveSession();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<SessionProvider, ClassroomProvider>(
      builder: (context, session, classroom, child) {
        final activeSession = session.activeSession;

        if (activeSession != null) {
          return MonitoringScreen(
            sessionId: activeSession.id,
            isEmbedded: true,
          );
        }

        final isLoading = classroom.isLoading && classroom.subjects.isEmpty;

        return Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: NoActiveSessionView(
              isLoading: isLoading,
              onStartSession: () => _showStartSessionSheet(context, session, classroom),
            ),
          ),
        );
      },
    );
  }



  Future<void> _showStartSessionSheet(
    BuildContext context,
    SessionProvider session,
    ClassroomProvider classroom,
  ) async {
    if (classroom.subjects.isEmpty) {
      await classroom.fetchClassroomData();
      if (!context.mounted) return;
      if (classroom.subjects.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text("No subjects available. Add a subject first.")),
        );
        return;
      }
    }

    final success = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => const StartSessionBottomSheet(),
    );

    if (success == true && context.mounted) {
      // No redirection needed here since we are already on the active session tab
      // and it will auto-update to show the embedded monitoring.
    }
  }
}
