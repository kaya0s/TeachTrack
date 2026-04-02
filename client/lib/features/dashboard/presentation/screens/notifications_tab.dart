import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/features/classroom/presentation/providers/classroom_provider.dart';
import 'package:teachtrack/features/auth/presentation/providers/auth_provider.dart';
import 'package:teachtrack/features/classroom/presentation/screens/subject_details_screen.dart';
import 'package:teachtrack/features/notifications/domain/models/notification_model.dart';
import 'package:teachtrack/features/notifications/presentation/providers/notification_provider.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';
import 'package:teachtrack/core/utils/image_url_resolver.dart';
import 'package:teachtrack/features/classroom/domain/models/classroom_models.dart';

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

    final classroom = context.watch<ClassroomProvider>();
    SubjectModel? subject;
    bool isNewAssignment = false;

    try {
      if (item.metadataJson != null && item.metadataJson!.isNotEmpty) {
        final meta = jsonDecode(item.metadataJson!);
        final dynamic sId = meta['subject_id'] ?? meta['SubjectId'];
        final int? subjectId = sId is int ? sId : int.tryParse(sId?.toString() ?? '');
        
        if (subjectId != null) {
          subject = classroom.subjects.where((s) => s.id == subjectId).firstOrNull;
          // If not in current subjects, maybe in sections (if that helps)
          if (subject == null && classroom.sections.isNotEmpty) {
             // Fallback: try to find a section that belongs to this subject ID (less reliable but better than nothing)
          }
        }
      }
      
      final title = item.title.toLowerCase();
      final body = item.body.toLowerCase();
      final type = item.type.toUpperCase();
      
      isNewAssignment = type.contains('ASSIGNMENT') || 
                       title.contains('assigned') || 
                       title.contains('new class') ||
                       title.contains('subject') ||
                       body.contains('assigned to you');
    } catch (_) {}

    final user = context.watch<AuthProvider>().user;
    final departmentImg = isNewAssignment 
        ? (resolveImageUrl(subject?.departmentCoverImageUrl) ?? resolveImageUrl(user?.departmentCoverImageUrl))
        : null;
    final collegeLogo = isNewAssignment 
        ? (resolveImageUrl(subject?.collegeLogoPath) ?? resolveImageUrl(user?.collegeLogoPath))
        : null;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: isNewAssignment 
              ? theme.colorScheme.primary.withValues(alpha: read ? 0.15 : 0.35)
              : theme.dividerColor.withValues(alpha: read ? 0.15 : 0.45),
          width: 0.8,
        ),
        boxShadow: [
          BoxShadow(
            color: (isNewAssignment ? theme.colorScheme.primary : Colors.black)
                .withValues(alpha: read ? 0.01 : 0.04),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          // Background Image for Assignment
          if (departmentImg != null)
            Positioned.fill(
              child: Opacity(
                opacity: theme.brightness == Brightness.dark ? 0.35 : 0.20,
                child: Image.network(
                  departmentImg,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              ),
            ),
          
          // Gradient overlay for readability
          if (departmentImg != null)
             Positioned.fill(
               child: Container(
                 decoration: BoxDecoration(
                   gradient: LinearGradient(
                     begin: Alignment.topLeft,
                     end: Alignment.bottomRight,
                     colors: [
                       theme.cardColor.withOpacity(0.4),
                       theme.cardColor.withOpacity(0.9),
                     ],
                   ),
                 ),
               ),
             ),

          InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(20),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Icon or Logo
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: isNewAssignment 
                          ? Colors.white.withOpacity(theme.brightness == Brightness.dark ? 0.1 : 0.8)
                          : accent.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(14),
                      border: isNewAssignment ? Border.all(color: theme.dividerColor.withOpacity(0.2)) : null,
                    ),
                    padding: EdgeInsets.all(isNewAssignment && collegeLogo != null ? 6 : 12),
                    child: (isNewAssignment && collegeLogo != null)
                        ? Image.network(
                            collegeLogo,
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => Icon(_getIcon(item.type), color: accent, size: 22),
                          )
                        : Icon(_getIcon(item.type), color: accent, size: 24),
                  ),
                  const SizedBox(width: 16),
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
                                  fontWeight: read ? FontWeight.w600 : FontWeight.w900,
                                  fontSize: 15,
                                  letterSpacing: -0.2,
                                ),
                              ),
                            ),
                            if (!read)
                              Container(
                                width: 10,
                                height: 10,
                                decoration: BoxDecoration(
                                  color: accent,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: theme.cardColor, width: 2),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item.body,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurface.withOpacity(0.7), 
                            fontSize: 13,
                            height: 1.3,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Icon(Icons.access_time_rounded, size: 12, color: theme.hintColor),
                            const SizedBox(width: 4),
                            Text(
                              timeStr,
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: theme.hintColor,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
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
