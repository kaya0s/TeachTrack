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
                  _buildBehaviorTrendChart(
                      context, metrics, session.activeSession!),
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
      BuildContext context, SessionMetricsModel metrics, SessionModel session) {
    if (metrics.recentLogs.isEmpty) {
      return const Text("Waiting for ML data...");
    }

    final startTime = session.startTime;
    final logs = metrics.recentLogs;

    double toMinutes(DateTime ts) {
      return ts.difference(startTime).inSeconds / 60.0;
    }

    final onTaskSpots = <FlSpot>[];
    final writingSpots = <FlSpot>[];
    final disengagedSpots = <FlSpot>[];
    final sleepingSpots = <FlSpot>[];
    final phoneSpots = <FlSpot>[];

    for (final log in logs) {
      final x = toMinutes(log.timestamp);
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

    final chartMaxY = (maxY + 2).toDouble();
    final textTheme = Theme.of(context).textTheme;

    return Card(
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildLegend(textTheme),
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
                    minY: 0,
                    maxY: chartMaxY == 0 ? 5 : chartMaxY,
                    gridData: FlGridData(
                      show: true,
                      drawVerticalLine: true,
                      getDrawingHorizontalLine: (value) => FlLine(
                        color: Colors.grey.shade300,
                        strokeWidth: 1,
                      ),
                      getDrawingVerticalLine: (value) => FlLine(
                        color: Colors.grey.shade200,
                        strokeWidth: 1,
                      ),
                    ),
                    borderData: FlBorderData(
                      show: true,
                      border: Border.all(color: Colors.grey.shade300),
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
                          interval: 1,
                          getTitlesWidget: (value, meta) => Text(
                            "${value.toStringAsFixed(0)}m",
                            style: textTheme.bodySmall
                                ?.copyWith(color: Colors.grey.shade600),
                          ),
                        ),
                      ),
                      leftTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 28,
                          interval: 1,
                          getTitlesWidget: (value, meta) => Text(
                            value.toStringAsFixed(0),
                            style: textTheme.bodySmall
                                ?.copyWith(color: Colors.grey.shade600),
                          ),
                        ),
                      ),
                    ),
                    lineTouchData: LineTouchData(
                      enabled: true,
                      touchTooltipData: LineTouchTooltipData(
                        tooltipBgColor: Colors.black.withOpacity(0.7),
                        getTooltipItems: (items) => items.map((item) {
                          final label = item.bar.color ==
                                  const Color(0xFF2E7D32)
                              ? "On Task"
                              : item.bar.color == const Color(0xFF1565C0)
                                  ? "Writing"
                                  : item.bar.color == const Color(0xFF6A1B9A)
                                      ? "Disengaged"
                                      : item.bar.color ==
                                              const Color(0xFFD32F2F)
                                          ? "Sleeping"
                                          : "Using Phone";
                          return LineTooltipItem(
                            "$label: ${item.y.toStringAsFixed(0)}",
                            const TextStyle(color: Colors.white),
                          );
                        }).toList(),
                      ),
                    ),
                    lineBarsData: [
                      _lineBar(onTaskSpots, const Color(0xFF2E7D32)),
                      _lineBar(writingSpots, const Color(0xFF1565C0)),
                      _lineBar(disengagedSpots, const Color(0xFF6A1B9A)),
                      _lineBar(sleepingSpots, const Color(0xFFD32F2F)),
                      _lineBar(phoneSpots, const Color(0xFFF57C00)),
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
      barWidth: 3,
      dotData: FlDotData(
        show: true,
        getDotPainter: (spot, percent, bar, index) => FlDotCirclePainter(
          radius: 3,
          color: Colors.white,
          strokeWidth: 2,
          strokeColor: color,
        ),
      ),
      belowBarData: BarAreaData(
        show: true,
        color: color.withOpacity(0.1),
      ),
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

  Widget _buildLegend(TextTheme textTheme) {
    return Wrap(
      spacing: 12,
      runSpacing: 8,
      children: [
        _legendItem(const Color(0xFF2E7D32), "On Task", textTheme),
        _legendItem(const Color(0xFF1565C0), "Writing", textTheme),
        _legendItem(const Color(0xFF6A1B9A), "Disengaged", textTheme),
        _legendItem(const Color(0xFFD32F2F), "Sleeping", textTheme),
        _legendItem(const Color(0xFFF57C00), "Using Phone", textTheme),
      ],
    );
  }

  Widget _legendItem(Color color, String label, TextTheme textTheme) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(label, style: textTheme.bodySmall),
      ],
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
