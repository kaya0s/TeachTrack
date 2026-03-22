import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
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
  String _selectedCollegeFilter = 'all';
  ViewType _viewType = ViewType.grid; // Added view type state

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

  // Removed _collegeLabel as it's no longer used for filtering logic

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
          if (_selectedCollegeFilter == 'all') return true;
          return s.collegeName == _selectedCollegeFilter; // Updated filtering logic
        }).toList();

        return RefreshIndicator(
          onRefresh: () => classroom.fetchClassroomData(),
          child: CustomScrollView(
            slivers: [
              // Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Title row with count badge
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
                      const SizedBox(height: 18),

                      Row(
                        children: [
                          // Search bar - flexible
                          Expanded(
                            child: _SearchBar(
                              controller: _searchController,
                              onChanged: (v) => setState(() => _searchQuery = v),
                              theme: theme,
                            ),
                          ),
                          const SizedBox(width: 8),

                          // College Filter Dropdown
                          SizedBox(
                            width: 110,
                            child: _CollegeDropdown(
                              colleges: classroom.colleges,
                              selected: _selectedCollegeFilter,
                              onChanged: (v) => setState(() => _selectedCollegeFilter = v ?? 'all'),
                              theme: theme,
                            ),
                          ),
                          const SizedBox(width: 8),

                          // View Switcher inside the action row
                          Container(
                            decoration: BoxDecoration(
                              color: theme.colorScheme.surfaceContainerHighest,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            padding: const EdgeInsets.all(4),
                            child: Row(
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
                    ],
                  ),
                ),
              ),

              // Results or empty
              if (filtered.isEmpty)
                SliverFillRemaining(
                  child: _EmptySearchResult(theme: theme),
                )
              else if (_viewType == ViewType.grid) // Conditional rendering for grid view
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  sliver: SliverGrid(
                    gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 400, // Updated maxCrossAxisExtent
                      mainAxisSpacing: 16, // Updated mainAxisSpacing
                      crossAxisSpacing: 16, // Updated crossAxisSpacing
                      childAspectRatio: 1.05, // Updated childAspectRatio
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
              else // Conditional rendering for list view
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final subject = filtered[index];
                        return SubjectListTile( // Using SubjectListTile
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

// ── Widgets ──────────────────────────────────────────────────────────────────

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

class _CollegeDropdown extends StatelessWidget {
  final List<CollegeModel> colleges;
  final String selected;
  final ValueChanged<String?> onChanged;
  final ThemeData theme;

  const _CollegeDropdown({
    required this.colleges,
    required this.selected,
    required this.onChanged,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.dividerColor.withOpacity(0.5)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: selected,
          isExpanded: true,
          icon: Icon(Icons.keyboard_arrow_down_rounded, color: theme.colorScheme.primary.withOpacity(0.7), size: 20),
          dropdownColor: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
          alignment: AlignmentDirectional.centerStart,
          menuMaxHeight: 400,
          onChanged: onChanged,
          // Closed state presentation
          selectedItemBuilder: (context) {
            return [
              const Center(child: Text('All', maxLines: 1)),
              ...colleges.map((c) => Center(
                    child: Text(c.acronym ?? (c.name.split(' ').first), maxLines: 1, overflow: TextOverflow.ellipsis),
                  )),
            ];
          },
          items: [
            DropdownMenuItem(
              value: 'all',
              enabled: true,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(color: theme.colorScheme.secondary.withOpacity(0.1), shape: BoxShape.circle),
                    child: const Icon(Icons.layers_rounded, size: 14),
                  ),
                  const SizedBox(width: 8),
                  const Expanded(child: Text('All ', maxLines: 1, overflow: TextOverflow.ellipsis)),
                ],
              ),
            ),
            ...colleges.map((c) => DropdownMenuItem(
                  value: c.name,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(color: theme.colorScheme.primary.withOpacity(0.1), shape: BoxShape.circle),
                        clipBehavior: Clip.antiAlias,
                        child: c.logoPath != null && c.logoPath!.isNotEmpty
                            ? Image.network(c.logoPath!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _buildFallback(c))
                            : _buildFallback(c),
                      ),
                      const SizedBox(width: 8),
                      Expanded(child: Text(c.acronym ?? c.name, maxLines: 1, overflow: TextOverflow.ellipsis)),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  Widget _buildFallback(CollegeModel c) {
    return Center(
      child: Text(
        (c.acronym ?? c.name).substring(0, 1).toUpperCase(),
        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900),
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

// Removed _CollegeFilterChips and _Chip as they are replaced by _CollegeFilterScroll and _CollegeCircle

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
