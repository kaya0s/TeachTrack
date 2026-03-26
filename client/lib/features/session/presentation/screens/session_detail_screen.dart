import 'dart:typed_data';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:teachtrack/features/session/domain/models/session_models.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';
import '../widgets/behavior_trend_chart.dart';

class SessionDetailScreen extends StatefulWidget {
  final SessionSummaryModel session;

  const SessionDetailScreen({super.key, required this.session});

  @override
  State<SessionDetailScreen> createState() => _SessionDetailScreenState();
}

class _SessionDetailScreenState extends State<SessionDetailScreen>
    with TickerProviderStateMixin {
  late AnimationController _chartAnimController;
  late Animation<double> _chartAnim;

  SessionMetricsModel? _metrics;
  bool _loading = true;
  String? _error;

  // Touch index for pie chart
  int _touchedIndex = -1;

  @override
  void initState() {
    super.initState();
    _chartAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _chartAnim = CurvedAnimation(
      parent: _chartAnimController,
      curve: Curves.easeOutBack,
    );
    _loadMetrics();
  }

  @override
  void dispose() {
    _chartAnimController.dispose();
    super.dispose();
  }

  Future<void> _loadMetrics() async {
    try {
      final metrics = await context
          .read<SessionProvider>()
          .fetchSessionMetricsById(widget.session.id);
      if (mounted) {
        setState(() {
          _metrics = metrics;
          _loading = false;
        });
        _chartAnimController.forward();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  Color _engColor(double v) {
    if (v >= 70) return const Color(0xFF00C9A7);
    if (v >= 45) return const Color(0xFFFFB300);
    return const Color(0xFFFF6B6B);
  }

  String _engLabel(double v) {
    if (v >= 70) return 'High';
    if (v >= 45) return 'Moderate';
    return 'Low';
  }

  String _formatDuration(DateTime start, DateTime? end) {
    if (end == null) return 'In progress';
    final diff = end.difference(start);
    if (diff.inHours > 0) return '${diff.inHours}h ${diff.inMinutes % 60}m';
    return '${diff.inMinutes} min';
  }

  // ── export ──────────────────────────────────────────────────────────────────

  void _showExportSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _ExportBottomSheet(
        session: widget.session,
        metrics: _metrics,
      ),
    );
  }

  // ── build ────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final s = widget.session;
    final eng = s.averageEngagement;
    final engColor = _engColor(eng);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            backgroundColor: theme.colorScheme.primary,
            foregroundColor: theme.colorScheme.onPrimary,
            iconTheme: IconThemeData(color: theme.colorScheme.onPrimary),
            leading: IconButton(
              icon: Icon(Icons.arrow_back_ios_new_rounded,
                  color: theme.colorScheme.onPrimary),
              onPressed: () => Navigator.of(context).pop(),
            ),
            title: Text(
              s.subjectName,
              style: TextStyle(
                color: theme.colorScheme.onPrimary,
                fontWeight: FontWeight.w800,
                fontSize: 18,
              ),
            ),
            actions: [
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: ElevatedButton.icon(
                  onPressed: _metrics == null
                      ? null
                      : () => _showExportSheet(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: theme.colorScheme.primary,
                    elevation: 0,
                    shadowColor: Colors.transparent,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20)),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 8),
                  ),
                  icon: const Icon(Icons.upload_rounded, size: 18),
                  label: const Text('Export',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverToBoxAdapter(
              child: _loading
                  ? const _LoadingView()
                  : _error != null
                      ? _ErrorView(error: _error!, onRetry: _loadMetrics)
                      : _Content(
                          session: s,
                          metrics: _metrics!,
                          chartAnim: _chartAnim,
                          touchedIndex: _touchedIndex,
                          onTouch: (i) => setState(() => _touchedIndex = i),
                          engColor: engColor,
                          engLabel: _engLabel(eng),
                          isDark: isDark,
                          theme: theme,
                          formatDuration: _formatDuration,
                        ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
        ],
      ),
    );
  }
}

// ── Loading & Error ──────────────────────────────────────────────────────────

