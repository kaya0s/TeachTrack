import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:teachtrack/features/session/presentation/providers/session_provider.dart';
import 'package:teachtrack/features/classroom/presentation/providers/classroom_provider.dart';
import 'package:teachtrack/features/session/domain/models/session_models.dart';
import 'package:teachtrack/features/classroom/domain/models/classroom_models.dart';
import 'package:teachtrack/features/session/presentation/screens/session_detail_screen.dart';
import 'package:teachtrack/core/widgets/hierarchy_meta_row.dart';
import 'package:teachtrack/core/utils/image_url_resolver.dart';

class FilterState {
  final Set<String> colleges;
  final Set<String> departments;
  final Set<String> majors;
  final Set<String> subjects;
  final Set<String> sections;
  final Set<String> statuses;
  final Set<String> engagements;
  final Set<String> timesOfDay;
  final String sortMode;
  final DateTimeRange? customDateRange;
  final String? quickDate;

  FilterState({
    this.colleges = const {},
    this.departments = const {},
    this.majors = const {},
    this.subjects = const {},
    this.sections = const {},
    this.statuses = const {},
    this.engagements = const {},
    this.timesOfDay = const {},
    this.sortMode = 'newest',
    this.customDateRange,
    this.quickDate,
  });

  FilterState copyWith({
    Set<String>? colleges,
    Set<String>? departments,
    Set<String>? majors,
    Set<String>? subjects,
    Set<String>? sections,
    Set<String>? statuses,
    Set<String>? engagements,
    Set<String>? timesOfDay,
    String? sortMode,
    DateTimeRange? customDateRange,
    String? quickDate,
    bool clearDate = false,
  }) {
    return FilterState(
      colleges: colleges ?? this.colleges,
      departments: departments ?? this.departments,
      majors: majors ?? this.majors,
      subjects: subjects ?? this.subjects,
      sections: sections ?? this.sections,
      statuses: statuses ?? this.statuses,
      engagements: engagements ?? this.engagements,
      timesOfDay: timesOfDay ?? this.timesOfDay,
      sortMode: sortMode ?? this.sortMode,
      customDateRange: clearDate ? null : (customDateRange ?? this.customDateRange),
      quickDate: clearDate ? null : (quickDate ?? this.quickDate),
    );
  }

  bool get isDefault =>
      colleges.isEmpty &&
      departments.isEmpty &&
      majors.isEmpty &&
      subjects.isEmpty &&
      sections.isEmpty &&
      statuses.isEmpty &&
      engagements.isEmpty &&
      timesOfDay.isEmpty &&
      sortMode == 'newest' &&
      customDateRange == null &&
      quickDate == null;
}

class SessionHistoryScreen extends StatefulWidget {
  const SessionHistoryScreen({super.key});

  @override
  State<SessionHistoryScreen> createState() => _SessionHistoryScreenState();
}

