import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/features/classroom/domain/models/classroom_models.dart';
import 'package:teachtrack/features/classroom/presentation/providers/classroom_provider.dart';
import 'package:teachtrack/features/session/domain/models/session_models.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';
import 'package:teachtrack/features/session/presentation/screens/monitoring_screen.dart';
import 'package:teachtrack/core/utils/image_url_resolver.dart';
import 'package:teachtrack/features/session/presentation/widgets/students_present_dialog.dart';
import 'package:teachtrack/core/providers/navigation_provider.dart';
import '../widgets/subject_header.dart';
import '../widgets/subject_overview_tab.dart';
import '../widgets/subject_history_tab.dart';

class SubjectDetailsScreen extends StatefulWidget {
  final SubjectModel subject;

  const SubjectDetailsScreen({super.key, required this.subject});

  @override
  State<SubjectDetailsScreen> createState() => _SubjectDetailsScreenState();
}

class _SubjectDetailsScreenState extends State<SubjectDetailsScreen> {
  final DateFormat _dateFormat = DateFormat('MMM d, yyyy h:mm a');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final session = context.read<SessionProvider>();
      if (session.history.isEmpty && !session.historyLoading) {
        session.fetchSessionHistory(includeActive: false);
      }
    });
  }

  void _startMonitoring(BuildContext context, SubjectModel subject, SectionModel section) async {
    final sessionProvider = context.read<SessionProvider>();
    final studentsPresent = await showStudentsPresentDialog(context, initialValue: 20);
    
    if (studentsPresent == null) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    final success = await sessionProvider.startSession(
      subject.id,
      section.id,
      studentsPresent,
    );

    if (context.mounted) {
      Navigator.pop(context); // Close loading dialog

      if (success) {
        // Redirection to Dashboard's Active Session Tab
        if (context.mounted) {
           context.read<NavigationProvider>().setIndex(2);
           Navigator.popUntil(context, (route) => route.isFirst);
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Failed to start session: ${sessionProvider.error}")),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.subject.name),
        ),
        body: Consumer2<ClassroomProvider, SessionProvider>(
          builder: (context, classroom, session, child) {
            final currentSubject = classroom.subjects.firstWhere(
              (s) => s.id == widget.subject.id,
              orElse: () => widget.subject,
            );
            final imageUrl = resolveImageUrl(currentSubject.coverImageUrl);
            final history = session.history.where((s) => s.subjectId == currentSubject.id).toList();

            final theme = Theme.of(context);
            return Column(
              children: [
                SubjectHeader(
                  subject: currentSubject,
                  imageUrl: imageUrl,
                  collapseProgress: 0,
                ),
                TabBar(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  indicatorColor: theme.colorScheme.primary,
                  indicatorWeight: 3,
                  labelColor: theme.colorScheme.primary,
                  unselectedLabelColor: theme.colorScheme.secondary.withValues(alpha: 0.55),
                  labelStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.4),
                  unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                  tabs: [
                    Tab(
                      height: 52,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.insights_rounded, size: 20, color: theme.colorScheme.primary),
                          const SizedBox(width: 8),
                          const Text("OVERVIEW"),
                        ],
                      ),
                    ),
                    Tab(
                      height: 52,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.history_rounded, size: 20, color: theme.colorScheme.primary),
                          const SizedBox(width: 8),
                          const Text("HISTORY"),
                        ],
                      ),
                    ),
                  ],
                ),
                Expanded(
                  child: TabBarView(
                    children: [
                      SubjectOverviewTab(
                        subject: currentSubject,
                        history: history,
                        dateFormat: _dateFormat,
                        onStartMonitoring: (section) => _startMonitoring(context, currentSubject, section),
                      ),
                      SubjectHistoryTab(
                        history: history,
                        isLoading: session.historyLoading && session.history.isEmpty,
                        error: session.historyError,
                        dateFormat: _dateFormat,
                        onRetry: () => session.fetchSessionHistory(includeActive: false),
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
