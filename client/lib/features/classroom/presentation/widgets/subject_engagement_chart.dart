import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:teachtrack/features/session/domain/models/session_models.dart';

class SubjectEngagementChart extends StatelessWidget {
  final List<SessionSummaryModel> sessions;

  const SubjectEngagementChart({super.key, required this.sessions});

  @override
  Widget build(BuildContext context) {
    if (sessions.isEmpty) return const SizedBox.shrink();

    final points = sessions
        .asMap()
        .entries
        .map((e) => FlSpot(e.key.toDouble(), e.value.averageEngagement))
        .toList();

    final theme = Theme.of(context);
    final lineColor = theme.colorScheme.primary;

    return Container(
      padding: const EdgeInsets.fromLTRB(10, 12, 12, 10),
      height: 220,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.dividerColor.withOpacity(0.2)),
      ),
      child: LineChart(
        LineChartData(
          minX: 0,
          maxX: (sessions.length - 1).toDouble() == 0 ? 1 : (sessions.length - 1).toDouble(),
          minY: 0,
          maxY: 100,
          gridData: FlGridData(
            show: true,
            horizontalInterval: 20,
            drawVerticalLine: false,
            getDrawingHorizontalLine: (_) => FlLine(color: theme.dividerColor.withOpacity(0.1), strokeWidth: 1),
          ),
          borderData: FlBorderData(
            show: true,
            border: Border(
              left: BorderSide(color: theme.dividerColor.withOpacity(0.4), width: 1),
              bottom: BorderSide(color: theme.dividerColor.withOpacity(0.4), width: 1),
            ),
          ),
          titlesData: FlTitlesData(
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 34,
                interval: 20,
                getTitlesWidget: (value, meta) => Text('${value.toInt()}%', style: theme.textTheme.labelSmall),
              ),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                interval: 1,
                getTitlesWidget: (value, meta) => Text('S${value.toInt() + 1}', style: theme.textTheme.labelSmall),
              ),
            ),
          ),
          lineBarsData: [
            LineChartBarData(
              spots: points,
              isCurved: true,
              barWidth: 3,
              color: lineColor,
              dotData: FlDotData(
                show: true,
                getDotPainter: (spot, percent, bar, index) => FlDotCirclePainter(
                  radius: 3,
                  color: lineColor,
                  strokeWidth: 1.5,
                  strokeColor: theme.colorScheme.surface,
                ),
              ),
              belowBarData: BarAreaData(
                show: true,
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [lineColor.withOpacity(0.2), lineColor.withOpacity(0.01)],
                ),
              ),
            ),
          ],
          lineTouchData: LineTouchData(
            enabled: true,
            touchTooltipData: LineTouchTooltipData(
              fitInsideHorizontally: true,
              fitInsideVertically: true,
              tooltipBgColor: theme.colorScheme.surface.withOpacity(0.96),
              getTooltipItems: (spots) => spots.map((spot) {
                  final i = spot.x.round().clamp(0, sessions.length - 1);
                  final item = sessions[i];
                  return LineTooltipItem(
                    '${item.sectionName}\n${item.averageEngagement.toStringAsFixed(1)}%',
                    theme.textTheme.bodySmall!.copyWith(fontWeight: FontWeight.w700),
                  );
                }).toList(),
            ),
          ),
        ),
      ),
    );
  }
}
