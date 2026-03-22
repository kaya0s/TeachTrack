import 'package:flutter/material.dart';
import 'package:teachtrack/features/classroom/domain/models/classroom_models.dart';

class SubjectHeader extends StatelessWidget {
  final SubjectModel subject;
  final String? imageUrl;
  final double collapseProgress;

  const SubjectHeader({
    super.key,
    required this.subject,
    this.imageUrl,
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
                      errorBuilder: (_, __, ___) => _ImagePlaceholder(title: subject.name),
                    ),
            ),
          ),
          SizedBox(height: verticalGap),
          Text(
            subject.name,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w900,
              fontSize: titleSize,
              letterSpacing: -0.5,
            ),
          ),
          if (subject.code != null && subject.code!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              subject.code!.toUpperCase(),
              style: theme.textTheme.labelLarge?.copyWith(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.0,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ImagePlaceholder extends StatelessWidget {
  final String title;
  const _ImagePlaceholder({required this.title});

  @override
  Widget build(BuildContext context) {
    final initials = title.trim().isEmpty ? '?' : title.trim().split(RegExp(r'\s+')).take(2).map((s) => s[0].toUpperCase()).join();
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Theme.of(context).colorScheme.primaryContainer, Theme.of(context).colorScheme.secondaryContainer],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
          fontWeight: FontWeight.w800,
          color: Theme.of(context).colorScheme.onPrimaryContainer,
        ),
      ),
    );
  }
}
