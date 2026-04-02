import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/features/auth/presentation/providers/auth_provider.dart';
import 'package:teachtrack/features/classroom/domain/models/classroom_models.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';
import 'package:teachtrack/features/session/domain/models/session_models.dart';
import 'subject_engagement_chart.dart';
import 'subject_advanced_charts.dart';

// ── Pure accent colors ─────────────────────────────────────────────────────────
// Genuine, saturated Material-style hues. Used as foreground/icon only;
// backgrounds always come from theme.colorScheme so light/dark is automatic.
class _C {
  static const green  = Color(0xFF16A34A); // green-600
  static const blue   = Color(0xFF2563EB); // blue-600
  static const teal   = Color(0xFF0D9488); // teal-600
  static const amber  = Color(0xFFD97706); // amber-600
  static const red    = Color(0xFFDC2626); // red-600
  static const purple = Color(0xFF7C3AED); // violet-600
  static const sky    = Color(0xFF0284C7); // sky-600
}

Color _tint(Color c) => c.withOpacity(0.10);

// ══════════════════════════════════════════════════════════════════════════════
class SubjectOverviewTab extends StatefulWidget {
  final SubjectModel subject;
  final List<SessionSummaryModel> history;
  final DateFormat dateFormat;
  final ValueChanged<SectionModel> onStartMonitoring;

  const SubjectOverviewTab({
    super.key,
    required this.subject,
    required this.history,
    required this.dateFormat,
    required this.onStartMonitoring,
  });

  @override
  State<SubjectOverviewTab> createState() => _SubjectOverviewTabState();
}

class _SubjectOverviewTabState extends State<SubjectOverviewTab> {
  bool _statsOpen     = true;
  bool _trendOpen     = false;
  bool _analyticsOpen = false;
  bool _descOpen      = false;

  void _toggle(String key) => setState(() {
        if (key == 'stats')     _statsOpen     = !_statsOpen;
        if (key == 'trend')     _trendOpen     = !_trendOpen;
        if (key == 'analytics') _analyticsOpen = !_analyticsOpen;
        if (key == 'desc')      _descOpen      = !_descOpen;
      });

