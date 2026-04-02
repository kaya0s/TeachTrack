import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/features/auth/presentation/providers/auth_provider.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';
import 'package:teachtrack/features/classroom/presentation/providers/classroom_provider.dart';
import 'package:teachtrack/features/session/domain/models/session_models.dart';
import 'package:teachtrack/core/providers/navigation_provider.dart';
import 'package:teachtrack/features/classroom/domain/models/classroom_models.dart';
import 'package:teachtrack/features/session/presentation/screens/session_detail_screen.dart';
import 'package:teachtrack/features/session/presentation/screens/session_history_screen.dart';
import 'package:teachtrack/features/dashboard/presentation/widgets/start_session_bottom_sheet.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'package:teachtrack/core/widgets/hierarchy_meta_row.dart';
import 'package:teachtrack/core/utils/image_url_resolver.dart';
  
class HomeTab extends StatefulWidget {
  const HomeTab({super.key});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  final _refreshKey = GlobalKey<RefreshIndicatorState>();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _onRefresh();
    });
  }

  Future<void> _onRefresh() async {
    if (!mounted) return;
    final session = context.read<SessionProvider>();
    final classroom = context.read<ClassroomProvider>();
    
    // Fetch both classroom data (subjects/sections) AND session history
    await Future.wait([
      classroom.fetchClassroomData(),
      session.fetchSessionHistory(includeActive: false),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = context.watch<AuthProvider>();
    final session = context.watch<SessionProvider>();
    final classroom = context.watch<ClassroomProvider>();

    final user = auth.user;

    // Determine full name
    final fullName = (user?.fullname?.trim().isNotEmpty == true)
        ? user!.fullname!
        : (user?.displayName ?? 'Teacher');

    // Determine college - Prioritize explicit college info from User Profile
    String collegeName = user?.collegeName ?? 'Instructor';
    String? collegeLogoPath = user?.collegeLogoPath;

    // Determine department - Prioritize explicit department info from User Profile
    String? departmentName = user?.departmentName;
    String? departmentCoverImageUrl = user?.departmentCoverImageUrl;
    
    // If user's college info is not in the profile, fall back to inferring from subjects
    if (user?.collegeName == null || user!.collegeName!.trim().isEmpty) {
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

    // If user's department info is not in the profile, fall back to inferring from subjects
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

    final greeting = _getGreeting();

    // ── Computed stats ──────────────────────────────────────────────────────
    final totalSessions = session.history.length;
    final totalClasses = classroom.subjects.length;
    final totalSections =
        classroom.subjects.fold(0, (s, sub) => s + sub.sections.length);
    final hasActiveSession = session.activeSession != null;

    final completedSessions =
        session.history.where((s) => !s.isActive).toList();
    final double avgEngagement = completedSessions.isEmpty
        ? 0
        : completedSessions.fold(0.0, (s, h) => s + h.averageEngagement) /
            completedSessions.length;

    // Calculate Best Section (highest average engagement across all its sessions)
    String? bestSectionName;
    String? bestSectionSubjectName;
    double bestSectionAvg = 0;
    if (completedSessions.isNotEmpty) {
      final Map<String, List<double>> sectionScores = {};
      final Map<String, String> sectionSubjects = {};
      final Map<String, String> sectionNames = {};
      
      for (final s in completedSessions) {
        final key = '${s.subjectId}-${s.sectionName}';
        sectionScores.putIfAbsent(key, () => []).add(s.averageEngagement);
        sectionSubjects[key] = s.subjectName;
        sectionNames[key] = s.sectionName;
      }

      for (final entry in sectionScores.entries) {
        final avg = entry.value.reduce((a, b) => a + b) / entry.value.length;
        if (avg > bestSectionAvg) {
          bestSectionAvg = avg;
          bestSectionName = sectionNames[entry.key];
          bestSectionSubjectName = sectionSubjects[entry.key];
        }
      }
    }

    // This week sessions
    final now = DateTime.now().toUtc().add(const Duration(hours: 8));
    final today = DateTime(now.year, now.month, now.day);
    final weekStart = today.subtract(Duration(days: now.weekday - 1));
    final thisWeekSessions = completedSessions
        .where((s) => s.startTime.isAfter(weekStart))
        .length;

    final isLoading = session.historyLoading || classroom.isLoading;

    return RefreshIndicator(
      key: _refreshKey,
      onRefresh: _onRefresh,
      color: theme.colorScheme.primary,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          // ── Loading Indicator ───────────────────────────────────────────────
          if (isLoading)
            const SliverToBoxAdapter(
              child: LinearProgressIndicator(minHeight: 2),
            ),
            
          // ── Hero header ─────────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: _HeroHeader(
              greeting: greeting,
              fullName: fullName,
              collegeName: collegeName,
              departmentName: departmentName,
              departmentCoverImageUrl: departmentCoverImageUrl,
              collegeLogoPath: collegeLogoPath,
              profilePictureUrl: user?.profilePictureUrl,
              userInitial: user?.firstname?.isNotEmpty == true
                  ? user!.firstname![0].toUpperCase()
                  : fullName.isNotEmpty
                      ? fullName[0].toUpperCase()
                      : '?',
              hasActiveSession: hasActiveSession,
              theme: theme,
            ),
          ),



          // ── Stats grid ───────────────────────────────────────────────────────
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SectionHeader('Overview', theme),
                  const SizedBox(height: 10),
                  _StatsGrid(
                    totalSessions: totalSessions,
                    totalClasses: totalClasses,
                    totalSections: totalSections,
                    avgEngagement: avgEngagement,
                    thisWeekSessions: thisWeekSessions,
                    hasActiveSession: hasActiveSession,
                    theme: theme,
                  ),
                  const SizedBox(height: 20),

                  // Engagement bar
                  if (completedSessions.isNotEmpty) ...[
                    _SectionHeader('Avg. Engagement', theme),
                    const SizedBox(height: 10),
                    _EngagementMeter(value: avgEngagement, theme: theme),
                    const SizedBox(height: 20),
                  ],

                  // Mini analytics preview
                  if (completedSessions.length >= 2) ...[
                    _SectionHeader('Weekly Trend', theme),
                    const SizedBox(height: 10),
                    _MiniAnalyticsCard(
                      sessions: completedSessions,
                      theme: theme,
                    ),
                    const SizedBox(height: 20),
                  ],

                  // Best section
                  if (bestSectionName != null) ...[
                    _SectionHeader('Best Performing Section', theme),
                    const SizedBox(height: 10),
                    _BestSectionCard(
                      sectionName: bestSectionName,
                      subjectName: bestSectionSubjectName ?? 'Subject',
                      engagement: bestSectionAvg,
                      theme: theme,
                    ),
                    const SizedBox(height: 20),
                  ],

                  // Recent sessions
                  if (completedSessions.isNotEmpty) ...[
                    Row(
                      children: [
                        Expanded(
                            child: _SectionHeader('Recent Activity', theme)),
                        TextButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => const SessionHistoryScreen(),
                              ),
                            );
                          },
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: Text(
                            'View All',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: theme.colorScheme.primary,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    _RecentSessionsList(
                      sessions: completedSessions.take(3).toList(),
                      subjects: classroom.subjects,
                      theme: theme,
                    ),
                    const SizedBox(height: 20),
                  ],


                ],
              ),
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }

  String _getGreeting() {
    final now = DateTime.now().toUtc().add(const Duration(hours: 8));
    final hour = now.hour;
    if (hour < 5) return 'Good night';
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }
}

