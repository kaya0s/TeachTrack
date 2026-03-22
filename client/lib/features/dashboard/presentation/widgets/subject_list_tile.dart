import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/core/utils/image_url_resolver.dart';
import 'package:teachtrack/features/classroom/domain/models/classroom_models.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';
import 'package:teachtrack/features/session/presentation/screens/monitoring_screen.dart';
import 'package:teachtrack/features/session/presentation/widgets/students_present_dialog.dart';

class SubjectListTile extends StatefulWidget {
  final SubjectModel subject;
  final VoidCallback onTap;

  const SubjectListTile({
    super.key,
    required this.subject,
    required this.onTap,
  });

  @override
  State<SubjectListTile> createState() => _SubjectListTileState();
}

class _SubjectListTileState extends State<SubjectListTile> {
  bool _isStarting = false;

  Future<void> _startMonitoring(BuildContext context) async {
    if (_isStarting) return;
    
    // Show section picker if multiple sections exist
    SectionModel? selectedSection;
    if (widget.subject.sections.length == 1) {
      selectedSection = widget.subject.sections.first;
    } else {
      selectedSection = await showModalBottomSheet<SectionModel>(
        context: context,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        builder: (context) => _SectionPicker(subject: widget.subject),
      );
    }

    if (selectedSection == null) return;

    final studentsPresent = await showStudentsPresentDialog(context, initialValue: 20);
    if (studentsPresent == null) return;

    setState(() => _isStarting = true);
    final session = context.read<SessionProvider>();
    final success = await session.startSession(
      widget.subject.id,
      selectedSection.id,
      studentsPresent,
    );

    if (!mounted) return;
    setState(() => _isStarting = false);

    if (success) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => MonitoringScreen(sessionId: session.activeSession!.id),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Failed to start session: ${session.error}")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final imageUrl = resolveImageUrl(widget.subject.coverImageUrl);
    final collegeLogoUrl = resolveImageUrl(widget.subject.collegeLogoPath);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.dividerColor.withOpacity(0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: widget.onTap,
          child: Padding(
            padding: const EdgeInsets.all(12.0),
            child: Row(
              children: [
                // Subject Image
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    color: theme.colorScheme.primaryContainer.withOpacity(0.2),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: imageUrl != null
                        ? Image.network(imageUrl, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _buildFallback())
                        : _buildFallback(),
                  ),
                ),
                const SizedBox(width: 14),
                
                // Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.subject.name,
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (widget.subject.code != null && widget.subject.code!.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          widget.subject.code!.toUpperCase(),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: theme.colorScheme.primary,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                      const SizedBox(height: 4),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            if (collegeLogoUrl != null)
                              Padding(
                                padding: const EdgeInsets.only(right: 6),
                                child: Container(
                                  width: 14,
                                  height: 14,
                                  decoration: const BoxDecoration(shape: BoxShape.circle),
                                  child: ClipOval(child: Image.network(collegeLogoUrl, fit: BoxFit.cover)),
                                ),
                              ),
                            Text(
                              widget.subject.collegeName ?? 'General',
                              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.secondary),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(width: 8),
                            Icon(Icons.groups_rounded, size: 12, color: theme.colorScheme.secondary),
                            const SizedBox(width: 4),
                            Text(
                              "${widget.subject.sections.length} sections",
                              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.secondary),
                              maxLines: 1,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                
                // Action
                Icon(
                  Icons.chevron_right_rounded,
                  size: 22,
                  color: theme.colorScheme.secondary,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFallback() {
    return const Center(child: Icon(Icons.class_rounded, color: Colors.grey, size: 28));
  }
}

class _SectionPicker extends StatelessWidget {
  final SubjectModel subject;
  const _SectionPicker({required this.subject});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Select Section', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          Flexible(
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: subject.sections.length,
              itemBuilder: (context, index) {
                final section = subject.sections[index];
                return ListTile(
                  title: Text(section.name),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => Navigator.pop(context, section),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
