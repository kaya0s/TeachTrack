import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/features/classroom/presentation/providers/classroom_provider.dart';
import 'package:teachtrack/features/auth/presentation/providers/auth_provider.dart';
import 'package:teachtrack/features/classroom/presentation/screens/subject_details_screen.dart';
import 'package:teachtrack/features/notifications/domain/models/notification_model.dart';
import 'package:teachtrack/features/notifications/presentation/providers/notification_provider.dart';
import 'package:teachtrack/features/session/domain/models/session_models.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';
import 'package:teachtrack/features/session/presentation/screens/session_detail_screen.dart';
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

class _BehaviorAlertsList extends StatefulWidget {
  final ThemeData theme;
  const _BehaviorAlertsList({required this.theme});

  @override
  State<_BehaviorAlertsList> createState() => _BehaviorAlertsListState();
}

class _BehaviorAlertsListState extends State<_BehaviorAlertsList> {
  bool _loading = true;
  String? _error;
  List<AlertModel> _alerts = const <AlertModel>[];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final alerts = await context.read<SessionProvider>().fetchTeacherAlerts(limit: 100);
      if (!mounted) return;
      setState(() {
        _alerts = alerts;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Failed to load behavior alerts',
                style: widget.theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                _error!,
                style: widget.theme.textTheme.bodySmall?.copyWith(
                  color: widget.theme.colorScheme.onSurface.withValues(alpha: 0.7),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _load,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_alerts.isEmpty) {
      return _EmptyState(
        theme: widget.theme,
        title: 'No behavior alerts',
        sub: 'Student engagement alerts will appear here.',
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: _GroupedAlertList(alerts: _alerts, theme: widget.theme),
    );
  }
}

class _GroupedAlertList extends StatelessWidget {
  final List<AlertModel> alerts;
  final ThemeData theme;

  const _GroupedAlertList({required this.alerts, required this.theme});

  @override
  Widget build(BuildContext context) {
    Map<String, List<AlertModel>> grouped = {};
    for (var alert in alerts) {
      String day;
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final yesterday = today.subtract(const Duration(days: 1));
      final date = DateTime(alert.triggeredAt.year, alert.triggeredAt.month, alert.triggeredAt.day);

      if (date == today) {
        day = 'Today';
      } else if (date == yesterday) {
        day = 'Yesterday';
      } else {
        day = DateFormat('MMMM d, y').format(date);
      }
      grouped.putIfAbsent(day, () => []).add(alert);
    }

    return CustomScrollView(
      slivers: [
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
                (context, index) => _AlertCard(
                  alert: entry.value[index],
                  theme: theme,
                  onTap: () => _openAlertSession(context, entry.value[index]),
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

  Future<void> _openAlertSession(BuildContext context, AlertModel alert) async {
    if (alert.sessionId <= 0) return;
    try {
      final summary = await context.read<SessionProvider>().fetchSessionSummaryById(alert.sessionId);
      if (!context.mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => SessionDetailScreen(session: summary)),
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to open session: $e'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
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

class _AlertCard extends StatelessWidget {
  final AlertModel alert;
  final VoidCallback onTap;
  final ThemeData theme;

  const _AlertCard({required this.alert, required this.onTap, required this.theme});

  IconData _iconForType(String type) {
    switch (type.toUpperCase()) {
      case 'PHONE':
        return Icons.smartphone_rounded;
      case 'SLEEPING':
        return Icons.bedtime_rounded;
      case 'ENGAGEMENT_DROP':
        return Icons.trending_down_rounded;
      default:
        return Icons.warning_amber_rounded;
    }
  }

  Color _accentForType(String type) {
    switch (type.toUpperCase()) {
      case 'PHONE':
        return const Color(0xFFFFB300);
      case 'SLEEPING':
        return const Color(0xFFFF6B6B);
      case 'ENGAGEMENT_DROP':
        return const Color(0xFF6C63FF);
      default:
        return theme.colorScheme.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final read = alert.isRead;
    final accent = read ? theme.colorScheme.outline : _accentForType(alert.alertType);
    final timeStr = DateFormat('h:mm a').format(alert.triggeredAt);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: theme.dividerColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: theme.brightness == Brightness.dark ? 0.12 : 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(_iconForType(alert.alertType), color: accent, size: 24),
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
                              alert.alertType.isEmpty ? 'ALERT' : alert.alertType,
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
                        alert.message,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
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
                          if (alert.severity.isNotEmpty) ...[
                            const SizedBox(width: 10),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: accent.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                alert.severity.toUpperCase(),
                                style: theme.textTheme.labelSmall?.copyWith(
                                  color: accent,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 9,
                                  letterSpacing: 0.6,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
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
