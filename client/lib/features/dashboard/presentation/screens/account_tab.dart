import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/core/utils/image_url_resolver.dart';
import 'package:teachtrack/features/auth/presentation/providers/auth_provider.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';
import 'package:teachtrack/features/classroom/presentation/providers/classroom_provider.dart';
import 'package:teachtrack/core/theme/theme_provider.dart';
import 'package:teachtrack/features/auth/presentation/screens/edit_profile_screen.dart';
import 'package:teachtrack/features/auth/presentation/screens/change_password_screen.dart';
import 'package:image_picker/image_picker.dart';

class AccountTab extends StatelessWidget {
  const AccountTab({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = context.watch<AuthProvider>();
    final session = context.watch<SessionProvider>();
    final classroom = context.watch<ClassroomProvider>();
    final user = auth.user;

    final fullName = '${user?.firstname ?? ''} ${user?.lastname ?? ''}'.trim();
    final initial = user?.firstname?.isNotEmpty == true ? user!.firstname![0].toUpperCase() : '?';

    // Determine college - Prioritize explicit college info from User Profile
    String collegeName = user?.collegeName ?? 'Instructor';
    String? collegeLogoPath = user?.collegeLogoPath;

    // Determine department - Prioritize explicit department info from User Profile
    String? departmentName = user?.departmentName;
    String? departmentCoverImageUrl = user?.departmentCoverImageUrl;

    // Fallback if missing in profile
    final userCollegeName = user?.collegeName?.trim();
    if (userCollegeName == null || userCollegeName.isEmpty) {
      if (classroom.subjects.isNotEmpty) {
        final Map<String, int> counts = {};
        final Map<String, String?> logos = {};
        for (final s in classroom.subjects) {
          if (s.collegeName != null && s.collegeName!.trim().isNotEmpty) {
            counts[s.collegeName!] = (counts[s.collegeName!] ?? 0) + 1;
            logos[s.collegeName!] = s.collegeLogoPath;
          }
        }
        if (counts.isNotEmpty) {
          final sorted = counts.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
          collegeName = sorted.first.key;
          collegeLogoPath = logos[collegeName];
        }
      }
    }

    // Fallback department from classroom subjects
    if (departmentName == null || departmentName.trim().isEmpty) {
      if (classroom.subjects.isNotEmpty) {
        final Map<String, int> counts = {};
        final Map<String, String?> coverUrls = {};
        for (final s in classroom.subjects) {
          if (s.departmentName != null && s.departmentName!.trim().isNotEmpty) {
            counts[s.departmentName!] = (counts[s.departmentName!] ?? 0) + 1;
            coverUrls[s.departmentName!] = s.departmentCoverImageUrl;
          }
        }
        if (counts.isNotEmpty) {
          final sorted = counts.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
          departmentName = sorted.first.key;
          departmentCoverImageUrl = coverUrls[departmentName];
        }
      }
    }

    final collegeLogoUrl = resolveImageUrl(collegeLogoPath);
    final deptCoverUrl = resolveImageUrl(departmentCoverImageUrl);
    final deptLabel = departmentName?.trim();

    final isDark = theme.brightness == Brightness.dark;
    final colorScheme = theme.colorScheme;
    final cardBg = isDark
        ? [const Color(0xFF18181B), const Color(0xFF09090B)]
        : [Colors.white, Colors.white];
    final textColor = isDark ? Colors.white : theme.textTheme.bodyLarge?.color;
    final subColor = isDark ? Colors.white.withOpacity(0.7) : theme.textTheme.bodyMedium?.color;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
      children: [
        // ── Profile Header Card Redesign ──────────────────────────────────────
        Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: cardBg,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(32),
            border: Border.all(color: isDark ? Colors.white.withOpacity(0.05) : colorScheme.primary.withOpacity(0.1)),
            boxShadow: [
              BoxShadow(
                color: isDark ? Colors.black.withOpacity(0.2) : colorScheme.primary.withOpacity(0.05),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            children: [
              Positioned(
                right: -30,
                top: -30,
                child: Opacity(
                  opacity: isDark ? 0.05 : 0.03,
                  child: Icon(Icons.person_rounded, size: 180, color: isDark ? Colors.white : colorScheme.primary),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(28),
                child: Column(
                  children: [
                    Row(
                      children: [
                        GestureDetector(
                          onTap: auth.isLoading ? null : () => _pickImage(context, auth),
                          child: Stack(
                            children: [
                              Container(
                                width: 84,
                                height: 84,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: (isDark ? Colors.white : colorScheme.primary).withOpacity(0.2), 
                                    width: 3
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.1), 
                                      blurRadius: 10, 
                                      offset: const Offset(0, 4)
                                    ),
                                  ],
                                ),
                                child: CircleAvatar(
                                  backgroundColor: (isDark ? Colors.white : colorScheme.primary).withOpacity(0.1),
                                  backgroundImage: user?.profilePictureUrl != null 
                                    ? NetworkImage(user!.profilePictureUrl!) 
                                    : null,
                                  child: user?.profilePictureUrl == null 
                                    ? Text(initial, 
                                        style: TextStyle(
                                          color: isDark ? Colors.white : colorScheme.primary, 
                                          fontSize: 32, 
                                          fontWeight: FontWeight.w900
                                        ))
                                    : (auth.isLoading 
                                        ? CircularProgressIndicator(color: colorScheme.primary, strokeWidth: 3)
                                        : null),
                                ),
                              ),
                              if (!auth.isLoading)
                                Positioned(
                                  bottom: 2,
                                  right: 2,
                                  child: Container(
                                    padding: const EdgeInsets.all(6),
                                    decoration: BoxDecoration(
                                      color: colorScheme.primary,
                                      shape: BoxShape.circle,
                                      border: Border.all(color: theme.scaffoldBackgroundColor, width: 2),
                                    ),
                                    child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 12),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 20),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(fullName.isEmpty ? 'Teacher' : fullName, 
                                maxLines: 1, 
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: textColor, 
                                  fontWeight: FontWeight.w900, 
                                  fontSize: 24, 
                                  letterSpacing: -0.5
                                )
                              ),
                              const SizedBox(height: 4),
                              Text(user?.email ?? '', 
                                style: TextStyle(
                                  color: subColor?.withOpacity(0.7), 
                                  fontSize: 13, 
                                  fontWeight: FontWeight.w600
                                )
                              ),
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: (isDark ? Colors.white : colorScheme.primary).withOpacity(0.08),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    if (collegeLogoUrl != null) ...[
                                      Container(
                                        width: 18,
                                        height: 18,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                            color: (isDark ? Colors.white : colorScheme.primary).withOpacity(0.25),
                                          ),
                                        ),
                                        clipBehavior: Clip.antiAlias,
                                        child: Image.network(
                                          collegeLogoUrl,
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, __, ___) => Icon(
                                            Icons.school_rounded,
                                            color: isDark ? Colors.white70 : colorScheme.primary,
                                            size: 14,
                                          ),
                                        ),
                                      ),
                                    ] else
                                      Icon(Icons.school_rounded, color: isDark ? Colors.white70 : colorScheme.primary, size: 14),
                                    const SizedBox(width: 8),
                                    Flexible(
                                      child: Text(collegeName, 
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          color: isDark ? Colors.white70 : colorScheme.primary, 
                                          fontSize: 11, 
                                          fontWeight: FontWeight.w800,
                                          letterSpacing: 0.2,
                                        )
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (deptLabel != null && deptLabel.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: (isDark ? Colors.white : colorScheme.primary).withOpacity(0.08),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      if (deptCoverUrl != null) ...[
                                        Container(
                                          width: 22,
                                          height: 16,
                                          decoration: BoxDecoration(
                                            borderRadius: BorderRadius.circular(6),
                                            border: Border.all(
                                              color: (isDark ? Colors.white : colorScheme.primary).withOpacity(0.25),
                                            ),
                                          ),
                                          clipBehavior: Clip.antiAlias,
                                          child: Image.network(
                                            deptCoverUrl,
                                            fit: BoxFit.cover,
                                            errorBuilder: (_, __, ___) => Icon(
                                              Icons.apartment_rounded,
                                              color: isDark ? Colors.white70 : colorScheme.primary,
                                              size: 14,
                                            ),
                                          ),
                                        ),
                                      ] else
                                        Icon(Icons.apartment_rounded, color: isDark ? Colors.white70 : colorScheme.primary, size: 14),
                                      const SizedBox(width: 8),
                                      Flexible(
                                        child: Text(
                                          deptLabel,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            color: isDark ? Colors.white70 : colorScheme.primary,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w800,
                                            letterSpacing: 0.2,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: (isDark ? Colors.white : colorScheme.primary).withOpacity(0.05),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: (isDark ? Colors.white : colorScheme.primary).withOpacity(0.05)),
                      ),
                      child: Row(
                        children: [
                          _HeaderQuickStat(
                            label: 'Total Sessions', 
                            value: '${session.history.length}', 
                            icon: Icons.history_rounded,
                            isDark: isDark,
                            primaryColor: colorScheme.primary,
                          ),
                          Container(
                            width: 1, 
                            height: 30, 
                            color: (isDark ? Colors.white : colorScheme.primary).withOpacity(0.1)
                          ),
                          _HeaderQuickStat(
                            label: 'Avg Engagement', 
                            value: '${(session.history.isEmpty ? 0 : session.history.fold(0.0, (s, h) => s + h.averageEngagement) / session.history.length).toStringAsFixed(0)}%', 
                            icon: Icons.bolt_rounded,
                            isDark: isDark,
                            primaryColor: colorScheme.primary,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 32),

        // ── Account Settings Section ──────────────────────────────────────────
        _SectionLabel('ACCOUNT & SECURITY', theme),
        _GroupedCard(
          theme: theme,
          tiles: [
            _SettingTile(
              icon: Icons.person_outline_rounded,
              color: const Color(0xFF6C63FF),
              title: 'Edit Profile Information',
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const EditProfileScreen())),
              theme: theme,
            ),
             _SettingTile(
              icon: Icons.lock_outline_rounded,
              color: const Color(0xFF4AC8FF),
              title: 'Change Password',
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ChangePasswordScreen())),
              theme: theme,
            ),
            _SettingTile(
              icon: Icons.logout_rounded,
              color: const Color(0xFFFF6B6B),
              title: 'Sign Out Account',
              titleColor: const Color(0xFFFF6B6B),
              showChevron: false,
              onTap: () => _confirmLogout(context, auth),
              theme: theme,
            ),
          ],
        ),
        const SizedBox(height: 24),

        // ── App Preferences Section ──────────────────────────────────────────
        _SectionLabel('PREFERENCES', theme),
        _GroupedCard(
          theme: theme,
          tiles: [
            _SettingTile(
              icon: Icons.palette_outlined,
              color: const Color(0xFF00C9A7),
              title: 'App Appearance',
              subtitle: theme.brightness == Brightness.dark ? 'Dark Mode Active' : 'Light Mode Active',
              onTap: () => _showThemeSheet(context, theme),
              theme: theme,
            ),
            _SettingTile(
              icon: Icons.psychology_rounded,
              color: const Color(0xFFFFB300),
              title: 'AI Behavioral Models',
              subtitle: 'System-wide monitoring settings',
              trailingText: session.currentModelFile != null ? 'Active' : 'Offline',
              showChevron: true, // Let's use chevron so users know they can tap for info
              onTap: () => _showModelsInfo(context, session, theme),
              theme: theme,
            ),
          ],
        ),
        const SizedBox(height: 24),

        // ── Info Section ────────────────────────────────────────────────────
        _SectionLabel('ABOUT TEACHTRACK', theme),
        _GroupedCard(
          theme: theme,
          tiles: [
            _SettingTile(
              icon: Icons.info_outline_rounded,
              color: theme.colorScheme.secondary,
              title: 'Application Version',
              trailingText: '1.2.0',
              showChevron: false,
              onTap: () {},
              theme: theme,
            ),
            _SettingTile(
              icon: Icons.auto_awesome_rounded,
              color: theme.colorScheme.primary,
              title: 'Our Developmental Mission',
              onTap: () => _showAboutMission(context, theme),
              theme: theme,
            ),
          ],
        ),
        const SizedBox(height: 24),

        // ── Methodology Section ──────────────────────────────────────────────
        _SectionLabel('SUPPORT & TRANSPARENCY', theme),
        _GroupedCard(
          theme: theme,
          tiles: [
            _SettingTile(
              icon: Icons.calculate_outlined,
              color: const Color(0xFF6C63FF),
              title: 'How Engagement is Calculated',
              subtitle: 'Learn about our scoring methodology',
              onTap: () => _showMethodology(context, theme),
              theme: theme,
            ),
          ],
        ),
        const SizedBox(height: 48),
        Center(
          child: Column(
            children: [
              Image.asset('assets/images/logo.png', width: 48, height: 48, errorBuilder: (_, __, ___) => const Icon(Icons.school_rounded, size: 32, color: Colors.grey)),
              const SizedBox(height: 12),
              Text(
                '© 2026 TeachTrack — Capstone Project',
                style: theme.textTheme.labelSmall?.copyWith(color: theme.hintColor.withOpacity(0.7), fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 4),
              Text('Designed for Educators', style: theme.textTheme.labelSmall?.copyWith(color: theme.hintColor.withOpacity(0.4))),
            ],
          ),
        ),
      ],
    );
  }

  void _showThemeSheet(BuildContext context, ThemeData theme) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _ThemeSheet(theme: theme),
    );
  }

  void _showModelsInfo(BuildContext context, SessionProvider session, ThemeData theme) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: theme.cardColor,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 24),
                decoration: BoxDecoration(color: theme.hintColor.withOpacity(0.2), borderRadius: BorderRadius.circular(2)),
              ),
            ),
            Row(
              children: [
                Icon(Icons.psychology_rounded, color: const Color(0xFFFFB300), size: 28),
                const SizedBox(width: 12),
                Text('AI Behavioral Models', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900, letterSpacing: -0.5)),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'These models analyze behavioral patterns in real-time. Selection is controlled by the institution\'s administrators to maintain consistency across sessions.',
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.hintColor, height: 1.4),
            ),
            const SizedBox(height: 24),
            ...session.availableModels.map((m) {
              final isActive = m.fileName == session.currentModelFile;
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isActive 
                    ? theme.colorScheme.primary.withOpacity(0.08)
                    : theme.brightness == Brightness.dark ? Colors.white.withOpacity(0.03) : Colors.black.withOpacity(0.02),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isActive ? theme.colorScheme.primary.withOpacity(0.2) : theme.dividerColor.withOpacity(0.05),
                    width: 1.5,
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(m.displayName, style: theme.textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w800)),
                          if (isActive) ...[
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(color: theme.colorScheme.primary, borderRadius: BorderRadius.circular(6)),
                              child: const Text('ACTIVATED BY ADMIN', style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
                            ),
                          ],
                        ],
                      ),
                    ),
                    if (isActive)
                      Icon(Icons.check_circle_rounded, color: theme.colorScheme.primary, size: 24)
                    else
                      Icon(Icons.lock_rounded, color: theme.hintColor.withOpacity(0.3), size: 18),
                  ],
                ),
              );
            }),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Back to Account Settings', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
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
                icon: Icons.camera_alt_rounded,
                title: "AI Detection",
                desc: "The system identifies all students currently in the camera's view. This becomes the 'Sample' for the current score.",
                theme: theme,
              ),
              _MethodologyStep(
                step: "2",
                icon: Icons.psychology_rounded,
                title: "Behavior Analysis",
                desc: "Our AI counts behaviors (On-Task, Phone, Sleep) for ONLY the students detected in-frame.",
                theme: theme,
              ),
              _MethodologyStep(
                step: "3",
                icon: Icons.auto_awesome_rounded,
                title: "Visibility-Based Score",
                desc: "The score is calculated by dividing the engagement quality of observed students by the total students currently in view.",
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
                      "Sum of Behaviors ÷ Observed Sample",
                      textAlign: TextAlign.center,
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              const Divider(),
              const SizedBox(height: 16),
              Text(
                "Why is Visibility-Based?",
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(
                "Because your camera may not see every student in the room, we focus only on those in view. This ensures the score accurately reflects the engagement of the students you are currently monitoring.",
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.hintColor, height: 1.5),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  void _showAboutMission(BuildContext context, ThemeData theme) {
    showDialog(
      context: context,
       builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Text('Our Mission', style: TextStyle(fontWeight: FontWeight.w800)),
        content: const Text('TeachTrack empowers educators with real-time AI-powered classroom engagement monitoring, helping improve student participation and teaching effectiveness through data-driven insights.', style: TextStyle(height: 1.5)),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Understood'))],
      ),
    );
  }

  Future<void> _pickImage(BuildContext context, AuthProvider auth) async {
    final picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.gallery);
    
    if (image != null && context.mounted) {
      final success = await auth.uploadProfilePicture(image.path);
      if (context.mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile picture updated!')));
        } else {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(auth.error ?? 'Upload failed')));
        }
      }
    }
  }

  Future<void> _confirmLogout(BuildContext context, AuthProvider auth) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Text('Sign Out?', style: TextStyle(fontWeight: FontWeight.w800)),
        content: const Text('Are you sure you want to log out of your account?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFFF6B6B), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
    if (ok == true) auth.logout();
  }
}

