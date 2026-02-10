import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../data/models/classroom_session_models.dart';
import '../provider/classroom_provider.dart';
import '../../session/provider/session_provider.dart';
import '../../session/screens/monitoring_screen.dart';

class SubjectDetailsScreen extends StatelessWidget {
  final SubjectModel subject;

  const SubjectDetailsScreen({super.key, required this.subject});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(subject.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showAddSectionDialog(context),
            tooltip: "Add Section",
          ),
        ],
      ),
      body: Consumer<ClassroomProvider>(
        builder: (context, provider, child) {
          // Re-find subject in provider to get updated sections
          final currentSubject = provider.subjects.firstWhere(
            (s) => s.id == subject.id,
            orElse: () => subject,
          );

          if (currentSubject.sections.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.group_off_outlined, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text("No sections created yet"),
                  const SizedBox(height: 8),
                  ElevatedButton(
                    onPressed: () => _showAddSectionDialog(context),
                    child: const Text("Create Section"),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: currentSubject.sections.length,
            itemBuilder: (context, index) {
              final section = currentSubject.sections[index];
              return Card(
                child: ListTile(
                  leading: Container(
                    height: 40,
                    width: 40,
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(Icons.groups, color: Theme.of(context).colorScheme.primary),
                  ),
                  title: Text(section.name),
                  subtitle: const Text("Select to start monitoring"),
                  trailing: const Icon(Icons.play_arrow_rounded),
                  onTap: () {
                    _startMonitoring(context, currentSubject, section);
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }

  void _showAddSectionDialog(BuildContext context) {
    final nameController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Add New Section"),
        content: TextField(
          controller: nameController,
          decoration: const InputDecoration(
            labelText: "Section Name",
            hintText: "e.g. Section A, Grade 10-B",
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.isNotEmpty) {
                final success = await context.read<ClassroomProvider>().addSection(
                  subject.id,
                  nameController.text,
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

  void _startMonitoring(BuildContext context, SubjectModel subject, SectionModel section) async {
    final sessionProvider = context.read<SessionProvider>();
    
    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    final success = await sessionProvider.startSession(subject.id, section.id);

    if (context.mounted) {
      Navigator.pop(context); // Close loading dialog

      if (success) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => MonitoringScreen(sessionId: sessionProvider.activeSession!.id),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Failed to start session: ${sessionProvider.error}")),
        );
      }
    }
  }
}