// ── Hero Header ──────────────────────────────────────────────────────────────

class _HeroHeader extends StatelessWidget {
  final String greeting;
  final String fullName;
  final String collegeName;
  final String? departmentName;
  final String? departmentCoverImageUrl;
  final String? collegeLogoPath;
  final String? profilePictureUrl;
  final String userInitial;
  final bool hasActiveSession;
  final ThemeData theme;

  const _HeroHeader({
    required this.greeting,
    required this.fullName,
    required this.collegeName,
    required this.departmentName,
    required this.departmentCoverImageUrl,
    required this.collegeLogoPath,
    required this.profilePictureUrl,
    required this.userInitial,
    required this.hasActiveSession,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    // Explicitly using PH Time (UTC+8) to ensure consistency
    final now = DateTime.now().toUtc().add(const Duration(hours: 8));
    final dateStr = DateFormat('MMMM d, EEEE').format(now);
    final timeStr = DateFormat('hh:mm a').format(now);
    final isDark = theme.brightness == Brightness.dark;
    final colorScheme = theme.colorScheme;

    final List<Color> cardBg = isDark
        ? [const Color(0xFF18181B), const Color(0xFF09090B)]
        : [Colors.white, Colors.white];
    final textColor = isDark ? Colors.white : theme.textTheme.bodyLarge?.color;
    final subColor = isDark ? Colors.white.withOpacity(0.7) : theme.textTheme.bodyMedium?.color;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: cardBg,
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
            right: -20,
            top: -20,
            child: Opacity(
              opacity: isDark ? 0.05 : 0.03,
              child: Icon(Icons.school_rounded, size: 160, color: isDark ? Colors.white : colorScheme.primary),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white.withOpacity(0.12) : colorScheme.primary.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.calendar_today_rounded, size: 12, color: isDark ? Colors.white.withOpacity(0.8) : colorScheme.primary),
                          const SizedBox(width: 8),
                          Text(
                            dateStr, 
                            style: TextStyle(
                              color: isDark ? Colors.white : colorScheme.primary, 
                              fontSize: 10, 
                              fontWeight: FontWeight.w800, 
                              letterSpacing: 0.5
                            )
                          ),
                        ],
                      ),
                    ),
                    Text(
                      timeStr, 
                      style: TextStyle(
                        color: isDark ? Colors.white.withOpacity(0.8) : colorScheme.primary.withOpacity(0.8), 
                        fontSize: 12, 
                        fontWeight: FontWeight.w900, 
                        letterSpacing: 1.0
                      )
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    _ProfileAvatar(
                      profilePictureUrl: profilePictureUrl,
                      initial: userInitial,
                      theme: theme,
                      size: 64,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            greeting,
                            style: TextStyle(
                              color: subColor?.withOpacity(0.7),
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            fullName,
                            style: TextStyle(
                              color: textColor,
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -0.5,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Container(
                                decoration: BoxDecoration(
                                  color: isDark ? Colors.blueAccent.withOpacity(0.2) : colorScheme.primary.withOpacity(0.05),
                                  shape: BoxShape.circle,
                                ),
                                child: _CollegeLogo(
                                  logoPath: collegeLogoPath,
                                  size: 18,
                                  placeholderText: collegeName.isNotEmpty ? collegeName[0] : 'C',
                                  theme: theme,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  collegeName,
                                  style: TextStyle(
                                    color: subColor,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          if (departmentName?.trim().isNotEmpty == true) ...[
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                if (resolveImageUrl(departmentCoverImageUrl) != null) ...[
                                  Container(
                                    width: 22,
                                    height: 16,
                                    decoration: BoxDecoration(
                                      color: isDark ? Colors.white.withOpacity(0.12) : colorScheme.primary.withOpacity(0.05),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: theme.dividerColor.withOpacity(0.35)),
                                    ),
                                    clipBehavior: Clip.antiAlias,
                                    child: Image.network(
                                      resolveImageUrl(departmentCoverImageUrl)!,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => Icon(Icons.apartment_rounded, size: 16, color: subColor),
                                    ),
                                  ),
                                ] else
                                  Icon(Icons.apartment_rounded, size: 16, color: subColor),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    departmentName!.trim(),
                                    style: TextStyle(
                                      color: subColor,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
                if (hasActiveSession) ...[
                  const SizedBox(height: 20),
                  GestureDetector(
                    onTap: () => context.read<NavigationProvider>().setIndex(2),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.greenAccent.withOpacity(0.1) : Colors.green.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: (isDark ? Colors.greenAccent : Colors.green).withOpacity(0.2)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(color: isDark ? Colors.greenAccent : Colors.green, shape: BoxShape.circle),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            'Active Class Session in Progress',
                            style: TextStyle(
                              color: isDark ? Colors.greenAccent : Colors.green[700],
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const Spacer(),
                          Icon(Icons.arrow_forward_ios_rounded, size: 10, color: isDark ? Colors.greenAccent : Colors.green[700]),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Profile Avatar ───────────────────────────────────────────────────────────

class _ProfileAvatar extends StatelessWidget {
  final String? profilePictureUrl;
  final String initial;
  final ThemeData theme;
  final double size;

  const _ProfileAvatar({
    required this.profilePictureUrl,
    required this.initial,
    required this.theme,
    required this.size,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: theme.colorScheme.primary.withValues(alpha: 0.2),
          width: 2,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: profilePictureUrl != null && profilePictureUrl!.isNotEmpty
            ? Image.network(
                profilePictureUrl!,
                fit: BoxFit.cover,
                width: size,
                height: size,
                errorBuilder: (_, __, ___) => _buildInitialAvatar(),
                loadingBuilder: (_, child, progress) {
                  if (progress == null) return child;
                  return _buildInitialAvatar();
                },
              )
            : _buildInitialAvatar(),
      ),
    );
  }

  Widget _buildInitialAvatar() {
    return Container(
      color: theme.colorScheme.primary.withValues(alpha: 0.15),
      child: Center(
        child: Text(
          initial,
          style: TextStyle(
            color: theme.colorScheme.primary,
            fontSize: 22,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

// ── College Logo ─────────────────────────────────────────────────────────────

class _CollegeLogo extends StatelessWidget {
  final String? logoPath;
  final double size;
  final String placeholderText;
  final ThemeData theme;

  const _CollegeLogo({
    required this.logoPath,
    required this.size,
    required this.placeholderText,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    final logoUrl = resolveImageUrl(logoPath);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: theme.dividerColor,
          width: 1,
        ),
      ),
      child: ClipOval(
        child: logoUrl != null
            ? Image.network(
                logoUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _buildPlaceholder(),
              )
            : _buildPlaceholder(),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      color: theme.colorScheme.secondary.withValues(alpha: 0.1),
      child: Center(
        child: Text(
          placeholderText.toUpperCase(),
          style: TextStyle(
            color: theme.colorScheme.secondary,
            fontSize: size * 0.4,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

// ── Quick Actions ─────────────────────────────────────────────────────────────



// ── Stats Grid ───────────────────────────────────────────────────────────────

class _StatsGrid extends StatelessWidget {
  final int totalSessions;
  final int totalClasses;
  final int totalSections;
  final double avgEngagement;
  final int thisWeekSessions;
  final bool hasActiveSession;
  final ThemeData theme;

  const _StatsGrid({
    required this.totalSessions,
    required this.totalClasses,
    required this.totalSections,
    required this.avgEngagement,
    required this.thisWeekSessions,
    required this.hasActiveSession,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _StatTile(
                icon: Icons.history_edu_rounded,
                label: 'Total Sessions',
                value: '$totalSessions',
                accent: const Color(0xFF6C63FF),
                theme: theme,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _StatTile(
                icon: Icons.class_rounded,
                label: 'Classes',
                value: '$totalClasses',
                accent: const Color(0xFF00C9A7),
                theme: theme,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _StatTile(
                icon: Icons.groups_rounded,
                label: 'Sections',
                value: '$totalSections',
                accent: const Color(0xFFFF6B6B),
                theme: theme,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _StatTile(
                icon: Icons.calendar_today_rounded,
                label: 'This Week',
                value: '$thisWeekSessions',
                accent: const Color(0xFFFFB300),
                theme: theme,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _StatTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color accent;
  final ThemeData theme;

  const _StatTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.accent,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: accent, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    height: 1.1,
                  ),
                ),
                Text(
                  label,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.secondary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Engagement Meter ─────────────────────────────────────────────────────────

class _EngagementMeter extends StatelessWidget {
  final double value; // 0–100
  final ThemeData theme;
  const _EngagementMeter({required this.value, required this.theme});

  Color _color(double v) {
    if (v >= 70) return const Color(0xFF00C9A7);
    if (v >= 45) return const Color(0xFFFFB300);
    return const Color(0xFFFF6B6B);
  }

  String _label(double v) {
    if (v >= 70) return 'High';
    if (v >= 45) return 'Moderate';
    return 'Low';
  }

  @override
  Widget build(BuildContext context) {
    final pct = (value / 100).clamp(0.0, 1.0);
    final color = _color(value);
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                '${value.toStringAsFixed(1)}%',
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: color,
                ),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _label(value),
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: pct),
            duration: const Duration(milliseconds: 1000),
            curve: Curves.easeOutCubic,
            builder: (_, v, __) => ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: v,
                minHeight: 10,
                backgroundColor: color.withValues(alpha: 0.12),
                valueColor: AlwaysStoppedAnimation<Color>(color),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Based on all completed sessions',
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.secondary,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Mini Analytics Card ───────────────────────────────────────────────────────

class _MiniAnalyticsCard extends StatelessWidget {
  final List<SessionSummaryModel> sessions;
  final ThemeData theme;

  const _MiniAnalyticsCard({required this.sessions, required this.theme});

  @override
  Widget build(BuildContext context) {
    // Group last 7 days by day of week
    final now = DateTime.now().toUtc().add(const Duration(hours: 8));
    final today = DateTime(now.year, now.month, now.day);
    final last7 = List.generate(7, (i) => today.subtract(Duration(days: 6 - i)));

    final Map<int, int> byDay = {};
    for (int i = 0; i < 7; i++) {
      byDay[i] = 0;
    }

    for (final s in sessions) {
      final sessionDate = DateTime(s.startTime.year, s.startTime.month, s.startTime.day);
      final diff = today.difference(sessionDate).inDays;
      if (diff >= 0 && diff < 7) {
        byDay[6 - diff] = (byDay[6 - diff] ?? 0) + 1;
      }
    }

    int maxCount = 0;
    int totalCount = 0;
    final List<BarChartGroupData> barGroups = [];
    for (int i = 0; i < 7; i++) {
      final count = byDay[i] ?? 0;
      barGroups.add(
        BarChartGroupData(
          x: i,
          barRods: [
            BarChartRodData(
              toY: count.toDouble(),
              color: const Color(0xFF00C9A7),
              width: 14,
              borderRadius: BorderRadius.circular(4),
            ),
          ],
        ),
      );
      if (count > maxCount) maxCount = count;
      totalCount += count;
    }

    final double interval = maxCount > 5 ? (maxCount > 20 ? 10 : 5) : 1;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.bar_chart_rounded,
                  size: 16, color: theme.colorScheme.primary),
              const SizedBox(width: 6),
              const Text(
                'Weekly Trend (Sessions)',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.2,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (totalCount == 0)
            SizedBox(
              height: 140,
              child: Center(
                child: Text('No sessions recorded this week.', style: TextStyle(color: theme.colorScheme.secondary)),
              ),
            )
          else
            SizedBox(
              height: 140,
              child: BarChart(
                BarChartData(
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    drawHorizontalLine: true,
                    horizontalInterval: interval,
                    getDrawingHorizontalLine: (value) => FlLine(
                      color: theme.dividerColor.withOpacity(0.5),
                      strokeWidth: 1,
                      dashArray: [4, 4],
                    ),
                  ),
                  titlesData: FlTitlesData(
                    show: true,
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 28,
                        interval: interval,
                        getTitlesWidget: (value, meta) {
                          return Text(
                            value.toInt().toString(),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: theme.colorScheme.secondary.withOpacity(0.8),
                            ),
                            textAlign: TextAlign.center,
                          );
                        },
                      ),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        interval: 1,
                        getTitlesWidget: (value, meta) {
                          final i = value.toInt();
                          if (i < 0 || i > 6) return const SizedBox.shrink();
                          final day = last7[i];
                          final isToday = i == 6;
                          return Padding(
                            padding: const EdgeInsets.only(top: 8.0),
                            child: Text(
                              _dayAbbr(day.weekday),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
                                color: isToday ? theme.colorScheme.primary : theme.colorScheme.secondary,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  maxY: maxCount < 4 ? 4 : (maxCount + 1).toDouble(),
                  barGroups: barGroups,
                  alignment: BarChartAlignment.spaceAround,
                ),
              ),
            ),
        ],
      ),
    );
  }

  String _dayAbbr(int weekday) {
    const days = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];
    return days[(weekday - 1) % 7];
  }
}

// ── Best Session ─────────────────────────────────────────────────────────────

class _BestSectionCard extends StatelessWidget {
  final String sectionName;
  final String subjectName;
  final double engagement;
  final ThemeData theme;
  const _BestSectionCard({
    required this.sectionName,
    required this.subjectName,
    required this.engagement,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF00C9A7).withValues(alpha: 0.08),
            const Color(0xFF00C9A7).withValues(alpha: 0.03),
          ],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: const Color(0xFF00C9A7).withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [
                  Color(0xFF00C9A7),
                  Color(0xFF00BFA5),
                ],
              ),
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF00C9A7).withValues(alpha: 0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: const Icon(Icons.star_rounded, color: Colors.white, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  sectionName,
                  style: theme.textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  subjectName,
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.secondary),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (engagement >= 70)
                    const Icon(Icons.trending_up_rounded, color: Color(0xFF00C9A7), size: 16),
                  if (engagement >= 70) const SizedBox(width: 4),
                  Text(
                    '${engagement.toStringAsFixed(1)}%',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF00C9A7),
                    ),
                  ),
                ],
              ),
              Text(
                'avg engagement',
                style: theme.textTheme.labelSmall
                    ?.copyWith(color: theme.colorScheme.secondary),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Recent Sessions List ──────────────────────────────────────────────────────

class _RecentSessionsList extends StatelessWidget {
  final List<SessionSummaryModel> sessions;
  final List<SubjectModel> subjects;
  final ThemeData theme;

  const _RecentSessionsList({
    required this.sessions,
    required this.subjects,
    required this.theme,
  });

  Color _engagementColor(double v) {
    if (v >= 70) return const Color(0xFF00C9A7);
    if (v >= 45) return const Color(0xFFFFB300);
    return const Color(0xFFFF6B6B);
  }

  String _engLabel(double v) {
    if (v >= 70) return 'High';
    if (v >= 45) return 'Medium';
    return 'Low';
  }

  SubjectModel? _findSubject(int subjectId) {
    try {
      return subjects.firstWhere((s) => s.id == subjectId);
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Column(
        children: sessions.asMap().entries.map((e) {
          final i = e.key;
          final s = e.value;
          final color = _engagementColor(s.averageEngagement);
          final subject = _findSubject(s.subjectId);
          final logoPath = (s.collegeLogoPath?.trim().isNotEmpty == true)
              ? s.collegeLogoPath
              : subject?.collegeLogoPath;
          final majorLabel = (s.majorCode?.trim().isNotEmpty == true)
              ? s.majorCode
              : (s.majorName ?? subject?.majorCode ?? subject?.majorName);

          return Column(
            children: [
              InkWell(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => SessionDetailScreen(session: s),
                    ),
                  );
                },
                borderRadius: i == 0
                    ? const BorderRadius.vertical(top: Radius.circular(18))
                    : i == sessions.length - 1
                        ? const BorderRadius.vertical(
                            bottom: Radius.circular(18))
                        : BorderRadius.zero,
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 14),
                  child: Row(
                    children: [
                      // College logo or engagement-colored icon
                      _SessionCardLeading(
                        logoPath: logoPath,
                        color: color,
                        theme: theme,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              s.subjectName,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.w700),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            HierarchyMetaRow(
                              collegeName: s.collegeName ?? subject?.collegeName,
                              departmentName: s.departmentName ?? subject?.departmentName,
                              majorLabel: majorLabel,
                              collegeLogoPath: logoPath,
                            ),
                            const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Icon(Icons.groups_rounded,
                                        size: 11,
                                        color: theme.colorScheme.secondary),
                                    const SizedBox(width: 4),
                                    Text(
                                      s.sectionName,
                                      style: theme.textTheme.labelSmall?.copyWith(
                                          color: theme.colorScheme.secondary),
                                    ),
                                    const SizedBox(width: 12),
                                    _buildModeChip(s.activityMode),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Icon(Icons.schedule_rounded,
                                        size: 11,
                                        color: theme.colorScheme.secondary),
                                    const SizedBox(width: 4),
                                    Text(
                                      _formatDate(s.startTime),
                                      style: theme.textTheme.labelSmall?.copyWith(
                                          color: theme.colorScheme.secondary),
                                    ),
                                  ],
                                ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '${s.averageEngagement.toStringAsFixed(1)}%',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: color,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                  color: color.withValues(alpha: 0.3)),
                            ),
                            child: Text(
                              _engLabel(s.averageEngagement),
                              style: TextStyle(
                                color: color,
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 6),
                      Icon(
                        Icons.chevron_right_rounded,
                        size: 18,
                        color: theme.colorScheme.secondary,
                      ),
                    ],
                  ),
                ),
              ),
              if (i < sessions.length - 1)
                Divider(height: 1, color: theme.dividerColor),
            ],
          );
        }).toList(),
      ),
    );
  }

  Widget _buildModeChip(String mode) {
    Color color;
    IconData icon;
    switch (mode) {
      case 'EXAM':
        color = Colors.red;
        icon = Icons.assignment_turned_in_rounded;
        break;
      case 'COLLABORATION':
        color = Colors.orange;
        icon = Icons.groups_rounded;
        break;
      case 'STUDY':
        color = Colors.green;
        icon = Icons.menu_book_rounded;
        break;
      default:
        color = Colors.blue;
        icon = Icons.school_rounded;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.15)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 8, color: color),
          const SizedBox(width: 4),
          Text(
            mode,
            style: TextStyle(
              fontSize: 8,
              fontWeight: FontWeight.w900,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime d) {
    final now = DateTime.now().toUtc().add(const Duration(hours: 8));
    final diff = now.difference(d);
    if (diff.inDays == 0) return 'Today';
    if (diff.inDays == 1) return 'Yesterday';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${d.month}/${d.day}/${d.year}';
  }
}

// ── Session Card Leading ──────────────────────────────────────────────────────

class _SessionCardLeading extends StatelessWidget {
  final String? logoPath;
  final Color color;
  final ThemeData theme;

  const _SessionCardLeading({
    required this.logoPath,
    required this.color,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    final logoUrl = resolveImageUrl(logoPath);
    if (logoUrl != null) {
      return Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: theme.dividerColor),
          color: theme.cardColor,
        ),
        child: ClipOval(
          child: Image.network(
            logoUrl,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => _buildFallback(),
          ),
        ),
      );
    }
    return _buildFallback();
  }

  Widget _buildFallback() {
    return Container(
      width: 42,
      height: 42,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(Icons.analytics_rounded, color: color, size: 20),
    );
  }
}

// ── Empty State ───────────────────────────────────────────────────────────────



// ── Section Header ────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final String title;
  final ThemeData theme;
  const _SectionHeader(this.title, this.theme);

  @override
  Widget build(BuildContext context) {
    return Text(
      title.toUpperCase(),
      style: theme.textTheme.labelSmall?.copyWith(
        color: theme.colorScheme.secondary,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.1,
      ),
    );
  }
}