class _SessionHistoryScreenState extends State<SessionHistoryScreen> {
  FilterState _filter = FilterState();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SessionProvider>().fetchSessionHistory(includeActive: false);
    });
  }

  SubjectModel? _findSubject(int subjectId, List<SubjectModel> subjects) {
    try {
      return subjects.firstWhere((s) => s.id == subjectId);
    } catch (_) {
      return null;
    }
  }

  String _getCollegeForSubject(int subjectId, List<SubjectModel> subjects) {
    final subj = _findSubject(subjectId, subjects);
    return subj?.collegeName != null && subj!.collegeName!.isNotEmpty
        ? subj.collegeName!
        : 'Unknown';
  }

  String _getDepartmentForSession(SessionSummaryModel session, List<SubjectModel> subjects) {
    final direct = session.departmentName?.trim();
    if (direct != null && direct.isNotEmpty) return direct;
    final subj = _findSubject(session.subjectId, subjects);
    final fallback = subj?.departmentName?.trim();
    return (fallback != null && fallback.isNotEmpty) ? fallback : 'Unknown';
  }

  String _getMajorForSession(SessionSummaryModel session, List<SubjectModel> subjects) {
    final directCode = session.majorCode?.trim();
    if (directCode != null && directCode.isNotEmpty) return directCode;
    final directName = session.majorName?.trim();
    if (directName != null && directName.isNotEmpty) return directName;
    final subj = _findSubject(session.subjectId, subjects);
    final fallbackCode = subj?.majorCode?.trim();
    if (fallbackCode != null && fallbackCode.isNotEmpty) return fallbackCode;
    final fallbackName = subj?.majorName?.trim();
    return (fallbackName != null && fallbackName.isNotEmpty) ? fallbackName : 'Unknown';
  }

  List<SessionSummaryModel> _applyFilters(
      List<SessionSummaryModel> history, List<SubjectModel> subjects) {
    var filtered = history.where((s) {
      final status = s.isActive ? 'Active' : 'Completed';
      if (_filter.statuses.isNotEmpty && !_filter.statuses.contains(status)) return false;

      if (_filter.colleges.isNotEmpty) {
        final cName = _getCollegeForSubject(s.subjectId, subjects);
        if (!_filter.colleges.contains(cName)) return false;
      }

      if (_filter.departments.isNotEmpty) {
        final dName = _getDepartmentForSession(s, subjects);
        if (!_filter.departments.contains(dName)) return false;
      }

      if (_filter.majors.isNotEmpty) {
        final mLabel = _getMajorForSession(s, subjects);
        if (!_filter.majors.contains(mLabel)) return false;
      }

      if (_filter.subjects.isNotEmpty && !_filter.subjects.contains(s.subjectName)) return false;
      if (_filter.sections.isNotEmpty && !_filter.sections.contains(s.sectionName)) return false;

      if (_filter.engagements.isNotEmpty) {
        String engLevel = 'Low';
        if (s.averageEngagement >= 70) {
          engLevel = 'High';
        } else if (s.averageEngagement >= 45) {
          engLevel = 'Medium';
        }
        if (!_filter.engagements.contains(engLevel)) return false;
      }

      if (_filter.timesOfDay.isNotEmpty) {
        String tod = 'Evening';
        final h = s.startTime.hour;
        if (h >= 5 && h < 12) {
          tod = 'Morning';
        } else if (h >= 12 && h < 17) {
          tod = 'Afternoon';
        }
        if (!_filter.timesOfDay.contains(tod)) return false;
      }

      if (_filter.quickDate != null) {
        final now = DateTime.now();
        final sessionDate = DateTime(s.startTime.year, s.startTime.month, s.startTime.day);
        final today = DateTime(now.year, now.month, now.day);
        
        if (_filter.quickDate == 'Today') {
          if (sessionDate != today) return false;
        } else if (_filter.quickDate == 'This Week') {
          final weekStart = today.subtract(Duration(days: now.weekday - 1));
          if (sessionDate.isBefore(weekStart)) return false;
        } else if (_filter.quickDate == 'This Month') {
          if (sessionDate.year != today.year || sessionDate.month != today.month) return false;
        }
      } else if (_filter.customDateRange != null) {
        final sessionDate = DateTime(s.startTime.year, s.startTime.month, s.startTime.day);
        final rStart = DateTime(_filter.customDateRange!.start.year,
            _filter.customDateRange!.start.month, _filter.customDateRange!.start.day);
        final rEnd = DateTime(_filter.customDateRange!.end.year,
            _filter.customDateRange!.end.month, _filter.customDateRange!.end.day);
        if (sessionDate.isBefore(rStart) || sessionDate.isAfter(rEnd)) return false;
      }

      return true;
    }).toList();

    filtered.sort((a, b) {
      if (_filter.sortMode == 'newest') return b.startTime.compareTo(a.startTime);
      if (_filter.sortMode == 'oldest') return a.startTime.compareTo(b.startTime);
      if (_filter.sortMode == 'highest') return b.averageEngagement.compareTo(a.averageEngagement);
      if (_filter.sortMode == 'lowest') return a.averageEngagement.compareTo(b.averageEngagement);
      return 0;
    });

    return filtered;
  }

  void _showFilters(BuildContext context, List<SubjectModel> subjects, List<SessionSummaryModel> history) async {
    // Extract available filter options dynamically
    final availableSubjects = history.map((e) => e.subjectName).toSet().toList()..sort();
    final availableSections = history.map((e) => e.sectionName).toSet().toList()..sort();
    final availableColleges = history.map((e) {
      return _getCollegeForSubject(e.subjectId, subjects);
    }).where((c) => c != 'Unknown').toSet().toList()..sort();
    final availableDepartments = history.map((e) {
      return _getDepartmentForSession(e, subjects);
    }).where((d) => d != 'Unknown').toSet().toList()..sort();
    final availableMajors = history.map((e) {
      return _getMajorForSession(e, subjects);
    }).where((m) => m != 'Unknown').toSet().toList()..sort();

    final newFilter = await showModalBottomSheet<FilterState>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _FilterBottomSheet(
        initialState: _filter,
        availableColleges: availableColleges,
        availableDepartments: availableDepartments,
        availableMajors: availableMajors,
        availableSubjects: availableSubjects,
        availableSections: availableSections,
      ),
    );

    if (newFilter != null && mounted) {
      setState(() {
        _filter = newFilter;
      });
    }
  }

  // Active filters visualization
  List<Widget> _buildFilterChips() {
    final theme = Theme.of(context);
    List<Widget> chips = [];

    void addChip(String label, VoidCallback onRemove) {
      chips.add(
        Container(
          height: 32, // Fixed height to prevent stretching
          margin: const EdgeInsets.only(right: 8, bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: theme.colorScheme.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: theme.colorScheme.primary.withValues(alpha: 0.3)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                label,
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: theme.colorScheme.primary),
              ),
              const SizedBox(width: 4),
              GestureDetector(
                onTap: onRemove,
                child: Icon(Icons.close_rounded,
                    size: 14, color: theme.colorScheme.primary),
              ),
            ],
          ),
        ),
      );
    }

    if (_filter.quickDate != null) {
      addChip('Date: ${_filter.quickDate}', () => setState(() => _filter = _filter.copyWith(clearDate: true)));
    } else if (_filter.customDateRange != null) {
      final s = DateFormat('MM/dd').format(_filter.customDateRange!.start);
      final e = DateFormat('MM/dd').format(_filter.customDateRange!.end);
      addChip('Range: $s - $e', () => setState(() => _filter = _filter.copyWith(clearDate: true)));
    }

    if (_filter.sortMode != 'newest') {
      final sortLabel = {
        'oldest': 'Oldest First',
        'highest': 'Highest Engagement',
        'lowest': 'Lowest Engagement',
      }[_filter.sortMode]!;
      addChip('Sort: $sortLabel', () => setState(() => _filter = _filter.copyWith(sortMode: 'newest')));
    }

    for (var s in _filter.statuses) {
      addChip('Status: $s', () {
        final updated = Set<String>.from(_filter.statuses)..remove(s);
        setState(() => _filter = _filter.copyWith(statuses: updated));
      });
    }
    for (var c in _filter.colleges) {
      addChip('College: $c', () {
        final updated = Set<String>.from(_filter.colleges)..remove(c);
        setState(() => _filter = _filter.copyWith(colleges: updated));
      });
    }
    for (var d in _filter.departments) {
      addChip('Dept: $d', () {
        final updated = Set<String>.from(_filter.departments)..remove(d);
        setState(() => _filter = _filter.copyWith(departments: updated));
      });
    }
    for (var m in _filter.majors) {
      addChip('Major: $m', () {
        final updated = Set<String>.from(_filter.majors)..remove(m);
        setState(() => _filter = _filter.copyWith(majors: updated));
      });
    }
    for (var s in _filter.subjects) {
      addChip('Subject: $s', () {
        final updated = Set<String>.from(_filter.subjects)..remove(s);
        setState(() => _filter = _filter.copyWith(subjects: updated));
      });
    }
    for (var s in _filter.sections) {
      addChip('Section: $s', () {
        final updated = Set<String>.from(_filter.sections)..remove(s);
        setState(() => _filter = _filter.copyWith(sections: updated));
      });
    }
    for (var e in _filter.engagements) {
      addChip('Eng: $e', () {
        final updated = Set<String>.from(_filter.engagements)..remove(e);
        setState(() => _filter = _filter.copyWith(engagements: updated));
      });
    }
    for (var t in _filter.timesOfDay) {
      addChip('Time: $t', () {
        final updated = Set<String>.from(_filter.timesOfDay)..remove(t);
        setState(() => _filter = _filter.copyWith(timesOfDay: updated));
      });
    }

    if (chips.isNotEmpty) {
      chips.add(
        GestureDetector(
          onTap: () => setState(() => _filter = FilterState()),
          child: Container(
            height: 32,
            margin: const EdgeInsets.only(right: 8, bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              // Simple text appearance, no border
            ),
            alignment: Alignment.center,
            child: Text(
              'Clear All',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: theme.colorScheme.error),
            ),
          ),
        ),
      );
    }
    return chips;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final sessionManager = context.watch<SessionProvider>();
    final classroomManager = context.watch<ClassroomProvider>();
    
    final allHistory = sessionManager.history;
    final subjects = classroomManager.subjects;
    
    final filteredSessions = _applyFilters(allHistory, subjects);
    
    // Quick analytics preview
    final avgEng = filteredSessions.isEmpty ? 0.0 : filteredSessions.fold(0.0, (s, e) => s + e.averageEngagement) / filteredSessions.length;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('Session History', style: TextStyle(fontWeight: FontWeight.w700)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(Icons.filter_list_rounded, 
              color: !_filter.isDefault ? theme.colorScheme.primary : null),
            onPressed: () => _showFilters(context, subjects, allHistory),
            tooltip: 'Filter & Sort',
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // Selected Filters Area
          if (!_filter.isDefault)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              color: theme.scaffoldBackgroundColor, // Ensure consistent background
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start, // Align to top safely
                  children: _buildFilterChips(),
                ),
              ),
            ),

          // Analytics Preview
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: theme.dividerColor)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Showing ${filteredSessions.length} session${filteredSessions.length == 1 ? '' : 's'}',
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: theme.colorScheme.secondary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (filteredSessions.isNotEmpty)
                  Row(
                    children: [
                      Icon(Icons.analytics_rounded, size: 14, color: theme.colorScheme.primary),
                      const SizedBox(width: 4),
                      Text(
                        'Avg. Eng: ${avgEng.toStringAsFixed(1)}%',
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: theme.colorScheme.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),

          // List View
          Expanded(
            child: sessionManager.historyLoading && allHistory.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : filteredSessions.isEmpty
                    ? _buildEmptyState(theme, !_filter.isDefault)
                    : RefreshIndicator(
                        onRefresh: () => sessionManager.fetchSessionHistory(includeActive: false),
                        color: theme.colorScheme.primary,
                        child: ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(16),
                          itemCount: filteredSessions.length,
                          itemBuilder: (context, index) {
                            final session = filteredSessions[index];
                            final subjModel = _findSubject(session.subjectId, subjects);
                            final majorLabel = (session.majorCode?.trim().isNotEmpty == true)
                                ? session.majorCode
                                : (session.majorName ?? subjModel?.majorCode ?? subjModel?.majorName);
                            return _SessionListCard(
                              session: session,
                              logoPath: (session.collegeLogoPath?.trim().isNotEmpty == true)
                                  ? session.collegeLogoPath
                                  : subjModel?.collegeLogoPath,
                              collegeName: session.collegeName ?? subjModel?.collegeName,
                              departmentName: session.departmentName ?? subjModel?.departmentName,
                              majorLabel: majorLabel,
                              theme: theme,
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(ThemeData theme, bool hasFilters) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: theme.colorScheme.secondary.withValues(alpha: 0.08),
              shape: BoxShape.circle,
            ),
            child: Icon(
              hasFilters ? Icons.filter_alt_off_rounded : Icons.history_rounded,
              size: 48,
              color: theme.colorScheme.secondary.withValues(alpha: 0.5),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            hasFilters ? 'No results found' : 'No history yet',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            hasFilters
                ? 'Try adjusting or clearing your filters.'
                : 'Run a monitoring session to see results here.',
            style: TextStyle(color: theme.colorScheme.secondary),
          ),
          if (hasFilters) ...[
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () => setState(() => _filter = FilterState()),
              icon: const Icon(Icons.clear_all_rounded, size: 18),
              label: const Text('Clear Filters'),
            )
          ],
        ],
      ),
    );
  }
}

