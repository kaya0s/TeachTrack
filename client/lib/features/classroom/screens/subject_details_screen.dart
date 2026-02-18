import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../data/models/classroom_session_models.dart';
import '../provider/classroom_provider.dart';
import '../../session/provider/session_provider.dart';
import '../../session/screens/monitoring_screen.dart';
import '../../../core/config/env_config.dart';

class SubjectDetailsScreen extends StatefulWidget {
  final SubjectModel subject;

  const SubjectDetailsScreen({super.key, required this.subject});

  @override
  State<SubjectDetailsScreen> createState() => _SubjectDetailsScreenState();
}

class _SubjectDetailsScreenState extends State<SubjectDetailsScreen> {
  final DateFormat _dateFormat = DateFormat('MMM d, yyyy h:mm a');
  int _selectedTabIndex = 0;
  double _historyScrollOffset = 0;

  void _onHistoryScrolled(double offset) {
    if (_selectedTabIndex != 1) return;
    final clamped = offset < 0 ? 0.0 : offset;
    if ((_historyScrollOffset - clamped).abs() < 1) return;
    setState(() => _historyScrollOffset = clamped);
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final session = context.read<SessionProvider>();
      if (session.history.isEmpty && !session.historyLoading) {
        session.fetchSessionHistory(includeActive: false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final subject = widget.subject;
    return Scaffold(
      appBar: AppBar(
        title: Text(subject.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showAddSectionDialog(context),
            tooltip: "Add Section",
          ),
        ],
      ),
      body: DefaultTabController(
        length: 2,
        child: Consumer2<ClassroomProvider, SessionProvider>(
          builder: (context, classroom, session, child) {
            final currentSubject = classroom.subjects.firstWhere(
              (s) => s.id == subject.id,
              orElse: () => subject,
            );
            final imageUrl = _resolveImageUrl(currentSubject.coverImageUrl);
            final history = session.history
                .where((entry) => entry.subjectId == currentSubject.id)
                .toList();
            final collapseProgress = _selectedTabIndex == 1
                ? (_historyScrollOffset / 140).clamp(0.0, 1.0)
                : 0.0;

            return Column(
              children: [
                _SubjectHeader(
                  subject: currentSubject,
                  imageUrl: imageUrl,
                  collapseProgress: collapseProgress,
                ),
                TabBar(
                  onTap: (index) {
                    setState(() {
                      _selectedTabIndex = index;
                      if (index != 1) _historyScrollOffset = 0;
                    });
                  },
                  tabs: [
                    Tab(text: 'Overview'),
                    Tab(text: 'History'),
                  ],
                ),
                Expanded(
                  child: TabBarView(
                    children: [
                      _OverviewTab(
                        subject: currentSubject,
                        onAddSection: () => _showAddSectionDialog(context),
                        onStartMonitoring: (section) =>
                            _startMonitoring(context, currentSubject, section),
                      ),
                      _HistoryTab(
                        history: history,
                        isLoading:
                            session.historyLoading && session.history.isEmpty,
                        error: session.historyError,
                        dateFormat: _dateFormat,
                        onRetry: () =>
                            session.fetchSessionHistory(includeActive: false),
                        onScroll: _onHistoryScrolled,
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  void _showAddSectionDialog(BuildContext context) {
    final nameController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Add New Section"),
        content: TextField(
          controller: nameController,
          decoration: const InputDecoration(
            labelText: "Section Name",
            hintText: "e.g. Section A, Grade 10-B",
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.isNotEmpty) {
                final success =
                    await context.read<ClassroomProvider>().addSection(
                          widget.subject.id,
                          nameController.text,
                        );
                if (success && context.mounted) {
                  Navigator.pop(context);
                }
              }
            },
            child: const Text("Save"),
          ),
        ],
      ),
    );
  }

  void _startMonitoring(
      BuildContext context, SubjectModel subject, SectionModel section) async {
    final sessionProvider = context.read<SessionProvider>();
    final studentsPresent = await _askStudentsPresent(context);
    if (studentsPresent == null) {
      return;
    }

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    final success = await sessionProvider.startSession(
      subject.id,
      section.id,
      studentsPresent,
    );

    if (context.mounted) {
      Navigator.pop(context);

      if (success) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) =>
                MonitoringScreen(sessionId: sessionProvider.activeSession!.id),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content:
                  Text("Failed to start session: ${sessionProvider.error}")),
        );
      }
    }
  }

  Future<int?> _askStudentsPresent(BuildContext context) async {
    final controller = TextEditingController();
    return showDialog<int>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Students Present'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Enter number of students present',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final value = int.tryParse(controller.text.trim());
              if (value == null || value <= 0) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                      content: Text('Enter a valid number greater than 0.')),
                );
                return;
              }
              Navigator.pop(dialogContext, value);
            },
            child: const Text('Start'),
          ),
        ],
      ),
    );
  }
}

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
          (section) => Container(
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
                  child: Text(
                    section.name,
                    style: Theme.of(context)
                        .textTheme
                        .titleSmall
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
                FilledButton.tonalIcon(
                  style: _startMonitoringButtonStyle(context),
                  onPressed: () => onStartMonitoring(section),
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: const Text('Start Monitoring'),
                ),
              ],
            ),
          ),
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

