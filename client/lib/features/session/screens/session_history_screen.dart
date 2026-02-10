import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../provider/session_provider.dart';

class SessionHistoryScreen extends StatefulWidget {
  const SessionHistoryScreen({super.key});

  @override
  State<SessionHistoryScreen> createState() => _SessionHistoryScreenState();
}

class _SessionHistoryScreenState extends State<SessionHistoryScreen> {
  final _dateFormat = DateFormat('MMM d, yyyy · h:mm a');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SessionProvider>().fetchSessionHistory(includeActive: false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Session History"),
      ),
      body: Consumer<SessionProvider>(
        builder: (context, session, child) {
          if (session.historyLoading && session.history.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (session.historyError != null && session.history.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 12),
                  Text(session.historyError ?? "Failed to load history"),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: () => session.fetchSessionHistory(includeActive: false),
                    child: const Text("Retry"),
                  ),
                ],
              ),
            );
          }

          if (session.history.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.history_rounded, size: 64, color: Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.6)),
                  const SizedBox(height: 16),
                  const Text("No session history yet", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text("Run a monitoring session to see results here."),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => session.fetchSessionHistory(includeActive: false),
            child: ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: session.history.length,
              itemBuilder: (context, index) {
                final item = session.history[index];
                final duration = item.endTime != null
                    ? item.endTime!.difference(item.startTime)
                    : const Duration();
                final durationLabel = item.endTime == null
                    ? "In progress"
                    : "${duration.inMinutes} min";

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.08),
                      child: Icon(Icons.class_, color: Theme.of(context).colorScheme.primary),
                    ),
                    title: Text("${item.subjectName} • ${item.sectionName}"),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 4),
                        Text(_dateFormat.format(item.startTime)),
                        Text("Duration: $durationLabel", style: TextStyle(color: Theme.of(context).textTheme.bodySmall?.color)),
                      ],
                    ),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        "${item.averageEngagement.toStringAsFixed(0)}%",
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
