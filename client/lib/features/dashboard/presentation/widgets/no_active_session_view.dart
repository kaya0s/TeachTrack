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
              colors: [Color(0xFF10B981), Color(0xFF0D9488)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF10B981).withValues(alpha: 0.25),
                blurRadius: 15,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: isLoading ? null : onStartSession,
              borderRadius: BorderRadius.circular(20),
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
                          Icon(Icons.sensors_rounded, color: Colors.white, size: 22),
                          SizedBox(width: 12),
                          Text(
                            "Initiate Monitoring Session",
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.2,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 18),
      ],
    );
  }
}
