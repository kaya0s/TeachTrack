import 'package:flutter/material.dart';

class SessionStartParams {
  final int studentsPresent;
  final String activityMode;

  SessionStartParams({
    required this.studentsPresent,
    required this.activityMode,
  });
}

Future<SessionStartParams?> showSessionStartDialog(
  BuildContext context, {
  int initialStudents = 20,
}) async {
  final controller = TextEditingController(text: '$initialStudents');
  String selectedMode = 'LECTURE';

  final modes = [
    {'value': 'LECTURE', 'label': 'Lecture', 'icon': Icons.school_rounded, 'color': Colors.blue},
    {'value': 'STUDY', 'label': 'Study', 'icon': Icons.menu_book_rounded, 'color': Colors.green},
    {'value': 'COLLABORATION', 'label': 'Collaboration', 'icon': Icons.groups_rounded, 'color': Colors.orange},
    {'value': 'EXAM', 'label': 'Exam (Strict)', 'icon': Icons.assignment_turned_in_rounded, 'color': Colors.red},
  ];

  return showDialog<SessionStartParams>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(28),
        ),
        titlePadding: const EdgeInsets.fromLTRB(24, 32, 24, 8),
        contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
        actionsPadding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
        icon: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(
            Icons.sensors_rounded,
            size: 32,
            color: Theme.of(context).colorScheme.primary,
          ),
        ),
        title: const Text(
          'Start Session',
          textAlign: TextAlign.center,
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 24, letterSpacing: -0.5),
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Configure your session parameters before starting live monitoring.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      height: 1.4,
                    ),
              ),
              const SizedBox(height: 28),
              
              Text(
                  'ACTIVITY MODE',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.2,
                    color: Theme.of(context).colorScheme.primary.withOpacity(0.8),
                  ),
                ),
              const SizedBox(height: 12),
              
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: modes.map((mode) {
                  final isSelected = selectedMode == mode['value'];
                  final color = mode['color'] as Color;
                  
                  return InkWell(
                    onTap: () => setState(() => selectedMode = mode['value'] as String),
                    borderRadius: BorderRadius.circular(16),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: isSelected ? color.withOpacity(0.15) : Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.5),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isSelected ? color : Colors.transparent,
                          width: 2,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            mode['icon'] as IconData,
                            size: 18,
                            color: isSelected ? color : Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            mode['label'] as String,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                              color: isSelected ? color : Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),

              if (selectedMode == 'EXAM')
                Container(
                  margin: const EdgeInsets.only(top: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.withOpacity(0.1)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline_rounded, size: 16, color: Colors.red),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Strict monitoring enabled. Due to limitations, only phone usage can be detected.',
                          style: TextStyle(fontSize: 11, color: Colors.red.shade800, fontWeight: FontWeight.w500),
                        ),
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 28),
              
              Text(
                  'STUDENTS PRESENT',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.2,
                    color: Theme.of(context).colorScheme.primary.withOpacity(0.8),
                  ),
                ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                keyboardType: TextInputType.number,
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
                decoration: InputDecoration(
                  hintText: 'Enter count',
                  filled: true,
                  fillColor: Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.5),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none,
                  ),
                  prefixIcon: const Icon(Icons.people_alt_rounded),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                ),
              ),
            ],
          ),
        ),
        actions: [
          Row(
            children: [
              Expanded(
                child: TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(
                    'Cancel',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: Theme.of(context).colorScheme.secondary,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: () async {
                    final value = int.tryParse(controller.text.trim());
                    if (value == null || value <= 0) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Please enter a valid student count.')),
                      );
                      return;
                    }
                    
                    // Show exam mode limitation confirmation if EXAM mode is selected
                    if (selectedMode == 'EXAM') {
                      final shouldContinue = await _showExamModeLimitationDialog(dialogContext);
                      if (!shouldContinue) return;
                    }
                    
                    Navigator.pop(
                      dialogContext,
                      SessionStartParams(
                        studentsPresent: value,
                        activityMode: selectedMode,
                      ),
                    );
                  },
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                  child: const Text('Start Now', style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

Future<bool> _showExamModeLimitationDialog(BuildContext context) async {
  final theme = Theme.of(context);
  return await showDialog<bool>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: Row(
        children: [
          Icon(
            Icons.warning_amber_rounded,
            color: Colors.orange,
            size: 28,
          ),
          const SizedBox(width: 12),
          Text(
            'Exam Mode Limitations',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Due to current system limitations, exam mode can only detect:',
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.orange.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.orange.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                Icon(Icons.phone_android, color: Colors.orange, size: 20),
                const SizedBox(width: 8),
                Text(
                  'Phone Usage',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: Colors.orange,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Other behaviors (looking around, off-task) cannot be detected yet.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.textTheme.bodySmall?.color?.withOpacity(0.7),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Do you want to continue with exam mode?',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(dialogContext).pop(false),
          child: Text(
            'Cancel',
            style: TextStyle(color: theme.textTheme.bodyLarge?.color),
          ),
        ),
        ElevatedButton(
          onPressed: () => Navigator.of(dialogContext).pop(true),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.orange,
            foregroundColor: Colors.white,
          ),
          child: const Text('Continue'),
        ),
      ],
    ),
  ) ?? false;
}
