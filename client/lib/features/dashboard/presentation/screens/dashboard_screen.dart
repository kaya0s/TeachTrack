import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/features/auth/presentation/providers/auth_provider.dart';
import 'package:teachtrack/features/notifications/presentation/providers/notification_provider.dart';
import 'package:teachtrack/features/notifications/presentation/screens/notifications_screen.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';
import 'package:teachtrack/core/providers/navigation_provider.dart';
import 'package:teachtrack/core/theme/theme_provider.dart';

// Tab screens
import 'home_tab.dart';
import 'classes_tab.dart';
import 'active_sessions_tab.dart';
import 'notifications_tab.dart';
import 'account_tab.dart';
import 'package:teachtrack/features/notifications/domain/models/notification_model.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  // Index mapping: 0=Home, 1=Classes, 2=ActiveSessions, 3=Notifications, 4=Account
  bool _didInitialSessionCheck = false;
  int _lastNotificationId = 0;


  static const List<Widget> _pages = [
    HomeTab(),
    ClassesTab(),
    ActiveSessionsTab(),
    NotificationsTab(),
    AccountTab(),
  ];

  static const List<String> _pageTitles = [
    'Home',
    'Classes',
    'Active Sessions',
    'Notifications',
    'Account',
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_didInitialSessionCheck) {
      final session = Provider.of<SessionProvider>(context);
      final notifications = Provider.of<NotificationProvider>(context, listen: false);
      
      if (!session.isLoading) {
        _didInitialSessionCheck = true;
        
        // Initial load to set baseline for notifications
        notifications.load(silent: true).then((_) {
          if (mounted && notifications.items.isNotEmpty) {
            _lastNotificationId = notifications.items.first.id;
          }
        });

        notifications.startBackgroundPolling();
        notifications.addListener(_handleNotificationUpdate);

        if (session.activeSession != null) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              context.read<NavigationProvider>().setIndex(2);
            }
          });
        }
      }
    }
  }

  void _handleNotificationUpdate() {
    if (!mounted) return;
    final notifications = context.read<NotificationProvider>();
    if (notifications.items.isNotEmpty) {
      // Find the absolute maximum ID in the current list
      final int maxIdInList = notifications.items
          .map((i) => i.id)
          .fold(0, (prev, id) => id > prev ? id : prev);
      
      // If we see a newer ID than our baseline
      if (maxIdInList > _lastNotificationId) {
        final previousBase = _lastNotificationId;
        _lastNotificationId = maxIdInList;

        // Only show if we had a baseline (so it's a truly new arrival)
        if (previousBase != 0) {
          // Find the specific notification(s) that are new and unread
          final newUnread = notifications.items
              .where((i) => i.id > previousBase && !i.isRead)
              .toList();
          
          if (newUnread.isNotEmpty) {
            // Show the very newest one
            newUnread.sort((a, b) => b.id.compareTo(a.id));
            _showHeadsUp(newUnread.first);
          }
        }
      } else if (maxIdInList < _lastNotificationId && notifications.items.length < 5) {
        // If the list was severely cleared, reset baseline
        _lastNotificationId = maxIdInList;
      }
    }
  }

  void _showHeadsUp(TeacherNotificationModel notification) {
    if (!mounted) return;
    final overlay = Overlay.of(context);
    late OverlayEntry entry;

    entry = OverlayEntry(
      builder: (context) => _HeadsUpAlert(
        notification: notification,
        onDismiss: () {
          if (entry.mounted) entry.remove();
        },
        onTap: () {
          if (entry.mounted) entry.remove();
          context.read<NavigationProvider>().setIndex(3);
        },
      ),
    );

    overlay.insert(entry);
    Future.delayed(const Duration(seconds: 5), () {
      if (entry.mounted) entry.remove();
    });
  }

  @override
  void dispose() {
    context.read<NotificationProvider>().removeListener(_handleNotificationUpdate);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final nav = context.watch<NavigationProvider>();
    // final session = context.watch<SessionProvider>(); // We check in didChangeDependencies

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.asset(
                'assets/images/logo.png', // Assuming logo.png is the brand logo
                height: 32,
                width: 32,
                errorBuilder: (context, error, stackTrace) => const Icon(Icons.school_rounded, color: Color(0xFF10B981), size: 32),
              ),
            ),
            const SizedBox(width: 12),
            const Text(
              "TeachTrack",
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 22,
                letterSpacing: -0.5,
              ),
            ),
          ],
        ),
        actions: [
          Consumer<ThemeProvider>(
            builder: (context, themeProvider, _) {
              final isDark = themeProvider.isDarkMode;
              return IconButton(
                onPressed: () => themeProvider.toggleTheme(!isDark),
                icon: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  transitionBuilder: (child, anim) => RotationTransition(
                    turns: anim,
                    child: FadeTransition(opacity: anim, child: child),
                  ),
                  child: Icon(
                    isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                    key: ValueKey(isDark),
                  ),
                ),
                tooltip: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: IndexedStack(
        index: nav.currentIndex,
        children: _pages,
      ),
      // No floatingActionButton here — we use a custom bottom bar
      bottomNavigationBar: _CustomBottomNav(
        currentIndex: nav.currentIndex,
        onTap: (index) => nav.setIndex(index),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Custom Bottom Nav
// ---------------------------------------------------------------------------

class _CustomBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const _CustomBottomNav({required this.currentIndex, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final bgColor = theme.cardColor;
    final activeColor = theme.colorScheme.primary;
    final inactiveColor = theme.colorScheme.onSurface.withOpacity(0.38);

    final session = context.watch<SessionProvider>();
    final hasActiveSession = session.activeSession != null;

    return SafeArea(
      minimum: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: SizedBox(
        height: 95,
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.bottomCenter,
          children: [
            // Pill nav bar
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              top: 15, // lowered slightly to make room for FAB label if needed
              child: Container(
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: theme.dividerColor.withValues(alpha: 0.08),
                    width: 0.5,
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: _NavItem(
                        index: 0,
                        currentIndex: currentIndex,
                        icon: Icons.home_outlined,
                        activeIcon: Icons.home_rounded,
                        label: 'Home',
                        activeColor: activeColor,
                        inactiveColor: inactiveColor,
                        onTap: onTap,
                      ),
                    ),
                    Expanded(
                      child: _NavItem(
                        index: 1,
                        currentIndex: currentIndex,
                        icon: Icons.class_outlined,
                        activeIcon: Icons.class_rounded,
                        label: 'Classes',
                        activeColor: activeColor,
                        inactiveColor: inactiveColor,
                        onTap: onTap,
                      ),
                    ),

                    // Center gap for floating button
                    const SizedBox(width: 80),

                    Expanded(
                      child: _NavItem(
                        index: 3,
                        currentIndex: currentIndex,
                        icon: Icons.notifications_none_rounded,
                        activeIcon: Icons.notifications_rounded,
                        label: 'Notifications',
                        activeColor: activeColor,
                        inactiveColor: inactiveColor,
                        onTap: onTap,
                      ),
                    ),
                    Expanded(
                      child: _NavItem(
                        index: 4,
                        currentIndex: currentIndex,
                        icon: Icons.account_circle_outlined,
                        activeIcon: Icons.account_circle_rounded,
                        label: 'Account',
                        activeColor: activeColor,
                        inactiveColor: inactiveColor,
                        onTap: onTap,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Floating center button — overlaps the pill
            Positioned(
              bottom: 2,
              child: GestureDetector(
                onTap: () => onTap(2),
                child: _FloatingCenterButton(
                  isActive: currentIndex == 2,
                  hasLiveSession: hasActiveSession,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Individual nav item
// ---------------------------------------------------------------------------

class _NavItem extends StatelessWidget {
  final int index;
  final int currentIndex;
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final Color activeColor;
  final Color inactiveColor;
  final ValueChanged<int> onTap;

  const _NavItem({
    required this.index,
    required this.currentIndex,
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.activeColor,
    required this.inactiveColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = currentIndex == index;
    final notifications = context.watch<NotificationProvider>();
    final showBadge = index == 3 && notifications.unreadCount > 0;
    
    return InkWell(
      onTap: () => onTap(index),
      borderRadius: BorderRadius.circular(28),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                child: Icon(
                  isSelected ? activeIcon : icon,
                  key: ValueKey(isSelected),
                  color: isSelected ? activeColor : inactiveColor,
                  size: 22,
                ),
              ),
              if (showBadge)
                Positioned(
                  top: -2,
                  right: -2,
                  child: Container(
                    height: 8,
                    width: 8,
                    decoration: const BoxDecoration(
                      color: Colors.redAccent,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 3),
          AnimatedDefaultTextStyle(
            duration: const Duration(milliseconds: 200),
            style: TextStyle(
              fontSize: 10,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w400,
              color: isSelected ? activeColor : inactiveColor,
            ),
            child: Text(label),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Floating center circle button
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Floating center circle button — green thin-border style
// ---------------------------------------------------------------------------

class _FloatingCenterButton extends StatefulWidget {
  final bool isActive;
  final bool hasLiveSession;

  const _FloatingCenterButton({
    required this.isActive,
    required this.hasLiveSession,
  });

  @override
  State<_FloatingCenterButton> createState() => _FloatingCenterButtonState();
}

class _FloatingCenterButtonState extends State<_FloatingCenterButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  // Modern Green palette
  static const _primaryGreen = Color(0xFF10B981); // Emerald 500
  static const _borderGreen = Color(0xFF059669); // Emerald 600

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1800),
      vsync: this,
    );
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    if (widget.hasLiveSession) _pulseController.repeat(reverse: true);
  }

  @override
  void didUpdateWidget(_FloatingCenterButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.hasLiveSession && !_pulseController.isAnimating) {
      _pulseController.repeat(reverse: true);
    } else if (!widget.hasLiveSession && _pulseController.isAnimating) {
      _pulseController..stop()..reset();
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final showGreen = widget.isActive || widget.hasLiveSession;
    final baseColor = showGreen ? _primaryGreen : (isDark ? const Color(0xFF333333) : const Color(0xFFE5E7EB));
    final iconColor = showGreen ? Colors.white : (isDark ? Colors.white70 : Colors.black54);
    final shadow = showGreen ? _primaryGreen.withOpacity(0.4) : Colors.black.withOpacity(0.05);

    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (context, child) => Transform.scale(
        scale: widget.hasLiveSession ? _pulseAnimation.value : 1.0,
        child: child,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Stack(
            alignment: Alignment.center,
            clipBehavior: Clip.none,
            children: [
              // Outer Ring
              AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isDark ? const Color(0xFF1A1A1A) : Colors.white,
                  boxShadow: [
                    BoxShadow(color: shadow, blurRadius: 12, offset: const Offset(0, 6)),
                  ],
                  border: Border.all(
                    color: showGreen ? _borderGreen : theme.dividerColor.withOpacity(0.1),
                    width: 1.5,
                  ),
                ),
              ),
              // Main Button
              AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                width: widget.isActive ? 54 : 50,
                height: widget.isActive ? 54 : 50,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: showGreen 
                    ? const LinearGradient(colors: [_primaryGreen, _borderGreen], begin: Alignment.topLeft, end: Alignment.bottomRight)
                    : null,
                  color: showGreen ? null : baseColor,
                ),
                child: Icon(
                  Icons.sensors_rounded,
                  color: iconColor,
                  size: 26,
                ),
              ),
              // Live Badge
              if (widget.hasLiveSession)
                Positioned(
                  top: -2,
                  right: -2,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.redAccent,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: isDark ? const Color(0xFF1A1A1A) : Colors.white, width: 2),
                    ),
                    child: const Text('LIVE', style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w900)),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            widget.hasLiveSession ? 'Monitoring...' : 'Monitor Behavior',
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.2,
              color: showGreen ? (isDark ? _primaryGreen : _borderGreen) : theme.hintColor,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// AppBar widgets
// ---------------------------------------------------------------------------



class _ProfileIconButton extends StatelessWidget {
  final AuthProvider auth;
  const _ProfileIconButton({required this.auth});

  @override
  Widget build(BuildContext context) {
    final user = auth.user;
    final initial = user?.firstname?.isNotEmpty == true
        ? user!.firstname![0].toUpperCase()
        : '?';

    return Padding(
      padding: const EdgeInsets.only(right: 10),
      child: IconButton(
        tooltip: "Profile",
        onPressed: () {},
        icon: CircleAvatar(
          radius: 16,
          backgroundColor:
              Theme.of(context).colorScheme.primary.withOpacity(0.14),
          child: Text(
            initial,
            style: TextStyle(
              color: Theme.of(context).colorScheme.primary,
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
          ),
        ),
      ),
    );
  }
}
class _HeadsUpAlert extends StatefulWidget {
  final TeacherNotificationModel notification;
  final VoidCallback onDismiss;
  final VoidCallback onTap;

  const _HeadsUpAlert({
    required this.notification,
    required this.onDismiss,
    required this.onTap,
  });

  @override
  State<_HeadsUpAlert> createState() => _HeadsUpAlertState();
}

class _HeadsUpAlertState extends State<_HeadsUpAlert> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _offsetAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );
    _offsetAnimation = Tween<Offset>(
      begin: const Offset(0, -1.2),
      end: const Offset(0, 0.05), // Slight bounce down
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutBack,
    ));
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return SafeArea(
      child: Align(
        alignment: Alignment.topCenter,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: SlideTransition(
            position: _offsetAnimation,
            child: Material(
              color: Colors.transparent,
              child: GestureDetector(
                onTap: widget.onTap,
                child: Container(
                  width: double.infinity,
                  constraints: const BoxConstraints(maxWidth: 400),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1F2937) : Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: theme.dividerColor.withOpacity(0.1)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.15),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                      BoxShadow(
                        color: theme.colorScheme.primary.withOpacity(0.1),
                        blurRadius: 0,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.notifications_active_rounded,
                          color: theme.colorScheme.primary,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.notification.title,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w900,
                                fontSize: 13,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              widget.notification.body,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.secondary,
                                fontSize: 11,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        onPressed: widget.onDismiss,
                        icon: const Icon(Icons.close_rounded, size: 18),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        visualDensity: VisualDensity.compact,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
