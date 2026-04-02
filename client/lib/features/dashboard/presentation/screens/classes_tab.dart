import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/core/utils/image_url_resolver.dart';
import 'package:teachtrack/features/auth/presentation/providers/auth_provider.dart';
import 'package:teachtrack/features/classroom/domain/models/classroom_models.dart';
import 'package:teachtrack/features/classroom/presentation/providers/classroom_provider.dart';
import 'package:teachtrack/features/classroom/presentation/screens/subject_details_screen.dart';
import '../widgets/subject_card.dart';
import '../widgets/subject_list_tile.dart';

enum ViewType { grid, list }

class ClassesTab extends StatefulWidget {
  const ClassesTab({super.key});

  @override
  State<ClassesTab> createState() => _ClassesTabState();
}

class _ClassesTabState extends State<ClassesTab> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  ViewType _viewType = ViewType.grid;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ClassroomProvider>().fetchClassroomData();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  bool _matchesSearch(SubjectModel subject, String query) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return true;
    return subject.name.toLowerCase().contains(q) ||
        (subject.code?.toLowerCase().contains(q) ?? false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Consumer<ClassroomProvider>(
      builder: (context, classroom, _) {
        if (classroom.isLoading && classroom.subjects.isEmpty) {
          return const Center(child: CircularProgressIndicator());
        }

        if (classroom.error != null && classroom.subjects.isEmpty) {
          return _ErrorView(
            message: classroom.error!,
            onRetry: classroom.fetchClassroomData,
          );
        }

        final filtered = classroom.subjects.where((s) {
          if (!_matchesSearch(s, _searchQuery)) return false;
          return true;
        }).toList();

        final user = context.watch<AuthProvider>().user;
        final firstSubject = classroom.subjects.firstOrNull;
        final collegeLogoUrl = resolveImageUrl(firstSubject?.collegeLogoPath ?? user?.collegeLogoPath);

        final deptId = firstSubject?.departmentId ?? user?.departmentId;
        final deptName = (firstSubject?.departmentName ?? user?.departmentName)?.trim();

        final deptFromList = deptId != null
            ? classroom.departments.where((d) => d.id == deptId).firstOrNull
            : (deptName == null || deptName.isEmpty)
                ? null
                : classroom.departments
                    .where((d) => d.name.trim().toLowerCase() == deptName.toLowerCase())
                    .firstOrNull;

        final departmentImageUrl = resolveImageUrl(
          firstSubject?.departmentCoverImageUrl ??
              deptFromList?.coverImageUrl ??
              user?.departmentCoverImageUrl,
        );

        return RefreshIndicator(
          onRefresh: () => classroom.fetchClassroomData(),
          child: CustomScrollView(
            slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Title row + view toggle
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'My Classes',
                                  style: theme.textTheme.headlineSmall?.copyWith(
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: -0.5,
                                  ),
                                ),
                                Text(
                                  '${classroom.subjects.length} active subject${classroom.subjects.length != 1 ? 's' : ''}',
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: theme.colorScheme.secondary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                            Container(
                              decoration: BoxDecoration(
                                color: theme.colorScheme.surfaceContainerHighest,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              padding: const EdgeInsets.all(4),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  _ViewToggleButton(
                                    icon: Icons.grid_view_rounded,
                                    isSelected: _viewType == ViewType.grid,
                                    onPressed: () => setState(() => _viewType = ViewType.grid),
                                    theme: theme,
                                  ),
                                  const SizedBox(width: 4),
                                  _ViewToggleButton(
                                    icon: Icons.view_list_rounded,
                                    isSelected: _viewType == ViewType.list,
                                    onPressed: () => setState(() => _viewType = ViewType.list),
                                    theme: theme,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),

                        // Search + affiliation logos (college + department)
                        Row(
                          children: [
                            Expanded(
                              child: _SearchBar(
                                controller: _searchController,
                                onChanged: (v) => setState(() => _searchQuery = v),
                                theme: theme,
                              ),
                            ),
                            const SizedBox(width: 12),
                            _AffiliationLogo(
                              imageUrl: collegeLogoUrl,
                              fallbackIcon: Icons.account_balance_rounded,
                              theme: theme,
                            ),
                            const SizedBox(width: 8),
                            _AffiliationLogo(
                              imageUrl: departmentImageUrl,
                              fallbackIcon: Icons.apartment_rounded,
                              theme: theme,
                              isCircular: false,
                              width: 64,
                              height: 44,
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                      ],
                    ),
                  ),
                ),

                // Results or empty
                if (filtered.isEmpty)
                  SliverFillRemaining(
                    child: _EmptySearchResult(theme: theme),
                  )
                else if (_viewType == ViewType.grid)
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    sliver: SliverGrid(
                      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                        maxCrossAxisExtent: 400,
                        mainAxisSpacing: 16,
                        crossAxisSpacing: 16,
                        childAspectRatio: 1.05,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final subject = filtered[index];
                          return SubjectCard(
                            subject: subject,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => SubjectDetailsScreen(subject: subject),
                              ),
                            ),
                          );
                        },
                        childCount: filtered.length,
                      ),
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final subject = filtered[index];
                          return SubjectListTile(
                            subject: subject,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => SubjectDetailsScreen(subject: subject),
                              ),
                            ),
                          );
                        },
                        childCount: filtered.length,
                      ),
                    ),
                  ),
            ],
          ),
        );
      },
    );
  }
}

