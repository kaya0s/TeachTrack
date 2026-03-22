import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:teachtrack/features/session/domain/models/session_models.dart';

class SessionSummaryDialog extends StatelessWidget {
  final SessionModel session;
  final SessionMetricsModel metrics;
  final SessionSummaryModel? summary;

  const SessionSummaryDialog({
    super.key,
    required this.session,
    required this.metrics,
    this.summary,
  });

  static Future<void> show(
    BuildContext context, {
    required SessionModel session,
    required SessionMetricsModel metrics,
    SessionSummaryModel? summary,
  }) async {
    return showGeneralDialog<void>(
      context: context,
      barrierDismissible: false,
      barrierLabel: 'Session Summary',
      barrierColor: Colors.black.withOpacity(0.35),
      transitionDuration: const Duration(milliseconds: 260),
      pageBuilder: (context, animation, secondaryAnimation) {
        return SessionSummaryDialog(session: session, metrics: metrics, summary: summary);
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
        return FadeTransition(
          opacity: curved,
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.95, end: 1.0).animate(curved),
            child: child,
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // ... UI from monitoring_actions.dart ...
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Center(
        child: Container(
          margin: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
               // Header
               _buildHeader(theme),
               // Contents
               Flexible(
                 child: SingleChildScrollView(
                   padding: const EdgeInsets.all(20),
                   child: Column(
                     children: [
                       _buildStatsGrid(theme),
                       const SizedBox(height: 16),
                       // Averages, Alerts, etc.
                     ],
                   ),
                 ),
               ),
               // Actions
               _buildActions(context, theme),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.colorScheme.primary,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Row(
        children: [
          const Icon(Icons.analytics_outlined, color: Colors.white, size: 32),
          const SizedBox(width: 16),
          const Text("Session Summary", style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildStatsGrid(ThemeData theme) {
    return const Column(children: [
       // Simplified stats
    ]);
  }

  Widget _buildActions(BuildContext context, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
           Expanded(child: OutlinedButton(onPressed: () {}, child: const Text("Export"))),
           const SizedBox(width: 12),
           Expanded(child: ElevatedButton(onPressed: () => Navigator.pop(context), child: const Text("Close"))),
        ],
      ),
    );
  }
}