class _TechRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String sub;
  const _TechRow({required this.icon, required this.label, required this.sub});
  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: EdgeInsets.zero,
    leading: Icon(icon, color: Theme.of(context).colorScheme.primary),
    title: Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
    subtitle: Text(sub, style: const TextStyle(fontSize: 12)),
  );
}

class _HeaderQuickStat extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final bool isDark;
  final Color primaryColor;

  const _HeaderQuickStat({
    required this.label, 
    required this.value, 
    required this.icon,
    required this.isDark,
    required this.primaryColor,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: isDark ? Colors.white70 : primaryColor, size: 20),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(color: isDark ? Colors.white : primaryColor, fontSize: 20, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
          Text(label, style: TextStyle(color: isDark ? Colors.white54 : primaryColor.withOpacity(0.6), fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String label;
  final ThemeData theme;
  const _SectionLabel(this.label, this.theme);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 12, bottom: 8),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: theme.colorScheme.secondary,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.5,
        ),
      ),
    );
  }
}

class _GroupedCard extends StatelessWidget {
  final List<Widget> tiles;
  final ThemeData theme;
  const _GroupedCard({required this.tiles, required this.theme});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: theme.dividerColor.withOpacity(0.4)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        children: tiles.asMap().entries.map((e) {
          return Column(
            children: [
              e.value,
              if (e.key < tiles.length - 1)
                Divider(height: 1, indent: 64, color: theme.dividerColor.withOpacity(0.3)),
            ],
          );
        }).toList(),
      ),
    );
  }
}