// ── Filter Data Model ─────────────────────────────────────────────────────────

// ── Filter Chip ───────────────────────────────────────────────────────────────

// ── Filter Panel ──────────────────────────────────────────────────────────────

// ── Widgets ───────────────────────────────────────────────────────────────────

class _AffiliationLogo extends StatelessWidget {
  final String? imageUrl;
  final IconData fallbackIcon;
  final ThemeData theme;
  final bool isCircular;
  final double width;
  final double height;

  const _AffiliationLogo({
    required this.imageUrl,
    required this.fallbackIcon,
    required this.theme,
    this.isCircular = true,
    this.width = 44,
    this.height = 44,
  });

  @override
  Widget build(BuildContext context) {
    final borderRadius = BorderRadius.circular(12);
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        shape: isCircular ? BoxShape.circle : BoxShape.rectangle,
        borderRadius: isCircular ? null : borderRadius,
        border: Border.all(color: theme.dividerColor.withOpacity(0.25)),
      ),
      clipBehavior: Clip.antiAlias,
      child: imageUrl == null
          ? Icon(fallbackIcon, size: 20, color: theme.colorScheme.secondary.withOpacity(0.8))
          : Image.network(
              imageUrl!,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Icon(
                fallbackIcon,
                size: 20,
                color: theme.colorScheme.secondary.withOpacity(0.8),
              ),
            ),
    );
  }
}

class _ViewToggleButton extends StatelessWidget {
  final IconData icon;
  final bool isSelected;
  final VoidCallback onPressed;
  final ThemeData theme;

  const _ViewToggleButton({
    required this.icon,
    required this.isSelected,
    required this.onPressed,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? theme.cardColor : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  )
                ]
              : null,
        ),
        child: Icon(
          icon,
          size: 20,
          color: isSelected ? theme.colorScheme.primary : theme.colorScheme.secondary,
        ),
      ),
    );
  }
}

class _SearchBar extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final ThemeData theme;
  const _SearchBar({required this.controller, required this.onChanged, required this.theme});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      onChanged: onChanged,
      style: theme.textTheme.bodyMedium,
      decoration: InputDecoration(
        hintText: 'Search subjects or codes…',
        hintStyle: theme.textTheme.bodyMedium?.copyWith(
          color: theme.colorScheme.secondary.withOpacity(0.5),
        ),
        prefixIcon: Icon(Icons.search_rounded, color: theme.colorScheme.secondary.withOpacity(0.7), size: 20),
        suffixIcon: controller.text.isNotEmpty
            ? IconButton(
                icon: const Icon(Icons.close_rounded, size: 18),
                onPressed: () {
                  controller.clear();
                  onChanged('');
                },
              )
            : null,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        filled: true,
        fillColor: theme.colorScheme.surfaceContainerHighest,
        isDense: true,
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.cloud_off_rounded, size: 64, color: theme.colorScheme.error.withOpacity(0.7)),
            const SizedBox(height: 16),
            Text('Sync Issue', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center, style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.secondary)),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Try Again'),
              style: FilledButton.styleFrom(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptySearchResult extends StatelessWidget {
  final ThemeData theme;
  const _EmptySearchResult({required this.theme});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.search_off_rounded, size: 64, color: theme.colorScheme.secondary.withOpacity(0.3)),
          const SizedBox(height: 16),
          Text('Nothing found', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text(
            'Try widening your search criteria.',
            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.secondary),
          ),
        ],
      ),
    );
  }
}
