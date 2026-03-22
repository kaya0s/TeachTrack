import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/features/classroom/presentation/providers/classroom_provider.dart';
import 'package:teachtrack/features/classroom/presentation/screens/subject_details_screen.dart';
import 'package:teachtrack/features/notifications/domain/models/notification_model.dart';
import 'package:teachtrack/features/notifications/presentation/providers/notification_provider.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';

class NotificationsTab extends StatefulWidget {
  const NotificationsTab({super.key});

  @override
  State<NotificationsTab> createState() => _NotificationsTabState();
}

class _NotificationsTabState extends State<NotificationsTab> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationProvider>().load(silent: true);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Column(
      children: [
        Container(
          margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          decoration: BoxDecoration(
            color: theme.brightness == Brightness.dark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.03),
            borderRadius: BorderRadius.circular(16),
          ),
          child: TabBar(
            controller: _tabController,
            dividerColor: Colors.transparent,
            indicatorSize: TabBarIndicatorSize.tab,
            indicator: BoxDecoration(
              color: theme.colorScheme.primary,
              borderRadius: BorderRadius.circular(12),
            ),
            labelColor: theme.colorScheme.onPrimary,
            unselectedLabelColor: theme.textTheme.bodySmall?.color?.withOpacity(0.5),
            labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
            unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            tabs: const [
              Tab(text: 'General'),
              Tab(text: 'Behavior Alerts'),
            ],
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _GeneralNotificationsList(theme: theme),
              _BehaviorAlertsList(theme: theme),
            ],
          ),
        ),
      ],
    );
  }
}

class _GeneralNotificationsList extends StatelessWidget {
  final ThemeData theme;
  const _GeneralNotificationsList({required this.theme});

  @override
  Widget build(BuildContext context) {
    final notifications = context.watch<NotificationProvider>();
    final items = notifications.items.where((i) => !i.type.toUpperCase().contains('ALERT')).toList();

    return RefreshIndicator(
      onRefresh: () => notifications.load(),
      child: items.isEmpty 
        ? _EmptyState(theme: theme, title: 'No notifications', sub: 'System and session updates will appear here.')
        : _GroupedNotificationList(items: items, theme: theme, onMarkAll: () {
            for (var item in items) {
              if (!item.isRead) context.read<NotificationProvider>().markAsRead(item.id);
            }
          }),
    );
  }
}

class _BehaviorAlertsList extends StatelessWidget {
  final ThemeData theme;
  const _BehaviorAlertsList({required this.theme});

  @override
  Widget build(BuildContext context) {
    final notifications = context.watch<NotificationProvider>();
    final session = context.watch<SessionProvider>();
    
    // Combine Behavioral Alerts from Notifications (historic) AND current session alerts (live) if needed
    final historicAlerts = notifications.items.where((i) => i.type.toUpperCase().contains('ALERT')).toList();
    final liveAlerts = session.metrics?.alerts ?? [];

    if (historicAlerts.isEmpty && liveAlerts.isEmpty) {
      return _EmptyState(theme: theme, title: 'No behavior alerts', sub: 'Student engagement alerts will appear here.');
    }

    // Since AlertModel and TeacherNotificationModel are different, we primarily use Notifications for history
    return RefreshIndicator(
      onRefresh: () => notifications.load(),
      child: _GroupedNotificationList(items: historicAlerts, theme: theme, isAlert: true),
    );
  }
}

class _GroupedNotificationList extends StatelessWidget {
  final List<TeacherNotificationModel> items;
  final ThemeData theme;
  final bool isAlert;
  final VoidCallback? onMarkAll;

  const _GroupedNotificationList({required this.items, required this.theme, this.isAlert = false, this.onMarkAll});