  @override
  Widget build(BuildContext context) {
    final theme   = Theme.of(context);
    final user    = context.watch<AuthProvider>().user;
    final history = widget.history;

    final avg = history.isEmpty
        ? 0.0
        : history.map((e) => e.averageEngagement).reduce((a, b) => a + b) / history.length;

    final canViewAll = widget.subject.teacherId == user?.id;
    final sections   = canViewAll
        ? widget.subject.sections
        : widget.subject.sections.where((s) => s.teacherId == user?.id).toList();

    return CustomScrollView(
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              _Collapsible(
                title: 'Description',
                icon: Icons.info_outline_rounded,
                accent: _C.sky,
                isOpen: _descOpen,
                onToggle: () => _toggle('desc'),
                child: Text(
                  widget.subject.description ?? 'No description available.',
                  style: theme.textTheme.bodySmall?.copyWith(height: 1.6),
                ),
              ),
              const SizedBox(height: 12),
              _Collapsible(
                title: 'Statistics',
                icon: Icons.bar_chart_rounded,
                accent: _C.green,
                isOpen: _statsOpen,
                onToggle: () => _toggle('stats'),
                child: _buildStats(theme, history, avg),
              ),
              const SizedBox(height: 12),
              if (history.isNotEmpty) ...[
                _Collapsible(
                  title: 'Engagement Trend',
                  icon: Icons.show_chart_rounded,
                  accent: _C.blue,
                  isOpen: _trendOpen,
                  onToggle: () => _toggle('trend'),
                  child: SubjectEngagementChart(sessions: history),
                ),
                const SizedBox(height: 12),
                _Collapsible(
                  title: 'Advanced Analytics',
                  icon: Icons.auto_graph_rounded,
                  accent: _C.purple,
                  isOpen: _analyticsOpen,
                  onToggle: () => _toggle('analytics'),
                  child: Column(children: [
                    SubjectEngagementTimeChart(history: history),
                    const Divider(height: 28),
                    SubjectSectionComparisonChart(history: history),
                  ]),
                ),
                const SizedBox(height: 12),
              ],
              _buildSections(context, theme, sections, history, user, canViewAll),
            ]),
          ),
        ),
      ],
    );
  }

  Widget _buildStats(ThemeData theme, List<SessionSummaryModel> history, double avg) {
    final recent    = history.take(3).toList();
    final prev      = history.skip(3).take(3).toList();
    final recentAvg = recent.isEmpty ? 0.0 : recent.map((e) => e.averageEngagement).reduce((a, b) => a + b) / recent.length;
    final prevAvg   = prev.isEmpty ? recentAvg : prev.map((e) => e.averageEngagement).reduce((a, b) => a + b) / prev.length;
    final delta     = recentAvg - prevAvg;
    final best      = history.isEmpty ? 0.0 : history.map((e) => e.averageEngagement).reduce((a, b) => a > b ? a : b);

    return Column(children: [
      Row(children: [
        Expanded(child: _StatCard(title: 'Avg Engagement', value: '${avg.toStringAsFixed(1)}%',  icon: Icons.insights_rounded,  accent: _C.green)),
        const SizedBox(width: 10),
        Expanded(child: _StatCard(title: 'Total Sessions',  value: '${history.length}',           icon: Icons.history_rounded,   accent: _C.blue)),
      ]),
      const SizedBox(height: 10),
      Row(children: [
        Expanded(child: _StatCard(
          title: 'Trend (Last 3)',
          value: '${delta >= 0 ? '+' : ''}${delta.toStringAsFixed(1)}%',
          icon:  delta >= 0 ? Icons.trending_up_rounded : Icons.trending_down_rounded,
          accent: delta >= 0 ? _C.teal : _C.red,
        )),
        const SizedBox(width: 10),
        Expanded(child: _StatCard(title: 'Best Score', value: history.isEmpty ? '--' : '${best.toStringAsFixed(0)}%', icon: Icons.emoji_events_rounded, accent: _C.amber)),
      ]),
    ]);
  }

  Widget _buildSections(
    BuildContext context,
    ThemeData theme,
    List<SectionModel> sections,
    List<SessionSummaryModel> history,
    dynamic user,
    bool canViewAll,
  ) {
    final cs = theme.colorScheme;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(color: _tint(_C.green), borderRadius: BorderRadius.circular(9)),
            child: const Icon(Icons.groups_rounded, size: 16, color: _C.green),
          ),
          const SizedBox(width: 9),
          Text('Class Sections',
              style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
            decoration: BoxDecoration(
              color: cs.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              '${sections.length} section${sections.length != 1 ? 's' : ''}',
              style: theme.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
        ]),
      ),
      if (sections.isEmpty)
        Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(children: [
              Icon(Icons.groups_outlined, size: 42, color: cs.onSurface.withOpacity(0.2)),
              const SizedBox(height: 10),
              Text('No sections available',
                  style: theme.textTheme.bodySmall?.copyWith(color: cs.onSurface.withOpacity(0.45))),
            ]),
          ),
        )
      else
        ...sections.asMap().entries.map((e) {
          final idx     = e.key;
          final section = e.value;
          final assigned = canViewAll || section.teacherId == user?.id;
          final ss       = history.where((h) => h.sectionId == section.id).toList();
          final sAvg     = ss.isEmpty ? null : ss.map((h) => h.averageEngagement).reduce((a, b) => a + b) / ss.length;
          return _SectionTile(
            section: section, avg: sAvg, isAssigned: assigned,
            index: idx, onStartMonitoring: widget.onStartMonitoring, theme: theme,
          );
        }),
    ]);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Hero Banner
// ══════════════════════════════════════════════════════════════════════════════
// _HeroBanner was removed as requested

// ══════════════════════════════════════════════════════════════════════════════
// Collapsible — plain Container, no size animation
// ══════════════════════════════════════════════════════════════════════════════
class _Collapsible extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color accent;
  final bool isOpen;
  final VoidCallback onToggle;
  final Widget child;

  const _Collapsible({
    required this.title, required this.icon, required this.accent,
    required this.isOpen, required this.onToggle, required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs    = theme.colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isOpen ? accent.withOpacity(0.35) : cs.outlineVariant.withOpacity(0.5),
          width: isOpen ? 1.5 : 1.0,
        ),
      ),
      child: Column(children: [
        InkWell(
          onTap: onToggle,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            child: Row(children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: _tint(accent),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 15, color: accent),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(title,
                    style: theme.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700)),
              ),
              AnimatedRotation(
                turns: isOpen ? 0.5 : 0,
                duration: const Duration(milliseconds: 200),
                child: Icon(Icons.keyboard_arrow_down_rounded, size: 18,
                    color: isOpen ? accent : cs.onSurfaceVariant),
              ),
            ]),
          ),
        ),
        if (isOpen) ...[
          Divider(height: 1, color: accent.withOpacity(0.15)),
          Padding(padding: const EdgeInsets.all(14), child: child),
        ],
      ]),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Stat Card
