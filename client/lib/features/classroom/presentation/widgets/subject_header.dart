import 'package:flutter/material.dart';
import 'package:teachtrack/features/classroom/domain/models/classroom_models.dart';
import 'package:teachtrack/core/widgets/hierarchy_meta_row.dart';

// Pure accent colors — same palette as SubjectOverviewTab
class _C {
  static const blue   = Color(0xFF2563EB);
  static const green  = Color(0xFF16A34A);
  static const purple = Color(0xFF7C3AED);
  static const amber  = Color(0xFFD97706);
  static const teal   = Color(0xFF0D9488);
  static const red    = Color(0xFFDC2626);
}

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

  // Pick a consistent accent from the subject name hash
  Color _accentFor(String name) {
    final accents = [_C.blue, _C.green, _C.purple, _C.amber, _C.teal, _C.red];
    return accents[name.hashCode.abs() % accents.length];
  }

  @override
  Widget build(BuildContext context) {
    final theme  = Theme.of(context);
    final cs     = theme.colorScheme;
    final t      = collapseProgress.clamp(0.0, 1.0);
    final accent = _accentFor(subject.name);
    final majorLabel = (subject.majorCode?.trim().isNotEmpty == true)
        ? subject.majorCode
        : subject.majorName;

    // Interpolated sizing — starts compact, collapses further
    final imgHeight  = 130.0 - (50.0 * t);  // 130 → 80
    final radius     =  16.0 - ( 4.0 * t);  //  16 → 12
    final titleSize  =  20.0 - ( 4.0 * t);  //  20 → 16
    final gap        =  10.0 - ( 4.0 * t);  //  10 →  6
    final vPad       =  12.0 - ( 4.0 * t);  //  12 →  8

    return Padding(
      padding: EdgeInsets.fromLTRB(16, vPad, 16, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Cover image / placeholder ──────────────────────────────
          ClipRRect(
            borderRadius: BorderRadius.circular(radius),
            child: SizedBox(
              height: imgHeight,
              width: double.infinity,
              child: imageUrl == null
                  ? _Placeholder(title: subject.name, accent: accent)
                  : Image.network(
                      imageUrl!,
                      fit: BoxFit.cover,
                      width: double.infinity,
                      errorBuilder: (_, __, ___) =>
                          _Placeholder(title: subject.name, accent: accent),
                    ),
            ),
          ),

          SizedBox(height: gap),

          // ── Title row ─────────────────────────────────────────────
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Text(
                  subject.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                    fontSize: titleSize,
                    letterSpacing: -0.3,
                  ),
                ),
              ),
              if (subject.code != null && subject.code!.isNotEmpty) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                  decoration: BoxDecoration(
                    color: accent.withOpacity(0.10),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: accent.withOpacity(0.30)),
                  ),
                  child: Text(
                    subject.code!.toUpperCase(),
                    style: TextStyle(
                      color: accent,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
              ],
            ],
          ),

          const SizedBox(height: 6),
          HierarchyMetaRow(
            collegeName: subject.collegeName,
            departmentName: subject.departmentName,
            majorLabel: majorLabel,
            collegeLogoPath: subject.collegeLogoPath,
          ),
        ],
      ),
    );
  }
}

// ── Placeholder ────────────────────────────────────────────────────────────────

class _Placeholder extends StatelessWidget {
  final String title;
  final Color accent;

  const _Placeholder({required this.title, required this.accent});

  @override
  Widget build(BuildContext context) {
    final initials = title.trim().isEmpty
        ? '?'
        : title.trim().split(RegExp(r'\s+')).take(2).map((s) => s[0].toUpperCase()).join();

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        // Subtle tinted background — works in both light and dark
        color: accent.withOpacity(isDark ? 0.18 : 0.08),
        // Thin accent border for definition
        border: Border.all(color: accent.withOpacity(0.20)),
      ),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            initials,
            style: TextStyle(
              fontSize: 36,
              fontWeight: FontWeight.w900,
              color: accent,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: accent.withOpacity(0.6),
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }
}