class _LoadingView extends StatelessWidget {
  const _LoadingView();
  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      height: 300,
      child: Center(child: CircularProgressIndicator()),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String error;
  final VoidCallback onRetry;
  const _ErrorView({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Column(
        children: [
          Icon(Icons.error_outline_rounded,
              size: 48, color: theme.colorScheme.error),
          const SizedBox(height: 12),
          const Text('Failed to load session details',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 8),
          Text(error,
              textAlign: TextAlign.center,
              style: TextStyle(color: theme.colorScheme.secondary)),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}

// ── Main Content ─────────────────────────────────────────────────────────────

class _Content extends StatelessWidget {
  final SessionSummaryModel session;
  final SessionMetricsModel metrics;
  final Animation<double> chartAnim;
  final int touchedIndex;
  final ValueChanged<int> onTouch;
  final Color engColor;
  final String engLabel;
  final bool isDark;
  final ThemeData theme;
  final String Function(DateTime, DateTime?) formatDuration;

  const _Content({
    required this.session,
    required this.metrics,
    required this.chartAnim,
    required this.touchedIndex,
    required this.onTouch,
    required this.engColor,
    required this.engLabel,
    required this.isDark,
    required this.theme,
    required this.formatDuration,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Metadata card ─────────────────────────────────────────────────
        _MetadataCard(
          session: session,
          metrics: metrics,
          theme: theme,
          engColor: engColor,
          engLabel: engLabel,
          formatDuration: formatDuration,
        ),
        const SizedBox(height: 16),

        // ── Engagement meter ──────────────────────────────────────────────
        _EngagementCard(
          engagement: session.averageEngagement,
          engColor: engColor,
          engLabel: engLabel,
          theme: theme,
        ),
        const SizedBox(height: 16),

        // ── Behavior Distribution chart ──────────────────────────────────
        _BehaviorChartCard(
          metrics: metrics,
          chartAnim: chartAnim,
          touchedIndex: touchedIndex,
          onTouch: onTouch,
          theme: theme,
          isDark: isDark,
        ),
        const SizedBox(height: 16),

        // ── Trend chart ───────────────────────────────────────────────────
        BehaviorTrendChart(metrics: metrics),
        const SizedBox(height: 16),

        // ── KPI grid ──────────────────────────────────────────────────────
        _KpiGrid(metrics: metrics, theme: theme),
      ],
    );
  }
}

// ── Metadata Card ────────────────────────────────────────────────────────────

class _MetadataCard extends StatelessWidget {
  final SessionSummaryModel session;
  final SessionMetricsModel metrics;
  final ThemeData theme;
  final Color engColor;
  final String engLabel;
  final String Function(DateTime, DateTime?) formatDuration;

  const _MetadataCard({
    required this.session,
    required this.metrics,
    required this.theme,
    required this.engColor,
    required this.engLabel,
    required this.formatDuration,
  });

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('MMM d, yyyy · h:mm a');
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.info_outline_rounded,
                    color: theme.colorScheme.primary, size: 18),
              ),
              const SizedBox(width: 10),
              Text(
                'Session Info',
                style: theme.textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _InfoRow(
            icon: Icons.class_rounded,
            label: 'Subject',
            value: session.subjectName,
            theme: theme,
          ),
          _InfoRow(
            icon: Icons.groups_rounded,
            label: 'Section',
            value: session.sectionName,
            theme: theme,
          ),
          _InfoRow(
            icon: Icons.calendar_today_rounded,
            label: 'Date',
            value: fmt.format(session.startTime),
            theme: theme,
          ),
          _InfoRow(
            icon: Icons.timer_rounded,
            label: 'Duration',
            value: formatDuration(session.startTime, session.endTime),
            theme: theme,
          ),
          _InfoRow(
            icon: Icons.people_rounded,
            label: 'Students',
            value: '${metrics.studentsPresent} present',
            theme: theme,
          ),
          _InfoRow(
            icon: Icons.bar_chart_rounded,
            label: 'Total Logs',
            value: '${metrics.totalLogs} data points',
            theme: theme,
            isLast: true,
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final ThemeData theme;
  final bool isLast;
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.theme,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            children: [
              Icon(icon, size: 16, color: theme.colorScheme.secondary),
              const SizedBox(width: 10),
              Text(
                label,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.secondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              Flexible(
                child: Text(
                  value,
                  style: theme.textTheme.bodyMedium
                      ?.copyWith(fontWeight: FontWeight.w600),
                  textAlign: TextAlign.end,
                  maxLines: 2,
                ),
              ),
            ],
          ),
        ),
        if (!isLast) Divider(height: 1, color: theme.dividerColor),
      ],
    );
  }
}