// ══════════════════════════════════════════════════════════════════════════════
class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color accent;

  const _StatCard({
    required this.title, required this.value,
    required this.icon,  required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs    = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: accent.withOpacity(0.22)),
      ),
      child: Row(children: [
        Container(
          padding: const EdgeInsets.all(7),
          decoration: BoxDecoration(
            color: _tint(accent),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 14, color: accent),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(value,
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: accent)),
            Text(title,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: cs.onSurface.withOpacity(0.55),
                  fontWeight: FontWeight.w600, fontSize: 10,
                ),
                maxLines: 1, overflow: TextOverflow.ellipsis),
          ]),
        ),
      ]),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Section Tile
// ══════════════════════════════════════════════════════════════════════════════
class _SectionTile extends StatelessWidget {
  final SectionModel section;
  final double? avg;
  final bool isAssigned;
  final int index;
  final ValueChanged<SectionModel> onStartMonitoring;
  final ThemeData theme;

  const _SectionTile({
    required this.section, required this.avg, required this.isAssigned,
    required this.index,   required this.onStartMonitoring, required this.theme,
  });

  static const _accents = [_C.green, _C.blue, _C.teal, _C.amber, _C.red, _C.purple];

  Color get _accent => _accents[index % _accents.length];

  Color get _engColor {
    if (avg == null) return const Color(0xFF9CA3AF);
    if (avg! >= 75)  return _C.green;
    if (avg! >= 50)  return _C.amber;
    return _C.red;
  }

  @override
  Widget build(BuildContext context) {
    final cs = theme.colorScheme;

    final session = context.watch<SessionProvider>();
    final hasActive = session.activeSession != null;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cs.outlineVariant.withOpacity(0.5)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(children: [
          // Index badge
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color: _tint(_accent),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: _accent.withOpacity(0.28)),
            ),
            child: Center(
              child: Text('${index + 1}',
                  style: TextStyle(color: _accent, fontWeight: FontWeight.w900, fontSize: 14)),
            ),
          ),
          const SizedBox(width: 11),

          // Name + bar
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(section.name,
                  style: theme.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              if (avg != null)
                Row(children: [
                  Container(
                    width: 70, height: 4,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      color: cs.surfaceContainerHighest,
                    ),
                    child: FractionallySizedBox(
                      alignment: Alignment.centerLeft,
                      widthFactor: avg! / 100,
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(8),
                          color: _engColor,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 7),
                  Text('${avg!.toStringAsFixed(1)}%',
                      style: TextStyle(color: _engColor, fontWeight: FontWeight.w700, fontSize: 11)),
                ])
              else
                Text('No sessions yet',
                    style: theme.textTheme.labelSmall
                        ?.copyWith(color: cs.onSurface.withOpacity(0.45), fontSize: 11)),
            ]),
          ),
          const SizedBox(width: 9),

          isAssigned
              ? FilledButton.icon(
                  onPressed: hasActive ? null : () => onStartMonitoring(section),
                  icon: const Icon(Icons.play_arrow_rounded, size: 14),
                  label: Text(hasActive ? 'Busy' : 'Start',
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                  style: FilledButton.styleFrom(
                    backgroundColor: hasActive ? theme.disabledColor.withOpacity(0.12) : _C.green,
                    foregroundColor: hasActive ? theme.disabledColor : Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                )
              : Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: cs.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.lock_rounded, size: 12, color: cs.onSurface.withOpacity(0.4)),
                    const SizedBox(width: 4),
                    Text('Locked',
                        style: TextStyle(
                            fontSize: 11, fontWeight: FontWeight.w700,
                            color: cs.onSurface.withOpacity(0.4))),
                  ]),
                ),
        ]),
      ),
    );
  }
}