// ── Shared Card UI reconstructed for History screen ──────────────────────────────

class _SessionListCard extends StatelessWidget {
  final SessionSummaryModel session;
  final String? logoPath;
  final String? collegeName;
  final String? departmentName;
  final String? majorLabel;
  final ThemeData theme;

  const _SessionListCard({
    required this.session,
    required this.logoPath,
    required this.collegeName,
    required this.departmentName,
    required this.majorLabel,
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

  String _formatDate(DateTime d) {
    final now = DateTime.now();
    final diff = now.difference(d);
    if (diff.inDays == 0) return 'Today at ${DateFormat('h:mm a').format(d)}';
    if (diff.inDays == 1) return 'Yesterday at ${DateFormat('h:mm a').format(d)}';
    return DateFormat('MMM d, yyyy · h:mm a').format(d);
  }

  @override
  Widget build(BuildContext context) {
    final color = _engagementColor(session.averageEngagement);
    final logoUrl = resolveImageUrl(logoPath);
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: theme.dividerColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: theme.brightness == Brightness.dark ? 0.2 : 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => SessionDetailScreen(session: session)),
            );
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                // Avatar / Logo
                if (logoUrl != null)
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: theme.dividerColor),
                    ),
                    child: ClipOval(
                      child: Image.network(logoUrl, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _buildFallback(color)),
                    ),
                  )
                else
                  _buildFallback(color),
                
                const SizedBox(width: 14),
                
                // Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        session.subjectName,
                        style: theme.textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w700),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      HierarchyMetaRow(
                        collegeName: collegeName,
                        departmentName: departmentName,
                        majorLabel: majorLabel,
                        collegeLogoPath: logoPath,
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Icon(Icons.groups_rounded, size: 12, color: theme.colorScheme.secondary),
                          const SizedBox(width: 4),
                          Text(
                            session.sectionName,
                            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.secondary),
                          ),
                          const SizedBox(width: 8),
                          Icon(Icons.schedule_rounded, size: 12, color: theme.colorScheme.secondary),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              _formatDate(session.startTime),
                              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.secondary),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      if (session.isActive)
                        Padding(
                          padding: const EdgeInsets.only(top: 4.0),
                          child: Text(
                            'Status: Active', 
                            style: theme.textTheme.labelSmall?.copyWith(color: Colors.green, fontWeight: FontWeight.bold),
                          ),
                        ),
                    ],
                  ),
                ),
                
                // Engagement Badge
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${session.averageEngagement.toStringAsFixed(1)}%',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: color,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      margin: const EdgeInsets.only(top: 2),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _engLabel(session.averageEngagement),
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
                Icon(Icons.chevron_right_rounded, size: 20, color: theme.colorScheme.secondary),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFallback(Color color) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        shape: BoxShape.circle,
      ),
      child: Icon(Icons.analytics_rounded, color: color, size: 20),
    );
  }
}


