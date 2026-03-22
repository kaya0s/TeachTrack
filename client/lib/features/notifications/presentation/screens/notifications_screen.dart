import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import 'package:teachtrack/features/session/domain/models/session_models.dart';
import 'package:teachtrack/features/classroom/presentation/providers/classroom_provider.dart';
import 'package:teachtrack/features/classroom/presentation/screens/subject_details_screen.dart';
import 'package:teachtrack/features/auth/presentation/providers/auth_provider.dart';
import 'package:teachtrack/app/widgets/splash_gate.dart';
import 'package:teachtrack/features/notifications/domain/models/notification_model.dart';
import 'package:teachtrack/features/notifications/presentation/providers/notification_provider.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  int _selectedFeed = 0; // 0 = notifications, 1 = alerts
  Timer? _alertsTimer;
  bool _isRedirecting = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final auth = context.read<AuthProvider>();
      if (!auth.isAuthenticated) {
        await _handleUnauthenticated(
          message:
              'Your session has expired. Please sign in again to continue.',
        );
        return;
      }
      final provider = context.read<NotificationProvider>();
      if (provider.showUnreadOnly) {
        provider.setUnreadOnly(false);
      }
      await _loadAllFeeds();
      if (!mounted) return;
      provider.startRealtimePolling();
      _alertsTimer = Timer.periodic(const Duration(seconds: 10), (_) {
        _refreshAlertsSilently();
      });
    });
  }

  @override
  void dispose() {
    _alertsTimer?.cancel();
    context.read<NotificationProvider>().stopRealtimePolling();
    super.dispose();
  }

  Future<void> _loadAllFeeds({bool silent = false}) async {
    final auth = context.read<AuthProvider>();
    final notifications = context.read<NotificationProvider>();
    final sessions = context.read<SessionProvider>();

    if (!auth.isAuthenticated) {
      await _handleUnauthenticated(
        message:
            'You are not authenticated. Please log in to view notifications.',
      );
      return;
    }

    await notifications.load(silent: silent);
    await sessions.checkActiveSession();
    if (sessions.activeSession != null) {
      await sessions.fetchMetrics();
    }

    if (_isUnauthorizedError(notifications.error) ||
        _isUnauthorizedError(sessions.error)) {
      await _handleUnauthenticated(
        message:
            'Authentication failed while fetching notifications and alerts.',
      );
    }
  }

  Future<void> _refreshAlertsSilently() async {
    if (!mounted) return;
    final sessions = context.read<SessionProvider>();
    if (sessions.activeSession == null) {
      await sessions.checkActiveSession();
    }
    if (sessions.activeSession != null) {
      await sessions.fetchMetrics();
    }

    if (_isUnauthorizedError(sessions.error)) {
      await _handleUnauthenticated(
        message: 'Your session expired while refreshing alerts.',
      );
    }
  }

  bool _isUnauthorizedError(String? raw) {
    if (raw == null) return false;
    final text = raw.toLowerCase();
    return text.contains('401') ||
        text.contains('unauthorized') ||
        text.contains('not authenticated') ||
        text.contains('access token');
  }

  Future<void> _handleUnauthenticated({required String message}) async {
    if (!mounted || _isRedirecting) return;
    _isRedirecting = true;
    _alertsTimer?.cancel();
    context.read<NotificationProvider>().stopRealtimePolling();

    await context.read<AuthProvider>().logout();
    if (!mounted) return;

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.lock_outline_rounded),
            SizedBox(width: 8),
            Text('Authentication Required'),
          ],
        ),
        content: Text(message),
        actions: [
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Go to Login'),
          ),
        ],
      ),
    );

    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const SplashGate()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () => _loadAllFeeds(silent: true),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: Consumer3<AuthProvider, NotificationProvider, SessionProvider>(
        builder: (context, auth, notifications, sessions, child) {
          if (!auth.isAuthenticated) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.lock_clock_rounded, size: 36),
                    const SizedBox(height: 12),
                    Text(
                      'You need to log in to access notifications.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed: () => _handleUnauthenticated(
                        message:
                            'Your session has ended. Please login to continue.',
                      ),
                      icon: const Icon(Icons.login_rounded),
                      label: const Text('Go to Login'),
                    ),
                  ],
                ),
              ),
            );
          }

          final alerts = sessions.metrics?.alerts ?? const <AlertModel>[];
          final hasNotificationError =
              notifications.error != null && notifications.items.isEmpty;

          if (notifications.isLoading && notifications.items.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (hasNotificationError) {
            return Center(child: Text(notifications.error!));
          }

          return RefreshIndicator(
            onRefresh: _loadAllFeeds,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _FeedSummaryCard(
                        title: 'Unread',
                        value: '${notifications.unreadCount}',
                        icon: Icons.notifications_active_rounded,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _FeedSummaryCard(
                        title: 'Active Alerts',
                        value: '${alerts.where((a) => !a.isRead).length}',
                        icon: Icons.warning_amber_rounded,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _FeedSwitcher(
                  selectedFeed: _selectedFeed,
                  onChanged: (value) => setState(() => _selectedFeed = value),
                ),
                const SizedBox(height: 12),
                if (_selectedFeed == 0) ...[
                  Row(
                    children: [
                      ChoiceChip(
                        label: const Text('All'),
                        selected: !notifications.showUnreadOnly,
                        onSelected: (_) => notifications.setUnreadOnly(false),
                      ),
                      const SizedBox(width: 8),
                      ChoiceChip(
                        label: Text('Unread (${notifications.unreadCount})'),
                        selected: notifications.showUnreadOnly,
                        onSelected: (_) => notifications.setUnreadOnly(true),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  _NotificationsList(
                    items: notifications.items,
                    onMarkRead: notifications.markAsRead,
                    onOpenTarget: _openNotificationTarget,
                  ),
                ] else ...[
                  _AlertsList(
                    alerts: alerts,
                    hasActiveSession: sessions.activeSession != null,
                    onRefreshAlerts: _loadAllFeeds,
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _openNotificationTarget(TeacherNotificationModel item) async {
    if (!item.isRead) {
      await context.read<NotificationProvider>().markAsRead(item.id);
    }
    if (!mounted) return;

    if (item.metadataJson == null || item.metadataJson!.isEmpty) return;
    try {
      final meta = jsonDecode(item.metadataJson!);
      final subjectId = meta['subject_id'];
      if (subjectId is! int) return;

      final classroom = context.read<ClassroomProvider>();
      final subject =
          classroom.subjects.where((s) => s.id == subjectId).firstOrNull;
      if (subject == null || !mounted) return;

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => SubjectDetailsScreen(subject: subject),
        ),
      );
    } catch (_) {
      // Ignore metadata parse errors.
    }
  }
}

class _FeedSummaryCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;

  const _FeedSummaryCard({
    required this.title,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isAlert = icon == Icons.warning_amber_rounded;
    final accent =
        isAlert ? const Color(0xFFF59E0B) : theme.colorScheme.primary;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            accent.withOpacity(0.12),
            theme.colorScheme.surfaceContainerLow,
          ],
        ),
        border: Border.all(
          color: accent.withOpacity(0.25),
        ),
      ),
      child: Row(
        children: [
          Container(
            height: 36,
            width: 36,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: accent.withOpacity(0.15),
            ),
            child: Icon(
              icon,
              size: 18,
              color: accent,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  value,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FeedSwitcher extends StatelessWidget {
  final int selectedFeed;
  final ValueChanged<int> onChanged;

  const _FeedSwitcher({
    required this.selectedFeed,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    Widget item({
      required int index,
      required String text,
      required IconData icon,
    }) {
      final selected = selectedFeed == index;
      return Expanded(
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: selected ? theme.colorScheme.primary : Colors.transparent,
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: theme.colorScheme.primary.withOpacity(0.25),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => onChanged(index),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    icon,
                    size: 18,
                    color: selected
                        ? theme.colorScheme.onPrimary
                        : theme.hintColor,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    text,
                    style: theme.textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: selected ? theme.colorScheme.onPrimary : null,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        color: theme.colorScheme.surfaceContainerLow,
        border: Border.all(
          color: theme.dividerColor.withOpacity(0.35),
        ),
      ),
      child: Row(
        children: [
          item(
            index: 0,
            text: 'Notifications',
            icon: Icons.notifications_none_rounded,
          ),
          const SizedBox(width: 6),
          item(index: 1, text: 'Alerts', icon: Icons.warning_amber_rounded),
        ],
      ),
    );
  }
}

class _NotificationsList extends StatelessWidget {
  final List<TeacherNotificationModel> items;
  final Future<void> Function(int id) onMarkRead;
  final Future<void> Function(TeacherNotificationModel item) onOpenTarget;

  const _NotificationsList({
    required this.items,
    required this.onMarkRead,
    required this.onOpenTarget,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (items.isEmpty) {
      return _EmptyStateCard(
        icon: Icons.mark_email_read_outlined,
        title: 'No notifications yet',
        subtitle: 'Updates, summaries, and reminders will appear here.',
      );
    }

    return Column(
      children: items.map((item) {
        final read = item.isRead;
        final timestamp = DateFormat('MMM d, y  h:mm a').format(item.createdAt);
        final accent =
            read ? theme.colorScheme.outline : theme.colorScheme.primary;
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            color: read
                ? theme.colorScheme.surface
                : theme.colorScheme.primary.withOpacity(0.04),
            border: Border.all(
              color: accent.withOpacity(read ? 0.25 : 0.4),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.03),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () => onOpenTarget(item),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        height: 34,
                        width: 34,
                        decoration: BoxDecoration(
                          color: accent.withOpacity(0.14),
                          borderRadius: BorderRadius.circular(11),
                        ),
                        child: Icon(
                          _notificationIcon(item.type),
                          size: 18,
                          color: accent,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.title,
                              style: theme.textTheme.titleSmall?.copyWith(
                                fontWeight:
                                    read ? FontWeight.w600 : FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              item.body,
                              style: theme.textTheme.bodyMedium,
                            ),
                          ],
                        ),
                      ),
                      if (!read)
                        Container(
                          width: 9,
                          height: 9,
                          margin: const EdgeInsets.only(top: 6, left: 6),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Icon(
                        Icons.schedule_rounded,
                        size: 14,
                        color: theme.hintColor,
                      ),
                      const SizedBox(width: 5),
                      Expanded(
                        child: Text(
                          timestamp,
                          style: theme.textTheme.labelSmall,
                        ),
                      ),
                      if (!read)
                        TextButton(
                          onPressed: () => onMarkRead(item.id),
                          style: TextButton.styleFrom(
                            visualDensity: VisualDensity.compact,
                            minimumSize: const Size(0, 28),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 2,
                            ),
                          ),
                          child: const Text('Mark read'),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  IconData _notificationIcon(String rawType) {
    final type = rawType.toUpperCase();
    if (type.contains('ALERT')) return Icons.warning_amber_rounded;
    if (type.contains('SESSION')) return Icons.video_camera_front_rounded;
    if (type.contains('REPORT')) return Icons.description_outlined;
    return Icons.notifications_active_rounded;
  }
}

class _AlertsList extends StatelessWidget {
  final List<AlertModel> alerts;
  final bool hasActiveSession;
  final Future<void> Function() onRefreshAlerts;

  const _AlertsList({
    required this.alerts,
    required this.hasActiveSession,
    required this.onRefreshAlerts,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (!hasActiveSession) {
      return _EmptyStateCard(
        icon: Icons.sensor_occupied_outlined,
        title: 'No active session',
        subtitle: 'Start monitoring to receive live behavior alerts.',
      );
    }

    if (alerts.isEmpty) {
      return _EmptyStateCard(
        icon: Icons.verified_user_outlined,
        title: 'No active alerts',
        subtitle:
            'Current session is stable. Alerts will show here in real time.',
      );
    }

    final sorted = [...alerts]
      ..sort((a, b) => b.triggeredAt.compareTo(a.triggeredAt));

    return Column(
      children: [
        Align(
          alignment: Alignment.centerRight,
          child: TextButton.icon(
            onPressed: onRefreshAlerts,
            icon: const Icon(Icons.refresh_rounded, size: 16),
            label: const Text('Refresh Alerts'),
          ),
        ),
        ...sorted.map((alert) {
          final timestamp =
              DateFormat('MMM d, y  h:mm a').format(alert.triggeredAt);
          final severityColor = alert.isRead
              ? theme.colorScheme.outline
              : const Color(0xFFF57C00);

          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              color: theme.colorScheme.surfaceContainerLow,
              border: Border.all(
                color: severityColor.withOpacity(alert.isRead ? 0.25 : 0.45),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        height: 34,
                        width: 34,
                        decoration: BoxDecoration(
                          color: severityColor.withOpacity(0.14),
                          borderRadius: BorderRadius.circular(11),
                        ),
                        child: Icon(
                          Icons.warning_amber_rounded,
                          color: severityColor,
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _formatAlertType(alert.alertType),
                              style: theme.textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              alert.message,
                              style: theme.textTheme.bodyMedium,
                            ),
                          ],
                        ),
                      ),
                      Icon(
                        alert.isRead
                            ? Icons.check_circle_outline_rounded
                            : Icons.fiber_manual_record_rounded,
                        size: alert.isRead ? 18 : 10,
                        color: severityColor,
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Icon(
                        Icons.schedule_rounded,
                        size: 14,
                        color: theme.hintColor,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        timestamp,
                        style: theme.textTheme.labelSmall,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  String _formatAlertType(String raw) {
    return raw
        .replaceAll('_', ' ')
        .trim()
        .split(' ')
        .where((part) => part.isNotEmpty)
        .map((part) =>
            '${part[0].toUpperCase()}${part.substring(1).toLowerCase()}')
        .join(' ');
  }
}

class _EmptyStateCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _EmptyStateCard({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        color: Theme.of(context).colorScheme.surfaceContainerLow,
      ),
      child: Column(
        children: [
          Icon(icon, size: 28, color: Theme.of(context).hintColor),
          const SizedBox(height: 10),
          Text(
            title,
            style: Theme.of(context)
                .textTheme
                .titleSmall
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
