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
                  style: TextStyle(color: Theme.of(context).colorScheme.error, fontWeight: FontWeight.w600),
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
                const Text("Classroom Pulse", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                if (metrics == null)
                  const Center(child: CircularProgressIndicator())
                else ...[
                  _buildEngagementCard(context, metrics),
                  const SizedBox(height: 24),
                  const Text("Behavior Intensity", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  _buildBehaviorTrendChart(context, metrics, session.activeSession!),
                ],
                const SizedBox(height: 24),
                const Text("Recent Alerts", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
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
                        color: Theme.of(context).colorScheme.error.withOpacity(0.08),
                        child: ListTile(
                          leading: Icon(Icons.warning, color: Theme.of(context).colorScheme.error),
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
            Icon(Icons.radio_button_checked, color: Theme.of(context).colorScheme.error),
            const SizedBox(width: 12),
            Text("LIVE", style: TextStyle(fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.error)),
            const Spacer(),
            Text("Started: ${session.startTime.hour}:${session.startTime.minute.toString().padLeft(2, '0')}"),
          ],
        ),
      ),
    );
  }


  Widget _buildEngagementCard(BuildContext context, SessionMetricsModel metrics) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            Text("${metrics.averageEngagement.toInt()}%",
                style: TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.primary)),
            const Text("Average Engagement"),
            const SizedBox(height: 16),
            LinearProgressIndicator(
              value: metrics.averageEngagement / 100,
              backgroundColor: Colors.grey.shade200,
              minHeight: 8,
              borderRadius: BorderRadius.circular(4),
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
        _buildMetricItem("Attentive", latestLog.attentive, Colors.green),
        _buildMetricItem("Writing", latestLog.writing, Colors.blue),
        _buildMetricItem("Sleeping", latestLog.sleeping, Colors.orange),
        _buildMetricItem("Mobile Use", latestLog.usingPhone, Colors.red),
        _buildMetricItem("Hand Raise", latestLog.raisingHand, Colors.purple),
        _buildMetricItem("Undetected", latestLog.undetected, Colors.grey),
      ],
    );
  }

  Widget _buildBehaviorTrendChart(BuildContext context, SessionMetricsModel metrics, SessionModel session) {
    if (metrics.recentLogs.isEmpty) {
      return const Text("Waiting for ML data...");
    }

    final startTime = session.startTime;
    final logs = metrics.recentLogs;

    double toMinutes(DateTime ts) {
      return ts.difference(startTime).inSeconds / 60.0;
    }

    final attentiveSpots = <FlSpot>[];
    final writingSpots = <FlSpot>[];
    final raisingHandSpots = <FlSpot>[];
    final sleepingSpots = <FlSpot>[];
    final phoneSpots = <FlSpot>[];

    for (final log in logs) {
      final x = toMinutes(log.timestamp);
      attentiveSpots.add(FlSpot(x, log.attentive.toDouble()));
      writingSpots.add(FlSpot(x, log.writing.toDouble()));
      raisingHandSpots.add(FlSpot(x, log.raisingHand.toDouble()));
      sleepingSpots.add(FlSpot(x, log.sleeping.toDouble()));
      phoneSpots.add(FlSpot(x, log.usingPhone.toDouble()));
    }

    final maxY = [
      ...logs.map((l) => l.attentive),
      ...logs.map((l) => l.writing),
      ...logs.map((l) => l.raisingHand),
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
                      scale: Tween<double>(begin: 0.98, end: 1.0).animate(animation),
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
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 28,
                        interval: 1,
                        getTitlesWidget: (value, meta) => Text(
                          "${value.toStringAsFixed(0)}m",
                          style: textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
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
                          style: textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
                        ),
                      ),
                    ),
                  ),
                  lineTouchData: LineTouchData(
                    enabled: true,
                    touchTooltipData: LineTouchTooltipData(
                      tooltipBgColor: Colors.black.withOpacity(0.7),
                      getTooltipItems: (items) => items.map((item) {
                        final label = item.bar.color == const Color(0xFF2E7D32)
                            ? "Attentive"
                            : item.bar.color == const Color(0xFF1565C0)
                                ? "Writing"
                                : item.bar.color == const Color(0xFF6A1B9A)
                                    ? "Hand Raise"
                                    : item.bar.color == const Color(0xFFD32F2F)
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
                    _lineBar(attentiveSpots, const Color(0xFF2E7D32)),
                    _lineBar(writingSpots, const Color(0xFF1565C0)),
                    _lineBar(raisingHandSpots, const Color(0xFF6A1B9A)),
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

  Widget _buildLegend(TextTheme textTheme) {
    return Wrap(
      spacing: 12,
      runSpacing: 8,
      children: [
        _legendItem(const Color(0xFF2E7D32), "Attentive", textTheme),
        _legendItem(const Color(0xFF1565C0), "Writing", textTheme),
        _legendItem(const Color(0xFF6A1B9A), "Hand Raise", textTheme),
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
          Text(count.toString(), style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  void _confirmStop(BuildContext context, SessionProvider session) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Stop Monitoring?"),
        content: const Text("This will end the current session and save the results to history."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Cancel")),
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
