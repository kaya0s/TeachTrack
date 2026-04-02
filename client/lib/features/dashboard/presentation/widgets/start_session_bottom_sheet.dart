import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/features/classroom/domain/models/classroom_models.dart';
import 'package:teachtrack/features/classroom/presentation/providers/classroom_provider.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';
import 'package:teachtrack/features/session/presentation/screens/monitoring_screen.dart';

class StartSessionBottomSheet extends StatefulWidget {
  const StartSessionBottomSheet({super.key});

  @override
  State<StartSessionBottomSheet> createState() => _StartSessionBottomSheetState();
}

class _StartSessionBottomSheetState extends State<StartSessionBottomSheet> {
  int selectedSubjectIndex = 0;
  SubjectModel? selectedSubject;
  SectionModel? selectedSection;
  int studentsCount = 30; // Default
  String selectedMode = 'LECTURE';
  bool isStarting = false;
  late final PageController subjectPageController;

  @override
  void initState() {
    super.initState();
    final classroom = context.read<ClassroomProvider>();
    if (classroom.subjects.isNotEmpty) {
      selectedSubject = classroom.subjects[0];
      selectedSection = selectedSubject!.sections.isNotEmpty
          ? selectedSubject!.sections.first
          : null;
    }
    subjectPageController = PageController(
      viewportFraction: 0.82,
      initialPage: 0,
    );
  }

