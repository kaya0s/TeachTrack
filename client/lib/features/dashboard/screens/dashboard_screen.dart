import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../auth/provider/auth_provider.dart';
import '../../../core/theme/theme_provider.dart';
import '../../classroom/provider/classroom_provider.dart';
import '../../classroom/screens/subject_details_screen.dart';
import '../../session/provider/session_provider.dart';
import '../../session/screens/monitoring_screen.dart';
import '../../session/screens/session_history_screen.dart';
import '../../../data/models/classroom_session_models.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 1; // Default to Active Sessions

  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      const _ClassesTab(),
      const _ActiveSessionsTab(),
      const _MeTab(),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.asset(
                'assets/images/ml_bg.png',
                height: 28,
                width: 28,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(width: 10),
            const Text("TeachTrack"),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.history_rounded),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SessionHistoryScreen()),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: _pages,
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
        child: Container(
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(22),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 24,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(22),
            child: BottomNavigationBar(
              currentIndex: _currentIndex,
              onTap: (index) => setState(() => _currentIndex = index),
              type: BottomNavigationBarType.fixed,
              showSelectedLabels: true,
              showUnselectedLabels: true,
              selectedItemColor: Theme.of(context).colorScheme.primary,
              unselectedItemColor: Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.6),
              backgroundColor: Colors.transparent,
              elevation: 0,
              items: const [
                BottomNavigationBarItem(
                  icon: Icon(Icons.class_outlined),
                  activeIcon: Icon(Icons.class_),
                  label: 'Classes',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.play_circle_outline),
                  activeIcon: Icon(Icons.play_circle_fill),
                  label: 'Active Sessions',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.person_outline),
                  activeIcon: Icon(Icons.person),
                  label: 'Me',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ClassesTab extends StatefulWidget {
  const _ClassesTab();

  @override
  State<_ClassesTab> createState() => _ClassesTabState();
}

class _ClassesTabState extends State<_ClassesTab> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ClassroomProvider>().fetchClassroomData();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Consumer<ClassroomProvider>(
        builder: (context, classroom, child) {
          if (classroom.isLoading && classroom.subjects.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (classroom.error != null && classroom.subjects.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 16),
                  Text("Error: ${classroom.error}"),
                  TextButton(
                    onPressed: () => classroom.fetchClassroomData(),
                    child: const Text("Retry"),
                  ),
                ],
              ),
            );
          }

          if (classroom.subjects.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.class_outlined, size: 64, color: Colors.grey.shade400),
                  const SizedBox(height: 16),
                  const Text("No classes found", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text("Add your subjects and sections to get started."),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => classroom.fetchClassroomData(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: classroom.subjects.length,
              itemBuilder: (context, index) {
                final subject = classroom.subjects[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    leading: Container(
                      height: 42,
                      width: 42,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary.withOpacity(0.18),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Theme.of(context).colorScheme.primary.withOpacity(0.35),
                        ),
                      ),
                      child: Icon(Icons.book, color: Theme.of(context).colorScheme.primary, size: 22),
                    ),
                    title: Text(
                      subject.name,
                      style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
                    ),
                    subtitle: Text(
                      subject.code ?? 'No Code',
                      style: TextStyle(color: Theme.of(context).textTheme.bodySmall?.color),
                    ),
                    trailing: Icon(Icons.chevron_right, color: Theme.of(context).textTheme.bodySmall?.color),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => SubjectDetailsScreen(subject: subject),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddSubjectDialog(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  void _showAddSubjectDialog(BuildContext context) {
    final nameController = TextEditingController();
    final codeController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Add New Subject"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: "Subject Name"),
            ),
            TextField(
              controller: codeController,
              decoration: const InputDecoration(labelText: "Subject Code (Optional)"),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.isNotEmpty) {
                final success = await context.read<ClassroomProvider>().addSubject(
                  nameController.text,
                  codeController.text.isEmpty ? null : codeController.text,
                );
                if (success && context.mounted) {
                  Navigator.pop(context);
                }
              }
            },
            child: const Text("Save"),
          ),
        ],
      ),
    );
  }
}

class _ActiveSessionsTab extends StatefulWidget {
  const _ActiveSessionsTab();

  @override
  State<_ActiveSessionsTab> createState() => _ActiveSessionsTabState();
}

