import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/core/utils/image_url_resolver.dart';
import 'package:teachtrack/features/auth/presentation/providers/auth_provider.dart';
import 'package:teachtrack/features/classroom/domain/models/classroom_models.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';
import 'package:teachtrack/features/session/presentation/screens/monitoring_screen.dart';
import 'package:teachtrack/features/session/presentation/widgets/students_present_dialog.dart';

class SubjectCard extends StatefulWidget {
  final SubjectModel subject;
  final VoidCallback onTap;

  const SubjectCard({
    super.key,
    required this.subject,
    required this.onTap,
  });

  @override
  State<SubjectCard> createState() => _SubjectCardState();
}

class _SubjectCardState extends State<SubjectCard> {
  bool _isStarting = false;

  String _subjectCollegeName(SubjectModel subject) {
    final direct = subject.collegeName?.trim();
    if (direct != null && direct.isNotEmpty) return direct;
    for (final section in subject.sections) {
      final fromSection = section.collegeName?.trim();
      if (fromSection != null && fromSection.isNotEmpty) return fromSection;
    }
    return 'Global';
  }

  Future<int?> _askStudentsPresent(BuildContext context) async {
    return showStudentsPresentDialog(context, initialValue: 20);
  }

  ButtonStyle _startSubjectButtonStyle(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF56CC9D) : const Color(0xFF0F7A5C);
    final fg = isDark ? Colors.black : Colors.white;
    return FilledButton.styleFrom(
      backgroundColor: bg,
      foregroundColor: fg,
      disabledBackgroundColor: scheme.surfaceContainerHighest,
      disabledForegroundColor: scheme.onSurface.withOpacity(0.55),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
      ),
    );
  }

  Future<void> _startMonitoringFromCard(SectionModel section, BuildContext sheetContext, StateSetter setSheetState) async {
    if (_isStarting) return;
    final studentsPresent = await _askStudentsPresent(context);
    if (studentsPresent == null) return;
    
    setState(() => _isStarting = true);
    setSheetState(() => _isStarting = true);

    final session = context.read<SessionProvider>();
    final success = await session.startSession(
      widget.subject.id,
      section.id,
      studentsPresent,
    );

    if (!mounted) return;
    
    setState(() => _isStarting = false);
    setSheetState(() => _isStarting = false);

    if (success) {
      if (sheetContext.mounted) {
        Navigator.pop(sheetContext);
      }
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) =>
              MonitoringScreen(sessionId: session.activeSession!.id),
        ),
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text("Failed to start session: ${session.error}")),
    );
  }

  @override
  Widget build(BuildContext context) {
    final subject = widget.subject;
    final imageUrl = resolveImageUrl(subject.coverImageUrl);
    final collegeLogoUrl = resolveImageUrl(subject.collegeLogoPath);
    final collegeName = _subjectCollegeName(subject);
    final theme = Theme.of(context);

    return Material(
      color: theme.cardColor,
      borderRadius: BorderRadius.circular(18),
      elevation: 3,
      shadowColor: Colors.black.withOpacity(0.08),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: widget.onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 6,
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                child: imageUrl == null
                    ? _SubjectImagePlaceholder(title: subject.name)
                    : Image.network(
                        imageUrl,
                        fit: BoxFit.cover,
                        width: double.infinity,
                        errorBuilder: (_, __, ___) => _SubjectImagePlaceholder(title: subject.name),
                      ),
              ),
            ),
            Expanded(
              flex: 5,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      subject.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.2,
                      ),
                    ),
                    if (subject.code != null && subject.code!.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer.withValues(alpha: 0.4),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          subject.code!.toUpperCase(),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: theme.colorScheme.primary,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 1),
                    Row(
                      children: [
                        Container(
                          width: 18,
                          height: 18,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: theme.dividerColor.withOpacity(0.55)),
                          ),
                          child: ClipOval(
                            child: collegeLogoUrl == null
                                ? Icon(Icons.school_rounded, size: 12, color: theme.colorScheme.primary)
                                : Image.network(
                                    collegeLogoUrl,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Icon(Icons.school_rounded, size: 12, color: theme.colorScheme.primary),
                                  ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            collegeName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: theme.colorScheme.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      subject.description?.trim().isNotEmpty == true
                          ? subject.description!
                          : 'No description available.',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall,
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        Icon(Icons.groups_rounded, size: 14, color: theme.textTheme.bodySmall?.color),
                        const SizedBox(width: 4),
                        Text(
                          "${subject.sections.length} sections",
                          style: theme.textTheme.bodySmall?.copyWith(fontSize: 11),
                        ),
                        const Icon(
                          Icons.chevron_right_rounded,
                          size: 20,
                          color: Colors.grey,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showSectionsPicker(BuildContext context) async {
     // ... modal bottom sheet logic from original _SubjectCard ...
  }
}

class _SubjectImagePlaceholder extends StatelessWidget {
  final String title;
  const _SubjectImagePlaceholder({required this.title});

  @override
  Widget build(BuildContext context) {
    final colors = [
      const Color(0xFF1E3C72),
      const Color(0xFF2A5298),
      const Color(0xFF4834D4),
      const Color(0xFF686DE0),
      const Color(0xFF30336B),
      const Color(0xFF130F40),
      const Color(0xFF22A6B3),
      const Color(0xFF7ED6DF),
    ];
    final color = colors[title.length % colors.length];

    return Container(
      decoration: BoxDecoration(
        color: color,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [color, color.withBlue(color.blue + 30).withGreen(color.green + 10)],
        ),
      ),
      child: Center(
        child: Opacity(
          opacity: 0.2,
          child: const Icon(Icons.class_rounded, size: 64, color: Colors.white),
        ),
      ),
    );
  }
}