// ── Engagement Card ──────────────────────────────────────────────────────────

class _EngagementCard extends StatelessWidget {
  final double engagement;
  final Color engColor;
  final String engLabel;
  final ThemeData theme;
  const _EngagementCard({
    required this.engagement,
    required this.engColor,
    required this.engLabel,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    final pct = (engagement / 100).clamp(0.0, 1.0);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                '${engagement.toStringAsFixed(1)}%',
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: engColor,
                ),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: engColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  engLabel,
                  style: TextStyle(
                    color: engColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Average Engagement Score',
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.secondary),
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: pct),
              duration: const Duration(milliseconds: 1200),
              curve: Curves.easeOutCubic,
              builder: (_, v, __) => LinearProgressIndicator(
                value: v,
                minHeight: 12,
                backgroundColor: engColor.withValues(alpha: 0.12),
                valueColor: AlwaysStoppedAnimation<Color>(engColor),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Behavior Chart Card ──────────────────────────────────────────────────────

class _BehaviorChartCard extends StatelessWidget {
  final SessionMetricsModel metrics;
  final Animation<double> chartAnim;
  final int touchedIndex;
  final ValueChanged<int> onTouch;
  final ThemeData theme;
  final bool isDark;

  const _BehaviorChartCard({
    required this.metrics,
    required this.chartAnim,
    required this.touchedIndex,
    required this.onTouch,
    required this.theme,
    required this.isDark,
  });

  static const _behaviorColors = [
    Color(0xFF00C9A7), // On Task
    Color(0xFFFF6B6B), // Sleeping
    Color(0xFFFFB300), // Using Phone
    Color(0xFF6C63FF), // offTask
    Color(0xFF90A4AE), // Not Visible
  ];

  static const _behaviorLabels = [
    'On Task',
    'Sleeping',
    'Phone',
    'Off Task',
    'Not Visible',
  ];

  @override
  Widget build(BuildContext context) {
    // Aggregate from recent logs
    int onTask = 0, sleeping = 0, phone = 0, offTask = 0, notVisible = 0;
    for (final log in metrics.recentLogs) {
      onTask += log.onTask;
      sleeping += log.sleeping;
      phone += log.usingPhone;
      offTask += log.offTask;
      notVisible += log.notVisible;
    }
    final values = [
      onTask.toDouble(),
      sleeping.toDouble(),
      phone.toDouble(),
      offTask.toDouble(),
      notVisible.toDouble(),
    ];
    final total = values.fold(0.0, (a, b) => a + b);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF6C63FF).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.pie_chart_rounded,
                    color: Color(0xFF6C63FF), size: 18),
              ),
              const SizedBox(width: 10),
              Text(
                'Behavior Distribution',
                style: theme.textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 20),
          if (total == 0)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text('No behavior data available',
                    style: TextStyle(color: Colors.grey)),
              ),
            )
          else
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                SizedBox(
                  width: 160,
                  height: 160,
                  child: AnimatedBuilder(
                    animation: chartAnim,
                    builder: (context, child) {
                      return PieChart(
                        PieChartData(
                          pieTouchData: PieTouchData(
                            touchCallback:
                                (FlTouchEvent event, pieTouchResponse) {
                              if (event is FlTapUpEvent ||
                                  event is FlPointerHoverEvent) {
                                final idx = pieTouchResponse
                                    ?.touchedSection
                                    ?.touchedSectionIndex;
                                onTouch(idx ?? -1);
                              }
                              if (event is FlLongPressEnd ||
                                  event is FlPointerExitEvent) {
                                onTouch(-1);
                              }
                            },
                          ),
                          sectionsSpace: 3,
                          centerSpaceRadius: 40,
                          sections: List.generate(values.length, (i) {
                            if (values[i] == 0) return null;
                            final isTouched = i == touchedIndex;
                            final pct = (values[i] / total * 100);
                            return PieChartSectionData(
                              value: values[i] * chartAnim.value,
                              color: _behaviorColors[i],
                              radius: isTouched ? 44 : 36,
                              title: isTouched
                                  ? '${pct.toStringAsFixed(1)}%'
                                  : '',
                              titleStyle: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 11,
                              ),
                              badgeWidget: null,
                            );
                          }).whereType<PieChartSectionData>().toList(),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: List.generate(values.length, (i) {
                      if (values[i] == 0) return const SizedBox.shrink();
                      final pct = values[i] / total * 100;
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 5),
                        child: Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                color: _behaviorColors[i],
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _behaviorLabels[i],
                                style: theme.textTheme.bodySmall?.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Text(
                              '${values[i].toInt()} (${pct.toStringAsFixed(0)}%)',
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: theme.colorScheme.secondary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

// ── KPI Grid ─────────────────────────────────────────────────────────────────

class _KpiGrid extends StatelessWidget {
  final SessionMetricsModel metrics;
  final ThemeData theme;
  const _KpiGrid({required this.metrics, required this.theme});

  @override
  Widget build(BuildContext context) {
    // Aggregate totals from recent logs
    int onTask = 0, sleeping = 0, phone = 0, offTask = 0;
    for (final log in metrics.recentLogs) {
      onTask += log.onTask;
      sleeping += log.sleeping;
      phone += log.usingPhone;
      offTask += log.offTask;
    }

    final count = metrics.totalLogs > 0 ? metrics.totalLogs : 1;
    final avgOnTask = onTask / count;
    final avgSleeping = sleeping / count;
    final avgPhone = phone / count;
    final avgOffTask = offTask / count;

    final tiles = [
      _KpiTile(
          icon: Icons.task_alt_rounded,
          label: 'On Task',
          value: '$onTask',
          average: avgOnTask,
          color: const Color(0xFF00C9A7)),
      _KpiTile(
          icon: Icons.bedtime_rounded,
          label: 'Sleeping',
          value: '$sleeping',
          average: avgSleeping,
          color: const Color(0xFFFF6B6B)),
      _KpiTile(
          icon: Icons.smartphone_rounded,
          label: 'Phone Use',
          value: '$phone',
          average: avgPhone,
          color: const Color(0xFFFFB300)),
      _KpiTile(
          icon: Icons.sentiment_dissatisfied_rounded,
          label: 'Off Task',
          value: '$offTask',
          average: avgOffTask,
          color: const Color(0xFF6C63FF)),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.5,
      ),
      itemCount: tiles.length,
      itemBuilder: (_, i) => tiles[i],
    );
  }
}

class _KpiTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final double average;
  final Color color;
  const _KpiTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.average,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  value,
                  style: theme.textTheme.titleLarge
                      ?.copyWith(fontWeight: FontWeight.w800, height: 1.1),
                ),
                Text(
                  'Avg: ${average.toStringAsFixed(1)}',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: color,
                    fontWeight: FontWeight.w700,
                    fontSize: 10,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  label,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.secondary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Export Bottom Sheet ───────────────────────────────────────────────────────

class _ExportBottomSheet extends StatefulWidget {
  final SessionSummaryModel session;
  final SessionMetricsModel? metrics;

  const _ExportBottomSheet({required this.session, required this.metrics});

  @override
  State<_ExportBottomSheet> createState() => _ExportBottomSheetState();
}

class _ExportBottomSheetState extends State<_ExportBottomSheet> {
  bool _exporting = false;

  Future<void> _exportCsv() async {
    setState(() => _exporting = true);
    try {
      await _doCsvExport();
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ CSV exported successfully'),
            backgroundColor: Color(0xFF00C9A7),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Export failed: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  Future<void> _doCsvExport() async {
    final s = widget.session;
    final m = widget.metrics;
    final fmt = DateFormat('yyyy-MM-dd HH:mm:ss');

    final buffer = StringBuffer();
    buffer.writeln('TeachTrack Session Export');
    buffer.writeln('Generated: ${fmt.format(DateTime.now())}');
    buffer.writeln('');
    buffer.writeln('--- SESSION DETAILS ---');
    buffer.writeln('Subject,${s.subjectName}');
    buffer.writeln('Section,${s.sectionName}');
    buffer.writeln('Start Time,${fmt.format(s.startTime)}');
    buffer.writeln('End Time,${s.endTime != null ? fmt.format(s.endTime!) : "In Progress"}');
    buffer.writeln('Average Engagement,${s.averageEngagement.toStringAsFixed(2)}%');

    if (m != null) {
      buffer.writeln('Students Present,${m.studentsPresent}');
      buffer.writeln('Total Logs,${m.totalLogs}');
      buffer.writeln('');
      buffer.writeln('--- BEHAVIOR LOGS ---');
      buffer.writeln('Timestamp,On Task,Sleeping,Using Phone,off_task,Not Visible,Total Detected');
      for (final log in m.recentLogs) {
        buffer.writeln(
          '${fmt.format(log.timestamp)},${log.onTask},${log.sleeping},${log.usingPhone},${log.offTask},${log.notVisible},${log.totalDetected}',
        );
      }
    }

    // Share/print the CSV data
    final bytes = Uint8List.fromList(buffer.toString().codeUnits);
    await Printing.sharePdf(
      bytes: bytes,
      filename: 'session_${s.id}_${DateFormat("yyyyMMdd").format(s.startTime)}.csv',
    );
  }

  Future<void> _exportPdf() async {
    setState(() => _exporting = true);
    try {
      final pdfBytes = await _buildPdf();
      if (mounted) {
        Navigator.pop(context);
        await Printing.sharePdf(
          bytes: pdfBytes,
          filename:
              'session_report_${widget.session.id}_${DateFormat("yyyyMMdd").format(widget.session.startTime)}.pdf',
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('✅ PDF report ready'),
              backgroundColor: Color(0xFF00C9A7),
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Export failed: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  Future<Uint8List> _buildPdf() async {
    final s = widget.session;
    final m = widget.metrics;
    final pdf = pw.Document();
    final fmt = DateFormat('MMM d, yyyy · h:mm a');
    final fmtShort = DateFormat('yyyy-MM-dd HH:mm');

    // Compute behavior totals
    int onTask = 0, sleeping = 0, phone = 0, offTask = 0, notVisible = 0;
    if (m != null) {
      for (final log in m.recentLogs) {
        onTask += log.onTask;
        sleeping += log.sleeping;
        phone += log.usingPhone;
        offTask += log.offTask;
        notVisible += log.notVisible;
      }
    }

    final engColor = s.averageEngagement >= 70
        ? PdfColors.green700
        : s.averageEngagement >= 45
            ? PdfColors.orange700
            : PdfColors.red700;

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        header: (ctx) => pw.Container(
          padding: const pw.EdgeInsets.only(bottom: 16),
          decoration: const pw.BoxDecoration(
            border: pw.Border(
              bottom: pw.BorderSide(color: PdfColors.indigo700, width: 2),
            ),
          ),
          child: pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text(
                'TeachTrack',
                style: pw.TextStyle(
                  fontSize: 20,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.indigo700,
                ),
              ),
              pw.Text(
                'Session Report',
                style: pw.TextStyle(fontSize: 14, color: PdfColors.grey700),
              ),
            ],
          ),
        ),
        footer: (ctx) => pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text(
              'Generated: ${fmt.format(DateTime.now())}',
              style: pw.TextStyle(fontSize: 10, color: PdfColors.grey600),
            ),
            pw.Text(
              'Page ${ctx.pageNumber} of ${ctx.pagesCount}',
              style: pw.TextStyle(fontSize: 10, color: PdfColors.grey600),
            ),
          ],
        ),
        build: (ctx) => [
          // ── Title ─────────────────────────────────────────────────────────
          pw.SizedBox(height: 24),
          pw.Text(
            s.subjectName,
            style: pw.TextStyle(
              fontSize: 26,
              fontWeight: pw.FontWeight.bold,
              color: PdfColors.indigo900,
            ),
          ),
          pw.SizedBox(height: 6),
          pw.Text(
            'Section: ${s.sectionName}',
            style: pw.TextStyle(fontSize: 15, color: PdfColors.grey700),
          ),
          pw.SizedBox(height: 24),

          // ── Session metadata ───────────────────────────────────────────────
          pw.Container(
            padding: const pw.EdgeInsets.all(16),
            decoration: pw.BoxDecoration(
              color: PdfColors.indigo50,
              borderRadius: pw.BorderRadius.circular(10),
              border: pw.Border.all(color: PdfColors.indigo200),
            ),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Text('Session Details',
                    style: pw.TextStyle(
                        fontWeight: pw.FontWeight.bold,
                        fontSize: 13,
                        color: PdfColors.indigo700)),
                pw.SizedBox(height: 10),
                pw.Row(children: [
                  _pdfKeyVal('Date', fmt.format(s.startTime)),
                ]),
                pw.SizedBox(height: 4),
                pw.Row(children: [
                  _pdfKeyVal(
                      'Duration',
                      s.endTime != null
                          ? '${s.endTime!.difference(s.startTime).inMinutes} min'
                          : 'In progress'),
                ]),
                if (m != null) ...[
                  pw.SizedBox(height: 4),
                  pw.Row(children: [
                    _pdfKeyVal(
                        'Students Present', '${m.studentsPresent}'),
                  ]),
                  pw.SizedBox(height: 4),
                  pw.Row(children: [
                    _pdfKeyVal('Total Data Points', '${m.totalLogs}'),
                  ]),
                ],
              ],
            ),
          ),
          pw.SizedBox(height: 20),

          // ── Engagement ─────────────────────────────────────────────────────
          pw.Container(
            padding: const pw.EdgeInsets.all(16),
            decoration: pw.BoxDecoration(
              color: PdfColors.white,
              borderRadius: pw.BorderRadius.circular(10),
              border: pw.Border.all(color: PdfColors.grey300),
            ),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('Average Engagement',
                        style: pw.TextStyle(
                            fontSize: 12, color: PdfColors.grey600)),
                    pw.SizedBox(height: 4),
                    pw.Text(
                      '${s.averageEngagement.toStringAsFixed(1)}%',
                      style: pw.TextStyle(
                        fontSize: 28,
                        fontWeight: pw.FontWeight.bold,
                        color: engColor,
                      ),
                    ),
                  ],
                ),
                pw.Container(
                  padding: const pw.EdgeInsets.symmetric(
                      horizontal: 14, vertical: 6),
                  decoration: pw.BoxDecoration(
                    color: s.averageEngagement >= 70
                        ? PdfColors.green100
                        : s.averageEngagement >= 45
                            ? PdfColors.orange100
                            : PdfColors.red100,
                    borderRadius: pw.BorderRadius.circular(20),
                  ),
                  child: pw.Text(
                    s.averageEngagement >= 70
                        ? 'High'
                        : s.averageEngagement >= 45
                            ? 'Moderate'
                            : 'Low',
                    style: pw.TextStyle(
                      color: engColor,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          pw.SizedBox(height: 20),

          // ── Behavior summary ───────────────────────────────────────────────
          if (m != null) ...[
            pw.Text('Behavior Summary',
                style: pw.TextStyle(
                    fontWeight: pw.FontWeight.bold,
                    fontSize: 14,
                    color: PdfColors.indigo900)),
            pw.SizedBox(height: 10),
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey300),
              children: [
                pw.TableRow(
                  decoration: const pw.BoxDecoration(color: PdfColors.indigo50),
                  children: [
                    _pdfTableHeader('Behavior'),
                    _pdfTableHeader('Count'),
                  ],
                ),
                _pdfTableRow('On Task', '$onTask'),
                _pdfTableRow('Sleeping', '$sleeping'),
                _pdfTableRow('Using Phone', '$phone'),
                _pdfTableRow('Off Task', '$offTask'),
                _pdfTableRow('Not Visible', '$notVisible'),
              ],
            ),
            pw.SizedBox(height: 20),

            // Log table
            if (m.recentLogs.isNotEmpty) ...[
              pw.Text('Behavior Logs',
                  style: pw.TextStyle(
                      fontWeight: pw.FontWeight.bold,
                      fontSize: 14,
                      color: PdfColors.indigo900)),
              pw.SizedBox(height: 10),
              pw.Table(
                border: pw.TableBorder.all(color: PdfColors.grey300),
                columnWidths: {
                  0: const pw.FlexColumnWidth(2),
                  1: const pw.FlexColumnWidth(1),
                  2: const pw.FlexColumnWidth(1),
                  3: const pw.FlexColumnWidth(1),
                  4: const pw.FlexColumnWidth(1),
                  5: const pw.FlexColumnWidth(1),
                },
                children: [
                  pw.TableRow(
                    decoration:
                        const pw.BoxDecoration(color: PdfColors.indigo50),
                    children: [
                      _pdfTableHeader('Time'),
                      _pdfTableHeader('On Task'),
                      _pdfTableHeader('Sleep'),
                      _pdfTableHeader('Phone'),
                      _pdfTableHeader('Off Task'),
                      _pdfTableHeader('N/V'),
                    ],
                  ),
                  ...m.recentLogs.take(50).map(
                        (log) => pw.TableRow(children: [
                          _pdfTableCell(fmtShort.format(log.timestamp)),
                          _pdfTableCell('${log.onTask}'),
                          _pdfTableCell('${log.sleeping}'),
                          _pdfTableCell('${log.usingPhone}'),
                          _pdfTableCell('${log.offTask}'),
                          _pdfTableCell('${log.notVisible}'),
                        ]),
                      ),
                ],
              ),
            ],
          ],
        ],
      ),
    );

    return pdf.save();
  }

  pw.Widget _pdfKeyVal(String key, String val) {
    return pw.Row(children: [
      pw.Text('$key: ',
          style: pw.TextStyle(
              fontWeight: pw.FontWeight.bold, color: PdfColors.indigo900)),
      pw.Text(val, style: const pw.TextStyle(color: PdfColors.grey800)),
    ]);
  }

  pw.Widget _pdfTableHeader(String text) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      child: pw.Text(
        text,
        style: pw.TextStyle(
            fontWeight: pw.FontWeight.bold, color: PdfColors.indigo700),
      ),
    );
  }

  pw.TableRow _pdfTableRow(String label, String value) {
    return pw.TableRow(children: [
      _pdfTableCell(label),
      _pdfTableCell(value),
    ]);
  }

  pw.Widget _pdfTableCell(String text) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      child: pw.Text(text, style: const pw.TextStyle(fontSize: 11)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 12),
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: theme.dividerColor,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
          const SizedBox(height: 20),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Row(
              children: [
                Icon(Icons.upload_rounded,
                    color: theme.colorScheme.primary, size: 24),
                const SizedBox(width: 12),
                Text(
                  'Export Session Report',
                  style: theme.textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              'Choose a format to download or share your session report.',
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.secondary),
            ),
          ),
          const SizedBox(height: 20),
          if (_exporting)
            Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                children: [
                  CircularProgressIndicator(
                      color: theme.colorScheme.primary),
                  const SizedBox(height: 12),
                  Text('Generating report...',
                      style: theme.textTheme.bodySmall
                          ?.copyWith(color: theme.colorScheme.secondary)),
                ],
              ),
            )
          else ...[
            _ExportOption(
              icon: Icons.table_chart_rounded,
              title: 'Export as CSV',
              subtitle: 'Raw data — all behavior logs in spreadsheet format',
              color: const Color(0xFF00C9A7),
              onTap: _exportCsv,
            ),
            Divider(height: 1, indent: 24, endIndent: 24,
                color: theme.dividerColor),
            _ExportOption(
              icon: Icons.picture_as_pdf_rounded,
              title: 'Export as PDF',
              subtitle: 'Formatted report with charts and session summary',
              color: const Color(0xFFFF6B6B),
              onTap: _exportPdf,
            ),
          ],
          const SizedBox(height: 12),
          SafeArea(child: const SizedBox()),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

class _ExportOption extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _ExportOption({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: theme.textTheme.bodyLarge
                          ?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  Text(subtitle,
                      style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.secondary)),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded,
                color: theme.colorScheme.secondary),
          ],
        ),
      ),
    );
  }
}


