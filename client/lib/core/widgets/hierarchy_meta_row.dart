import 'package:flutter/material.dart';
import 'package:teachtrack/core/utils/image_url_resolver.dart';

class HierarchyMetaRow extends StatelessWidget {
  final String? collegeName;
  final String? departmentName;
  final String? majorLabel;
  final String? collegeLogoPath;
  final int maxLines;

  const HierarchyMetaRow({
    super.key,
    this.collegeName,
    this.departmentName,
    this.majorLabel,
    this.collegeLogoPath,
    this.maxLines = 1,
  });

  String? _clean(String? value) {
    final v = value?.trim();
    if (v == null || v.isEmpty) return null;
    return v;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    final college = _clean(collegeName);
    final department = _clean(departmentName);
    final major = _clean(majorLabel);
    final logoUrl = resolveImageUrl(collegeLogoPath);

    final parts = <String>[];
    if (college != null) parts.add(college);
    if (department != null) parts.add(department);
    if (major != null) parts.add(major);

    if (parts.isEmpty) return const SizedBox.shrink();

    return Row(
      children: [
        if (logoUrl != null) ...[
          Container(
            width: 16,
            height: 16,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: cs.outline.withOpacity(0.45),
              ),
            ),
            child: ClipOval(
              child: Image.network(
                logoUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Icon(
                  Icons.school_rounded,
                  size: 12,
                  color: cs.primary,
                ),
              ),
            ),
          ),
          const SizedBox(width: 6),
        ],
        Flexible(
          child: Text(
            parts.join(' • '),
            maxLines: maxLines,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.labelSmall?.copyWith(
              color: cs.onSurface.withOpacity(0.68),
              fontWeight: FontWeight.w600,
              letterSpacing: 0.1,
            ),
          ),
        ),
      ],
    );
  }
}
