import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:teachtrack/features/session/domain/models/session_models.dart';

class BehaviorSnapshotChart extends StatelessWidget {
  final BehaviorLogModel? latestLog;
  final int studentsPresent;

  const BehaviorSnapshotChart({
    super.key,
    required this.latestLog,
    required this.studentsPresent,
  });

  @override
  Widget build(BuildContext context) {
    if (latestLog == null) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(24.0),
          child: Center(child: Text("Waiting for ML data...", style: TextStyle(color: Colors.grey))),
        ),
      );
    }

    final sections = [
      _pieSection("On Task", latestLog!.onTask.toDouble(), const Color(0xFF2E7D32)),
      _pieSection("Phone", latestLog!.usingPhone.toDouble(), const Color(0xFFF57C00)),
      _pieSection("Sleeping", latestLog!.sleeping.toDouble(), const Color(0xFFD32F2F)),
      _pieSection("Disengaged", latestLog!.disengagedPosture.toDouble(), const Color(0xFF6A1B9A)),
      _pieSection("Not Visible", latestLog!.notVisible.toDouble(), Colors.grey),
    ].where((e) => e.value > 0).toList();

    final total = sections.fold<double>(0, (sum, item) => sum + item.value);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Latest Behavior Snapshot",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 16),
            if (total == 0)
              const Center(child: Text("No detections yet."))
            else
              Row(
                children: [
                  SizedBox(
                    width: 140,
                    height: 140,
                    child: PieChart(
                      PieChartData(
                        sectionsSpace: 3,
                        centerSpaceRadius: 36,
                        sections: sections
                            .map((item) => PieChartSectionData(
                                  value: item.value,
                                  color: item.color,
                                  radius: 30,
                                  title: "",
                                ))
                            .toList(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 20),
                  Expanded(
                    child: Column(
                      children: sections
                          .map((item) => Padding(
                                padding: const EdgeInsets.symmetric(vertical: 4),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 12,
                                      height: 12,
                                      decoration: BoxDecoration(color: item.color, shape: BoxShape.circle),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(child: Text(item.label, style: const TextStyle(fontWeight: FontWeight.w500))),
                                    Text("${item.value.toInt()}", style: const TextStyle(fontWeight: FontWeight.w800)),
                                  ],
                                ),
                              ))
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

  _PieDatum _pieSection(String label, double value, Color color) {
    return _PieDatum(label: label, value: value, color: color);
  }
}

class _PieDatum {
  final String label;
  final double value;
  final Color color;
  _PieDatum({required this.label, required this.value, required this.color});
}
