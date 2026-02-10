import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../provider/session_provider.dart';
import '../../../data/models/classroom_session_models.dart';

class MonitoringScreen extends StatelessWidget {
  const MonitoringScreen({super.key});

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
                child: const Text("STOP", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildStatusCard(context, session.activeSession!),
                const SizedBox(height: 24),
                const Text("Classroom Pulse", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                if (metrics == null)
                  const Center(child: CircularProgressIndicator())
                else ...[
                  _buildEngagementCard(context, metrics),
                  const SizedBox(height: 24),
                  const Text("Real-time Metrics", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  _buildBehaviorGrid(context, metrics.recentLogs.isNotEmpty ? metrics.recentLogs.last : null),
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
                        color: Colors.red.shade50,
                        child: ListTile(
                          leading: const Icon(Icons.warning, color: Colors.red),
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

  Widget _buildStatusCard(BuildContext context, SessionModel session) {
    return Card(
      elevation: 0,
      color: Theme.of(context).primaryColor.withOpacity(0.1),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            const Icon(Icons.radio_button_checked, color: Colors.red),
            const SizedBox(width: 12),
            const Text("LIVE", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
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
              style: TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: Theme.of(context).primaryColor)),
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
            onPressed: () {
              session.stopSession();
              Navigator.pop(context); // Close dialog
              Navigator.pop(context); // Go back from monitoring
            }, 
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text("Stop Session"),
          ),
        ],
      ),
    );
  }
}