class _HistoryTab extends StatefulWidget {
  final List<SessionSummaryModel> history;
  final bool isLoading;
  final String? error;
  final DateFormat dateFormat;
  final Future<void> Function() onRetry;
  final ValueChanged<double>? onScroll;

  const _HistoryTab({
    required this.history,
    required this.isLoading,
    required this.error,
    required this.dateFormat,
    required this.onRetry,
    this.onScroll,
  });

  @override
  State<_HistoryTab> createState() => _HistoryTabState();
}

class _HistoryTabState extends State<_HistoryTab> {
  int? _expandedSessionId;
  final Map<int, Future<SessionMetricsModel>> _sessionMetricsFutures = {};
  final DateFormat _tooltipDateFormat = DateFormat('MMM d, yyyy');
  final DateFormat _tooltipTimeFormat = DateFormat('HH:mm:ss');
  bool _filtersOpen = false;
  String _query = '';
  String _sort = 'newest';
  String? _sectionFilter;
  double _minEngagement = 0;
  DateTimeRange? _dateRange;

  String _formatSessionDuration(SessionSummaryModel item) {
    final end = item.endTime ?? DateTime.now();
    final duration = end.difference(item.startTime);
    if (duration.inMinutes < 1) return '${duration.inSeconds}s';
    if (duration.inHours < 1) return '${duration.inMinutes}m';
    final hours = duration.inHours;
    final mins = duration.inMinutes.remainder(60);
    return '${hours}h ${mins}m';
  }

  void _toggleExpanded(int sessionId) {
    setState(() {
      _expandedSessionId = _expandedSessionId == sessionId ? null : sessionId;
      if (_expandedSessionId == sessionId &&
          !_sessionMetricsFutures.containsKey(sessionId)) {
        _sessionMetricsFutures[sessionId] =
            context.read<SessionProvider>().fetchSessionMetricsById(sessionId);
      }
    });
  }

  List<SessionSummaryModel> _filteredHistory(List<SessionSummaryModel> input) {
    var items = [...input];
    if (_query.trim().isNotEmpty) {
      final q = _query.trim().toLowerCase();
      items =
          items.where((s) => s.sectionName.toLowerCase().contains(q)).toList();
    }
    if (_sectionFilter != null && _sectionFilter!.isNotEmpty) {
      items = items.where((s) => s.sectionName == _sectionFilter).toList();
    }
    items = items.where((s) => s.averageEngagement >= _minEngagement).toList();
    if (_dateRange != null) {
      final start = DateTime(_dateRange!.start.year, _dateRange!.start.month,
          _dateRange!.start.day);
      final end = DateTime(_dateRange!.end.year, _dateRange!.end.month,
          _dateRange!.end.day, 23, 59, 59);
      items = items
          .where(
              (s) => !s.startTime.isBefore(start) && !s.startTime.isAfter(end))
          .toList();
    }

    switch (_sort) {
      case 'oldest':
        items.sort((a, b) => a.startTime.compareTo(b.startTime));
        break;
      case 'engagement_high':
        items
            .sort((a, b) => b.averageEngagement.compareTo(a.averageEngagement));
        break;
      case 'engagement_low':
        items
            .sort((a, b) => a.averageEngagement.compareTo(b.averageEngagement));
        break;
      default:
        items.sort((a, b) => b.startTime.compareTo(a.startTime));
    }
    return items;
  }

