import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../provider/notification_provider.dart';
import '../../classroom/provider/classroom_provider.dart';
import '../../classroom/screens/subject_details_screen.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<NotificationProvider>();
      provider.load();
      provider.startRealtimePolling();
    });
  }

  @override
  void dispose() {
    context.read<NotificationProvider>().stopRealtimePolling();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
      ),
      body: Consumer<NotificationProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading && provider.items.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (provider.error != null && provider.items.isEmpty) {
            return Center(child: Text(provider.error!));
          }

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: Row(
                  children: [
                    ChoiceChip(
                      label: const Text('All'),
                      selected: !provider.showUnreadOnly,
                      onSelected: (_) => provider.setUnreadOnly(false),
                    ),
                    const SizedBox(width: 8),
                    ChoiceChip(
                      label: Text('Unread (${provider.unreadCount})'),
                      selected: provider.showUnreadOnly,
                      onSelected: (_) => provider.setUnreadOnly(true),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () => provider.load(),
                  child: provider.items.isEmpty
                      ? ListView(
                          children: [
                            const SizedBox(height: 120),
                            const Center(child: Text('No notifications yet.')),
                          ],
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                          itemBuilder: (context, index) {
                            final item = provider.items[index];
                            return Card(
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                                side: BorderSide(
                                  color: item.isRead
                                      ? Theme.of(context).dividerColor.withOpacity(0.45)
                                      : Theme.of(context).colorScheme.primary.withOpacity(0.35),
                                ),
                              ),
                              child: ListTile(
                                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                leading: Icon(
                                  item.isRead ? Icons.notifications_none_rounded : Icons.notifications_active_rounded,
                                  color: item.isRead ? Theme.of(context).hintColor : Theme.of(context).colorScheme.primary,
                                ),
                                title: Text(
                                  item.title,
                                  style: TextStyle(fontWeight: item.isRead ? FontWeight.w500 : FontWeight.w700),
                                ),
                                subtitle: Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Text(
                                    "${item.body}\n${DateFormat('MMM d, y - h:mm a').format(item.createdAt)}",
                                  ),
                                ),
                                isThreeLine: true,
                                trailing: item.isRead
                                    ? null
                                    : TextButton(
                                        onPressed: () => provider.markAsRead(item.id),
                                        child: const Text('Mark read'),
                                      ),
                                onTap: () {
                                  if (!item.isRead) {
                                    provider.markAsRead(item.id);
                                  }
                                  if (item.metadataJson != null && item.metadataJson!.isNotEmpty) {
                                    try {
                                      final meta = jsonDecode(item.metadataJson!);
                                      final subjectId = meta['subject_id'];
                                      if (subjectId != null && subjectId is int) {
                                        final classroom = context.read<ClassroomProvider>();
                                        final subject = classroom.subjects.where((s) => s.id == subjectId).firstOrNull;
                                        if (subject != null) {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => SubjectDetailsScreen(subject: subject),
                                            ),
                                          );
                                        }
                                      }
                                    } catch (e) {
                                      // ignore parse error
                                    }
                                  }
                                },
                              ),
                            );
                          },
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemCount: provider.items.length,
                        ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
