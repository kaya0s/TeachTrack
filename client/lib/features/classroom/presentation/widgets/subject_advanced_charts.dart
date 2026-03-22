import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:teachtrack/features/session/domain/models/session_models.dart';

class SubjectEngagementTimeChart extends StatelessWidget {
  final List<SessionSummaryModel> history;

  const SubjectEngagementTimeChart({super.key, required this.history});

  @override
  Widget build(BuildContext context) {
    if (history.isEmpty) return const SizedBox.shrink();

    // Group by hour
    final Map<int, List<double>> grouped = {};
    for (final s in history) {
      final hour = s.startTime.hour;
      grouped.putIfAbsent(hour, () => []).add(s.averageEngagement);
    }

    final sortedHours = grouped.keys.toList()..sort();
    final List<BarChartGroupData> barGroups = [];

    for (int i = 0; i < sortedHours.length; i++) {
      final hour = sortedHours[i];
      final avg = grouped[hour]!.reduce((a, b) => a + b) / grouped[hour]!.length;
      barGroups.add(
        BarChartGroupData(
          x: hour,
          barRods: [
            BarChartRodData(
              toY: avg,
              color: _getColorForValue(context, avg),
              width: 16,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Avg Engagement by Hour", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        const SizedBox(height: 12),
        SizedBox(
          height: 160,
          child: BarChart(
            BarChartData(
              alignment: BarChartAlignment.spaceAround,
              maxY: 100,
              barGroups: barGroups,
              gridData: const FlGridData(show: false),
              borderData: FlBorderData(show: false),
              titlesData: FlTitlesData(
                leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    getTitlesWidget: (value, meta) {
                      final h = value.toInt();
                      final period = h >= 12 ? 'PM' : 'AM';
                      final displayHour = h == 0 ? 12 : (h > 12 ? h - 12 : h);
                      return Padding(
                        padding: const EdgeInsets.only(top: 8.0),
                        child: Text("$displayHour$period", style: const TextStyle(fontSize: 10)),
                      );
                    },
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Color _getColorForValue(BuildContext context, double value) {
    if (value >= 70) return const Color(0xFF2E7D32);
    if (value >= 40) return const Color(0xFFF57C00);
    return Theme.of(context).colorScheme.error;
  }
}

class SubjectSectionComparisonChart extends StatelessWidget {
  final List<SessionSummaryModel> history;

  const SubjectSectionComparisonChart({super.key, required this.history});

  @override
  Widget build(BuildContext context) {
    if (history.isEmpty) return const SizedBox.shrink();

    final Map<String, List<double>> grouped = {};
    for (final s in history) {
      grouped.putIfAbsent(s.sectionName, () => []).add(s.averageEngagement);
    }

    final sections = grouped.keys.toList()..sort();
    final List<BarChartGroupData> barGroups = [];

    for (int i = 0; i < sections.length; i++) {
      final section = sections[i];
      final avg = grouped[section]!.reduce((a, b) => a + b) / grouped[section]!.length;
      barGroups.add(
        BarChartGroupData(
          x: i,
          barRods: [
            BarChartRodData(
              toY: avg,
              color: _getColorForValue(context, avg),
              width: 20,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Engagement by Section", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        const SizedBox(height: 12),
        SizedBox(
          height: 160,
          child: BarChart(
            BarChartData(
              alignment: BarChartAlignment.spaceAround,
              maxY: 100,
              barGroups: barGroups,
              gridData: const FlGridData(show: false),
              borderData: FlBorderData(show: false),
              titlesData: FlTitlesData(
                leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    getTitlesWidget: (value, meta) {
                      final index = value.toInt();
                      if (index < 0 || index >= sections.length) return const SizedBox.shrink();
                      return Padding(
                        padding: const EdgeInsets.only(top: 8.0),
                        child: Text(sections[index], style: const TextStyle(fontSize: 10), overflow: TextOverflow.ellipsis),
                      );
                    },
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Color _getColorForValue(BuildContext context, double value) {
    if (value >= 70) return const Color(0xFF2E7D32);
    if (value >= 40) return const Color(0xFFF57C00);
    return Theme.of(context).colorScheme.error;
  }
}
