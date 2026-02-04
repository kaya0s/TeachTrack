import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../auth/provider/auth_provider.dart';
import '../../../core/theme/theme_provider.dart';
import '../../classroom/provider/classroom_provider.dart';

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
    final themeProvider = context.watch<ThemeProvider>();
    final isDark = themeProvider.isDarkMode;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        centerTitle: false,
        title: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.asset(
                'assets/images/ml_bg.png',
                height: 32,
                width: 32,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(width: 12),
            RichText(
              text: TextSpan(
                children: [
                  TextSpan(
                    text: 'Teach',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: Theme.of(context).primaryColor,
                      letterSpacing: -0.5,
                    ),
                  ),
                  TextSpan(
                    text: 'Track',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w400,
                      color: Theme.of(context).textTheme.titleLarge?.color,
                      letterSpacing: -0.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.history_rounded),
            onPressed: () {
              // Navigate to history
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: _pages,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        showSelectedLabels: true,
        showUnselectedLabels: true,
        selectedItemColor: Theme.of(context).primaryColor,
        unselectedItemColor: Colors.grey,
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
    return Consumer<ClassroomProvider>(
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
                  leading: CircleAvatar(
                    backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
                    child: Icon(Icons.book, color: Theme.of(context).primaryColor),
                  ),
                  title: Text(subject.name),
                  subtitle: Text(subject.code ?? 'No Code'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    // Navigate to subject details or section list
                  },
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _ActiveSessionsTab extends StatelessWidget {
  const _ActiveSessionsTab();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.sensors_rounded,
            size: 100,
            color: Theme.of(context).primaryColor.withOpacity(0.2),
          ),
          const SizedBox(height: 24),
          const Text(
            "No Active Session",
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Text(
            "Start a session to monitor classroom behavior in real-time.",
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
          ),
          const SizedBox(height: 40),
          ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.add),
            label: const Text("Start New Session"),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
            ),
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
