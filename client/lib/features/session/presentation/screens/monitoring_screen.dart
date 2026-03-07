import 'dart:async';

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';
import 'package:teachtrack/features/classroom/domain/models/classroom_session_models.dart';

part 'monitoring_ui.dart';
part 'monitoring_models.dart';

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
                  _buildBehaviorTrendChart(context, metrics),
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
}
