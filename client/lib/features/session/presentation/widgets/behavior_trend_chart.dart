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
    const offTaskColor = Color(0xFF6A1B9A);
    const sleepingColor = Color(0xFFD32F2F);
    const phoneColor = Color(0xFFF57C00);

    final onTaskSpots = <FlSpot>[];
    final offTaskSpots = <FlSpot>[];
    final sleepingSpots = <FlSpot>[];
    final phoneSpots = <FlSpot>[];

    for (final log in logs) {
      final x = log.timestamp.millisecondsSinceEpoch.toDouble();
      onTaskSpots.add(FlSpot(x, log.onTask.toDouble()));
      offTaskSpots.add(FlSpot(x, log.offTask.toDouble()));
      sleepingSpots.add(FlSpot(x, log.sleeping.toDouble()));
      phoneSpots.add(FlSpot(x, log.usingPhone.toDouble()));
    }

    final maxYValue = [
      ...logs.map((l) => l.onTask),
      ...logs.map((l) => l.offTask),
      ...logs.map((l) => l.sleeping),
      ...logs.map((l) => l.usingPhone),
    ].fold<int>(0, (maxVal, v) => v > maxVal ? v : maxVal);

    final chartMaxY = maxYValue < 5 ? 5.0 : (maxYValue * 1.15).ceilToDouble();
    final minX = onTaskSpots.first.x;
    final maxX = onTaskSpots.last.x == minX ? minX + 1 : onTaskSpots.last.x;

    return Container(
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: theme.dividerColor.withOpacity(0.05)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 20, offset: const Offset(0, 10)),
        ],
      ),
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   const Text("Class Participation", style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
                   Text("Detections over last session", style: TextStyle(fontSize: 12, color: theme.hintColor)),
                ],
              ),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: theme.colorScheme.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                child: Icon(Icons.show_chart_rounded, color: theme.colorScheme.primary, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildLegend(context, onTaskColor, offTaskColor, sleepingColor, phoneColor),
          const SizedBox(height: 24),
          SizedBox(
            height: 240,
            child: LineChart(
              LineChartData(
                minX: minX,
                maxX: maxX,
                minY: 0,
                maxY: chartMaxY,
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (value) => FlLine(
                    color: theme.dividerColor.withOpacity(0.05),
                    strokeWidth: 1,
                  ),
                ),
                borderData: FlBorderData(show: false),
                lineTouchData: LineTouchData(
                  touchTooltipData: LineTouchTooltipData(
                    tooltipBgColor: theme.cardColor,
                    tooltipRoundedRadius: 12,
                    tooltipBorder: BorderSide(color: theme.dividerColor.withOpacity(0.1)),
                  )
                ),
                titlesData: FlTitlesData(
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 32,
                      interval: (maxX - minX) / 4, // Show 4 time markers
                      getTitlesWidget: (value, meta) {
                        final time = DateTime.fromMillisecondsSinceEpoch(value.toInt());
                        return Padding(
                          padding: const EdgeInsets.only(top: 12.0),
                          child: Text("${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}", 
                            style: TextStyle(color: theme.hintColor.withOpacity(0.5), fontSize: 10, fontWeight: FontWeight.bold)
                          ),
                        );
                      },
                    ),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 40,
                      // Calculate dynamic interval to avoid overcrowding
                      interval: (chartMaxY / 4).clamp(1, 100), 
                      getTitlesWidget: (value, meta) => Text(
                        value.toInt().toString(), 
                        style: TextStyle(color: theme.hintColor.withOpacity(0.3), fontSize: 10, fontWeight: FontWeight.bold)
                      ),
                    ),
                  ),
                ),
                lineBarsData: [
                  _lineBar(onTaskSpots, onTaskColor, true),
                  _lineBar(offTaskSpots, offTaskColor, false),
                  _lineBar(sleepingSpots, sleepingColor, false),
                  _lineBar(phoneSpots, phoneColor, false),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  LineChartBarData _lineBar(List<FlSpot> spots, Color color, bool isFeatured) {
    return LineChartBarData(
      spots: spots,
      isCurved: true,
      curveSmoothness: 0.35,
      color: isFeatured ? color : color.withOpacity(0.6),
      barWidth: isFeatured ? 3 : 2,
      dotData: const FlDotData(show: false),
      belowBarData: BarAreaData(
        show: isFeatured,
        gradient: LinearGradient(
          colors: [color.withOpacity(0.15), color.withOpacity(0)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
    );
  }

  Widget _buildLegend(BuildContext context, Color onTask, Color offTask, Color sleeping, Color phone) {
    return Wrap(
      spacing: 12,
      runSpacing: 10,
      children: [
        _legendItem(context, onTask, "On Task", true),
        _legendItem(context, offTask, "Off Task", false),
        _legendItem(context, sleeping, "Sleeping", false),
        _legendItem(context, phone, "Phones", false),
      ],
    );
  }

  Widget _legendItem(BuildContext context, Color color, String label, bool isPrimary) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(label, style: TextStyle(
          fontWeight: isPrimary ? FontWeight.w900 : FontWeight.w600, 
          fontSize: 11,
          color: Theme.of(context).textTheme.bodyLarge?.color?.withOpacity(isPrimary ? 1.0 : 0.6)
        )),
      ],
    );
  }
}
