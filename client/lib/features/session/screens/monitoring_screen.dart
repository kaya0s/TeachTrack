import 'dart:async';

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../provider/session_provider.dart';
import '../../../data/models/classroom_session_models.dart';

class MonitoringScreen extends StatefulWidget {
  final int sessionId;

  const MonitoringScreen({super.key, required this.sessionId});

  @override
  State<MonitoringScreen> createState() => _MonitoringScreenState();
}

class _MonitoringScreenState extends State<MonitoringScreen> {
  Timer? _heartbeatTimer;

  @override
  void initState() {
    super.initState();
    _startDetectorAndHeartbeat();
  }

  void _startDetectorAndHeartbeat() {
    final provider = context.read<SessionProvider>();
    provider.startServerDetector();
    provider.heartbeatServerDetector();
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      provider.heartbeatServerDetector();
    });
  }

  @override
  void dispose() {
    _heartbeatTimer?.cancel();
    context.read<SessionProvider>().stopServerDetector();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<SessionProvider>(
      builder: (context, session, child) {
        if (session.activeSession == null) {
          return const Scaffold(
            body: Center(child: Text("No active session")),
          );
        }

        final metrics = session.metrics;

        return Scaffold(
          appBar: AppBar(
            title: const Text("Live Monitoring"),
            actions: [
              TextButton(
                onPressed: () => _confirmStop(context, session),
                child: Text(
                  "Stop",
                  style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                      fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildStatusCard(context, session.activeSession!),
                const SizedBox(height: 16),
                _buildServerCameraCard(),
                const SizedBox(height: 24),
                const Text("Classroom Pulse",
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                if (metrics == null)
                  const Center(child: CircularProgressIndicator())
                else ...[
                  _buildOverviewStats(context, metrics),
                  const SizedBox(height: 16),
                  _buildEngagementCard(context, metrics),
                  const SizedBox(height: 16),
                  _buildBehaviorDistributionCard(
                    context,
                    metrics.recentLogs.isEmpty ? null : metrics.recentLogs.last,
                    metrics.studentsPresent,
                  ),
                  const SizedBox(height: 12),
                  _buildBehaviorGrid(
                    context,
                    metrics.recentLogs.isEmpty ? null : metrics.recentLogs.last,
                  ),
                  const SizedBox(height: 24),
                  const Text("Behavior Intensity",
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  _buildBehaviorTrendChart(context, metrics),
                ],
                const SizedBox(height: 24),
                const Text("Recent Alerts",
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                if (metrics?.alerts.isEmpty ?? true)
                  const Text("No alerts detected.")
                else
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: metrics!.alerts.length,
                    itemBuilder: (context, index) {
                      final alert = metrics.alerts[index];
                      return Card(
                        color: Theme.of(context)
                            .colorScheme
                            .error
                            .withOpacity(0.08),
                        child: ListTile(
                          leading: Icon(Icons.warning,
                              color: Theme.of(context).colorScheme.error),
                          title: Text(alert.message),
                          subtitle: Text(alert.alertType),
                        ),
                      );
                    },
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildServerCameraCard() {
    return const Card(
      elevation: 0,
      color: Colors.transparent,
      child: Padding(
        padding: EdgeInsets.all(16.0),
        child: Row(
          children: [
            Icon(Icons.videocam, color: Colors.blueGrey),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                "Using server webcam for detection. Metrics update as frames are processed.",
                style: TextStyle(fontSize: 13),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusCard(BuildContext context, SessionModel session) {
    return Card(
      elevation: 0,
      color: Theme.of(context).colorScheme.primary.withOpacity(0.08),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Icon(Icons.radio_button_checked,
                color: Theme.of(context).colorScheme.error),
            const SizedBox(width: 12),
            Text("LIVE",
                style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.error)),
            const Spacer(),
            Text(
                "Started: ${session.startTime.hour}:${session.startTime.minute.toString().padLeft(2, '0')}"),
          ],
        ),
      ),
    );
  }

  Widget _buildEngagementCard(
      BuildContext context, SessionMetricsModel metrics) {
    final progress = (metrics.averageEngagement / 100).clamp(0.0, 1.0);
    final color = _engagementColor(context, metrics.averageEngagement);
    final label = _engagementLabel(metrics.averageEngagement);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Row(
          children: [
            SizedBox(
              width: 92,
              height: 92,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  CircularProgressIndicator(
                    value: progress,
                    strokeWidth: 8,
                    backgroundColor:
                        Theme.of(context).colorScheme.surfaceContainerHighest,
                    color: color,
                  ),
                  Text(
                    "${metrics.averageEngagement.toInt()}%",
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: color,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Average Engagement"),
                  const SizedBox(height: 6),
                  Text(
                    label,
                    style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 10),
                  LinearProgressIndicator(
                    value: progress,
                    backgroundColor:
                        Theme.of(context).colorScheme.surfaceContainerHighest,
                    minHeight: 8,
                    borderRadius: BorderRadius.circular(4),
                    color: color,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOverviewStats(
      BuildContext context, SessionMetricsModel metrics) {
    final latest = metrics.recentLogs.isEmpty ? null : metrics.recentLogs.last;
    final observed = latest == null
        ? 0
        : latest.onTask +
            latest.writing +
            latest.usingPhone +
            latest.sleeping +
            latest.disengagedPosture;
    final notVisible = latest?.notVisible ?? 0;
    final highRisk = latest == null
        ? 0
        : latest.sleeping + latest.usingPhone + latest.disengagedPosture;

    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        _buildKpiTile(
          context,
          title: "Present",
          value: metrics.studentsPresent.toString(),
          icon: Icons.groups_rounded,
        ),
        _buildKpiTile(
          context,
          title: "Observed",
          value: observed.toString(),
          icon: Icons.visibility_rounded,
        ),
        _buildKpiTile(
          context,
          title: "Not Visible",
          value: notVisible.toString(),
          icon: Icons.visibility_off_rounded,
        ),
        _buildKpiTile(
          context,
          title: "Risk Behaviors",
          value: highRisk.toString(),
          icon: Icons.warning_amber_rounded,
        ),
      ],
    );
  }

  Widget _buildKpiTile(
    BuildContext context, {
    required String title,
    required String value,
    required IconData icon,
  }) {
    return Container(
      width: (MediaQuery.of(context).size.width - 54) / 2,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        color: Theme.of(context).colorScheme.surfaceContainerLow,
      ),
      child: Row(
        children: [
          Icon(icon, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.bodySmall),
                Text(
                  value,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBehaviorDistributionCard(
    BuildContext context,
    BehaviorLogModel? latestLog,
    int studentsPresent,
  ) {
    if (latestLog == null) {
      return const Text("Waiting for ML data...");
    }

    final sections = [
      _pieSection(
          "On Task", latestLog.onTask.toDouble(), const Color(0xFF2E7D32)),
      _pieSection(
          "Writing", latestLog.writing.toDouble(), const Color(0xFF1565C0)),
      _pieSection(
          "Phone", latestLog.usingPhone.toDouble(), const Color(0xFFF57C00)),
      _pieSection(
          "Sleeping", latestLog.sleeping.toDouble(), const Color(0xFFD32F2F)),
      _pieSection("Disengaged", latestLog.disengagedPosture.toDouble(),
          const Color(0xFF6A1B9A)),
      _pieSection("Not Visible", latestLog.notVisible.toDouble(), Colors.grey),
    ].where((e) => e.value > 0).toList();

    final total = sections.fold<double>(0, (sum, item) => sum + item.value);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Latest Behavior Snapshot",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(
              "Current frame mix out of $studentsPresent students",
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 14),
            if (total == 0)
              const Text("No detections yet.")
            else
              Row(
                children: [
                  SizedBox(
                    width: 120,
                    height: 120,
                    child: PieChart(
                      PieChartData(
                        sectionsSpace: 2,
                        centerSpaceRadius: 28,
                        sections: sections
                            .map(
                              (item) => PieChartSectionData(
                                value: item.value,
                                color: item.color,
                                radius: 26,
                                title: "",
                              ),
                            )
                            .toList(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      children: sections
                          .map(
                            (item) => Padding(
                              padding: const EdgeInsets.symmetric(vertical: 3),
                              child: Row(
                                children: [
                                  Container(
                                    width: 10,
                                    height: 10,
                                    decoration: BoxDecoration(
                                      color: item.color,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(child: Text(item.label)),
                                  Text("${item.value.toInt()}"),
                                ],
                              ),
                            ),
                          )
                          .toList(),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildBehaviorGrid(BuildContext context, BehaviorLogModel? latestLog) {
    if (latestLog == null) return const Text("Waiting for ML data...");

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 2.5,
      children: [
        _buildMetricItem("On Task", latestLog.onTask, Colors.green),
        _buildMetricItem("Writing", latestLog.writing, Colors.blue),
        _buildMetricItem("Sleeping", latestLog.sleeping, Colors.orange),
        _buildMetricItem("Mobile Use", latestLog.usingPhone, Colors.red),
        _buildMetricItem(
            "Disengaged", latestLog.disengagedPosture, Colors.purple),
        _buildMetricItem("Not Visible", latestLog.notVisible, Colors.grey),
      ],
    );
  }

  Widget _buildBehaviorTrendChart(
      BuildContext context, SessionMetricsModel metrics) {
    if (metrics.recentLogs.isEmpty) {
      return const Text("Waiting for ML data...");
    }

    final theme = Theme.of(context);
    final textTheme = theme.textTheme;
    final logs = [...metrics.recentLogs]
      ..sort((a, b) => a.timestamp.compareTo(b.timestamp));
    final onTaskColor = const Color(0xFF2E7D32);
    final writingColor = const Color(0xFF1565C0);
    final disengagedColor = const Color(0xFF6A1B9A);
    final sleepingColor = const Color(0xFFD32F2F);
    final phoneColor = const Color(0xFFF57C00);

    final onTaskSpots = <FlSpot>[];
    final writingSpots = <FlSpot>[];
    final disengagedSpots = <FlSpot>[];
    final sleepingSpots = <FlSpot>[];
    final phoneSpots = <FlSpot>[];

    for (final log in logs) {
      final x = log.timestamp.millisecondsSinceEpoch.toDouble();
      onTaskSpots.add(FlSpot(x, log.onTask.toDouble()));
      writingSpots.add(FlSpot(x, log.writing.toDouble()));
      disengagedSpots.add(FlSpot(x, log.disengagedPosture.toDouble()));
      sleepingSpots.add(FlSpot(x, log.sleeping.toDouble()));
      phoneSpots.add(FlSpot(x, log.usingPhone.toDouble()));
    }

    final maxY = [
      ...logs.map((l) => l.onTask),
      ...logs.map((l) => l.writing),
      ...logs.map((l) => l.disengagedPosture),
      ...logs.map((l) => l.sleeping),
      ...logs.map((l) => l.usingPhone),
    ].fold<int>(0, (maxVal, v) => v > maxVal ? v : maxVal);

    final chartMaxY = maxY < 3 ? 3.0 : (maxY + 1).toDouble();
    final minX = onTaskSpots.first.x;
    final maxRawX = onTaskSpots.last.x;
    final maxX = maxRawX == minX ? minX + 1 : maxRawX;
    final centerX = minX + ((maxX - minX) / 2);

    return Card(
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildLegend(
              context,
              onTaskColor: onTaskColor,
              writingColor: writingColor,
              disengagedColor: disengagedColor,
              sleepingColor: sleepingColor,
              phoneColor: phoneColor,
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 220,
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 350),
                switchInCurve: Curves.easeOut,
                switchOutCurve: Curves.easeIn,
                transitionBuilder: (child, animation) {
                  return FadeTransition(
                    opacity: animation,
                    child: ScaleTransition(
                      scale: Tween<double>(begin: 0.98, end: 1.0)
                          .animate(animation),
                      child: child,
                    ),
                  );
                },
                child: LineChart(
                  LineChartData(
                    minX: minX,
                    maxX: maxX,
                    minY: 0,
                    maxY: chartMaxY,
                    gridData: const FlGridData(show: false),
                    borderData: FlBorderData(
                      show: true,
                      border: Border(
                        left: BorderSide(color: theme.dividerColor, width: 1),
                        bottom: BorderSide(color: theme.dividerColor, width: 1),
                      ),
                    ),
                    titlesData: FlTitlesData(
                      rightTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false)),
                      topTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false)),
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

                            final timestamp =
                                (value - centerX).abs() <= tolerance
                                    ? centerX
                                    : (value - minX).abs() <= tolerance
                                        ? minX
                                        : maxX;
                            final time = DateTime.fromMillisecondsSinceEpoch(
                                timestamp.toInt());
                            return Padding(
                              padding: const EdgeInsets.only(top: 6),
                              child: Text(
                                "${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}",
                                style: textTheme.labelSmall,
                              ),
                            );
                          },
                        ),
                      ),
                      leftTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 28,
                          interval: 1,
                          getTitlesWidget: (value, meta) => Text(
                            value.toStringAsFixed(0),
                            style: textTheme.labelSmall,
                          ),
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
                                    color:
                                        bar.color ?? theme.colorScheme.primary,
                                    strokeWidth: 1.2,
                                    strokeColor: theme.colorScheme.surface,
                                  ),
                                ),
                              ),
                            )
                            .toList();
                      },
                      touchTooltipData: LineTouchTooltipData(
                        tooltipBgColor:
                            theme.colorScheme.surface.withOpacity(0.95),
                        fitInsideHorizontally: true,
                        fitInsideVertically: true,
                        getTooltipItems: (items) {
                          final sorted = [...items]
                            ..sort((a, b) => a.barIndex.compareTo(b.barIndex));
                          return sorted.map((item) {
                            final index =
                                item.spotIndex.clamp(0, logs.length - 1);
                            final log = logs[index];
                            String metricLine;
                            if (item.barIndex == 0) {
                              metricLine = "On Task ${log.onTask}";
                            } else if (item.barIndex == 1) {
                              metricLine = "Writing ${log.writing}";
                            } else if (item.barIndex == 2) {
                              metricLine =
                                  "Disengaged ${log.disengagedPosture}";
                            } else if (item.barIndex == 3) {
                              metricLine = "Sleeping ${log.sleeping}";
                            } else {
                              metricLine = "Phone ${log.usingPhone}";
                            }
                            final showTimestamp = item.barIndex == 0;
                            final dateLine =
                                "${log.timestamp.year.toString().padLeft(4, '0')}-${log.timestamp.month.toString().padLeft(2, '0')}-${log.timestamp.day.toString().padLeft(2, '0')}";
                            final timeLine =
                                "${log.timestamp.hour.toString().padLeft(2, '0')}:${log.timestamp.minute.toString().padLeft(2, '0')}:${log.timestamp.second.toString().padLeft(2, '0')}";
                            return LineTooltipItem(
                              "${showTimestamp ? "$dateLine\n$timeLine\n" : ""}$metricLine",
                              textTheme.bodySmall!.copyWith(
                                fontWeight: FontWeight.w600,
                                color: item.bar.color ??
                                    theme.colorScheme.onSurface,
                              ),
                            );
                          }).toList();
                        },
                      ),
                    ),
                    lineBarsData: [
                      _lineBar(onTaskSpots, onTaskColor),
                      _lineBar(writingSpots, writingColor),
                      _lineBar(disengagedSpots, disengagedColor),
                      _lineBar(sleepingSpots, sleepingColor),
                      _lineBar(phoneSpots, phoneColor),
                    ],
                  ),
                  key: ValueKey<int>(metrics.totalLogs),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  LineChartBarData _lineBar(List<FlSpot> spots, Color color) {
    return LineChartBarData(
      spots: spots,
      isCurved: true,
      color: color,
      barWidth: 2,
      isStrokeCapRound: true,
      dotData: const FlDotData(show: false),
      belowBarData: BarAreaData(show: false),
    );
  }

  _PieDatum _pieSection(String label, double value, Color color) {
    return _PieDatum(label: label, value: value, color: color);
  }

  Color _engagementColor(BuildContext context, double value) {
    if (value >= 70) return const Color(0xFF2E7D32);
    if (value >= 40) return const Color(0xFFF57C00);
    return Theme.of(context).colorScheme.error;
  }

  String _engagementLabel(double value) {
    if (value >= 70) return "Strong";
    if (value >= 40) return "Moderate";
    return "Needs intervention";
  }

  Widget _buildLegend(
    BuildContext context, {
    required Color onTaskColor,
    required Color writingColor,
    required Color disengagedColor,
    required Color sleepingColor,
    required Color phoneColor,
  }) {
    return Wrap(
      spacing: 12,
      runSpacing: 8,
      children: [
        _legendItem(context, onTaskColor, "On Task"),
        _legendItem(context, writingColor, "Writing"),
        _legendItem(context, disengagedColor, "Disengaged"),
        _legendItem(context, sleepingColor, "Sleeping"),
        _legendItem(context, phoneColor, "Using Phone"),
      ],
    );
  }

  Widget _legendItem(BuildContext context, Color color, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: color,
            ),
      ),
    );
  }

  Widget _buildMetricItem(String label, int count, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          CircleAvatar(radius: 4, backgroundColor: color),
          const SizedBox(width: 8),
          Text(label, style: const TextStyle(fontSize: 12)),
          const Spacer(),
          Text(count.toString(),
              style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  void _confirmStop(BuildContext context, SessionProvider session) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Stop Monitoring?"),
        content: const Text(
            "This will end the current session and save the results to history."),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () async {
              await session.stopServerDetector();
              await session.stopSession();
              if (context.mounted) {
                Navigator.pop(context); // Close dialog
                Navigator.pop(context); // Go back from monitoring
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text("Stop Session"),
          ),
        ],
      ),
    );
  }
}

class _PieDatum {
  final String label;
  final double value;
  final Color color;

  const _PieDatum({
    required this.label,
    required this.value,
    required this.color,
  });
}
