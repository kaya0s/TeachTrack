import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:teachtrack/features/classroom/domain/models/classroom_session_models.dart';
import 'package:teachtrack/features/classroom/presentation/providers/classroom_provider.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';
import 'package:teachtrack/features/session/presentation/screens/monitoring_screen.dart';
import 'package:teachtrack/features/auth/presentation/providers/auth_provider.dart';
import 'package:teachtrack/core/config/env_config.dart';

part 'subject_details_overview_tab.dart';
part 'subject_details_history_tab.dart';
part 'subject_details_widgets.dart';


class SubjectDetailsScreen extends StatefulWidget {
  final SubjectModel subject;

  const SubjectDetailsScreen({super.key, required this.subject});

  @override
  State<SubjectDetailsScreen> createState() => _SubjectDetailsScreenState();
}

class _SubjectDetailsScreenState extends State<SubjectDetailsScreen> {
  final DateFormat _dateFormat = DateFormat('MMM d, yyyy h:mm a');
  int _selectedTabIndex = 0;
  double _historyScrollOffset = 0;

  void _onHistoryScrolled(double offset) {
    if (_selectedTabIndex != 1) return;
    final clamped = offset < 0 ? 0.0 : offset;
    if ((_historyScrollOffset - clamped).abs() < 1) return;
    setState(() => _historyScrollOffset = clamped);
  }

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

  @override
  Widget build(BuildContext context) {
    final subject = widget.subject;
    return Scaffold(
      appBar: AppBar(
        title: Text(subject.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showAddSectionDialog(context),
            tooltip: "Add Section",
          ),
        ],
      ),
      body: DefaultTabController(
        length: 2,
        child: Consumer2<ClassroomProvider, SessionProvider>(
          builder: (context, classroom, session, child) {
            final currentSubject = classroom.subjects.firstWhere(
              (s) => s.id == subject.id,
              orElse: () => subject,
            );
            final imageUrl = _resolveImageUrl(currentSubject.coverImageUrl);
            final history = session.history
                .where((entry) => entry.subjectId == currentSubject.id)
                .toList();
            final collapseProgress = _selectedTabIndex == 1
                ? (_historyScrollOffset / 140).clamp(0.0, 1.0)
                : 0.0;

            return Column(
              children: [
                _SubjectHeader(
                  subject: currentSubject,
                  imageUrl: imageUrl,
                  collapseProgress: collapseProgress,
                ),
                TabBar(
                  onTap: (index) {
                    setState(() {
                      _selectedTabIndex = index;
                      if (index != 1) _historyScrollOffset = 0;
                    });
                  },
                  tabs: [
                    Tab(text: 'Overview'),
                    Tab(text: 'History'),
                  ],
                ),
                Expanded(
                  child: TabBarView(
                    children: [
                      _OverviewTab(
                        subject: currentSubject,
                        onAddSection: () => _showAddSectionDialog(context),
                        onStartMonitoring: (section) =>
                            _startMonitoring(context, currentSubject, section),
                      ),
                      _HistoryTab(
                        history: history,
                        isLoading:
                            session.historyLoading && session.history.isEmpty,
                        error: session.historyError,
                        dateFormat: _dateFormat,
                        onRetry: () =>
                            session.fetchSessionHistory(includeActive: false),
                        onScroll: _onHistoryScrolled,
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

  void _showAddSectionDialog(BuildContext context) {
    final nameController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Add New Section"),
        content: TextField(
          controller: nameController,
          decoration: const InputDecoration(
            labelText: "Section Name",
            hintText: "e.g. Section A, Grade 10-B",
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.isNotEmpty) {
                final success =
                    await context.read<ClassroomProvider>().addSection(
                          widget.subject.id,
                          nameController.text,
                        );
                if (success && context.mounted) {
                  Navigator.pop(context);
                }
              }
            },
            child: const Text("Save"),
          ),
        ],
      ),
    );
  }

  void _startMonitoring(
      BuildContext context, SubjectModel subject, SectionModel section) async {
    final sessionProvider = context.read<SessionProvider>();
    final studentsPresent = await _askStudentsPresent(context);
    if (studentsPresent == null) {
      return;
    }

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
      Navigator.pop(context);

      if (success) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) =>
                MonitoringScreen(sessionId: sessionProvider.activeSession!.id),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content:
                  Text("Failed to start session: ${sessionProvider.error}")),
        );
      }
    }
  }

  Future<int?> _askStudentsPresent(BuildContext context) async {
    final controller = TextEditingController();
    return showDialog<int>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Students Present'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Enter number of students present',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final value = int.tryParse(controller.text.trim());
              if (value == null || value <= 0) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                      content: Text('Enter a valid number greater than 0.')),
                );
                return;
              }
              Navigator.pop(dialogContext, value);
            },
            child: const Text('Start'),
          ),
        ],
      ),
    );
  }
}

