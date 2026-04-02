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
import 'package:intl/intl.dart';
import 'package:teachtrack/core/utils/image_url_resolver.dart';

class MonitoringScreen extends StatefulWidget {
  final int sessionId;
  final bool isEmbedded;

  const MonitoringScreen({super.key, required this.sessionId, this.isEmbedded = false});

  @override
  State<MonitoringScreen> createState() => _MonitoringScreenState();
}

class _MonitoringScreenState extends State<MonitoringScreen> {
  Timer? _heartbeatTimer;

  int? _lastAlertId;
  AlertModel? _latestAlertWithSnapshot;

  @override
  void initState() {
    super.initState();
    _startDetectorAndHeartbeat();
  }

  void _checkForNewAlerts(SessionMetricsModel metrics) {
    if (metrics.alerts.isEmpty) return;
    final latestAlert = metrics.alerts.last;
    
    if (_lastAlertId != latestAlert.id) {
      _lastAlertId = latestAlert.id;
      
      // Update snapshot if available
      if (latestAlert.snapshotUrl != null) {
        setState(() {
          _latestAlertWithSnapshot = latestAlert;
        });
      }

      // Show popup
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _showAlertPopup(context, latestAlert);
      });
    }
  }

  void _showAlertPopup(BuildContext context, AlertModel alert) {
    if (!mounted) return;
    final theme = Theme.of(context);
    final size = MediaQuery.of(context).size;
    final topMargin = MediaQuery.of(context).viewPadding.top + 10;
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: Colors.transparent,
        elevation: 0,
        duration: const Duration(seconds: 5),
        margin: EdgeInsets.only(
          bottom: size.height - 200, 
          left: 16,
          right: 16,
        ),
        padding: EdgeInsets.zero,
        content: Container(
          decoration: BoxDecoration(
            color: Colors.red.shade900,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.red.withOpacity(0.3),
                blurRadius: 15,
                spreadRadius: 2,
                offset: const Offset(0, 4),
              ),
            ],
            border: Border.all(color: Colors.white.withOpacity(0.2), width: 1.5),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.security_rounded, color: Colors.white, size: 24),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            alert.alertType.replaceAll('_', ' ').toUpperCase(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 14,
                              letterSpacing: 1.0,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            alert.message,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white70),
                      onPressed: () => ScaffoldMessenger.of(context).hideCurrentSnackBar(),
                    ),
                  ],
                ),
              ),
              if (alert.snapshotUrl != null)
                Container(
                  height: 4,
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    color: Colors.white30,
                    borderRadius: BorderRadius.vertical(bottom: Radius.circular(16)),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _startDetectorAndHeartbeat() {
    final session = Provider.of<SessionProvider>(context, listen: false);
    session.startServerDetector();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 10), (timer) {
      if (mounted) {
        session.heartbeatServerDetector();
      }
    });
  }

  void _confirmStop(BuildContext context, SessionProvider session) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text("End Session?"),
        content: const Text("This will stop real-time monitoring and save behavioral analytics for this session."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("CANCEL")),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx); // Close dialog
              await session.stopSession();
              // Auto-pop logic in builder will trigger once session.activeSession is null
            },
            style: FilledButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.error),
            child: const Text("STOP SESSION"),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _heartbeatTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<SessionProvider, ClassroomProvider>(
      builder: (context, session, classroom, child) {
        if (session.activeSession == null) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted && !widget.isEmbedded) {
              Navigator.of(context).popUntil((route) => route.isFirst);
            }
          });
          return const Scaffold(
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text("Session ended. Returning to dashboard..."),
                ],
              ),
            ),
          );
        }

        final metrics = session.metrics;
        final active = session.activeSession!;
        
        if (metrics != null) {
          _checkForNewAlerts(metrics);
        }

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
                  decoration: BoxDecoration(
                    color: active.activityMode == 'EXAM' ? Colors.orange : Colors.red, 
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: (active.activityMode == 'EXAM' ? Colors.orange : Colors.red).withOpacity(0.4),
                        blurRadius: 4,
                        spreadRadius: 2,
                      )
                    ]
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  active.activityMode == 'EXAM' ? "EXAM MONITORING" : "LIVE AI MONITORING",
                  style: const TextStyle(
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
                    backgroundColor: Theme.of(context).colorScheme.error.withOpacity(0.12),
                    foregroundColor: Theme.of(context).colorScheme.error,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                    side: BorderSide(color: Theme.of(context).colorScheme.error.withOpacity(0.25), width: 1),
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
                if (active.activityMode == 'EXAM')
                   _buildExamAlertPanel(context),
                
                if (subject != null || section != null) ...[
                  Card(
                    elevation: 0,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  subject?.name ?? 'Class Session',
                                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                        fontWeight: FontWeight.w800,
                                      ),
                                ),
                              ),
                              _buildModeBadge(context, active.activityMode),
                            ],
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

                if (_latestAlertWithSnapshot != null) ...[
                   _buildDetectionSnapshot(context, _latestAlertWithSnapshot!),
                   const SizedBox(height: 20),
                ],

                _buildStatusBanner(context, active.activityMode),
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

  Widget _buildModeBadge(BuildContext context, String mode) {
    Color color;
    IconData icon;
    
    switch (mode) {
      case 'EXAM':
        color = Colors.red;
        icon = Icons.assignment_turned_in_rounded;
        break;
      case 'COLLABORATION':
        color = Colors.orange;
        icon = Icons.groups_rounded;
        break;
      case 'STUDY':
        color = Colors.green;
        icon = Icons.menu_book_rounded;
        break;
      default:
        color = Colors.blue;
        icon = Icons.school_rounded;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            mode,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExamAlertPanel(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.withOpacity(0.15)),
      ),
      child: Row(
        children: [
          const Icon(Icons.gavel_rounded, color: Colors.red, size: 20),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'EXAM MODE ACTIVE: Enhanced tracking for prohibited items and off-task behaviors.',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetectionSnapshot(BuildContext context, AlertModel alert) {
    return Card(
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 4,
      shadowColor: Colors.black26,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: Colors.red.shade900,
            child: Row(
              children: [
                const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 18),
                const SizedBox(width: 10),
                const Text(
                  "LATEST DETECTION SNAPSHOT",
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 11, letterSpacing: 0.5),
                ),
                const Spacer(),
                Text(
                  "${alert.triggeredAt.hour}:${alert.triggeredAt.minute.toString().padLeft(2, '0')}:${alert.triggeredAt.second.toString().padLeft(2, '0')}",
                  style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          if (alert.snapshotUrl != null)
            Stack(
              children: [
                Image.network(
                  alert.snapshotUrl!,
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    height: 200,
                    color: Colors.grey.shade200,
                    child: const Center(child: Icon(Icons.broken_image_rounded, size: 48, color: Colors.grey)),
                  ),
                ),
                Positioned(
                  bottom: 12,
                  left: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      alert.alertType.toUpperCase(),
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            )
          else
             const SizedBox(height: 200, child: Center(child: Text("Waiting for detection..."))),
        ],
      ),
    );
  }

  Widget _buildStatusBanner(BuildContext context, String mode) {
    final cs = Theme.of(context).colorScheme;
    final isExam = mode == 'EXAM';

    return Card(
      color: isExam ? Colors.orange.withOpacity(0.12) : cs.primaryContainer.withOpacity(0.5),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isExam ? Colors.orange.withOpacity(0.2) : cs.primary.withOpacity(0.1),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Icon(
              isExam ? Icons.security_rounded : Icons.sensors_rounded,
              color: isExam ? Colors.orange.shade800 : cs.primary,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                isExam
                    ? "EXAM MONITORING: Enhanced suspicious behavior tracking active."
                    : "AI detection is active. Metrics update automatically.",
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: isExam ? Colors.orange.shade900 : cs.onPrimaryContainer,
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
        ...metrics.alerts.reversed.map((alert) {
          final imageUrl = resolveImageUrl(alert.snapshotUrl);
          
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            elevation: 0,
            color: cs.errorContainer.withOpacity(0.4),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: cs.error.withOpacity(0.1)),
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (imageUrl != null)
                  AspectRatio(
                    aspectRatio: 16 / 9,
                    child: Image.network(
                      imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: Colors.grey.withOpacity(0.1),
                        child: const Icon(Icons.broken_image_rounded, color: Colors.grey),
                      ),
                    ),
                  ),
                ListTile(
                  leading: CircleAvatar(
                    backgroundColor: cs.error.withOpacity(0.2),
                    child: Icon(Icons.warning_amber_rounded, color: cs.error, size: 20),
                  ),
                  title: Text(
                    alert.message,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  subtitle: Text(
                    "${alert.alertType} · ${DateFormat('HH:mm').format(alert.triggeredAt)}",
                    style: TextStyle(fontSize: 11, color: cs.onSurfaceVariant),
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }
}
