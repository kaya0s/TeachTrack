part of 'subject_details_screen.dart';

class _SubjectHeader extends StatelessWidget {
  final SubjectModel subject;
  final String? imageUrl;
  final double collapseProgress;

  const _SubjectHeader({
    required this.subject,
    required this.imageUrl,
    this.collapseProgress = 0,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = collapseProgress.clamp(0.0, 1.0);
    final imageHeight = 190 - (70 * t);
    final radius = 20 - (6 * t);
    final titleSize = 28 - (8 * t);
    final verticalGap = 14 - (6 * t);
    final topPadding = 16 - (6 * t);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOut,
      padding: EdgeInsets.fromLTRB(16, topPadding, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(radius),
            child: SizedBox(
              height: imageHeight,
              width: double.infinity,
              child: imageUrl == null
                  ? _ImagePlaceholder(title: subject.name)
                  : Image.network(
                      imageUrl!,
                      fit: BoxFit.cover,
                      width: double.infinity,
                      errorBuilder: (_, __, ___) =>
                          _ImagePlaceholder(title: subject.name),
                    ),
            ),
          ),
          SizedBox(height: verticalGap),
          Text(
            subject.name,
            style: theme.textTheme.headlineSmall
                ?.copyWith(fontWeight: FontWeight.w700, fontSize: titleSize),
          ),
        ],
      ),
    );
  }
}

class _OverviewTab extends StatelessWidget {
  final SubjectModel subject;
  final VoidCallback onAddSection;
  final ValueChanged<SectionModel> onStartMonitoring;

  const _OverviewTab({
    required this.subject,
    required this.onAddSection,
    required this.onStartMonitoring,
  });

  @override
  Widget build(BuildContext context) {
    final currentUserId = context.read<AuthProvider>().user?.id;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      children: [
        Text(
          subject.description?.trim().isNotEmpty == true
              ? subject.description!
              : 'No description available.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Sections',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            TextButton.icon(
              onPressed: onAddSection,
              icon: const Icon(Icons.add),
              label: const Text('Add'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (subject.sections.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context)
                  .colorScheme
                  .surfaceContainerHighest
                  .withOpacity(0.45),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Text('No sections created yet.'),
          ),
        ...subject.sections.map(
          (section) {
            final isAssigned = (subject.teacherId == currentUserId) || (section.teacherId == currentUserId);
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                    color: Theme.of(context).dividerColor.withOpacity(0.4)),
              ),
              child: Row(
                children: [
                   Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          section.name,
                          style: Theme.of(context)
                              .textTheme
                              .titleSmall
                              ?.copyWith(fontWeight: FontWeight.w600),
                        ),
                        if (!isAssigned)
                          Text('Not Assigned', style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.error)),
                      ],
                    ),
                  ),
                  FilledButton.tonalIcon(
                    style: _startMonitoringButtonStyle(context),
                    onPressed: isAssigned ? () => onStartMonitoring(section) : null,
                    icon: isAssigned ? const Icon(Icons.play_arrow_rounded) : const Icon(Icons.lock_outline, size: 18),
                    label: isAssigned ? const Text('Start Monitoring') : const Text('Locked'),
                  ),
                ],
              ),
            );
          }
        ),
      ],
    );
  }

  ButtonStyle _startMonitoringButtonStyle(BuildContext context) {
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
        borderRadius: BorderRadius.circular(12),
      ),
    );
  }
}

