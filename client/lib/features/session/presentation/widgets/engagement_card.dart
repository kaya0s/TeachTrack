import 'package:flutter/material.dart';
import 'package:teachtrack/features/session/domain/models/session_models.dart';

class EngagementCard extends StatelessWidget {
  final SessionMetricsModel metrics;

  const EngagementCard({super.key, required this.metrics});

  @override
  Widget build(BuildContext context) {
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
                    backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                    color: color,
                  ),
                  Text(
                    "${metrics.averageEngagement.toInt()}%",
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: color,
                      fontSize: 18,
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
                  const Text("Average Engagement", style: TextStyle(fontWeight: FontWeight.w500)),
                  const SizedBox(height: 6),
                  Text(
                    label,
                    style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 10),
                  LinearProgressIndicator(
                    value: progress,
                    backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
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
}
