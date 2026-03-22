import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/features/session/domain/models/session_models.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';
import 'package:teachtrack/features/session/presentation/screens/session_detail_screen.dart';

class SubjectHistoryTab extends StatefulWidget {
  final List<SessionSummaryModel> history;
  final bool isLoading;
  final String? error;
  final DateFormat dateFormat;
  final Future<void> Function() onRetry;

  const SubjectHistoryTab({
    super.key,
    required this.history,
    required this.isLoading,
    required this.error,
    required this.dateFormat,
    required this.onRetry,
  });

  @override
  State<SubjectHistoryTab> createState() => _SubjectHistoryTabState();
}

class _SubjectHistoryTabState extends State<SubjectHistoryTab> {
  int? _expandedId;

  @override
  Widget build(BuildContext context) {
    if (widget.isLoading) return const Center(child: CircularProgressIndicator());
    if (widget.error != null && widget.history.isEmpty) {
      return Center(
        child: Column(
          children: [
            const Icon(Icons.error_outline),
            Text(widget.error!),
            TextButton(onPressed: widget.onRetry, child: const Text("Retry")),
          ],
        ),
      );
    }
    if (widget.history.isEmpty) return const Center(child: Text("No history available."));

    return RefreshIndicator(
      onRefresh: widget.onRetry,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: widget.history.length,
        itemBuilder: (context, index) {
          final item = widget.history[index];
          final isExpanded = _expandedId == item.id;
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ExpansionTile(
              title: Text(item.sectionName, style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text("${widget.dateFormat.format(item.startTime)} • ${item.averageEngagement.toInt()}% Engagement"),
              onExpansionChanged: (exp) {
                setState(() => _expandedId = exp ? item.id : null);
                if (exp) context.read<SessionProvider>().fetchSessionMetricsById(item.id);
              },
              children: [
                if (isExpanded) _buildExpandedContent(context, item),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildExpandedContent(BuildContext context, SessionSummaryModel item) {
    return FutureBuilder<SessionMetricsModel?>(
      future: context.read<SessionProvider>().fetchSessionMetricsById(item.id),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator());
        final metrics = snapshot.data!;
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
               const Text("Session Insights", style: TextStyle(fontWeight: FontWeight.bold)),
               const SizedBox(height: 8),
               Text("Present: ${metrics.studentsPresent} students"),
               Text("Frames Analyzed: ${metrics.totalLogs}"),
               const SizedBox(height: 12),
               SizedBox(
                 width: double.infinity,
                 child: FilledButton.icon(
                   onPressed: () {
                     Navigator.push(
                       context,
                       MaterialPageRoute(
                         builder: (_) => SessionDetailScreen(session: item),
                       ),
                     );
                   },
                   icon: const Icon(Icons.analytics_rounded, size: 18),
                   label: const Text('View Detailed Report'),
                   style: FilledButton.styleFrom(
                     shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                   ),
                 ),
               ),
            ],
          ),
        );
      },
    );
  }
}
