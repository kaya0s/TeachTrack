import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:teachtrack/features/session/domain/models/session_models.dart';

class BehaviorTrendChart extends StatelessWidget {
  final SessionMetricsModel metrics;

  const BehaviorTrendChart({super.key, required this.metrics});

  @override
  Widget build(BuildContext context) {
    if (metrics.recentLogs.isEmpty) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(24.0),
          child: Center(child: Text("Waiting for ML data...", style: TextStyle(color: Colors.grey))),
        ),
      );
    }

    final theme = Theme.of(context);
    final textTheme = theme.textTheme;
    final logs = [...metrics.recentLogs]..sort((a, b) => a.timestamp.compareTo(b.timestamp));

    const onTaskColor = Color(0xFF2E7D32);
    const disengagedColor = Color(0xFF6A1B9A);
    const sleepingColor = Color(0xFFD32F2F);
    const phoneColor = Color(0xFFF57C00);

    final onTaskSpots = <FlSpot>[];
    final disengagedSpots = <FlSpot>[];
    final sleepingSpots = <FlSpot>[];
    final phoneSpots = <FlSpot>[];

    for (final log in logs) {
      final x = log.timestamp.millisecondsSinceEpoch.toDouble();
      onTaskSpots.add(FlSpot(x, log.onTask.toDouble()));
      disengagedSpots.add(FlSpot(x, log.disengagedPosture.toDouble()));
      sleepingSpots.add(FlSpot(x, log.sleeping.toDouble()));
      phoneSpots.add(FlSpot(x, log.usingPhone.toDouble()));
    }

    final maxY = [
      ...logs.map((l) => l.onTask),
      ...logs.map((l) => l.disengagedPosture),
      ...logs.map((l) => l.sleeping),
      ...logs.map((l) => l.usingPhone),
    ].fold<int>(0, (maxVal, v) => v > maxVal ? v : maxVal);

    final chartMaxY = maxY < 3 ? 3.0 : (maxY + 1).toDouble();
    final minX = onTaskSpots.first.x;
    final maxX = onTaskSpots.last.x == minX ? minX + 1 : onTaskSpots.last.x;
    final centerX = minX + ((maxX - minX) / 2);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Intensity Over Time", style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),
            _buildLegend(context, onTaskColor, disengagedColor, sleepingColor, phoneColor),
            const SizedBox(height: 16),
            SizedBox(
              height: 220,
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
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 28,
                        getTitlesWidget: (value, meta) {
                          final tolerance = (maxX - minX) * 0.05;
                          if ((value - minX).abs() > tolerance &&
                              (value - centerX).abs() > tolerance &&
                              (value - maxX).abs() > tolerance) {
                            return const SizedBox.shrink();
                          }
                          final time = DateTime.fromMillisecondsSinceEpoch(value.toInt());
                          return Text("${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}", style: textTheme.labelSmall);
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 28,
                        interval: 1,
                        getTitlesWidget: (value, meta) => Text(value.toInt().toString(), style: textTheme.labelSmall),
                      ),
                    ),
                  ),
                  lineBarsData: [
                    _lineBar(onTaskSpots, onTaskColor),
                    _lineBar(disengagedSpots, disengagedColor),
                    _lineBar(sleepingSpots, sleepingColor),
                    _lineBar(phoneSpots, phoneColor),
                  ],
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
      dotData: const FlDotData(show: false),
      belowBarData: BarAreaData(show: false),
    );
  }

  Widget _buildLegend(BuildContext context, Color onTask, Color disengaged, Color sleeping, Color phone) {
    return Wrap(
      spacing: 10,
      runSpacing: 8,
      children: [
        _legendItem(context, onTask, "On Task"),
        _legendItem(context, disengaged, "Disengaged"),
        _legendItem(context, sleeping, "Sleeping"),
        _legendItem(context, phone, "Phone"),
      ],
    );
  }

  Widget _legendItem(BuildContext context, Color color, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleAvatar(radius: 4, backgroundColor: color),
          const SizedBox(width: 8),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 11)),
        ],
      ),
    );
  }
}