  Future<void> _copyText(
      BuildContext context, String label, String text) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text('$label copied')));
  }

  String _historyCsv(List<SessionSummaryModel> sessions) {
    final rows = <String>[
      'session_id,section,start_time,end_time,duration_minutes,engagement'
    ];
    for (final s in sessions) {
      final duration =
          s.endTime == null ? 0 : s.endTime!.difference(s.startTime).inMinutes;
      rows.add(
          '${s.id},"${s.sectionName}","${s.startTime.toIso8601String()}","${s.endTime?.toIso8601String() ?? ''}",$duration,${s.averageEngagement.toStringAsFixed(2)}');
    }
    return rows.join('\n');
  }

  String _summaryReport(List<SessionSummaryModel> sessions) {
    if (sessions.isEmpty) return 'No sessions found.';
    final avg =
        sessions.map((e) => e.averageEngagement).reduce((a, b) => a + b) /
            sessions.length;
    final best = sessions
        .reduce((a, b) => a.averageEngagement > b.averageEngagement ? a : b);
    return 'Subject History Summary\n'
        'Sessions: ${sessions.length}\n'
        'Average Engagement: ${avg.toStringAsFixed(1)}%\n'
        'Best: ${best.sectionName} (${best.averageEngagement.toStringAsFixed(1)}%)';
  }

  Future<void> _pickRange() async {
    final now = DateTime.now();
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year - 2),
      lastDate: DateTime(now.year + 1),
      initialDateRange: _dateRange,
    );
    if (picked != null) {
      setState(() => _dateRange = picked);
    }
  }

  Widget _historyChip(BuildContext context, String text, {Color? textColor}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
      ),
      child: Text(
        text,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
      ),
    );
  }

  Color _engagementColor(BuildContext context, double value) {
    if (value >= 70) return const Color(0xFF2E7D32);
    if (value >= 40) return const Color(0xFFF57C00);
    return Theme.of(context).colorScheme.error;
  }

  Widget _buildExpandedSessionAnalytics(
      BuildContext context, SessionSummaryModel item) {
    final future = _sessionMetricsFutures[item.id] ??=
        context.read<SessionProvider>().fetchSessionMetricsById(item.id);

    return FutureBuilder<SessionMetricsModel>(
      future: future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting &&
            !snapshot.hasData) {
          return const SizedBox(
            height: 170,
            child: Center(
              child: CircularProgressIndicator(strokeWidth: 2.3),
            ),
          );
        }

        if (snapshot.hasError) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Failed to load session analytics.',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: () {
                    setState(() {
                      _sessionMetricsFutures[item.id] = context
                          .read<SessionProvider>()
                          .fetchSessionMetricsById(item.id, forceRefresh: true);
                    });
                  },
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        final metrics = snapshot.data;
        if (metrics == null || metrics.recentLogs.isEmpty) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(
              'No timeline data available for this session.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _copyText(
                        context, 'Session CSV', _sessionCsv(item, metrics)),
                    icon: const Icon(Icons.table_chart_rounded, size: 16),
                    label: const Text('Export CSV'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () =>
                        _copyText(context, 'Session report', _insight(metrics)),
                    icon: const Icon(Icons.description_outlined, size: 16),
                    label: const Text('Export Report'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _insight(metrics),
              style: Theme.of(context).textTheme.bodySmall,
            ),
            _buildSessionTimelineChart(context, metrics),
          ],
        );
      },
    );
  }

  String _insight(SessionMetricsModel metrics) {
    if (metrics.recentLogs.length < 2) return 'Collecting trend insights...';
    final logs = [...metrics.recentLogs]
      ..sort((a, b) => a.timestamp.compareTo(b.timestamp));
    int phoneSpikes = 0;
    int sleepingSpikes = 0;
    for (int i = 1; i < logs.length; i++) {
      if ((logs[i].usingPhone - logs[i - 1].usingPhone) >= 2) phoneSpikes++;
      if ((logs[i].sleeping - logs[i - 1].sleeping) >= 2) sleepingSpikes++;
    }
    if (phoneSpikes == 0 && sleepingSpikes == 0) {
      return 'Stable behavior trend with no major spikes detected.';
    }
    return 'Detected spikes: phone $phoneSpikes, sleeping $sleepingSpikes.';
  }

  String _sessionCsv(SessionSummaryModel session, SessionMetricsModel metrics) {
    final rows = <String>[
      'session_id,section,timestamp,on_task,writing,disengaged,sleeping,phone'
    ];
    for (final log in metrics.recentLogs) {
      rows.add(
          '${session.id},"${session.sectionName}","${log.timestamp.toIso8601String()}",${log.onTask},${log.writing},${log.disengagedPosture},${log.sleeping},${log.usingPhone}');
    }
    return rows.join('\n');
  }

  Widget _buildSessionTimelineChart(
      BuildContext context, SessionMetricsModel metrics) {
    final theme = Theme.of(context);
    final logs = [...metrics.recentLogs]
      ..sort((a, b) => a.timestamp.compareTo(b.timestamp));
    final onTaskColor = const Color(0xFF2E7D32);
    final writingColor = const Color(0xFF1565C0);
    final disengagedColor = const Color(0xFF6A1B9A);
    final sleepingColor = const Color(0xFFD32F2F);
    final phoneColor = const Color(0xFFF57C00);

    final onTaskPoints = logs
        .map((log) => FlSpot(
              log.timestamp.millisecondsSinceEpoch.toDouble(),
              log.onTask.toDouble(),
            ))
        .toList();
    final writingPoints = logs
        .map((log) => FlSpot(
              log.timestamp.millisecondsSinceEpoch.toDouble(),
              log.writing.toDouble(),
            ))
        .toList();
    final disengagedPoints = logs
        .map((log) => FlSpot(
              log.timestamp.millisecondsSinceEpoch.toDouble(),
              log.disengagedPosture.toDouble(),
            ))
        .toList();
    final sleepingPoints = logs
        .map((log) => FlSpot(
              log.timestamp.millisecondsSinceEpoch.toDouble(),
              log.sleeping.toDouble(),
            ))
        .toList();
    final phonePoints = logs
        .map((log) => FlSpot(
              log.timestamp.millisecondsSinceEpoch.toDouble(),
              log.usingPhone.toDouble(),
            ))
        .toList();

    final minX = onTaskPoints.first.x;
    final maxRawX = onTaskPoints.last.x;
    final maxX = maxRawX == minX ? minX + 1 : maxRawX;
    final centerX = minX + ((maxX - minX) / 2);
    final allValues = [
      ...onTaskPoints.map((p) => p.y),
      ...writingPoints.map((p) => p.y),
      ...disengagedPoints.map((p) => p.y),
      ...sleepingPoints.map((p) => p.y),
      ...phonePoints.map((p) => p.y),
    ];
    final maxYValue = allValues.reduce((a, b) => a > b ? a : b);
    final maxY = maxYValue < 3 ? 3.0 : maxYValue + 1;
    final phoneSpikeIndexes = <int>{};
    final sleepingSpikeIndexes = <int>{};
    for (int i = 1; i < logs.length; i++) {
      if ((logs[i].usingPhone - logs[i - 1].usingPhone) >= 2) {
        phoneSpikeIndexes.add(i);
      }
      if ((logs[i].sleeping - logs[i - 1].sleeping) >= 2) {
        sleepingSpikeIndexes.add(i);
      }
    }

    LineChartBarData behaviorBar(
      List<FlSpot> spots,
      Color color, {
      Set<int> highlightIndexes = const {},
    }) {
      return LineChartBarData(
        spots: spots,
        isCurved: true,
        color: color,
        barWidth: 2,
        isStrokeCapRound: true,
        dotData: FlDotData(
          show: highlightIndexes.isNotEmpty,
          checkToShowDot: (_, index) => highlightIndexes.contains(index),
          getDotPainter: (spot, percent, barData, index) => FlDotCirclePainter(
            radius: 3,
            color: color,
            strokeWidth: 1.3,
            strokeColor: theme.colorScheme.surface,
          ),
        ),
        belowBarData: BarAreaData(show: false),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 4),
        Text(
          'Behavior Timeline',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          'Hover over the timeline for exact date, time, and values.',
          style: theme.textTheme.bodySmall,
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _historyChip(context, 'On Task', textColor: onTaskColor),
            _historyChip(context, 'Writing', textColor: writingColor),
            _historyChip(context, 'Disengaged', textColor: disengagedColor),
            _historyChip(context, 'Sleeping', textColor: sleepingColor),
            _historyChip(context, 'Phone', textColor: phoneColor),
          ],
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 220,
          child: LineChart(
            LineChartData(
              minX: minX,
              maxX: maxX,
              minY: 0,
              maxY: maxY,
              gridData: const FlGridData(show: false),
              borderData: FlBorderData(
                show: true,
                border: Border(
                  left: BorderSide(color: theme.dividerColor, width: 1),
                  bottom: BorderSide(color: theme.dividerColor, width: 1),
                ),
              ),
              titlesData: FlTitlesData(
                topTitles:
                    const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles:
                    const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 28,
                    interval: 1,
                    getTitlesWidget: (value, meta) => Text(
                      value.toStringAsFixed(0),
                      style: theme.textTheme.labelSmall,
                    ),
                  ),
                ),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 28,
                    getTitlesWidget: (value, meta) {
                      final tolerance = (maxX - minX) * 0.03;
                      if ((value - minX).abs() > tolerance &&
                          (value - centerX).abs() > tolerance &&
                          (value - maxX).abs() > tolerance) {
                        return const SizedBox.shrink();
                      }

                      final timestamp = (value - centerX).abs() <= tolerance
                          ? centerX
                          : (value - minX).abs() <= tolerance
                              ? minX
                              : maxX;
                      final time = DateTime.fromMillisecondsSinceEpoch(
                          timestamp.toInt());

                      return Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(
                          DateFormat('HH:mm').format(time),
                          style: theme.textTheme.labelSmall,
                        ),
                      );
                    },
                  ),
                ),
              ),
              lineTouchData: LineTouchData(
                enabled: true,
                handleBuiltInTouches: true,
                getTouchedSpotIndicator: (barData, spotIndexes) {
                  final isPrimaryIndicator = barData.color == onTaskColor;
                  return spotIndexes
                      .map(
                        (_) => TouchedSpotIndicatorData(
                          FlLine(
                            color: isPrimaryIndicator
                                ? onTaskColor.withOpacity(0.38)
                                : Colors.transparent,
                            strokeWidth: isPrimaryIndicator ? 1 : 0,
                          ),
                          FlDotData(
                            show: true,
                            getDotPainter: (spot, percent, bar, index) =>
                                FlDotCirclePainter(
                              radius: 2.8,
                              color: bar.color ?? theme.colorScheme.primary,
                              strokeWidth: 1.2,
                              strokeColor: theme.colorScheme.surface,
                            ),
                          ),
                        ),
                      )
                      .toList();
                },
                touchTooltipData: LineTouchTooltipData(
                  tooltipBgColor: theme.colorScheme.surface.withOpacity(0.95),
                  fitInsideHorizontally: true,
                  fitInsideVertically: true,
                  getTooltipItems: (items) {
                    final sorted = [...items]
                      ..sort((a, b) => a.barIndex.compareTo(b.barIndex));
                    return sorted.map((spot) {
                      final logIndex = spot.spotIndex.clamp(0, logs.length - 1);
                      final log = logs[logIndex];
                      String metricLine;
                      if (spot.barIndex == 0) {
                        metricLine = 'On Task ${log.onTask}';
                      } else if (spot.barIndex == 1) {
                        metricLine = 'Writing ${log.writing}';
                      } else if (spot.barIndex == 2) {
                        metricLine = 'Disengaged ${log.disengagedPosture}';
                      } else if (spot.barIndex == 3) {
                        metricLine = 'Sleeping ${log.sleeping}';
                      } else {
                        metricLine = 'Phone ${log.usingPhone}';
                      }
                      final showTimestamp = spot.barIndex == 0;
                      return LineTooltipItem(
                        "${showTimestamp ? "${_tooltipDateFormat.format(log.timestamp)}\n${_tooltipTimeFormat.format(log.timestamp)}\n" : ""}$metricLine",
                        theme.textTheme.bodySmall!.copyWith(
                          fontWeight: FontWeight.w600,
                          color: spot.bar.color ?? theme.colorScheme.onSurface,
                        ),
                      );
                    }).toList();
                  },
                ),
              ),
              lineBarsData: [
                behaviorBar(onTaskPoints, onTaskColor),
                behaviorBar(writingPoints, writingColor),
                behaviorBar(disengagedPoints, disengagedColor),
                behaviorBar(
                  sleepingPoints,
                  sleepingColor,
                  highlightIndexes: sleepingSpikeIndexes,
                ),
                behaviorBar(
                  phonePoints,
                  phoneColor,
                  highlightIndexes: phoneSpikeIndexes,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredHistory(widget.history);
    final sections = widget.history.map((e) => e.sectionName).toSet().toList()
      ..sort();
    final avg = filtered.isEmpty
        ? 0.0
        : filtered.map((e) => e.averageEngagement).reduce((a, b) => a + b) /
            filtered.length;
    final best = filtered.isEmpty
        ? null
        : filtered.reduce(
            (a, b) => a.averageEngagement > b.averageEngagement ? a : b);

    if (widget.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (widget.error != null && widget.history.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: Colors.red),
            const SizedBox(height: 8),
            Text(widget.error!),
            const SizedBox(height: 8),
            TextButton(onPressed: widget.onRetry, child: const Text('Retry')),
          ],
        ),
      );
    }

    if (widget.history.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('No session history for this subject yet.'),
            const SizedBox(height: 6),
            Text(
              'Start a session to generate timeline insights and behavior analytics.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: widget.onRetry,
      child: NotificationListener<ScrollNotification>(
        onNotification: (notification) {
          widget.onScroll?.call(notification.metrics.pixels);
          return false;
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          children: [
            Row(
              children: [
                IconButton(
                  tooltip: _filtersOpen ? 'Close filters' : 'Open filters',
                  visualDensity: const VisualDensity(
                    horizontal: -3,
                    vertical: -3,
                  ),
                  onPressed: () => setState(() => _filtersOpen = !_filtersOpen),
                  icon: Icon(
                    _filtersOpen
                        ? Icons.close_rounded
                        : Icons.filter_alt_outlined,
                    size: 18,
                  ),
                ),
                const Spacer(),
                PopupMenuButton<String>(
                  tooltip: 'Export',
                  onSelected: (value) {
                    if (value == 'csv') {
                      _copyText(context, 'History CSV', _historyCsv(filtered));
                    } else {
                      _copyText(
                          context, 'History report', _summaryReport(filtered));
                    }
                  },
                  itemBuilder: (_) => const [
                    PopupMenuItem(
                        value: 'csv', child: Text('Export CSV (copy)')),
                    PopupMenuItem(
                        value: 'report', child: Text('Export Report (copy)')),
                  ],
                  child: Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(9),
                      border: Border.all(
                        color: Theme.of(context).dividerColor.withOpacity(0.4),
                      ),
                    ),
                    child: const Icon(Icons.ios_share_rounded, size: 17),
                  ),
                ),
              ],
            ),
            AnimatedSize(
              duration: const Duration(milliseconds: 280),
              curve: Curves.easeInOut,
              child: _filtersOpen
                  ? Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: Theme.of(context)
                                .dividerColor
                                .withOpacity(0.35)),
                        color: Theme.of(context).colorScheme.surface,
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.filter_alt_outlined, size: 18),
                              const SizedBox(width: 6),
                              Text(
                                'Filter',
                                style: Theme.of(context)
                                    .textTheme
                                    .labelMedium
                                    ?.copyWith(
                                      fontWeight: FontWeight.w700,
                                    ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  onChanged: (value) =>
                                      setState(() => _query = value),
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyMedium
                                      ?.copyWith(
                                        fontSize: 13,
                                      ),
                                  decoration: InputDecoration(
                                    hintText: 'Search',
                                    prefixIcon: const Icon(Icons.search_rounded,
                                        size: 18),
                                    isDense: true,
                                    constraints:
                                        const BoxConstraints(minHeight: 36),
                                    contentPadding: const EdgeInsets.symmetric(
                                        horizontal: 8, vertical: 8),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    suffixIcon: _query.isEmpty
                                        ? null
                                        : IconButton(
                                            onPressed: () =>
                                                setState(() => _query = ''),
                                            icon: const Icon(
                                                Icons.close_rounded,
                                                size: 16),
                                          ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              PopupMenuButton<String>(
                                tooltip: 'Sort',
                                onSelected: (v) => setState(() => _sort = v),
                                itemBuilder: (_) => const [
                                  PopupMenuItem(
                                      value: 'newest', child: Text('Newest')),
                                  PopupMenuItem(
                                      value: 'oldest', child: Text('Oldest')),
                                  PopupMenuItem(
                                      value: 'engagement_high',
                                      child: Text('Engagement High')),
                                  PopupMenuItem(
                                      value: 'engagement_low',
                                      child: Text('Engagement Low')),
                                ],
                                child: Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(9),
                                    border: Border.all(
                                      color: Theme.of(context)
                                          .dividerColor
                                          .withOpacity(0.4),
                                    ),
                                  ),
                                  child:
                                      const Icon(Icons.sort_rounded, size: 18),
                                ),
                              ),
                              const SizedBox(width: 6),
                              GestureDetector(
                                onTap: _pickRange,
                                child: Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(9),
                                    border: Border.all(
                                      color: _dateRange == null
                                          ? Theme.of(context)
                                              .dividerColor
                                              .withOpacity(0.4)
                                          : Theme.of(context)
                                              .colorScheme
                                              .primary,
                                    ),
                                  ),
                                  child: Icon(
                                    Icons.date_range_outlined,
                                    size: 17,
                                    color: _dateRange == null
                                        ? Theme.of(context)
                                            .textTheme
                                            .bodyMedium
                                            ?.color
                                        : Theme.of(context).colorScheme.primary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Align(
                            alignment: Alignment.centerLeft,
                            child: ConstrainedBox(
                              constraints: const BoxConstraints(maxWidth: 260),
                              child: Row(
                                children: [
                                  Container(
                                    width: 36,
                                    height: 36,
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: Theme.of(context)
                                            .dividerColor
                                            .withOpacity(0.4),
                                      ),
                                    ),
                                    child: Icon(
                                      Icons.groups_2_outlined,
                                      size: 17,
                                      color: Theme.of(context)
                                          .textTheme
                                          .bodyMedium
                                          ?.color,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: DropdownButtonFormField<String>(
                                      value: _sectionFilter,
                                      isDense: true,
                                      isExpanded: true,
                                      decoration: const InputDecoration(
                                        labelText: 'Section',
                                        isDense: true,
                                        contentPadding: EdgeInsets.symmetric(
                                            horizontal: 10, vertical: 8),
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.all(
                                              Radius.circular(8)),
                                        ),
                                      ),
                                      items: [
                                        const DropdownMenuItem(
                                            value: null, child: Text('All')),
                                        ...sections.map(
                                          (s) => DropdownMenuItem(
                                              value: s, child: Text(s)),
                                        ),
                                      ],
                                      onChanged: (v) =>
                                          setState(() => _sectionFilter = v),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Min Engagement ${_minEngagement.toStringAsFixed(0)}%',
                            style: Theme.of(context).textTheme.labelSmall,
                          ),
                          Slider(
                            value: _minEngagement,
                            min: 0,
                            max: 100,
                            divisions: 20,
                            onChanged: (v) =>
                                setState(() => _minEngagement = v),
                          ),
                        ],
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Theme.of(context)
                    .colorScheme
                    .surfaceContainerHighest
                    .withOpacity(0.45),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                      child: _historyChip(
                          context, 'Avg ${avg.toStringAsFixed(1)}%')),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _historyChip(context,
                        'Best ${best?.averageEngagement.toStringAsFixed(1) ?? '0'}%'),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                      child: _historyChip(context, 'Total ${filtered.length}')),
                ],
              ),
            ),
            if (filtered.isEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Text(
                  'No sessions match the current filters.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
            ...filtered.map((item) {
              final isExpanded = _expandedSessionId == item.id;
              final scoreColor =
                  _engagementColor(context, item.averageEngagement);

              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                child: Column(
                  children: [
                    InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: () => _toggleExpanded(item.id),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.sectionName,
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleSmall
                                        ?.copyWith(fontWeight: FontWeight.w700),
                                  ),
                                  const SizedBox(height: 8),
                                  Wrap(
                                    spacing: 6,
                                    runSpacing: 6,
                                    children: [
                                      _historyChip(
                                        context,
                                        widget.dateFormat
                                            .format(item.startTime),
                                      ),
                                      _historyChip(
                                        context,
                                        'Duration ${_formatSessionDuration(item)}',
                                      ),
                                      _historyChip(
                                        context,
                                        'Engagement ${item.averageEngagement.toStringAsFixed(0)}%',
                                        textColor: scoreColor,
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            AnimatedRotation(
                              turns: isExpanded ? 0.5 : 0,
                              duration: const Duration(milliseconds: 320),
                              curve: Curves.easeInOut,
                              child:
                                  const Icon(Icons.keyboard_arrow_down_rounded),
                            ),
                          ],
                        ),
                      ),
                    ),
                    ClipRect(
                      child: AnimatedSize(
                        duration: const Duration(milliseconds: 340),
                        curve: Curves.easeInOut,
                        child: isExpanded
                            ? Padding(
                                padding:
                                    const EdgeInsets.fromLTRB(14, 0, 14, 14),
                                child: _buildExpandedSessionAnalytics(
                                  context,
                                  item,
                                ),
                              )
                            : const SizedBox.shrink(),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _ImagePlaceholder extends StatelessWidget {
  final String title;

  const _ImagePlaceholder({required this.title});

  @override
  Widget build(BuildContext context) {
    final initials = title.trim().isEmpty
        ? '?'
        : title
            .trim()
            .split(RegExp(r'\s+'))
            .where((part) => part.isNotEmpty)
            .take(2)
            .map((part) => part[0].toUpperCase())
            .join();

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Theme.of(context).colorScheme.primaryContainer,
            Theme.of(context).colorScheme.secondaryContainer,
          ],
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

String? _resolveImageUrl(String? rawPath) {
  if (rawPath == null || rawPath.trim().isEmpty) return null;
  final path = rawPath.trim();
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  final base = EnvConfig.baseUrl.replaceAll(RegExp(r'/$'), '');
  final normalizedPath = path.startsWith('/') ? path : '/$path';
  return '$base$normalizedPath';
}
