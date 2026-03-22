import 'package:flutter/material.dart';
import 'package:teachtrack/features/session/domain/models/session_models.dart';

class SessionKpiGridView extends StatelessWidget {
  final SessionMetricsModel metrics;

  const SessionKpiGridView({super.key, required this.metrics});

  @override
  Widget build(BuildContext context) {
    final latest = metrics.recentLogs.isEmpty ? null : metrics.recentLogs.last;
    final observed = latest == null
        ? 0
        : latest.onTask +
            latest.usingPhone +
            latest.sleeping +
            latest.disengagedPosture;
    final notVisible = latest?.notVisible ?? 0;
    final highRisk = latest == null
        ? 0
        : latest.sleeping + latest.usingPhone + latest.disengagedPosture;

    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        _KpiTile(
          title: "Present",
          value: metrics.studentsPresent.toString(),
          icon: Icons.groups_rounded,
        ),
        _KpiTile(
          title: "Observed",
          value: observed.toString(),
          icon: Icons.visibility_rounded,
        ),
        _KpiTile(
          title: "Not Visible",
          value: notVisible.toString(),
          icon: Icons.visibility_off_rounded,
        ),
        _KpiTile(
          title: "Risk Behaviors",
          value: highRisk.toString(),
          icon: Icons.warning_amber_rounded,
          isAlert: highRisk > 0,
        ),
      ],
    );
  }
}

class _KpiTile extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final bool isAlert;

  const _KpiTile({
    required this.title,
    required this.value,
    required this.icon,
    this.isAlert = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final alertColor = theme.colorScheme.error;
    final bgColor = isAlert 
        ? alertColor.withOpacity(0.1) 
        : theme.colorScheme.surfaceContainerLow;
    final iconColor = isAlert ? alertColor : theme.colorScheme.primary;

    return Container(
      width: (MediaQuery.of(context).size.width - 54) / 2,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: bgColor,
        border: Border.all(
          color: isAlert ? alertColor.withOpacity(0.3) : Colors.transparent,
        ),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: iconColor),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: theme.textTheme.labelSmall),
                Text(
                  value,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