// ── Filter Bottom Sheet ───────────────────────────────────────────────────────

class _FilterBottomSheet extends StatefulWidget {
  final FilterState initialState;
  final List<String> availableColleges;
  final List<String> availableDepartments;
  final List<String> availableMajors;
  final List<String> availableSubjects;
  final List<String> availableSections;

  const _FilterBottomSheet({
    required this.initialState,
    required this.availableColleges,
    required this.availableDepartments,
    required this.availableMajors,
    required this.availableSubjects,
    required this.availableSections,
  });

  @override
  State<_FilterBottomSheet> createState() => _FilterBottomSheetState();
}

class _FilterBottomSheetState extends State<_FilterBottomSheet> {
  late FilterState _state;

  @override
  void initState() {
    super.initState();
    _state = widget.initialState.copyWith(); // Clone
  }

  void _toggleSetItem(Set<String> current, String item, void Function(Set<String>) update) {
    final newSet = Set<String>.from(current);
    if (newSet.contains(item)) {
      newSet.remove(item);
    } else {
      newSet.add(item);
    }
    update(newSet);
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(top: 24, bottom: 12),
      child: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      ),
    );
  }

  Widget _buildChoiceChip(String label, bool isSelected, VoidCallback onTap) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(right: 8, bottom: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (_) => onTap(),
        selectedColor: theme.colorScheme.primary.withValues(alpha: 0.15),
        labelStyle: TextStyle(
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          color: isSelected ? theme.colorScheme.primary : theme.textTheme.bodyMedium?.color,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: isSelected ? theme.colorScheme.primary : theme.dividerColor,
          ),
        ),
        backgroundColor: theme.cardColor,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: DraggableScrollableSheet(
        initialChildSize: 0.9,
        minChildSize: 0.5,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) {
          return Column(
            children: [
              // Handle behavior
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.dividerColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Filter & Sort', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    IconButton(
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () => Navigator.pop(context),
                    )
                  ],
                ),
              ),
              const Divider(height: 1),
              
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  children: [
                    _buildSectionHeader('Sort By'),
                    Wrap(
                      children: [
                        _buildChoiceChip('Newest First', _state.sortMode == 'newest', () => setState(() => _state = _state.copyWith(sortMode: 'newest'))),
                        _buildChoiceChip('Oldest First', _state.sortMode == 'oldest', () => setState(() => _state = _state.copyWith(sortMode: 'oldest'))),
                        _buildChoiceChip('Highest Engagement', _state.sortMode == 'highest', () => setState(() => _state = _state.copyWith(sortMode: 'highest'))),
                        _buildChoiceChip('Lowest Engagement', _state.sortMode == 'lowest', () => setState(() => _state = _state.copyWith(sortMode: 'lowest'))),
                      ],
                    ),

                    _buildSectionHeader('Date'),
                    Wrap(
                      children: [
                        _buildChoiceChip('Today', _state.quickDate == 'Today', () => setState(() => _state = _state.copyWith(quickDate: _state.quickDate == 'Today' ? null : 'Today', clearDate: _state.quickDate == 'Today' ? true : false))),
                        _buildChoiceChip('This Week', _state.quickDate == 'This Week', () => setState(() => _state = _state.copyWith(quickDate: _state.quickDate == 'This Week' ? null : 'This Week', clearDate: _state.quickDate == 'This Week' ? true : false))),
                        _buildChoiceChip('This Month', _state.quickDate == 'This Month', () => setState(() => _state = _state.copyWith(quickDate: _state.quickDate == 'This Month' ? null : 'This Month', clearDate: _state.quickDate == 'This Month' ? true : false))),
                        _buildChoiceChip('Custom Range', _state.customDateRange != null, () async {
                          final range = await showDateRangePicker(
                            context: context,
                            firstDate: DateTime(2020),
                            lastDate: DateTime.now(),
                            initialDateRange: _state.customDateRange,
                          );
                          if (range != null) {
                            setState(() => _state = _state.copyWith(customDateRange: range, quickDate: null));
                          } else if (_state.customDateRange != null) {
                            // User cancelled, maybe clear if they untoggled? Let's leave it.
                          }
                        }),
                      ],
                    ),

                    _buildSectionHeader('Status'),
                    Wrap(
                      children: [
                        _buildChoiceChip('Active', _state.statuses.contains('Active'), () => _toggleSetItem(_state.statuses, 'Active', (s) => setState(() => _state = _state.copyWith(statuses: s)))),
                        _buildChoiceChip('Completed', _state.statuses.contains('Completed'), () => _toggleSetItem(_state.statuses, 'Completed', (s) => setState(() => _state = _state.copyWith(statuses: s)))),
                      ],
                    ),

                    _buildSectionHeader('Engagement Level'),
                    Wrap(
                      children: [
                        _buildChoiceChip('High (≥70%)', _state.engagements.contains('High'), () => _toggleSetItem(_state.engagements, 'High', (s) => setState(() => _state = _state.copyWith(engagements: s)))),
                        _buildChoiceChip('Medium (45-69%)', _state.engagements.contains('Medium'), () => _toggleSetItem(_state.engagements, 'Medium', (s) => setState(() => _state = _state.copyWith(engagements: s)))),
                        _buildChoiceChip('Low (<45%)', _state.engagements.contains('Low'), () => _toggleSetItem(_state.engagements, 'Low', (s) => setState(() => _state = _state.copyWith(engagements: s)))),
                      ],
                    ),

                    _buildSectionHeader('Time of Day'),
                    Wrap(
                      children: [
                        _buildChoiceChip('Morning', _state.timesOfDay.contains('Morning'), () => _toggleSetItem(_state.timesOfDay, 'Morning', (s) => setState(() => _state = _state.copyWith(timesOfDay: s)))),
                        _buildChoiceChip('Afternoon', _state.timesOfDay.contains('Afternoon'), () => _toggleSetItem(_state.timesOfDay, 'Afternoon', (s) => setState(() => _state = _state.copyWith(timesOfDay: s)))),
                        _buildChoiceChip('Evening', _state.timesOfDay.contains('Evening'), () => _toggleSetItem(_state.timesOfDay, 'Evening', (s) => setState(() => _state = _state.copyWith(timesOfDay: s)))),
                      ],
                    ),

                    if (widget.availableColleges.isNotEmpty) ...[
                      _buildSectionHeader('College'),
                      Wrap(
                        children: widget.availableColleges.map((c) => _buildChoiceChip(
                          c, _state.colleges.contains(c),
                          () => _toggleSetItem(_state.colleges, c, (s) => setState(() => _state = _state.copyWith(colleges: s)))
                        )).toList(),
                      ),
                    ],

                    if (widget.availableDepartments.isNotEmpty) ...[
                      _buildSectionHeader('Department'),
                      Wrap(
                        children: widget.availableDepartments.map((d) => _buildChoiceChip(
                          d, _state.departments.contains(d),
                          () => _toggleSetItem(_state.departments, d, (s) => setState(() => _state = _state.copyWith(departments: s)))
                        )).toList(),
                      ),
                    ],

                    if (widget.availableMajors.isNotEmpty) ...[
                      _buildSectionHeader('Major'),
                      Wrap(
                        children: widget.availableMajors.map((m) => _buildChoiceChip(
                          m, _state.majors.contains(m),
                          () => _toggleSetItem(_state.majors, m, (s) => setState(() => _state = _state.copyWith(majors: s)))
                        )).toList(),
                      ),
                    ],

                    if (widget.availableSubjects.isNotEmpty) ...[
                      _buildSectionHeader('Subject / Class'),
                      Wrap(
                        children: widget.availableSubjects.map((s) => _buildChoiceChip(
                          s, _state.subjects.contains(s),
                          () => _toggleSetItem(_state.subjects, s, (st) => setState(() => _state = _state.copyWith(subjects: st)))
                        )).toList(),
                      ),
                    ],

                    if (widget.availableSections.isNotEmpty) ...[
                      _buildSectionHeader('Section'),
                      Wrap(
                        children: widget.availableSections.map((sec) => _buildChoiceChip(
                          sec, _state.sections.contains(sec),
                          () => _toggleSetItem(_state.sections, sec, (st) => setState(() => _state = _state.copyWith(sections: st)))
                        )).toList(),
                      ),
                    ],
                    
                    const SizedBox(height: 32),
                  ],
                ),
              ),
              
              // Bottom Action Bar
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                decoration: BoxDecoration(
                  color: theme.cardColor,
                  border: Border(top: BorderSide(color: theme.dividerColor)),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -4))
                  ],
                ),
                child: Row(
                  children: [
                    TextButton(
                      onPressed: () {
                        setState(() => _state = FilterState());
                      },
                      child: const Text('Clear All', style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: theme.colorScheme.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          elevation: 0,
                        ),
                        onPressed: () {
                          Navigator.pop(context, _state);
                        },
                        child: const Text('Apply Filters', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
