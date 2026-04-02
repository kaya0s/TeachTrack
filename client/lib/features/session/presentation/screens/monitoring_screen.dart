import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/core/widgets/hierarchy_meta_row.dart';
import 'package:teachtrack/features/classroom/domain/models/classroom_models.dart';
import 'package:teachtrack/features/classroom/presentation/providers/classroom_provider.dart';
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
    return Consumer2<SessionProvider, ClassroomProvider>(
      builder: (context, session, classroom, child) {
        if (session.activeSession == null) {
          return const Scaffold(body: Center(child: Text("No active session")));
        }

        final metrics = session.metrics;
        final active = session.activeSession!;

        SubjectModel? subject;
        try {
          subject = classroom.subjects.firstWhere((s) => s.id == active.subjectId);
        } catch (_) {
          subject = null;
        }

        SectionModel? section;
        if (subject != null) {
          try {
            section = subject.sections.firstWhere((s) => s.id == active.sectionId);
          } catch (_) {
            section = null;
          }
        }
        if (section == null) {
          try {
            section = classroom.sections.firstWhere((s) => s.id == active.sectionId);
          } catch (_) {
            section = null;
          }
        }

        final majorLabel = (subject?.majorCode?.trim().isNotEmpty == true)
            ? subject!.majorCode
            : subject?.majorName;

        return Scaffold(
          appBar: AppBar(
            automaticallyImplyLeading: !widget.isEmbedded,
            title: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                ),
                const SizedBox(width: 8),
                const Text(
                  "LIVE AI MONITORING",
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.8,
                  ),
                ),
              ],
            ),
            actions: [
              Padding(
                padding: const EdgeInsets.only(right: 12, top: 10, bottom: 10),
                child: FilledButton.icon(
                  onPressed: () => _confirmStop(context, session),
                  icon: const Icon(Icons.stop_rounded, size: 16),
                  label: const Text(
                    "STOP",
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.5),
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.error.withValues(alpha: 0.12),
                    foregroundColor: Theme.of(context).colorScheme.error,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                    side: BorderSide(color: Theme.of(context).colorScheme.error.withValues(alpha: 0.25), width: 1),
                  ),
                ),
              ),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (subject != null || section != null) ...[
                  Card(
                    elevation: 0,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            subject?.name ?? 'Class Session',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w800,
                                ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Icon(Icons.groups_rounded, size: 14, color: Theme.of(context).colorScheme.secondary),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  section?.name ?? 'Section',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                        color: Theme.of(context).colorScheme.secondary,
                                        fontWeight: FontWeight.w600,
                                      ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          HierarchyMetaRow(
                            collegeName: subject?.collegeName,
                            departmentName: subject?.departmentName,
                            majorLabel: majorLabel,
                            collegeLogoPath: subject?.collegeLogoPath,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
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
     final cs = Theme.of(context).colorScheme;
     return Card(
       color: cs.primaryContainer.withOpacity(0.5),
       child: Padding(
         padding: EdgeInsets.all(16.0),
         child: Row(
           children: [
              Icon(Icons.sensors_rounded, color: cs.primary),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  "AI detection is active. Metrics update automatically.",
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: cs.onPrimaryContainer,
                  ),
                ),
              ),
           ],
         ),
       ),
     );
  }

  Widget _buildAlertList(BuildContext context, SessionMetricsModel? metrics) {
    if (metrics == null || metrics.alerts.isEmpty) return const SizedBox.shrink();
    final cs = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Recent Alerts", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        ...metrics.alerts.reversed.map((alert) => Card(
          margin: const EdgeInsets.only(bottom: 8),
          color: cs.errorContainer.withOpacity(0.55),
          child: ListTile(
            leading: Icon(Icons.warning_amber_rounded, color: cs.error),
            title: Text(alert.message, style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text(alert.alertType),
          ),
        )),
      ],
    );
  }
}