  @override
  void dispose() {
    subjectPageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final classroom = context.watch<ClassroomProvider>();
    final session = context.read<SessionProvider>();
    final subjects = classroom.subjects;
    
    if (subjects.isEmpty) {
       return const Center(child: Padding(
         padding: EdgeInsets.all(20.0),
         child: Text("No subjects available."),
       ));
    }

    if (selectedSubject == null) {
       selectedSubject = subjects[0];
       selectedSection = selectedSubject!.sections.isNotEmpty ? selectedSubject!.sections.first : null;
    }

    final sections = selectedSubject!.sections;
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return AnimatedPadding(
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOutCubic,
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        decoration: BoxDecoration(
          color: theme.scaffoldBackgroundColor,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(40)),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 14),
              Center(child: _buildHandle(theme)),
              const SizedBox(height: 32),
              _buildHeader(theme),
              const SizedBox(height: 36),
              _buildSectionLabel(theme, "SELECT SUBJECT"),
              const SizedBox(height: 16),
              _buildSubjectCarousel(subjects, theme),
              const SizedBox(height: 36),
              _buildSectionLabel(theme, "SELECT SECTION"),
              const SizedBox(height: 16),
              _buildSectionSelection(sections, theme),
              const SizedBox(height: 36),
               _buildStudentCountSelection(theme),
               const SizedBox(height: 36),
               _buildSectionLabel(theme, "ACTIVITY MODE"),
               const SizedBox(height: 16),
               _buildActivityModeSelection(theme),
               const SizedBox(height: 48),
              _buildStartButton(session, context, theme),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHandle(ThemeData theme) {
    return Container(
      width: 48,
      height: 5,
      decoration: BoxDecoration(
        color: theme.dividerColor.withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
      ),
    );
  }

  Widget _buildHeader(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Session Settings",
            style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w900, fontSize: 28, letterSpacing: -0.8),
          ),
          const SizedBox(height: 4),
          Text(
            "Prepare your monitoring parameters for this class.",
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.hintColor.withOpacity(0.6),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionLabel(ThemeData theme, String label) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28),
      child: Text(
        label,
        style: TextStyle(
          color: theme.textTheme.bodySmall?.color?.withOpacity(0.4),
          fontWeight: FontWeight.w800,
          letterSpacing: 2.0,
          fontSize: 10,
        ),
      ),
    );
  }

  Widget _buildSubjectCarousel(List<SubjectModel> subjects, ThemeData theme) {
    return Column(
      children: [
        SizedBox(
          height: 190,
          child: PageView.builder(
            controller: subjectPageController,
            itemCount: subjects.length,
            onPageChanged: (index) {
              setState(() {
                selectedSubjectIndex = index;
                selectedSubject = subjects[index];
                selectedSection = selectedSubject!.sections.isNotEmpty
                    ? selectedSubject!.sections.first
                    : null;
              });
            },
            itemBuilder: (context, index) {
              final subject = subjects[index];
              final isSelected = index == selectedSubjectIndex;
              return _SubjectCarouselItem(
                subject: subject,
                isSelected: isSelected,
              );
            },
          ),
        ),
        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(subjects.length, (index) {
            final active = index == selectedSubjectIndex;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: active ? 20 : 6,
              height: 6,
              decoration: BoxDecoration(
                color: active 
                  ? const Color(0xFF10B981) 
                  : theme.dividerColor.withOpacity(0.2),
                borderRadius: BorderRadius.circular(3),
              ),
            );
          }),
        ),
      ],
    );
  }

  Widget _buildSectionSelection(List<SectionModel> sections, ThemeData theme) {
    if (sections.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 28),
        child: Text(
          "No sections found for this subject",
          style: theme.textTheme.bodySmall?.copyWith(fontStyle: FontStyle.italic),
        ),
      );
    }
    return SizedBox(
      height: 44,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 28),
        scrollDirection: Axis.horizontal,
        itemCount: sections.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final section = sections[index];
          final isSecSelected = selectedSection?.id == section.id;
          return GestureDetector(
            onTap: () => setState(() => selectedSection = section),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 24),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: isSecSelected ? const Color(0xFF10B981) : theme.cardColor,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isSecSelected 
                    ? const Color(0xFF10B981) 
                    : theme.dividerColor.withOpacity(0.08),
                  width: 2,
                ),
              ),
              child: Text(
                section.name,
                style: TextStyle(
                  color: isSecSelected ? Colors.white : theme.textTheme.bodyLarge?.color?.withOpacity(0.6),
                  fontWeight: isSecSelected ? FontWeight.w900 : FontWeight.w700,
                  fontSize: 14,
                  letterSpacing: -0.2,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildStudentCountSelection(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: theme.dividerColor.withOpacity(0.05),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.groups_rounded,
              color: theme.textTheme.bodyMedium?.color?.withOpacity(0.5),
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSectionLabel(theme, "STUDENT COUNT").paddingOnly(left: 0),
                const SizedBox(height: 4),
                // Description 
                Text(
                  "Expected attendees",
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.hintColor.withOpacity(0.4),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: theme.cardColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: theme.dividerColor.withOpacity(0.05)),
            ),
            child: Row(
              children: [
                _CounterButton(
                  icon: Icons.remove_rounded,
                  onPressed: () {
                    if (studentsCount > 1) setState(() => studentsCount--);
                  },
                  theme: theme,
                ),
                Container(
                  constraints: const BoxConstraints(minWidth: 44),
                  alignment: Alignment.center,
                  child: Text(
                    "$studentsCount",
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900, 
                      fontSize: 22,
                      letterSpacing: -1,
                    ),
                  ),
                ),
                _CounterButton(
                  icon: Icons.add_rounded,
                  onPressed: () => setState(() => studentsCount++),
                  theme: theme,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActivityModeSelection(ThemeData theme) {
    const modes = [
      {'id': 'LECTURE', 'name': 'Lecture', 'icon': Icons.sensors_rounded, 'color': Colors.teal},
      {'id': 'STUDY', 'name': 'Study', 'icon': Icons.menu_book_rounded, 'color': Colors.blue},
      {'id': 'COLLABORATION', 'name': 'Collaboration', 'icon': Icons.groups_rounded, 'color': Colors.orange},
      {'id': 'EXAM', 'name': 'Exam', 'icon': Icons.security_rounded, 'color': Colors.red},
    ];

    return SizedBox(
      height: 48,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 28),
        scrollDirection: Axis.horizontal,
        itemCount: modes.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final mode = modes[index];
          final isSelected = selectedMode == mode['id'];
          final Color color = mode['color'] as Color;

          return GestureDetector(
            onTap: () => setState(() => selectedMode = mode['id'] as String),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 20),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: isSelected ? color : theme.cardColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isSelected ? color : theme.dividerColor.withOpacity(0.08),
                  width: 2,
                ),
                boxShadow: isSelected ? [
                  BoxShadow(color: color.withOpacity(0.2), blurRadius: 8, offset: const Offset(0, 4))
                ] : [],
              ),
              child: Row(
                children: [
                  Icon(
                    mode['icon'] as IconData,
                    size: 16,
                    color: isSelected ? Colors.white : color,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    mode['name'] as String,
                    style: TextStyle(
                      color: isSelected ? Colors.white : theme.textTheme.bodyLarge?.color?.withOpacity(0.8),
                      fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildStartButton(SessionProvider session, BuildContext context, ThemeData theme) {
    final bool hasActive = session.activeSession != null;
    final bool canStart = selectedSection != null && !isStarting && !hasActive;
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28),
      child: GestureDetector(
        onTap: !canStart ? null : () async {
          setState(() => isStarting = true);
          
          // Show exam mode limitation modal if EXAM mode is selected
          if (selectedMode == 'EXAM') {
            final shouldContinue = await _showExamModeLimitationDialog(context);
            if (!shouldContinue) {
              setState(() => isStarting = false);
              return;
            }
          }
          
          final success = await session.startSession(
            selectedSubject!.id,
            selectedSection!.id,
            studentsCount,
            selectedMode,
          );
          if (!mounted) return;
          Navigator.pop(context, success);
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          height: 68,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            gradient: !canStart
                ? LinearGradient(
                    colors: [theme.dividerColor.withOpacity(0.1), theme.dividerColor.withOpacity(0.05)],
                  )
                : const LinearGradient(
                    colors: [Color(0xFF10B981), Color(0xFF0D9488)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
            boxShadow: !canStart ? [] : [
              BoxShadow(
                color: const Color(0xFF10B981).withOpacity(0.3),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (isStarting)
                const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 3, color: Colors.white),
                )
              else ...[
                const Icon(Icons.bolt_rounded, color: Colors.white, size: 24),
                const SizedBox(width: 12),
                Text(
                  hasActive ? "SESSION ALREADY ACTIVE" : "START LIVE SESSION",
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                      letterSpacing: 0.5),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Future<bool> _showExamModeLimitationDialog(BuildContext context) async {
    final theme = Theme.of(context);
    return await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Row(
          children: [
            Icon(
              Icons.warning_amber_rounded,
              color: Colors.orange,
              size: 28,
            ),
            const SizedBox(width: 12),
            Text(
              'Exam Mode Limitations',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Due to current system limitations, exam mode can only detect:',
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  Icon(Icons.phone_android, color: Colors.orange, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Phone Usage',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: Colors.orange,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Other behaviors (looking around, off-task) cannot be detected yet.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.textTheme.bodySmall?.color?.withOpacity(0.7),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Do you want to continue with exam mode?',
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(
              'Cancel',
              style: TextStyle(color: theme.textTheme.bodyLarge?.color),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange,
              foregroundColor: Colors.white,
            ),
            child: const Text('Continue'),
          ),
        ],
      ),
    ) ?? false;
  }
}

class _CounterButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onPressed;
  final ThemeData theme;

  const _CounterButton({required this.icon, required this.onPressed, required this.theme});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onPressed,
      icon: Icon(icon, size: 20),
      style: IconButton.styleFrom(
        backgroundColor: theme.scaffoldBackgroundColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: EdgeInsets.zero,
      ),
    );
  }
}

class _SubjectCarouselItem extends StatelessWidget {
  final SubjectModel subject;
  final bool isSelected;

  const _SubjectCarouselItem({
    required this.subject,
    required this.isSelected,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return AnimatedScale(
      scale: isSelected ? 1.0 : 0.92,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeOutBack,
      child: AnimatedOpacity(
        opacity: isSelected ? 1.0 : 0.6,
        duration: const Duration(milliseconds: 400),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 6),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(28),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    )
                  ]
                : [],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(28),
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (subject.coverImageUrl != null)
                  Image.network(subject.coverImageUrl!, fit: BoxFit.cover)
                else
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [theme.colorScheme.primary.withOpacity(0.4), theme.colorScheme.primary.withOpacity(0.1)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                  ),
                Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Colors.black.withOpacity(0.8),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          subject.code?.toUpperCase() ?? 'N/A',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        subject.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ],
                  ),
                ),
                if (isSelected)
                  Positioned(
                    top: 16,
                    right: 16,
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(
                        color: Color(0xFF10B981),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.check_rounded, color: Colors.white, size: 18),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

extension on Widget {
  Widget paddingOnly({double left = 0, double right = 0, double top = 0, double bottom = 0}) {
    return Padding(
      padding: EdgeInsets.only(left: left, right: right, top: top, bottom: bottom),
      child: this,
    );
  }
}
