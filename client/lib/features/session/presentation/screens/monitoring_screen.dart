import 'dart:async';
import 'dart:ui';
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
import 'package:intl/intl.dart';
import 'package:teachtrack/core/utils/image_url_resolver.dart';

class MonitoringScreen extends StatefulWidget {
  final int sessionId;
  final bool isEmbedded;

  const MonitoringScreen(
      {super.key, required this.sessionId, this.isEmbedded = false});

  @override
  State<MonitoringScreen> createState() => _MonitoringScreenState();
}

class _MonitoringScreenState extends State<MonitoringScreen> {
  Timer? _heartbeatTimer;
  bool _switchingMode = false;

  int? _lastAlertId;
  AlertModel? _latestAlertWithSnapshot;

  @override
  void initState() {
    super.initState();
    _startDetectorAndHeartbeat();

    // Listen for metrics changes to check for new alerts
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final session = Provider.of<SessionProvider>(context, listen: false);
      session.addListener(_onSessionChanged);
    });
  }

  void _onSessionChanged() {
    final metrics =
        Provider.of<SessionProvider>(context, listen: false).metrics;
    if (metrics != null) {
      _checkForNewAlerts(metrics);
    }
  }

  @override
  void dispose() {
    _heartbeatTimer?.cancel();
    final session = Provider.of<SessionProvider>(context, listen: false);
    session.removeListener(_onSessionChanged);
    super.dispose();
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
    final size = MediaQuery.of(context).size;
    final topPadding = MediaQuery.of(context).viewPadding.top;

    // Clear previous snackbars to avoid stacking
    ScaffoldMessenger.of(context).hideCurrentSnackBar();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: Colors.transparent,
        elevation: 0,
        duration: const Duration(seconds: 4),
        margin: EdgeInsets.only(
          bottom: size.height - topPadding - 120,
          left: 16,
          right: 16,
        ),
        padding: EdgeInsets.zero,
        content: ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.85),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.2),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
                border:
                    Border.all(color: Colors.white.withOpacity(0.3), width: 1),
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () =>
                      ScaffoldMessenger.of(context).hideCurrentSnackBar(),
                  borderRadius: BorderRadius.circular(20),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 14),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.warning_amber_rounded,
                              color: Colors.white, size: 24),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "AI DETECTION ALERT",
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.9),
                                  fontWeight: FontWeight.w900,
                                  fontSize: 10,
                                  letterSpacing: 1.2,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                alert.message,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  height: 1.2,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                alert.alertType
                                    .replaceAll('_', ' ')
                                    .toUpperCase(),
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.7),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right_rounded,
                            color: Colors.white54),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _startDetectorAndHeartbeat() {
    final session = Provider.of<SessionProvider>(context, listen: false);

    // Fire and forget warmup so we show detections faster on first open.
    Future.microtask(() => session.warmupLiveMonitoring());

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
        content: const Text(
            "This will stop real-time monitoring and save behavioral analytics for this session."),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text("CANCEL")),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx); // Close dialog
              await session.stopSession();
              // Auto-pop logic in builder will trigger once session.activeSession is null
            },
            style: FilledButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.error),
            child: const Text("STOP SESSION"),
          ),
        ],
      ),
    );
  }

  Future<void> _changeMode(
      BuildContext context, SessionProvider session, String mode) async {
    if (session.activeSession?.activityMode == mode || _switchingMode) return;

    if (mode == 'EXAM') {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Switch to exam mode?'),
          content: const Text(
            'Enhanced tracking will apply to all new detections. The session will remain live.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('CANCEL'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('SWITCH'),
            ),
          ],
        ),
      );
      if (confirmed != true || !mounted) return;
    }

    setState(() => _switchingMode = true);
    final changed = await session.switchSessionMode(mode);
    if (!mounted) return;
    setState(() => _switchingMode = false);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(changed
            ? 'Live mode changed to $mode.'
            : (session.error ?? 'Unable to change live mode.')),
      ),
    );
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

        // Don't call _checkForNewAlerts here - it will be called when metrics change

        SubjectModel? subject;
        try {
          subject =
              classroom.subjects.firstWhere((s) => s.id == active.subjectId);
        } catch (_) {
          subject = null;
        }

        SectionModel? section;
        if (subject != null) {
          try {
            section =
                subject.sections.firstWhere((s) => s.id == active.sectionId);
          } catch (_) {
            section = null;
          }
        }
        if (section == null) {
          try {
            section =
                classroom.sections.firstWhere((s) => s.id == active.sectionId);
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
                      color: active.activityMode == 'EXAM'
                          ? Colors.orange
                          : Colors.red,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: (active.activityMode == 'EXAM'
                                  ? Colors.orange
                                  : Colors.red)
                              .withOpacity(0.4),
                          blurRadius: 4,
                          spreadRadius: 2,
                        )
                      ]),
                ),
                const SizedBox(width: 10),
                Text(
                  active.activityMode == 'EXAM'
                      ? "EXAM MONITORING"
                      : "LIVE AI MONITORING",
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.8,
                  ),
                ),
              ],
            ),
            actions: [
              PopupMenuButton<String>(
                enabled: !_switchingMode && !session.isSwitchingMode,
                tooltip: 'Change live mode',
                onSelected: (mode) => _changeMode(context, session, mode),
                itemBuilder: (context) => const [
                  PopupMenuItem(value: 'LECTURE', child: Text('Lecture')),
                  PopupMenuItem(value: 'EXAM', child: Text('Exam')),
                ],
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (_switchingMode)
                        const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2))
                      else
                        const Icon(Icons.tune_rounded, size: 18),
                      const SizedBox(width: 4),
                      Text(active.activityMode,
                          style: const TextStyle(
                              fontSize: 11, fontWeight: FontWeight.w800)),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(right: 12, top: 10, bottom: 10),
                child: FilledButton.icon(
                  onPressed: () => _confirmStop(context, session),
                  icon: const Icon(Icons.stop_rounded, size: 16),
                  label: const Text(
                    "STOP",
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5),
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor:
                        Theme.of(context).colorScheme.error.withOpacity(0.12),
                    foregroundColor: Theme.of(context).colorScheme.error,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(100)),
                    side: BorderSide(
                        color: Theme.of(context)
                            .colorScheme
                            .error
                            .withOpacity(0.25),
                        width: 1),
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
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleMedium
                                      ?.copyWith(
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
                              Icon(Icons.groups_rounded,
                                  size: 14,
                                  color:
                                      Theme.of(context).colorScheme.secondary),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  section?.name ?? 'Section',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(
                                        color: Theme.of(context)
                                            .colorScheme
                                            .secondary,
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
                _buildStatusBanner(
                  context,
                  active.activityMode,
                  session.detectorStatus,
                ),
                const SizedBox(height: 16),
                if (metrics == null)
                  const Center(child: CircularProgressIndicator())
                else ...[
                  SessionKpiGridView(metrics: metrics),
                  const SizedBox(height: 24),
                  const Text("Engagement",
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  EngagementCard(metrics: metrics),
                  const SizedBox(height: 24),
                  const Text("Behaviors",
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  BehaviorSnapshotChart(
                    latestLog: metrics.recentLogs.isEmpty
                        ? null
                        : metrics.recentLogs.last,
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

  Widget _buildModeSelector(
      BuildContext context, SessionProvider session, String currentMode) {
    final color = _modeColor(currentMode);
    final disabled = _switchingMode || session.isSwitchingMode;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: PopupMenuButton<String>(
        enabled: !disabled,
        tooltip: 'Change live monitoring mode',
        onSelected: (mode) => _changeMode(context, session, mode),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        itemBuilder: (context) => [
          _modeMenuItem(
              'LECTURE', 'Lecture', Icons.school_rounded, currentMode),
          _modeMenuItem(
              'EXAM', 'Exam', Icons.assignment_turned_in_rounded, currentMode),
        ],
        child: Container(
          constraints: const BoxConstraints(minWidth: 112),
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            color: color.withOpacity(0.12),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: color.withOpacity(0.45)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (disabled)
                SizedBox(
                  width: 15,
                  height: 15,
                  child:
                      CircularProgressIndicator(strokeWidth: 2, color: color),
                )
              else
                Icon(Icons.tune_rounded, size: 16, color: color),
              const SizedBox(width: 6),
              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('MODE',
                      style: TextStyle(
                          fontSize: 8,
                          fontWeight: FontWeight.w900,
                          color: color)),
                  Text(_modeLabel(currentMode),
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: color)),
                ],
              ),
              const SizedBox(width: 3),
              Icon(Icons.expand_more_rounded, size: 16, color: color),
            ],
          ),
        ),
      ),
    );
  }

  PopupMenuItem<String> _modeMenuItem(
      String value, String label, IconData icon, String currentMode) {
    final selected = value == currentMode;
    return PopupMenuItem(
      value: value,
      child: Row(
        children: [
          Icon(icon, size: 18),
          const SizedBox(width: 10),
          Expanded(child: Text(label)),
          if (selected) const Icon(Icons.check_rounded, size: 18),
        ],
      ),
    );
  }

  String _modeLabel(String mode) {
    return mode;
  }

  Color _modeColor(String mode) {
    switch (mode) {
      case 'EXAM':
        return Colors.red;
      default:
        return Colors.blue;
    }
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
              style: TextStyle(
                  fontSize: 12, fontWeight: FontWeight.w700, color: Colors.red),
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
                const Icon(Icons.camera_alt_rounded,
                    color: Colors.white, size: 18),
                const SizedBox(width: 10),
                const Text(
                  "LATEST DETECTION SNAPSHOT",
                  style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 11,
                      letterSpacing: 0.5),
                ),
                const Spacer(),
                Text(
                  "${alert.triggeredAt.hour}:${alert.triggeredAt.minute.toString().padLeft(2, '0')}:${alert.triggeredAt.second.toString().padLeft(2, '0')}",
                  style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 11,
                      fontWeight: FontWeight.bold),
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
                    child: const Center(
                        child: Icon(Icons.broken_image_rounded,
                            size: 48, color: Colors.grey)),
                  ),
                ),
                Positioned(
                  bottom: 12,
                  left: 12,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      alert.alertType.toUpperCase(),
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            )
          else
            const SizedBox(
                height: 200,
                child: Center(child: Text("Waiting for detection..."))),
        ],
      ),
    );
  }

  Widget _buildStatusBanner(
    BuildContext context,
    String mode,
    DetectorStatusModel? detectorStatus,
  ) {
    final cs = Theme.of(context).colorScheme;
    final isExam = mode == 'EXAM';
    final isWaiting = detectorStatus?.isWaiting == true;
    final message = detectorStatus?.message ??
        (isExam
            ? "EXAM MONITORING: Enhanced suspicious behavior tracking active."
            : "AI detection is active. Metrics update automatically.");
    final icon = isWaiting
        ? Icons.sync_problem_rounded
        : (isExam ? Icons.security_rounded : Icons.sensors_rounded);
    final accent = isWaiting
        ? Colors.amber.shade800
        : (isExam ? Colors.orange.shade800 : cs.primary);

    return Card(
      color: isWaiting
          ? Colors.amber.withValues(alpha: 0.14)
          : isExam
              ? Colors.orange.withValues(alpha: 0.12)
              : cs.primaryContainer.withValues(alpha: 0.5),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isWaiting
              ? Colors.amber.withValues(alpha: 0.3)
              : isExam
                  ? Colors.orange.withValues(alpha: 0.2)
                  : cs.primary.withValues(alpha: 0.1),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Icon(
              icon,
              color: accent,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: isWaiting
                      ? Colors.amber.shade900
                      : isExam
                          ? Colors.orange.shade900
                          : cs.onPrimaryContainer,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAlertList(BuildContext context, SessionMetricsModel? metrics) {
    if (metrics == null || metrics.alerts.isEmpty)
      return const SizedBox.shrink();
    final cs = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Recent Alerts",
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
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
                        child: const Icon(Icons.broken_image_rounded,
                            color: Colors.grey),
                      ),
                    ),
                  ),
                ListTile(
                  leading: CircleAvatar(
                    backgroundColor: cs.error.withOpacity(0.2),
                    child: Icon(Icons.warning_amber_rounded,
                        color: cs.error, size: 20),
                  ),
                  title: Text(
                    alert.message,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 13),
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