class _SettingTile extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final Color? titleColor;
  final String? subtitle;
  final String? trailingText;
  final bool showChevron;
  final VoidCallback onTap;
  final ThemeData theme;

  const _SettingTile({
    required this.icon,
    required this.color,
    required this.title,
    this.titleColor,
    this.subtitle,
    this.trailingText,
    this.showChevron = true,
    required this.onTap,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
      leading: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(16)),
        child: Icon(icon, color: color, size: 22),
      ),
      title: Text(title, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700, color: titleColor, fontSize: 15)),
      subtitle: subtitle != null ? Text(subtitle!, style: theme.textTheme.bodySmall?.copyWith(color: theme.hintColor)) : null,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (trailingText != null) ...[
             Text(trailingText!, style: theme.textTheme.bodySmall?.copyWith(color: theme.hintColor, fontWeight: FontWeight.w700, fontSize: 13)),
             const SizedBox(width: 8),
          ],
          if (showChevron) Icon(Icons.chevron_right_rounded, size: 22, color: theme.hintColor.withOpacity(0.4)),
        ],
      ),
      onTap: onTap,
    );
  }
}

class _ThemeSheet extends StatelessWidget {
  final ThemeData theme;
  const _ThemeSheet({required this.theme});

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(color: theme.cardColor, borderRadius: BorderRadius.circular(32)),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Appearance', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900, letterSpacing: -0.5)),
          const SizedBox(height: 24),
          _ThemeItem(title: 'System Default', icon: Icons.brightness_auto_rounded, selected: themeProvider.themeMode == ThemeMode.system, onTap: () => themeProvider.setThemeMode(ThemeMode.system), theme: theme),
          _ThemeItem(title: 'Light Mode', icon: Icons.light_mode_rounded, selected: themeProvider.themeMode == ThemeMode.light, onTap: () => themeProvider.setThemeMode(ThemeMode.light), theme: theme),
          _ThemeItem(title: 'Dark Mode', icon: Icons.dark_mode_rounded, selected: themeProvider.themeMode == ThemeMode.dark, onTap: () => themeProvider.setThemeMode(ThemeMode.dark), theme: theme),
        ],
      ),
    );
  }
}

class _ThemeItem extends StatelessWidget {
  final String title;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  final ThemeData theme;
  const _ThemeItem({required this.title, required this.icon, required this.selected, required this.onTap, required this.theme});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: selected ? theme.colorScheme.primary.withOpacity(0.1) : Colors.transparent, borderRadius: BorderRadius.circular(10)),
        child: Icon(icon, color: selected ? theme.colorScheme.primary : theme.hintColor),
      ),
      title: Text(title, style: TextStyle(fontWeight: selected ? FontWeight.w800 : FontWeight.w600, color: selected ? theme.colorScheme.primary : theme.textTheme.bodyLarge?.color)),
      trailing: selected ? Icon(Icons.check_circle_rounded, color: theme.colorScheme.primary, size: 24) : null,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
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
