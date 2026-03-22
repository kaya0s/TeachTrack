import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/features/session/domain/models/session_models.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';
import '../widgets/engagement_card.dart';
import '../widgets/session_kpi_grid_view.dart';
import '../widgets/behavior_snapshot_chart.dart';
import '../widgets/behavior_trend_chart.dart';
import '../widgets/session_summary_dialog.dart';

class MonitoringScreen extends StatefulWidget {
  final int sessionId;
  final bool isEmbedded;

  const MonitoringScreen({super.key, required this.sessionId, this.isEmbedded = false});

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
    // Use context safely or check if mounted if needed
    // But usually provider logic in dispose is tricky if the widget is already gone
    super.dispose();
  }

  Future<void> _confirmStop(BuildContext context, SessionProvider session) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Stop Monitoring?"),
        content: const Text("This will end the current session and save the results."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            child: const Text("Stop"),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final finalMetrics = session.metrics;
      final finalSession = session.activeSession;
      await session.stopServerDetector();
      await session.stopSession();
      if (!mounted) return;
      if (finalMetrics != null && finalSession != null) {
        await SessionSummaryDialog.show(context, session: finalSession, metrics: finalMetrics);
      }
      if (!mounted) return;
      if (!widget.isEmbedded) {
        Navigator.pop(context); // Go back to dashboard
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<SessionProvider>(
      builder: (context, session, child) {
        if (session.activeSession == null) {
          return const Scaffold(body: Center(child: Text("No active session")));
        }

        final metrics = session.metrics;

        return Scaffold(
          appBar: AppBar(
            automaticallyImplyLeading: !widget.isEmbedded,
            title: const Text("Live Monitoring"),
            actions: [
              TextButton(
                onPressed: () => _confirmStop(context, session),
                child: const Text("Stop", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildStatusBanner(context),
                const SizedBox(height: 16),
                if (metrics == null)
                  const Center(child: CircularProgressIndicator())
                else ...[
                  SessionKpiGridView(metrics: metrics),
                  const SizedBox(height: 24),
                  const Text("Engagement", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  EngagementCard(metrics: metrics),
                  const SizedBox(height: 24),
                  const Text("Behaviors", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  BehaviorSnapshotChart(
                    latestLog: metrics.recentLogs.isEmpty ? null : metrics.recentLogs.last,
                    studentsPresent: metrics.studentsPresent,
                  ),
                  const SizedBox(height: 24),
                  BehaviorTrendChart(metrics: metrics),
                ],
                const SizedBox(height: 24),
                _buildAlertList(context, metrics),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatusBanner(BuildContext context) {
     return Card(
       color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.5),
       child: const Padding(
         padding: EdgeInsets.all(16.0),
         child: Row(
           children: [
              Icon(Icons.sensors_rounded, color: Colors.blue),
              SizedBox(width: 12),
              Expanded(child: Text("AI detection is active. Metrics update automatically.", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
           ],
         ),
       ),
     );
  }

  Widget _buildAlertList(BuildContext context, SessionMetricsModel? metrics) {
    if (metrics == null || metrics.alerts.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Recent Alerts", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        ...metrics.alerts.reversed.map((alert) => Card(
          margin: const EdgeInsets.only(bottom: 8),
          color: Colors.red.shade50,
          child: ListTile(
            leading: const Icon(Icons.warning_amber_rounded, color: Colors.orange),
            title: Text(alert.message, style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text(alert.alertType),
          ),
        )),
      ],
    );
  }
}
