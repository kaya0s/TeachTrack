import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/features/auth/presentation/providers/auth_provider.dart';
import 'package:teachtrack/features/classroom/domain/models/classroom_models.dart';
import 'package:teachtrack/features/session/domain/models/session_models.dart';
import 'subject_engagement_chart.dart';
import 'subject_advanced_charts.dart';

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
  bool _isStatisticsExpanded = false;
  bool _isTrendExpanded = false;
  bool _isAdvanceAnalyticsExpanded = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final user = context.watch<AuthProvider>().user;
    final history = widget.history;
    final avgEngagement = history.isEmpty 
        ? 0.0 
        : history.map((e) => e.averageEngagement).reduce((a, b) => a + b) / history.length;
    
    final canViewAll = widget.subject.teacherId == user?.id;
    final visibleSections = canViewAll 
        ? widget.subject.sections 
        : widget.subject.sections.where((s) => s.teacherId == user?.id).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      children: [
        _buildInfoCard(theme),
        const SizedBox(height: 16),
        _buildStatsSection(theme, history, avgEngagement),
        const SizedBox(height: 16),
        if (history.isNotEmpty) ...[
          _buildTrendSection(theme, history),
          const SizedBox(height: 16),
          _buildAdvanceAnalytics(theme, history),
          const SizedBox(height: 16),
        ],
        _buildSectionsHeader(theme),
        const SizedBox(height: 8),
        ...visibleSections.map((s) => _buildSectionTile(context, s, history, canViewAll || s.teacherId == user?.id)),
      ],
    );
  }

  Widget _buildInfoCard(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Description", style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(widget.subject.description ?? "No description available."),
        ],
      ),
    );
  }

  Widget _buildStatsSection(ThemeData theme, List<SessionSummaryModel> history, double avg) {
    final recentSessions = history.take(3).toList();
    final prevSessions = history.skip(3).take(3).toList();
    final recentAvg = recentSessions.isEmpty ? 0.0 : recentSessions.map((e) => e.averageEngagement).reduce((a, b) => a + b) / recentSessions.length;
    final prevAvg = prevSessions.isEmpty ? recentAvg : prevSessions.map((e) => e.averageEngagement).reduce((a, b) => a + b) / prevSessions.length;
    final delta = recentAvg - prevAvg;

    return _CollapsibleSection(
      title: "Statistics",
      icon: Icons.analytics_outlined,
      isExpanded: _isStatisticsExpanded,
      onToggle: () => setState(() => _isStatisticsExpanded = !_isStatisticsExpanded),
      child: Wrap(
        spacing: 12,
        runSpacing: 12,
        children: [
          _StatTile(title: "Avg Engagement", value: "${avg.toStringAsFixed(1)}%", icon: Icons.insights_rounded),
          _StatTile(title: "Sessions", value: "${history.length}", icon: Icons.history_rounded),
          _StatTile(
            title: "Trend (Last 3)", 
            value: "${delta >= 0 ? '+' : ''}${delta.toStringAsFixed(1)}%", 
            icon: delta >= 0 ? Icons.trending_up_rounded : Icons.trending_down_rounded,
            color: delta >= 0 ? Colors.green : Colors.red,
          ),
          _StatTile(
            title: "Best Score", 
            value: history.isEmpty ? "--" : "${history.map((e) => e.averageEngagement).reduce((a, b) => a > b ? a : b).toStringAsFixed(0)}%", 
            icon: Icons.emoji_events_rounded,
          ),
        ],
      ),
    );
  }

  Widget _buildAdvanceAnalytics(ThemeData theme, List<SessionSummaryModel> history) {
    return _CollapsibleSection(
      title: "Advanced Analytics",
      icon: Icons.auto_graph_rounded,
      isExpanded: _isAdvanceAnalyticsExpanded,
      onToggle: () => setState(() => _isAdvanceAnalyticsExpanded = !_isAdvanceAnalyticsExpanded),
      child: Column(
        children: [
          SubjectEngagementTimeChart(history: history),
          const Divider(height: 32),
          SubjectSectionComparisonChart(history: history),
        ],
      ),
    );
  }

  Widget _buildTrendSection(ThemeData theme, List<SessionSummaryModel> history) {
    return _CollapsibleSection(
      title: "Engagement Trend",
      icon: Icons.show_chart_rounded,
      isExpanded: _isTrendExpanded,
      onToggle: () => setState(() => _isTrendExpanded = !_isTrendExpanded),
      child: SubjectEngagementChart(sessions: history),
    );
  }

  Widget _buildSectionsHeader(ThemeData theme) {
    return Row(
      children: [
        Icon(Icons.groups_rounded, size: 20, color: theme.colorScheme.primary),
        const SizedBox(width: 8),
        const Text("Class Sections", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildSectionTile(BuildContext context, SectionModel section, List<SessionSummaryModel> history, bool isAssigned) {
    final theme = Theme.of(context);
    final sectionSessions = history.where((s) => s.sectionId == section.id).toList();
    final avg = sectionSessions.isEmpty ? null : sectionSessions.map((e) => e.averageEngagement).reduce((a, b) => a + b) / sectionSessions.length;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        title: Text(section.name, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(avg == null ? "No data yet" : "Avg Engagement: ${avg.toStringAsFixed(1)}%"),
        trailing: FilledButton(
          onPressed: isAssigned ? () => widget.onStartMonitoring(section) : null,
          child: Text(isAssigned ? "Start" : "Locked"),
        ),
      ),
    );
  }
}

class _CollapsibleSection extends StatelessWidget {
  final String title;
  final IconData icon;
  final bool isExpanded;
  final VoidCallback onToggle;
  final Widget child;

  const _CollapsibleSection({required this.title, required this.icon, required this.isExpanded, required this.onToggle, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(border: Border.all(color: Theme.of(context).dividerColor.withOpacity(0.2)), borderRadius: BorderRadius.circular(16)),
      child: Column(
        children: [
          ListTile(
            leading: Icon(icon, color: Theme.of(context).colorScheme.primary),
            title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
            trailing: Icon(isExpanded ? Icons.expand_less : Icons.expand_more),
            onTap: onToggle,
          ),
          if (isExpanded) Padding(padding: const EdgeInsets.all(12), child: child),
        ],
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color? color;

  const _StatTile({required this.title, required this.value, required this.icon, this.color});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: (MediaQuery.of(context).size.width - 60) / 2,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: theme.colorScheme.surfaceContainerLow, borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: color ?? theme.colorScheme.primary),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          Text(title, style: theme.textTheme.labelSmall),
        ],
      ),
    );
  }
}