  @override
  Widget build(BuildContext context) {
    // Group by date
    Map<String, List<TeacherNotificationModel>> grouped = {};
    for (var item in items) {
      String day;
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final yesterday = today.subtract(const Duration(days: 1));
      final date = DateTime(item.createdAt.year, item.createdAt.month, item.createdAt.day);

      if (date == today) {
        day = 'Today';
      } else if (date == yesterday) {
        day = 'Yesterday';
      } else {
        day = DateFormat('MMMM d, y').format(date);
      }
      grouped.putIfAbsent(day, () => []).add(item);
    }

    return CustomScrollView(
      slivers: [
        if (onMarkAll != null)
           SliverToBoxAdapter(
             child: Padding(
               padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
               child: Row(
                 mainAxisAlignment: MainAxisAlignment.end,
                 children: [
                   TextButton(onPressed: onMarkAll, child: const Text('Mark all as read', style: TextStyle(fontSize: 12))),
                 ],
               ),
             ),
           ),
        for (var entry in grouped.entries) ...[
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            sliver: SliverToBoxAdapter(
              child: Text(
                entry.key.toUpperCase(),
                style: theme.textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: theme.colorScheme.secondary,
                  letterSpacing: 1.2,
                ),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) => _NotificationCard(
                  item: entry.value[index],
                  onTap: () => _openNotificationTarget(context, entry.value[index]),
                  theme: theme,
                  isAlert: isAlert,
                ),
                childCount: entry.value.length,
              ),
            ),
          ),
        ],
        const SliverToBoxAdapter(child: SizedBox(height: 32)),
      ],
    );
  }

  Future<void> _openNotificationTarget(BuildContext context, TeacherNotificationModel item) async {
    if (!item.isRead) {
      context.read<NotificationProvider>().markAsRead(item.id);
    }
    if (item.metadataJson == null || item.metadataJson!.isEmpty) return;
    try {
      final meta = jsonDecode(item.metadataJson!);
      final subjectId = meta['subject_id'];
      if (subjectId is! int) return;

      final classroom = context.read<ClassroomProvider>();
      final subject = classroom.subjects.where((s) => s.id == subjectId).firstOrNull;
      if (subject == null) return;

      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => SubjectDetailsScreen(subject: subject)),
      );
    } catch (_) {}
  }
}

class _NotificationCard extends StatelessWidget {
  final TeacherNotificationModel item;
  final VoidCallback onTap;
  final ThemeData theme;
  final bool isAlert;

  const _NotificationCard({required this.item, required this.onTap, required this.theme, this.isAlert = false});

  @override
  Widget build(BuildContext context) {
    final read = item.isRead;
    final accent = isAlert ? const Color(0xFFFF6B6B) : (read ? theme.colorScheme.outline : theme.colorScheme.primary);
    final timeStr = DateFormat('h:mm a').format(item.createdAt);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.dividerColor.withOpacity(read ? 0.4 : 0.8)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.01),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: accent.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(_getIcon(item.type), color: accent, size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            item.title,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: read ? FontWeight.w600 : FontWeight.w800,
                            ),
                          ),
                        ),
                        if (!read)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.body,
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.secondary, fontSize: 13),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      timeStr,
                      style: theme.textTheme.labelSmall?.copyWith(color: theme.hintColor),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getIcon(String type) {
    final t = type.toUpperCase();
    if (t.contains('ALERT')) return Icons.warning_amber_rounded;
    if (t.contains('SESSION')) return Icons.video_camera_front_rounded;
    return Icons.notifications_none_rounded;
  }
}

class _EmptyState extends StatelessWidget {
  final ThemeData theme;
  final String title;
  final String sub;
  const _EmptyState({required this.theme, required this.title, required this.sub});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.notifications_off_outlined, size: 64, color: theme.hintColor.withOpacity(0.3)),
          const SizedBox(height: 16),
          Text(title, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Text(sub, textAlign: TextAlign.center, style: theme.textTheme.bodySmall?.copyWith(color: theme.hintColor)),
          ),
        ],
      ),
    );
  }
}
