import 'package:flutter/material.dart';

class NoActiveSessionView extends StatelessWidget {
  final bool isLoading;
  final VoidCallback onStartSession;

  const NoActiveSessionView({
    super.key,
    required this.isLoading,
    required this.onStartSession,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(Icons.sensors_off_rounded,
            size: 64, color: Colors.grey.shade400),
        const SizedBox(height: 16),
        const Text(
          "No Active Session",
          style: TextStyle(
              fontSize: 20, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        Text(
          isLoading
              ? "Loading subjects..."
              : "Start a session to begin live monitoring.",
          textAlign: TextAlign.center,
          style: TextStyle(
              color:
                  Theme.of(context).textTheme.bodySmall?.color),
        ),
        const SizedBox(height: 16),
        Container(
          width: double.infinity,
          height: 56,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF10B981), Color(0xFF0F766E)], // Updated for more modern teal
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ),
            borderRadius: BorderRadius.circular(16), // Slightly less round for modern vibe
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: isLoading ? null : onStartSession,
              borderRadius: BorderRadius.circular(16),
              child: Center(
                child: isLoading
                    ? const SizedBox(
                        height: 24,
                        width: 24,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.rocket_launch_rounded, color: Colors.white, size: 20),
                          SizedBox(width: 12),
                          Text(
                            "Start AI Class Behavior Monitoring",
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.1,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 18),
        TextButton.icon(
          onPressed: isLoading ? null : () => _showMethodology(context, Theme.of(context)),
          icon: Icon(Icons.calculate_outlined, size: 18, color: Theme.of(context).colorScheme.primary),
          label: Text(
            "How Engagement is Calculated",
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
        ),
      ],
    );
  }

  void _showMethodology(BuildContext context, ThemeData theme) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.9,
        expand: false,
        builder: (_, scrollController) => Container(
          decoration: BoxDecoration(
            color: theme.cardColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
          ),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(24),
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 24),
                  decoration: BoxDecoration(
                    color: theme.hintColor.withOpacity(0.2), 
                    borderRadius: BorderRadius.circular(2)
                  ),
                ),
              ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF6C63FF).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.calculate_rounded, color: Color(0xFF6C63FF), size: 28),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Methodology', style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900, letterSpacing: -1)),
                        Text('The logic behind your scores', style: theme.textTheme.bodySmall?.copyWith(color: theme.hintColor)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),

              _MethodologyStep(
                step: "1",
                icon: Icons.person_add_rounded,
                title: "Initial Headcount",
                desc: "The teacher defines the total number of students present. This becomes our base for calculation.",
                theme: theme,
              ),
              _MethodologyStep(
                step: "2",
                icon: Icons.camera_alt_rounded,
                title: "AI Analysis",
                desc: "The AI counts behaviors (On-Task, Phone, Sleep). Students not seen are automatically marked 'Not Visible'.",
                theme: theme,
              ),
              _MethodologyStep(
                step: "3",
                icon: Icons.auto_awesome_rounded,
                title: "Scoring Weight",
                desc: "Every behavior has a weight. Distractions subtract from the potential 100% score based on admin-defined rules.",
                theme: theme,
                isLast: true,
              ),

              const SizedBox(height: 32),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: theme.colorScheme.primary.withOpacity(0.1)),
                ),
                child: Column(
                  children: [
                    Text("Live Formula Breakdown", style: theme.textTheme.labelLarge?.copyWith(color: theme.colorScheme.primary, fontWeight: FontWeight.w900, letterSpacing: 1)),
                    const SizedBox(height: 16),
                    const _FormulaRow(label: "On-Task", icon: Icons.check_circle_outline, value: "Points +", color: Colors.green),
                    const _FormulaRow(label: "Distractions", icon: Icons.error_outline, value: "Points -", color: Colors.red),
                    const Divider(height: 32),
                    const Text(
                      "Sum of Behaviors ÷ Total Headcount",
                      textAlign: TextAlign.center,
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              const Divider(),
              const SizedBox(height: 16),
              const Text(
                "Why is 'Not Visible' accounted for?",
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
              ),
              const SizedBox(height: 8),
              Text(
                "To ensure 100% accuracy, we track students the camera can't currently see. This creates a realistic classroom average rather than just a best-case scenario.",
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.hintColor, height: 1.5),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}

class _MethodologyStep extends StatelessWidget {
  final String step;
  final IconData icon;
  final String title;
  final String desc;
  final ThemeData theme;
  final bool isLast;

  const _MethodologyStep({required this.step, required this.icon, required this.title, required this.desc, required this.theme, this.isLast = false});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(color: theme.colorScheme.primary, shape: BoxShape.circle),
              alignment: Alignment.center,
              child: Text(step, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
            if (!isLast)
              Container(width: 2, height: 40, color: theme.dividerColor.withOpacity(0.2)),
          ],
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(icon, size: 18, color: theme.colorScheme.primary),
                  const SizedBox(width: 8),
                  Text(title, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 4),
              Text(desc, style: theme.textTheme.bodySmall?.copyWith(color: theme.hintColor, height: 1.4)),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ],
    );
  }
}

class _FormulaRow extends StatelessWidget {
  final String label;
  final IconData icon;
  final String value;
  final Color color;

  const _FormulaRow({required this.label, required this.icon, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 12),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
          const Spacer(),
          Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 13)),
        ],
      ),
    );
  }
}