class _ActiveSessionsTabState extends State<_ActiveSessionsTab> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final session = context.read<SessionProvider>();
      session.checkActiveSession();
      if (context.read<ClassroomProvider>().subjects.isEmpty) {
        context.read<ClassroomProvider>().fetchClassroomData();
      }
    });
  }

  Future<void> _confirmStopSession(BuildContext context, SessionProvider session) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("End Session?"),
        content: const Text("This will stop the current session and save its results."),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text("Stop"),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await session.stopServerDetector();
      await session.stopSession();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<SessionProvider, ClassroomProvider>(
      builder: (context, session, classroom, child) {
        final activeSession = session.activeSession;
        final metrics = session.metrics;

        if (activeSession != null) {
          return RefreshIndicator(
            onRefresh: () async {
              await session.checkActiveSession();
              await session.fetchMetrics();
            },
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(
                  "Active Session",
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Row(
                      children: [
                        Container(
                          height: 52,
                          width: 52,
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.primary.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Icon(Icons.sensors_rounded, color: Theme.of(context).colorScheme.primary),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                "Session in progress",
                                style: TextStyle(fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "Live metrics are updating.",
                                style: TextStyle(color: Theme.of(context).textTheme.bodySmall?.color),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        IconButton(
                          tooltip: "Open monitoring",
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => MonitoringScreen(sessionId: activeSession.id),
                              ),
                            );
                          },
                          icon: const Icon(Icons.open_in_new),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                _buildMetricsSummary(context, metrics),
                const SizedBox(height: 12),
                _buildEngagementChart(context, metrics),
                const SizedBox(height: 12),
                _buildAlertsPreview(context, metrics),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => session.fetchMetrics(),
                        icon: const Icon(Icons.refresh),
                        label: const Text("Refresh"),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red,
                          foregroundColor: Colors.white,
                        ),
                        onPressed: () => _confirmStopSession(context, session),
                        icon: const Icon(Icons.stop_circle_outlined),
                        label: const Text("Stop Session"),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        }

        if (classroom.isLoading && classroom.subjects.isEmpty) {
          return const Center(child: CircularProgressIndicator());
        }

        if (classroom.subjects.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.class_outlined, size: 64, color: Colors.grey.shade400),
                const SizedBox(height: 16),
                const Text("No classes found", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const Text("Add your subjects and sections to get started."),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(20),
          itemCount: classroom.subjects.length,
          itemBuilder: (context, index) {
            final subject = classroom.subjects[index];
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ExpansionTile(
                leading: CircleAvatar(
                  backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
                  child: Icon(Icons.book, color: Theme.of(context).primaryColor),
                ),
                title: Text(subject.name),
                subtitle: Text(subject.code ?? 'No Code'),
                children: subject.sections.map((section) {
                  return ListTile(
                    leading: const Icon(Icons.groups_outlined),
                    title: Text(section.name),
                    trailing: const Icon(Icons.play_arrow_rounded),
                    onTap: () async {
                      final success = await context.read<SessionProvider>().startSession(
                        subject.id,
                        section.id,
                      );
                      if (!context.mounted) return;
                      if (success) {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => MonitoringScreen(
                              sessionId: context.read<SessionProvider>().activeSession!.id,
                            ),
                          ),
                        );
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text("Failed to start session: ${session.error}")),
                        );
                      }
                    },
                  );
                }).toList(),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildMetricsSummary(BuildContext context, SessionMetricsModel? metrics) {
    final theme = Theme.of(context);
    if (metrics == null) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              const SizedBox(
                height: 28,
                width: 28,
                child: CircularProgressIndicator(strokeWidth: 2.4),
              ),
              const SizedBox(width: 16),
              Text(
                "Loading engagement metrics...",
                style: theme.textTheme.bodyMedium,
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Expanded(
              child: _MetricTile(
                title: "Avg Engagement",
                value: "${metrics.averageEngagement.toStringAsFixed(1)}%",
                icon: Icons.insights_rounded,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _MetricTile(
                title: "Logs",
                value: metrics.totalLogs.toString(),
                icon: Icons.timeline_rounded,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEngagementChart(BuildContext context, SessionMetricsModel? metrics) {
    if (metrics == null || metrics.recentLogs.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Engagement Trend",
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              Text(
                "No engagement data yet. Metrics will appear once logs start streaming.",
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      );
    }

    final values = metrics.recentLogs.map((log) {
      if (log.totalDetected == 0) return 0.0;
      final positives = log.attentive + log.writing + log.raisingHand;
      return (positives / log.totalDetected) * 100;
    }).toList();

    if (values.every((value) => value == 0)) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Engagement Trend",
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              Text(
                "No engagement detected yet. Start the detector to see live activity.",
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Engagement Trend",
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 120,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: values.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final value = values[index];
                  final height = (value / 100) * 110;
                  final adjustedHeight = height < 6 && value > 0 ? 6.0 : height;
                  return Align(
                    alignment: Alignment.bottomCenter,
                    child: Container(
                      width: 12,
                      height: adjustedHeight,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary.withOpacity(0.8),
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
            Text(
              "Showing the last ${values.length} samples",
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAlertsPreview(BuildContext context, SessionMetricsModel? metrics) {
    final alerts = metrics?.alerts ?? [];
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Alerts",
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            if (alerts.isEmpty)
              Text(
                "No active alerts.",
                style: Theme.of(context).textTheme.bodySmall,
              ),
            if (alerts.isNotEmpty)
              ...alerts.take(3).map((alert) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.warning_rounded, color: Colors.orange.shade600, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          alert.message,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
          ],
        ),
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;

  const _MetricTile({
    required this.title,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 10),
          Text(
            value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _MeTab extends StatelessWidget {
  const _MeTab();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final themeProvider = context.read<ThemeProvider>();

    return SingleChildScrollView(
      child: Column(
        children: [
          const SizedBox(height: 32),
          CircleAvatar(
            radius: 50,
            backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
            child: Text(
              user?.username[0].toUpperCase() ?? '?',
              style: TextStyle(
                fontSize: 40,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).primaryColor,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            user?.username ?? 'Teacher',
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          Text(
            user?.email ?? '',
            style: TextStyle(color: Colors.grey.shade600),
          ),
          const SizedBox(height: 32),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.dark_mode_outlined),
            title: const Text('Dark Mode'),
            trailing: Switch(
              value: themeProvider.isDarkMode,
              onChanged: (value) => themeProvider.toggleTheme(value),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.settings_outlined),
            title: const Text('Account Settings'),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.help_outline),
            title: const Text('Help & Support'),
            onTap: () {},
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Log Out', style: TextStyle(color: Colors.red)),
            onTap: () => auth.logout(),
          ),
        ],
      ),
    );
  }
}
