import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:fl_chart/fl_chart.dart';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../auth/provider/auth_provider.dart';
import '../../../core/theme/theme_provider.dart';
import '../../classroom/provider/classroom_provider.dart';
import '../../classroom/screens/subject_details_screen.dart';
import '../../session/provider/session_provider.dart';
import '../../session/screens/monitoring_screen.dart';
import '../../../data/models/classroom_session_models.dart';
import '../../../core/config/env_config.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 1; // Default to Active Sessions

  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      const _ClassesTab(),
      const _ActiveSessionsTab(),
      const _MachineLearningSettingsTab(),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final username = user?.username.trim() ?? '';
    final initial = username.isNotEmpty ? username[0].toUpperCase() : '?';
    final hasProfileImage = auth.profileImagePath != null &&
        File(auth.profileImagePath!).existsSync();

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.asset(
                'assets/images/ml_bg.png',
                height: 28,
                width: 28,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(width: 10),
            const Text("TeachTrack"),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 10),
            child: IconButton(
              tooltip: "Profile",
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const ProfileScreen(),
                  ),
                );
              },
              icon: CircleAvatar(
                radius: 16,
                backgroundColor:
                    Theme.of(context).colorScheme.primary.withOpacity(0.14),
                backgroundImage: hasProfileImage
                    ? FileImage(File(auth.profileImagePath!))
                    : null,
                child: hasProfileImage
                    ? null
                    : Text(
                        initial,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: _pages,
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
        child: Container(
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 24,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: BottomNavigationBar(
              currentIndex: _currentIndex,
              onTap: (index) => setState(() => _currentIndex = index),
              type: BottomNavigationBarType.fixed,
              showSelectedLabels: true,
              showUnselectedLabels: true,
              selectedItemColor: Theme.of(context).colorScheme.primary,
              unselectedItemColor: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.color
                  ?.withOpacity(0.6),
              backgroundColor: Colors.transparent,
              elevation: 0,
              items: const [
                BottomNavigationBarItem(
                  icon: Icon(Icons.class_outlined),
                  activeIcon: Icon(Icons.class_),
                  label: 'Classes',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.play_circle_outline),
                  activeIcon: Icon(Icons.play_circle_fill),
                  label: 'Active Sessions',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.tune_outlined),
                  activeIcon: Icon(Icons.tune),
                  label: 'Settings',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ClassesTab extends StatefulWidget {
  const _ClassesTab();

  @override
  State<_ClassesTab> createState() => _ClassesTabState();
}

class _ClassesTabState extends State<_ClassesTab> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

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
    final normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.isEmpty) return true;

    return subject.name.toLowerCase().contains(normalizedQuery);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Consumer<ClassroomProvider>(
        builder: (context, classroom, child) {
          if (classroom.isLoading && classroom.subjects.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (classroom.error != null && classroom.subjects.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 16),
                  Text("Error: ${classroom.error}"),
                  TextButton(
                    onPressed: () => classroom.fetchClassroomData(),
                    child: const Text("Retry"),
                  ),
                ],
              ),
            );
          }

          if (classroom.subjects.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.class_outlined,
                      size: 64, color: Colors.grey.shade400),
                  const SizedBox(height: 16),
                  const Text("No classes found",
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text("Add your subjects and sections to get started."),
                ],
              ),
            );
          }

          final filteredSubjects = classroom.subjects
              .where((subject) => _matchesSearch(subject, _searchQuery))
              .toList();
          final theme = Theme.of(context);

          return RefreshIndicator(
            onRefresh: () => classroom.fetchClassroomData(),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final width = constraints.maxWidth;
                final crossAxisCount = width >= 1100
                    ? 3
                    : width >= 680
                        ? 2
                        : 1;
                final ratio = crossAxisCount == 1 ? 1.28 : 1.15;

                return CustomScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  slivers: [
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Classes",
                              style: theme.textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              "Manage your subjects,sections, and sessions",
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.textTheme.bodySmall?.color,
                              ),
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(child: _classesSearchField(theme)),
                                const SizedBox(width: 8),
                                SizedBox(
                                  height: 50,
                                  child: _addSubjectButton(theme, context),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (filteredSubjects.isEmpty)
                      const SliverFillRemaining(
                        hasScrollBody: false,
                        child: Center(
                          child: Text('No classes match your search.'),
                        ),
                      ),
                    if (filteredSubjects.isNotEmpty)
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                        sliver: SliverGrid(
                          gridDelegate:
                              SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: crossAxisCount,
                            mainAxisSpacing: 16,
                            crossAxisSpacing: 16,
                            childAspectRatio: ratio,
                          ),
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final subject = filteredSubjects[index];
                              return _SubjectCard(
                                subject: subject,
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) =>
                                          SubjectDetailsScreen(
                                              subject: subject),
                                    ),
                                  );
                                },
                              );
                            },
                            childCount: filteredSubjects.length,
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
          );
        },
      ),
    );
  }

  void _showAddSubjectDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _AddSubjectSheet(),
    );
  }

  Widget _classesSearchField(ThemeData theme) {
    return Container(
      height: 50,
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: theme.dividerColor.withOpacity(0.45),
        ),
      ),
      child: TextField(
        controller: _searchController,
        onChanged: (value) => setState(() => _searchQuery = value),
        style: theme.textTheme.bodyMedium,
        textInputAction: TextInputAction.search,
        decoration: InputDecoration(
          hintText: 'Search by subject name',
          hintStyle: theme.textTheme.bodyMedium?.copyWith(
            color: theme.textTheme.bodySmall?.color,
          ),
          prefixIcon: Icon(
            Icons.search_rounded,
            size: 20,
            color: theme.textTheme.bodySmall?.color,
          ),
          suffixIcon: _searchQuery.isEmpty
              ? null
              : IconButton(
                  tooltip: "Clear search",
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _searchQuery = '');
                  },
                  icon: Icon(
                    Icons.close_rounded,
                    size: 20,
                    color: theme.textTheme.bodySmall?.color,
                  ),
                ),
          border: InputBorder.none,
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 8,
            vertical: 13,
          ),
        ),
      ),
    );
  }

  Widget _addSubjectButton(ThemeData theme, BuildContext context) {
    final compact = MediaQuery.of(context).size.width < 390;
    return FilledButton.icon(
      onPressed: () => _showAddSubjectDialog(context),
      icon: const Icon(Icons.add_rounded, size: 18),
      label: Text(
        compact ? "Add" : "Add Subject",
        style: theme.textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w700,
          color: theme.colorScheme.onPrimary,
        ),
      ),
      style: FilledButton.styleFrom(
        backgroundColor: theme.colorScheme.primary,
        foregroundColor: theme.colorScheme.onPrimary,
        minimumSize: const Size(0, 50),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
      ),
    );
  }
}

class _AddSubjectSheet extends StatefulWidget {
  const _AddSubjectSheet();

  @override
  State<_AddSubjectSheet> createState() => _AddSubjectSheetState();
}

class _AddSubjectSheetState extends State<_AddSubjectSheet> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final ImagePicker _imagePicker = ImagePicker();
  XFile? _pickedImage;
  Uint8List? _pickedImageBytes;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickFrom(ImageSource source) async {
    final selected = await _imagePicker.pickImage(
      source: source,
      imageQuality: 85,
      maxWidth: 1600,
    );
    if (selected == null || !mounted) return;
    final bytes = await selected.readAsBytes();
    if (!mounted) return;
    setState(() {
      _pickedImage = selected;
      _pickedImageBytes = bytes;
    });
  }

  Future<void> _submit() async {
    if (_isSubmitting) return;
    final subjectName = _nameController.text.trim();
    if (subjectName.isEmpty) return;

    setState(() => _isSubmitting = true);
    final classroomProvider = context.read<ClassroomProvider>();
    final success = await classroomProvider.addSubject(
      name: subjectName,
      description: _descriptionController.text.trim().isEmpty
          ? null
          : _descriptionController.text.trim(),
      coverImagePath: _pickedImage?.path,
    );

    if (!mounted) return;
    setState(() => _isSubmitting = false);
    if (success) {
      Navigator.of(context).pop();
      return;
    }

    final error = classroomProvider.error ?? "Failed to add subject";
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final modalButtonRadius = BorderRadius.circular(12);
    final saveButtonBg =
        isDark ? const Color(0xFF56CC9D) : const Color(0xFF0F7A5C);
    final saveButtonFg = isDark ? Colors.black : Colors.white;

    return AnimatedPadding(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOut,
      padding:
          EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: FractionallySizedBox(
        widthFactor: 1,
        child: Container(
          decoration: BoxDecoration(
            color: theme.scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 22),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 42,
                      height: 5,
                      decoration: BoxDecoration(
                        color: theme.dividerColor,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    "New Subject",
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "Add a subject name, optional description, and cover image.",
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.textTheme.bodySmall?.color,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    "Subject Name",
                    style: theme.textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _nameController,
                    style: theme.textTheme.bodyMedium,
                    decoration: const InputDecoration(
                      hintText: "e.g. Computer Programming 1",
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    "Description (Optional)",
                    style: theme.textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _descriptionController,
                    minLines: 3,
                    maxLines: 4,
                    style: theme.textTheme.bodyMedium,
                    decoration: const InputDecoration(
                      hintText: "Add short context for this subject",
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    "Cover Image",
                    style: theme.textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      width: double.infinity,
                      height: 160,
                      color: theme.colorScheme.surfaceContainerHighest
                          .withOpacity(0.4),
                      child: _pickedImageBytes == null
                          ? Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.photo_library_outlined,
                                  color: theme.colorScheme.primary,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  "No image selected",
                                  style: theme.textTheme.bodySmall,
                                ),
                              ],
                            )
                          : Image.memory(_pickedImageBytes!, fit: BoxFit.cover),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    children: [
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(0, 44),
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: modalButtonRadius,
                          ),
                        ),
                        onPressed: _isSubmitting
                            ? null
                            : () => _pickFrom(ImageSource.gallery),
                        icon: const Icon(Icons.photo_library_outlined),
                        label: const Text("Gallery"),
                      ),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(0, 44),
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: modalButtonRadius,
                          ),
                        ),
                        onPressed: _isSubmitting
                            ? null
                            : () => _pickFrom(ImageSource.camera),
                        icon: const Icon(Icons.photo_camera_outlined),
                        label: const Text("Camera"),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(0, 50),
                            shape: RoundedRectangleBorder(
                              borderRadius: modalButtonRadius,
                            ),
                          ),
                          onPressed: _isSubmitting
                              ? null
                              : () => Navigator.pop(context),
                          child: Text(
                            "Cancel",
                            style: theme.textTheme.labelLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            minimumSize: const Size(0, 50),
                            backgroundColor: saveButtonBg,
                            foregroundColor: saveButtonFg,
                            shape: RoundedRectangleBorder(
                              borderRadius: modalButtonRadius,
                            ),
                          ),
                          onPressed: _isSubmitting ? null : _submit,
                          child: _isSubmitting
                              ? const SizedBox(
                                  height: 18,
                                  width: 18,
                                  child:
                                      CircularProgressIndicator(strokeWidth: 2),
                                )
                              : Text(
                                  "Save Subject",
                                  style: theme.textTheme.labelLarge?.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SubjectCard extends StatefulWidget {
  final SubjectModel subject;
  final VoidCallback onTap;

  const _SubjectCard({
    required this.subject,
    required this.onTap,
  });

  @override
  State<_SubjectCard> createState() => _SubjectCardState();
}

class _SubjectCardState extends State<_SubjectCard> {
  bool _isStarting = false;

  Future<int?> _askStudentsPresent(BuildContext context) async {
    final controller = TextEditingController();
    return showDialog<int>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Students Present'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Enter number of students present',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final value = int.tryParse(controller.text.trim());
              if (value == null || value <= 0) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                      content: Text('Enter a valid number greater than 0.')),
                );
                return;
              }
              Navigator.pop(dialogContext, value);
            },
            child: const Text('Start'),
          ),
        ],
      ),
    );
  }

  ButtonStyle _startSubjectButtonStyle(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF56CC9D) : const Color(0xFF0F7A5C);
    final fg = isDark ? Colors.black : Colors.white;
    return FilledButton.styleFrom(
      backgroundColor: bg,
      foregroundColor: fg,
      disabledBackgroundColor: scheme.surfaceContainerHighest,
      disabledForegroundColor: scheme.onSurface.withOpacity(0.55),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
      ),
    );
  }

  Future<void> _startMonitoringFromCard(SectionModel section) async {
    if (_isStarting) return;
    final studentsPresent = await _askStudentsPresent(context);
    if (studentsPresent == null) return;
    setState(() => _isStarting = true);

    final session = context.read<SessionProvider>();
    final success = await session.startSession(
      widget.subject.id,
      section.id,
      studentsPresent,
    );

    if (!mounted) return;
    setState(() => _isStarting = false);

    if (success) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) =>
              MonitoringScreen(sessionId: session.activeSession!.id),
        ),
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text("Failed to start session: ${session.error}")),
    );
  }

  Future<void> _showSectionsPicker() async {
    final subject = widget.subject;

    await showModalBottomSheet(
      context: context,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Container(
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(22)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(height: 10),
                  Container(
                    width: 42,
                    height: 5,
                    decoration: BoxDecoration(
                      color: Theme.of(context).dividerColor,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            subject.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          "${subject.sections.length} section${subject.sections.length == 1 ? '' : 's'}",
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  if (subject.sections.isEmpty)
                    const Padding(
                      padding: EdgeInsets.fromLTRB(16, 12, 16, 20),
                      child: Text("No sections available."),
                    ),
                  if (subject.sections.isNotEmpty)
                    Flexible(
                      child: ListView.separated(
                        shrinkWrap: true,
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                        itemCount: subject.sections.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final section = subject.sections[index];
                          return Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: Theme.of(context)
                                    .dividerColor
                                    .withOpacity(0.35),
                              ),
                            ),
                            child: ListTile(
                              leading: const Icon(Icons.groups_rounded),
                              title: Text(section.name),
                              trailing: FilledButton.tonal(
                                style: _startSubjectButtonStyle(context),
                                onPressed: _isStarting
                                    ? null
                                    : () async {
                                        setSheetState(() => _isStarting = true);
                                        await _startMonitoringFromCard(section);
                                        if (!mounted) return;
                                        setSheetState(
                                            () => _isStarting = false);
                                        if (sheetContext.mounted) {
                                          Navigator.pop(sheetContext);
                                        }
                                      },
                                child: _isStarting
                                    ? const SizedBox(
                                        height: 14,
                                        width: 14,
                                        child: CircularProgressIndicator(
                                            strokeWidth: 2),
                                      )
                                    : const Text('Start'),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final subject = widget.subject;
    final imageUrl = _resolveImageUrl(subject.coverImageUrl);
    final theme = Theme.of(context);

    return Material(
      color: theme.cardColor,
      borderRadius: BorderRadius.circular(18),
      elevation: 3,
      shadowColor: Colors.black.withOpacity(0.08),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: widget.onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 6,
              child: ClipRRect(
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(18)),
                child: imageUrl == null
                    ? _SubjectImagePlaceholder(title: subject.name)
                    : Image.network(
                        imageUrl,
                        fit: BoxFit.cover,
                        width: double.infinity,
                        loadingBuilder: (context, child, loadingProgress) {
                          if (loadingProgress == null) return child;
                          return const Center(
                              child: CircularProgressIndicator(strokeWidth: 2));
                        },
                        errorBuilder: (_, __, ___) =>
                            _SubjectImagePlaceholder(title: subject.name),
                      ),
              ),
            ),
            Expanded(
              flex: 5,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      subject.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      subject.description?.trim().isNotEmpty == true
                          ? subject.description!
                          : 'No description available.',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall,
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        Icon(Icons.view_list_rounded,
                            size: 16, color: theme.colorScheme.primary),
                        const SizedBox(width: 6),
                        Text(
                          "Sections",
                          style: theme.textTheme.labelMedium?.copyWith(
                            color: theme.colorScheme.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const Spacer(),
                        InkWell(
                          borderRadius: BorderRadius.circular(18),
                          onTap: _showSectionsPicker,
                          child: Ink(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 7),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(18),
                              color:
                                  theme.colorScheme.primary.withOpacity(0.08),
                              border: Border.all(
                                color:
                                    theme.colorScheme.primary.withOpacity(0.28),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.groups_rounded,
                                    size: 15, color: theme.colorScheme.primary),
                                const SizedBox(width: 6),
                                Text(
                                  "${subject.sections.length}",
                                  style: theme.textTheme.labelMedium?.copyWith(
                                    color: theme.colorScheme.primary,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(width: 2),
                                Icon(
                                  Icons.keyboard_arrow_down_rounded,
                                  size: 17,
                                  color: theme.colorScheme.primary,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SubjectImagePlaceholder extends StatelessWidget {
  final String title;

  const _SubjectImagePlaceholder({required this.title});

  @override
  Widget build(BuildContext context) {
    final initials = title.trim().isEmpty
        ? '?'
        : title
            .trim()
            .split(RegExp(r'\s+'))
            .where((part) => part.isNotEmpty)
            .take(2)
            .map((part) => part[0].toUpperCase())
            .join();

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Theme.of(context).colorScheme.primaryContainer,
            Theme.of(context).colorScheme.secondaryContainer,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: Theme.of(context).colorScheme.onPrimaryContainer,
            ),
      ),
    );
  }
}

String? _resolveImageUrl(String? rawPath) {
  if (rawPath == null || rawPath.trim().isEmpty) return null;
  final path = rawPath.trim();
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  final base = EnvConfig.baseUrl.replaceAll(RegExp(r'/$'), '');
  final normalizedPath = path.startsWith('/') ? path : '/$path';
  return '$base$normalizedPath';
}

class _ActiveSessionsTab extends StatefulWidget {
  const _ActiveSessionsTab();

  @override
  State<_ActiveSessionsTab> createState() => _ActiveSessionsTabState();
}

class _ActiveSessionsTabState extends State<_ActiveSessionsTab>
    with WidgetsBindingObserver {
  final DateFormat _sessionDateFormat = DateFormat('MMM d, yyyy');
  final DateFormat _tooltipDateFormat = DateFormat('MMM d, yyyy');
  final DateFormat _tooltipTimeFormat = DateFormat('HH:mm:ss');
  int? _expandedSessionId;
  final Map<int, Future<SessionMetricsModel>> _sessionMetricsFutures = {};
  final ScrollController _recentSessionsScrollController = ScrollController();
  bool _showRecentSessionsBottomFade = true;
  bool _showRecentSessionsThirdHintFade = true;
  String _historyQuery = '';
  String _historySort = 'newest';
  String? _historySubjectFilter;
  String? _historySectionFilter;
  double _historyMinEngagement = 0;
  DateTimeRange? _historyDateRange;
  bool _historyFiltersOpen = false;
  bool _historyFiltersApplied = false;
  bool _isExportingHistory = false;
  String _draftHistoryQuery = '';
  String _draftHistorySort = 'newest';
  String? _draftHistorySubjectFilter;
  String? _draftHistorySectionFilter;
  double _draftHistoryMinEngagement = 0;
  DateTimeRange? _draftHistoryDateRange;

  void _handleRecentSessionsScroll() {
    if (!_recentSessionsScrollController.hasClients || !mounted) return;
    final position = _recentSessionsScrollController.position;
    final atTop = position.pixels <= 2;
    final hasMoreBelow = position.pixels < (position.maxScrollExtent - 2);

    if (atTop != _showRecentSessionsThirdHintFade ||
        hasMoreBelow != _showRecentSessionsBottomFade) {
      setState(() {
        _showRecentSessionsThirdHintFade = atTop;
        _showRecentSessionsBottomFade = hasMoreBelow;
      });
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _recentSessionsScrollController.addListener(_handleRecentSessionsScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final session = context.read<SessionProvider>();
      session.checkActiveSession();
      session.fetchSessionHistory(includeActive: false);
      if (context.read<ClassroomProvider>().subjects.isEmpty) {
        context.read<ClassroomProvider>().fetchClassroomData();
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _recentSessionsScrollController.removeListener(_handleRecentSessionsScroll);
    _recentSessionsScrollController.dispose();
    _sessionMetricsFutures.clear();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      final session = context.read<SessionProvider>();
      final classroom = context.read<ClassroomProvider>();
      session.checkActiveSession();
      session.fetchSessionHistory(includeActive: false);
      if (classroom.subjects.isEmpty) {
        classroom.fetchClassroomData();
      }
    }
  }

  Future<void> _confirmStopSession(
      BuildContext context, SessionProvider session) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("End Session?"),
        content: const Text(
            "This will stop the current session and save its results."),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text("Stop"),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await session.stopServerDetector();
      await session.stopSession();
    }
  }

  Future<int?> _askStudentsPresent(BuildContext context) async {
    final controller = TextEditingController();
    return showDialog<int>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Students Present'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Enter number of students present',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final value = int.tryParse(controller.text.trim());
              if (value == null || value <= 0) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                      content: Text('Enter a valid number greater than 0.')),
                );
                return;
              }
              Navigator.pop(dialogContext, value);
            },
            child: const Text('Start'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<SessionProvider, ClassroomProvider>(
      builder: (context, session, classroom, child) {
        final activeSession = session.activeSession;

        if (activeSession != null) {
          return RefreshIndicator(
            onRefresh: () async {
              await session.checkActiveSession();
              await session.fetchMetrics();
            },
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(
                  "Active Session",
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Row(
                      children: [
                        Container(
                          height: 52,
                          width: 52,
                          decoration: BoxDecoration(
                            color: Theme.of(context)
                                .colorScheme
                                .primary
                                .withOpacity(0.08),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Icon(Icons.sensors_rounded,
                              color: Theme.of(context).colorScheme.primary),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                "Session in progress",
                                style: TextStyle(fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "Live metrics are updating.",
                                style: TextStyle(
                                    color: Theme.of(context)
                                        .textTheme
                                        .bodySmall
                                        ?.color),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        IconButton(
                          tooltip: "Open monitoring",
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => MonitoringScreen(
                                    sessionId: activeSession.id),
                              ),
                            );
                          },
                          icon: const Icon(Icons.open_in_new),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => session.fetchMetrics(),
                        icon: const Icon(Icons.refresh),
                        label: const Text("Refresh"),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red,
                          foregroundColor: Colors.white,
                        ),
                        onPressed: () => _confirmStopSession(context, session),
                        icon: const Icon(Icons.stop_circle_outlined),
                        label: const Text("Stop Session"),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        }

        final isLoading = classroom.isLoading && classroom.subjects.isEmpty;
        final defaultHistory = session.history.take(5).toList();
        final filteredHistory = _historyFiltersApplied
            ? _applyHistoryFilters(session.history)
            : defaultHistory;
        return ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 8),
            AnimatedSize(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeInOut,
              child: _historyFiltersOpen
                  ? const SizedBox.shrink()
                  : Column(
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
                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            style: _startSessionButtonStyle(context),
                            onPressed: () => _showStartSessionSheet(
                                context, session, classroom),
                            child: isLoading
                                ? const SizedBox(
                                    height: 18,
                                    width: 18,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2.2),
                                  )
                                : const Text("Start Session"),
                          ),
                        ),
                        const SizedBox(height: 18),
                      ],
                    ),
            ),
            if (session.historyLoading && session.history.isEmpty)
              const SizedBox(
                height: 28,
                width: 28,
                child: CircularProgressIndicator(strokeWidth: 2.4),
              )
            else if (session.historyError != null && session.history.isEmpty)
              Text(
                "Failed to load recent sessions",
                style: TextStyle(
                  color: Theme.of(context).colorScheme.error,
                ),
              )
            else if (filteredHistory.isNotEmpty) ...[
              _buildRecentSessionsPanel(
                context,
                filteredHistory,
                session.history,
                session,
              ),
            ] else ...[
              Column(
                children: [
                  Text(
                    "No sessions found",
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "No recent sessions available.",
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ],
          ],
        );
      },
    );
  }

  Future<void> _showStartSessionSheet(
    BuildContext context,
    SessionProvider session,
    ClassroomProvider classroom,
  ) async {
    if (classroom.subjects.isEmpty) {
      await classroom.fetchClassroomData();
      if (!context.mounted) return;
      if (classroom.subjects.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text("No subjects available. Add a subject first.")),
        );
        return;
      }
    }

    final subjects = classroom.subjects;
    SubjectModel selectedSubject = subjects.first;
    SectionModel? selectedSection = selectedSubject.sections.isNotEmpty
        ? selectedSubject.sections.first
        : null;
    bool isStarting = false;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final sections = selectedSubject.sections;

            return AnimatedPadding(
              duration: const Duration(milliseconds: 180),
              curve: Curves.easeOut,
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
              ),
              child: FractionallySizedBox(
                widthFactor: 1,
                child: Container(
                  decoration: BoxDecoration(
                    color: Theme.of(context).scaffoldBackgroundColor,
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(28)),
                  ),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      maxHeight: MediaQuery.of(context).size.height * 0.88,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 10),
                        Center(
                          child: Container(
                            width: 46,
                            height: 5,
                            decoration: BoxDecoration(
                              color: Theme.of(context).dividerColor,
                              borderRadius: BorderRadius.circular(999),
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
                          child: Text(
                            "Start Session",
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                          child: Text(
                            "Choose a subject and section to begin monitoring.",
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ),
                        Expanded(
                          child: SingleChildScrollView(
                            padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "Subject",
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleSmall
                                      ?.copyWith(fontWeight: FontWeight.w700),
                                ),
                                const SizedBox(height: 10),
                                SizedBox(
                                  height: 42,
                                  child: ListView.separated(
                                    scrollDirection: Axis.horizontal,
                                    itemCount: subjects.length,
                                    separatorBuilder: (_, __) =>
                                        const SizedBox(width: 8),
                                    itemBuilder: (context, index) {
                                      final subject = subjects[index];
                                      final isSelected =
                                          subject.id == selectedSubject.id;

                                      return ChoiceChip(
                                        label: Text(subject.name),
                                        selected: isSelected,
                                        onSelected: (_) {
                                          setSheetState(() {
                                            selectedSubject = subject;
                                            selectedSection =
                                                subject.sections.isNotEmpty
                                                    ? subject.sections.first
                                                    : null;
                                          });
                                        },
                                      );
                                    },
                                  ),
                                ),
                                const SizedBox(height: 18),
                                Row(
                                  children: [
                                    Text(
                                      "Section",
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleSmall
                                          ?.copyWith(
                                              fontWeight: FontWeight.w700),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: Theme.of(context)
                                            .colorScheme
                                            .primary
                                            .withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Text(
                                        "${sections.length}",
                                        style: TextStyle(
                                          color: Theme.of(context)
                                              .colorScheme
                                              .primary,
                                          fontWeight: FontWeight.w700,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                if (sections.isEmpty)
                                  Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.all(14),
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(14),
                                      color: Theme.of(context)
                                          .colorScheme
                                          .surfaceContainerHighest
                                          .withOpacity(0.45),
                                    ),
                                    child: const Text(
                                      "No sections available for this subject.",
                                    ),
                                  ),
                                ...sections.map(
                                  (section) {
                                    final isSelected =
                                        selectedSection?.id == section.id;
                                    return Padding(
                                      padding:
                                          const EdgeInsets.only(bottom: 10),
                                      child: Material(
                                        color: Colors.transparent,
                                        child: InkWell(
                                          borderRadius:
                                              BorderRadius.circular(14),
                                          onTap: () {
                                            setSheetState(() =>
                                                selectedSection = section);
                                          },
                                          child: Ink(
                                            padding: const EdgeInsets.all(14),
                                            decoration: BoxDecoration(
                                              borderRadius:
                                                  BorderRadius.circular(14),
                                              border: Border.all(
                                                width: isSelected ? 1.6 : 1,
                                                color: isSelected
                                                    ? Theme.of(context)
                                                        .colorScheme
                                                        .primary
                                                    : Theme.of(context)
                                                        .dividerColor
                                                        .withOpacity(0.45),
                                              ),
                                              color: isSelected
                                                  ? Theme.of(context)
                                                      .colorScheme
                                                      .primary
                                                      .withOpacity(0.06)
                                                  : null,
                                            ),
                                            child: Row(
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    section.name,
                                                    style: Theme.of(context)
                                                        .textTheme
                                                        .titleSmall
                                                        ?.copyWith(
                                                          fontWeight:
                                                              FontWeight.w600,
                                                        ),
                                                  ),
                                                ),
                                                Icon(
                                                  isSelected
                                                      ? Icons
                                                          .radio_button_checked_rounded
                                                      : Icons
                                                          .radio_button_off_rounded,
                                                  color: isSelected
                                                      ? Theme.of(context)
                                                          .colorScheme
                                                          .primary
                                                      : Theme.of(context)
                                                          .disabledColor,
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ],
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                          child: SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              style: _startSessionButtonStyle(context),
                              onPressed: selectedSection == null || isStarting
                                  ? null
                                  : () async {
                                      final studentsPresent =
                                          await _askStudentsPresent(context);
                                      if (studentsPresent == null) return;
                                      setSheetState(() => isStarting = true);
                                      final success =
                                          await session.startSession(
                                        selectedSubject.id,
                                        selectedSection!.id,
                                        studentsPresent,
                                      );
                                      if (!context.mounted) return;
                                      Navigator.pop(context);
                                      if (success) {
                                        Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (context) =>
                                                MonitoringScreen(
                                              sessionId:
                                                  session.activeSession!.id,
                                            ),
                                          ),
                                        );
                                      } else {
                                        ScaffoldMessenger.of(context)
                                            .showSnackBar(
                                          SnackBar(
                                              content: Text(
                                                  "Failed to start session: ${session.error}")),
                                        );
                                      }
                                    },
                              icon: isStarting
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2),
                                    )
                                  : const Icon(Icons.play_circle_fill_rounded),
                              label: Text(isStarting
                                  ? "Starting..."
                                  : "Start Monitoring Session"),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  ButtonStyle _startSessionButtonStyle(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF56CC9D) : const Color(0xFF0F7A5C);
    final fg = isDark ? Colors.black : Colors.white;

    return ElevatedButton.styleFrom(
      backgroundColor: bg,
      foregroundColor: fg,
      disabledBackgroundColor: scheme.surfaceContainerHighest,
      disabledForegroundColor: scheme.onSurface.withOpacity(0.55),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
      ),
      elevation: 0,
    );
  }

  void _toggleSessionExpanded(BuildContext context, int sessionId) {
    setState(() {
      _expandedSessionId = _expandedSessionId == sessionId ? null : sessionId;
      if (_expandedSessionId == sessionId &&
          !_sessionMetricsFutures.containsKey(sessionId)) {
        _sessionMetricsFutures[sessionId] =
            context.read<SessionProvider>().fetchSessionMetricsById(sessionId);
      }
    });
  }

  String _formatSessionDuration(SessionSummaryModel item) {
    final end = item.endTime ?? DateTime.now();
    final duration = end.difference(item.startTime);
    if (duration.inMinutes < 1) return "${duration.inSeconds}s";
    if (duration.inHours < 1) return "${duration.inMinutes}m";
    final hours = duration.inHours;
    final mins = duration.inMinutes.remainder(60);
    return "${hours}h ${mins}m";
  }

  List<SessionSummaryModel> _applyHistoryFilters(
      List<SessionSummaryModel> source) {
    var items = [...source];
    if (_historyQuery.trim().isNotEmpty) {
      final q = _historyQuery.trim().toLowerCase();
      items = items
          .where(
            (s) =>
                s.subjectName.toLowerCase().contains(q) ||
                s.sectionName.toLowerCase().contains(q),
          )
          .toList();
    }
    if (_historySubjectFilter != null && _historySubjectFilter!.isNotEmpty) {
      items =
          items.where((s) => s.subjectName == _historySubjectFilter).toList();
    }
    if (_historySectionFilter != null && _historySectionFilter!.isNotEmpty) {
      items =
          items.where((s) => s.sectionName == _historySectionFilter).toList();
    }
    items = items
        .where((s) => s.averageEngagement >= _historyMinEngagement)
        .toList();
    if (_historyDateRange != null) {
      final start = DateTime(
        _historyDateRange!.start.year,
        _historyDateRange!.start.month,
        _historyDateRange!.start.day,
      );
      final end = DateTime(
        _historyDateRange!.end.year,
        _historyDateRange!.end.month,
        _historyDateRange!.end.day,
        23,
        59,
        59,
      );
      items = items
          .where(
              (s) => !s.startTime.isBefore(start) && !s.startTime.isAfter(end))
          .toList();
    }

    switch (_historySort) {
      case 'oldest':
        items.sort((a, b) => a.startTime.compareTo(b.startTime));
        break;
      case 'engagement_high':
        items
            .sort((a, b) => b.averageEngagement.compareTo(a.averageEngagement));
        break;
      case 'engagement_low':
        items
            .sort((a, b) => a.averageEngagement.compareTo(b.averageEngagement));
        break;
      default:
        items.sort((a, b) => b.startTime.compareTo(a.startTime));
    }
    return items;
  }

  Future<void> _copyExportText(
      BuildContext context, String label, String text) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text("$label copied to clipboard")),
    );
  }

  String _bulkSessionsCsv(List<SessionSummaryModel> sessions) {
    final rows = <String>[
      'session_id,subject,section,start_time,end_time,duration_minutes,engagement'
    ];
    for (final s in sessions) {
      final end = s.endTime;
      final duration = end == null ? 0 : end.difference(s.startTime).inMinutes;
      rows.add(
        '${s.id},"${s.subjectName}","${s.sectionName}","${s.startTime.toIso8601String()}","${end?.toIso8601String() ?? ''}",$duration,${s.averageEngagement.toStringAsFixed(2)}',
      );
    }
    return rows.join('\n');
  }

  String _bulkSummaryReport(List<SessionSummaryModel> sessions) {
    if (sessions.isEmpty) return 'No sessions available.';
    final avg =
        sessions.map((e) => e.averageEngagement).reduce((a, b) => a + b) /
            sessions.length;
    final best = sessions
        .reduce((a, b) => a.averageEngagement > b.averageEngagement ? a : b);
    return 'Session Summary\n'
        'Total Sessions: ${sessions.length}\n'
        'Average Engagement: ${avg.toStringAsFixed(1)}%\n'
        'Best Session: ${best.subjectName} - ${best.sectionName} (${best.averageEngagement.toStringAsFixed(1)}%)';
  }

  Future<void> _selectHistoryDateRange(BuildContext context) async {
    final now = DateTime.now();
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year - 2),
      lastDate: DateTime(now.year + 1),
      initialDateRange: _draftHistoryDateRange,
      helpText: 'Select Date Range',
      saveText: 'OK',
      builder: (context, child) {
        final theme = Theme.of(context);
        return Theme(
          data: theme.copyWith(
            dialogTheme: DialogThemeData(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
            ),
          ),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
    if (picked != null) {
      setState(() => _draftHistoryDateRange = picked);
    }
  }

  void _toggleHistoryFilters() {
    setState(() {
      if (!_historyFiltersOpen) {
        _draftHistoryQuery = _historyQuery;
        _draftHistorySort = _historySort;
        _draftHistorySubjectFilter = _historySubjectFilter;
        _draftHistorySectionFilter = _historySectionFilter;
        _draftHistoryMinEngagement = _historyMinEngagement;
        _draftHistoryDateRange = _historyDateRange;
      }
      _historyFiltersOpen = !_historyFiltersOpen;
    });
  }

  void _closeHistoryFilters() {
    if (_historyFiltersOpen) {
      setState(() => _historyFiltersOpen = false);
    }
  }

  Future<void> _applyHistoryFiltersAndFetch(SessionProvider session) async {
    setState(() {
      _historyQuery = _draftHistoryQuery;
      _historySort = _draftHistorySort;
      _historySubjectFilter = _draftHistorySubjectFilter;
      _historySectionFilter = _draftHistorySectionFilter;
      _historyMinEngagement = _draftHistoryMinEngagement;
      _historyDateRange = _draftHistoryDateRange;
      _historyFiltersApplied = true;
      _historyFiltersOpen = false;
    });
    await session.fetchSessionHistory(includeActive: false);
  }

  Future<void> _exportFilteredResults(
    BuildContext context,
    List<SessionSummaryModel> sessions,
    String format,
  ) async {
    if (_isExportingHistory) return;
    setState(() => _isExportingHistory = true);
    await Future<void>.delayed(const Duration(milliseconds: 350));
    if (format == 'csv') {
      await _copyExportText(context, "CSV export", _bulkSessionsCsv(sessions));
    } else if (format == 'pdf') {
      await _copyExportText(
          context, "PDF export", _bulkSummaryReport(sessions));
    } else if (format == 'json') {
      await _copyExportText(
          context, "JSON export", _bulkSessionsJson(sessions));
    } else {
      await _copyExportText(
          context, "Text export", _bulkSummaryReport(sessions));
    }
    if (!mounted) return;
    setState(() => _isExportingHistory = false);
  }

  String _bulkSessionsJson(List<SessionSummaryModel> sessions) {
    final rows = sessions
        .map((s) => {
              'session_id': s.id,
              'subject': s.subjectName,
              'section': s.sectionName,
              'start_time': s.startTime.toIso8601String(),
              'end_time': s.endTime?.toIso8601String(),
              'duration_minutes':
                  (s.endTime ?? s.startTime).difference(s.startTime).inMinutes,
              'engagement':
                  double.parse(s.averageEngagement.toStringAsFixed(2)),
            })
        .toList();
    return const JsonEncoder.withIndent('  ').convert(rows);
  }

  Widget _buildRecentSessionsPanel(
    BuildContext context,
    List<SessionSummaryModel> recentSessions,
    List<SessionSummaryModel> allSessions,
    SessionProvider session,
  ) {
    final theme = Theme.of(context);
    final compactOutlinedButtonStyle = OutlinedButton.styleFrom(
      minimumSize: const Size(0, 32),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      textStyle: theme.textTheme.labelMedium?.copyWith(
        fontWeight: FontWeight.w600,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(9),
      ),
    );
    final compactElevatedButtonStyle = ElevatedButton.styleFrom(
      minimumSize: const Size(0, 32),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      textStyle: theme.textTheme.labelMedium?.copyWith(
        fontWeight: FontWeight.w600,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(9),
      ),
    );
    final uniqueSubjects =
        allSessions.map((s) => s.subjectName).toSet().toList()..sort();
    final uniqueSections =
        allSessions.map((s) => s.sectionName).toSet().toList()..sort();
    final hasOverflow = recentSessions.length > 3;
    final viewportHeight =
        MediaQuery.of(context).size.width < 420 ? 300.0 : 324.0;
    final showThirdHintFade = hasOverflow && _showRecentSessionsThirdHintFade;
    final showBottomFade = hasOverflow && _showRecentSessionsBottomFade;
    final avgEngagement = recentSessions.isEmpty
        ? 0.0
        : recentSessions
                .map((e) => e.averageEngagement)
                .reduce((a, b) => a + b) /
            recentSessions.length;
    final bestSession = recentSessions.isEmpty
        ? null
        : recentSessions.reduce(
            (a, b) => a.averageEngagement > b.averageEngagement ? a : b);

    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
        child: TapRegion(
          onTapOutside: (_) => _closeHistoryFilters(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.history_rounded, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "Recent Sessions",
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (_historyFiltersOpen)
                    IconButton(
                      tooltip: 'Close filters',
                      alignment: Alignment.centerRight,
                      padding: EdgeInsets.zero,
                      constraints:
                          const BoxConstraints(minWidth: 24, minHeight: 24),
                      visualDensity:
                          const VisualDensity(horizontal: -4, vertical: -4),
                      iconSize: 18,
                      onPressed: _closeHistoryFilters,
                      icon: const Icon(Icons.close_rounded),
                    )
                  else
                    Flexible(
                      child: Wrap(
                        alignment: WrapAlignment.end,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 8,
                        runSpacing: 6,
                        children: [
                          IconButton(
                            tooltip: 'Filter',
                            onPressed: _toggleHistoryFilters,
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(
                                minWidth: 24, minHeight: 24),
                            visualDensity: const VisualDensity(
                                horizontal: -4, vertical: -4),
                            icon:
                                const Icon(Icons.filter_alt_outlined, size: 18),
                          ),
                          PopupMenuButton<String>(
                            tooltip: 'Export',
                            onSelected: (value) => _exportFilteredResults(
                                context, recentSessions, value),
                            itemBuilder: (_) => const [
                              PopupMenuItem(value: 'csv', child: Text('CSV')),
                              PopupMenuItem(value: 'pdf', child: Text('PDF')),
                              PopupMenuItem(value: 'json', child: Text('JSON')),
                              PopupMenuItem(value: 'txt', child: Text('TXT')),
                            ],
                            child:
                                const Icon(Icons.ios_share_rounded, size: 18),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(999),
                              color:
                                  theme.colorScheme.primary.withOpacity(0.08),
                            ),
                            child: Text(
                              "${recentSessions.length} sessions",
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: theme.colorScheme.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              AnimatedSize(
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeInOut,
                child: _historyFiltersOpen
                    ? Container(
                        margin: const EdgeInsets.only(top: 4, bottom: 8),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: theme.dividerColor.withOpacity(0.4)),
                          color: theme.colorScheme.surface,
                        ),
                        child: Column(
                          children: [
                            Align(
                              alignment: Alignment.centerLeft,
                              child: Text(
                                'Filters',
                                style: theme.textTheme.labelMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    onChanged: (value) => setState(
                                        () => _draftHistoryQuery = value),
                                    style: theme.textTheme.bodyMedium?.copyWith(
                                      fontSize: 13,
                                    ),
                                    decoration: InputDecoration(
                                      hintText: "Search",
                                      prefixIcon: const Icon(
                                          Icons.search_rounded,
                                          size: 18),
                                      isDense: true,
                                      constraints:
                                          const BoxConstraints(minHeight: 36),
                                      contentPadding:
                                          const EdgeInsets.symmetric(
                                              horizontal: 8, vertical: 8),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      enabledBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: BorderSide(
                                          color: theme.dividerColor
                                              .withOpacity(0.45),
                                        ),
                                      ),
                                      focusedBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: BorderSide(
                                          color: theme.colorScheme.primary,
                                        ),
                                      ),
                                      suffixIcon: _draftHistoryQuery.isEmpty
                                          ? null
                                          : IconButton(
                                              onPressed: () => setState(() =>
                                                  _draftHistoryQuery = ''),
                                              icon: const Icon(
                                                Icons.close_rounded,
                                                size: 16,
                                              ),
                                            ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                PopupMenuButton<String>(
                                  tooltip: 'Sort',
                                  onSelected: (value) =>
                                      setState(() => _draftHistorySort = value),
                                  itemBuilder: (context) => const [
                                    PopupMenuItem(
                                        value: 'newest', child: Text('Newest')),
                                    PopupMenuItem(
                                        value: 'oldest', child: Text('Oldest')),
                                    PopupMenuItem(
                                        value: 'engagement_high',
                                        child: Text('Engagement High')),
                                    PopupMenuItem(
                                        value: 'engagement_low',
                                        child: Text('Engagement Low')),
                                  ],
                                  child: Container(
                                    width: 36,
                                    height: 36,
                                    decoration: BoxDecoration(
                                      border: Border.all(
                                        color: theme.dividerColor
                                            .withOpacity(0.45),
                                      ),
                                      borderRadius: BorderRadius.circular(9),
                                    ),
                                    child: Icon(
                                      Icons.sort_rounded,
                                      size: 18,
                                      color: theme.textTheme.bodyMedium?.color,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                GestureDetector(
                                  onTap: () => _selectHistoryDateRange(context),
                                  child: Container(
                                    width: 36,
                                    height: 36,
                                    decoration: BoxDecoration(
                                      border: Border.all(
                                        color: _draftHistoryDateRange == null
                                            ? theme.dividerColor
                                                .withOpacity(0.45)
                                            : theme.colorScheme.primary,
                                      ),
                                      borderRadius: BorderRadius.circular(9),
                                    ),
                                    child: Icon(
                                      Icons.date_range_outlined,
                                      size: 17,
                                      color: _draftHistoryDateRange == null
                                          ? theme.textTheme.bodyMedium?.color
                                          : theme.colorScheme.primary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            LayoutBuilder(
                              builder: (context, constraints) {
                                final useTwoColumns =
                                    constraints.maxWidth >= 260;
                                final subjectField =
                                    DropdownButtonFormField<String>(
                                  value: _draftHistorySubjectFilter,
                                  isDense: true,
                                  isExpanded: true,
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    fontSize: 13,
                                  ),
                                  decoration: const InputDecoration(
                                    labelText: "Subject",
                                    isDense: true,
                                    constraints: BoxConstraints(minHeight: 38),
                                    contentPadding: EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 8,
                                    ),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.all(
                                        Radius.circular(8),
                                      ),
                                    ),
                                  ),
                                  items: [
                                    const DropdownMenuItem(
                                        value: null, child: Text('All')),
                                    ...uniqueSubjects.map(
                                      (s) => DropdownMenuItem(
                                          value: s, child: Text(s)),
                                    ),
                                  ],
                                  onChanged: (v) => setState(
                                      () => _draftHistorySubjectFilter = v),
                                );
                                final sectionField = ConstrainedBox(
                                  constraints:
                                      const BoxConstraints(maxWidth: 260),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 36,
                                        height: 36,
                                        decoration: BoxDecoration(
                                          border: Border.all(
                                            color: theme.dividerColor
                                                .withOpacity(0.45),
                                          ),
                                          borderRadius:
                                              BorderRadius.circular(8),
                                        ),
                                        child: Icon(
                                          Icons.groups_2_outlined,
                                          size: 17,
                                          color:
                                              theme.textTheme.bodyMedium?.color,
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: DropdownButtonFormField<String>(
                                          value: _draftHistorySectionFilter,
                                          isDense: true,
                                          isExpanded: true,
                                          style: theme.textTheme.bodyMedium
                                              ?.copyWith(
                                            fontSize: 13,
                                          ),
                                          decoration: const InputDecoration(
                                            labelText: "Section",
                                            isDense: true,
                                            constraints:
                                                BoxConstraints(minHeight: 38),
                                            contentPadding:
                                                EdgeInsets.symmetric(
                                              horizontal: 10,
                                              vertical: 8,
                                            ),
                                            border: OutlineInputBorder(
                                              borderRadius: BorderRadius.all(
                                                Radius.circular(8),
                                              ),
                                            ),
                                          ),
                                          items: [
                                            const DropdownMenuItem(
                                                value: null,
                                                child: Text('All')),
                                            ...uniqueSections.map(
                                              (s) => DropdownMenuItem(
                                                  value: s, child: Text(s)),
                                            ),
                                          ],
                                          onChanged: (v) => setState(() =>
                                              _draftHistorySectionFilter = v),
                                        ),
                                      ),
                                    ],
                                  ),
                                );

                                if (!useTwoColumns) {
                                  return Column(
                                    children: [
                                      subjectField,
                                      const SizedBox(height: 6),
                                      sectionField,
                                    ],
                                  );
                                }

                                return Row(
                                  children: [
                                    Expanded(child: subjectField),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: Align(
                                        alignment: Alignment.centerLeft,
                                        child: sectionField,
                                      ),
                                    ),
                                  ],
                                );
                              },
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Min Engagement ${_draftHistoryMinEngagement.toStringAsFixed(0)}%',
                              style: theme.textTheme.labelSmall,
                            ),
                            Slider(
                              value: _draftHistoryMinEngagement,
                              min: 0,
                              max: 100,
                              divisions: 20,
                              onChanged: (v) => setState(
                                  () => _draftHistoryMinEngagement = v),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton(
                                    style: compactOutlinedButtonStyle,
                                    onPressed: () {
                                      setState(() {
                                        _draftHistoryQuery = '';
                                        _draftHistorySort = 'newest';
                                        _draftHistorySubjectFilter = null;
                                        _draftHistorySectionFilter = null;
                                        _draftHistoryMinEngagement = 0;
                                        _draftHistoryDateRange = null;
                                      });
                                    },
                                    child: const Text('Reset'),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: ElevatedButton(
                                    style: compactElevatedButtonStyle,
                                    onPressed: () =>
                                        _applyHistoryFiltersAndFetch(session),
                                    child: const Text('Apply'),
                                  ),
                                ),
                              ],
                            ),
                            if (_isExportingHistory) ...[
                              const SizedBox(height: 6),
                              const Align(
                                alignment: Alignment.centerLeft,
                                child: SizedBox(
                                  width: 16,
                                  height: 16,
                                  child:
                                      CircularProgressIndicator(strokeWidth: 2),
                                ),
                              ),
                            ],
                          ],
                        ),
                      )
                    : const SizedBox.shrink(),
              ),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest
                      .withOpacity(0.5),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: _sessionSummaryChip(
                          context, "Avg ${avgEngagement.toStringAsFixed(1)}%"),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _sessionSummaryChip(context,
                          "Best ${bestSession?.averageEngagement.toStringAsFixed(1) ?? '0'}%"),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _sessionSummaryChip(
                          context, "Total ${recentSessions.length}"),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              if (recentSessions.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    "No sessions match current filters.",
                    style: theme.textTheme.bodyMedium,
                  ),
                )
              else
                SizedBox(
                  height: viewportHeight,
                  child: Stack(
                    children: [
                      ScrollConfiguration(
                        behavior: ScrollConfiguration.of(context)
                            .copyWith(scrollbars: false, overscroll: false),
                        child: ListView.separated(
                          controller: _recentSessionsScrollController,
                          primary: false,
                          padding: const EdgeInsets.only(top: 2, bottom: 12),
                          physics: const BouncingScrollPhysics(
                            parent: AlwaysScrollableScrollPhysics(),
                          ),
                          itemCount: recentSessions.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final item = recentSessions[index];
                            final isExpanded = _expandedSessionId == item.id;
                            final scoreColor = _engagementColor(
                                context, item.averageEngagement);
                            final opacity =
                                showThirdHintFade && index == 2 ? 0.62 : 1.0;

                            return AnimatedOpacity(
                              duration: const Duration(milliseconds: 260),
                              curve: Curves.easeInOut,
                              opacity: opacity,
                              child: Container(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: theme.dividerColor.withOpacity(0.45),
                                  ),
                                ),
                                child: Column(
                                  children: [
                                    InkWell(
                                      borderRadius: BorderRadius.circular(12),
                                      onTap: () => _toggleSessionExpanded(
                                          context, item.id),
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 12,
                                          vertical: 11,
                                        ),
                                        child: Row(
                                          children: [
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    item.subjectName,
                                                    maxLines: 1,
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                    style: theme
                                                        .textTheme.titleSmall
                                                        ?.copyWith(
                                                      fontWeight:
                                                          FontWeight.w700,
                                                    ),
                                                  ),
                                                  const SizedBox(height: 8),
                                                  Wrap(
                                                    spacing: 6,
                                                    runSpacing: 6,
                                                    children: [
                                                      _sessionSummaryChip(
                                                        context,
                                                        "Date ${_sessionDateFormat.format(item.startTime)}",
                                                      ),
                                                      _sessionSummaryChip(
                                                        context,
                                                        "Section ${item.sectionName}",
                                                      ),
                                                      _sessionSummaryChip(
                                                        context,
                                                        "Duration ${_formatSessionDuration(item)}",
                                                      ),
                                                      _sessionSummaryChip(
                                                        context,
                                                        "Engagement ${item.averageEngagement.toStringAsFixed(0)}%",
                                                        textColor: scoreColor,
                                                      ),
                                                    ],
                                                  ),
                                                ],
                                              ),
                                            ),
                                            const SizedBox(width: 10),
                                            AnimatedRotation(
                                              turns: isExpanded ? 0.5 : 0,
                                              duration: const Duration(
                                                  milliseconds: 320),
                                              curve: Curves.easeInOut,
                                              child: Icon(
                                                Icons
                                                    .keyboard_arrow_down_rounded,
                                                color: theme.textTheme
                                                    .bodyMedium?.color,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                    ClipRect(
                                      child: AnimatedSize(
                                        duration:
                                            const Duration(milliseconds: 340),
                                        curve: Curves.easeInOut,
                                        child: isExpanded
                                            ? Padding(
                                                padding:
                                                    const EdgeInsets.fromLTRB(
                                                        12, 0, 12, 12),
                                                child:
                                                    _buildExpandedSessionAnalytics(
                                                  context,
                                                  item,
                                                ),
                                              )
                                            : const SizedBox.shrink(),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      if (showBottomFade)
                        Positioned(
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: 56,
                          child: IgnorePointer(
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [
                                    theme.cardColor.withOpacity(0),
                                    theme.cardColor.withOpacity(0.92),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sessionSummaryChip(
    BuildContext context,
    String text, {
    Color? textColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
      ),
      child: Text(
        text,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
      ),
    );
  }

  String _sessionInsight(SessionMetricsModel metrics) {
    if (metrics.recentLogs.length < 2) return 'Collecting trend insights...';
    final logs = [...metrics.recentLogs]
      ..sort((a, b) => a.timestamp.compareTo(b.timestamp));
    int phoneSpikes = 0;
    int sleepingSpikes = 0;
    for (int i = 1; i < logs.length; i++) {
      if ((logs[i].usingPhone - logs[i - 1].usingPhone) >= 2) phoneSpikes++;
      if ((logs[i].sleeping - logs[i - 1].sleeping) >= 2) sleepingSpikes++;
    }
    if (phoneSpikes == 0 && sleepingSpikes == 0) {
      return 'Stable behavior trend with no major spikes detected.';
    }
    return 'Detected spikes: phone $phoneSpikes, sleeping $sleepingSpikes.';
  }

  String _sessionDetailCsv(
      SessionSummaryModel session, SessionMetricsModel metrics) {
    final rows = <String>[
      'session_id,subject,section,timestamp,on_task,writing,disengaged,sleeping,phone'
    ];
    for (final log in metrics.recentLogs) {
      rows.add(
          '${session.id},"${session.subjectName}","${session.sectionName}","${log.timestamp.toIso8601String()}",${log.onTask},${log.writing},${log.disengagedPosture},${log.sleeping},${log.usingPhone}');
    }
    return rows.join('\n');
  }

  Widget _buildExpandedSessionAnalytics(
    BuildContext context,
    SessionSummaryModel item,
  ) {
    final future = _sessionMetricsFutures[item.id] ??=
        context.read<SessionProvider>().fetchSessionMetricsById(item.id);

    return FutureBuilder<SessionMetricsModel>(
      future: future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting &&
            !snapshot.hasData) {
          return const SizedBox(
            height: 170,
            child: Center(
              child: CircularProgressIndicator(strokeWidth: 2.3),
            ),
          );
        }

        if (snapshot.hasError) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    "Failed to load session analytics.",
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: () {
                    setState(() {
                      _sessionMetricsFutures[item.id] = context
                          .read<SessionProvider>()
                          .fetchSessionMetricsById(item.id, forceRefresh: true);
                    });
                  },
                  child: const Text("Retry"),
                ),
              ],
            ),
          );
        }

        final metrics = snapshot.data;
        if (metrics == null || metrics.recentLogs.isEmpty) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(
              "No timeline data available for this session.",
              style: Theme.of(context).textTheme.bodySmall,
            ),
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _copyExportText(
                      context,
                      "Session CSV",
                      _sessionDetailCsv(item, metrics),
                    ),
                    icon: const Icon(Icons.table_chart_rounded, size: 16),
                    label: const Text("Export CSV"),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _copyExportText(
                      context,
                      "Session report",
                      _sessionInsight(metrics),
                    ),
                    icon: const Icon(Icons.description_outlined, size: 16),
                    label: const Text("Export Report"),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _sessionInsight(metrics),
              style: Theme.of(context).textTheme.bodySmall,
            ),
            _buildSessionTimelineChart(context, metrics),
          ],
        );
      },
    );
  }

  Widget _buildSessionTimelineChart(
      BuildContext context, SessionMetricsModel metrics) {
    final theme = Theme.of(context);
    final logs = [...metrics.recentLogs]
      ..sort((a, b) => a.timestamp.compareTo(b.timestamp));
    final onTaskColor = const Color(0xFF2E7D32);
    final writingColor = const Color(0xFF1565C0);
    final disengagedColor = const Color(0xFF6A1B9A);
    final sleepingColor = const Color(0xFFD32F2F);
    final phoneColor = const Color(0xFFF57C00);

    final onTaskPoints = logs
        .map((log) => FlSpot(
              log.timestamp.millisecondsSinceEpoch.toDouble(),
              log.onTask.toDouble(),
            ))
        .toList();
    final writingPoints = logs
        .map((log) => FlSpot(
              log.timestamp.millisecondsSinceEpoch.toDouble(),
              log.writing.toDouble(),
            ))
        .toList();
    final disengagedPoints = logs
        .map((log) => FlSpot(
              log.timestamp.millisecondsSinceEpoch.toDouble(),
              log.disengagedPosture.toDouble(),
            ))
        .toList();
    final sleepingPoints = logs
        .map((log) => FlSpot(
              log.timestamp.millisecondsSinceEpoch.toDouble(),
              log.sleeping.toDouble(),
            ))
        .toList();
    final phonePoints = logs
        .map((log) => FlSpot(
              log.timestamp.millisecondsSinceEpoch.toDouble(),
              log.usingPhone.toDouble(),
            ))
        .toList();

    final minX = onTaskPoints.first.x;
    final maxRawX = onTaskPoints.last.x;
    final maxX = maxRawX == minX ? minX + 1 : maxRawX;
    final centerX = minX + ((maxX - minX) / 2);
    final allValues = [
      ...onTaskPoints.map((p) => p.y),
      ...writingPoints.map((p) => p.y),
      ...disengagedPoints.map((p) => p.y),
      ...sleepingPoints.map((p) => p.y),
      ...phonePoints.map((p) => p.y),
    ];
    final maxYValue = allValues.reduce((a, b) => a > b ? a : b);
    final maxY = maxYValue < 3 ? 3.0 : maxYValue + 1;
    final isCompact = MediaQuery.of(context).size.width < 460;
    final phoneSpikeIndexes = <int>{};
    final sleepingSpikeIndexes = <int>{};
    for (int i = 1; i < logs.length; i++) {
      if ((logs[i].usingPhone - logs[i - 1].usingPhone) >= 2) {
        phoneSpikeIndexes.add(i);
      }
      if ((logs[i].sleeping - logs[i - 1].sleeping) >= 2) {
        sleepingSpikeIndexes.add(i);
      }
    }

    LineChartBarData behaviorBar(
      List<FlSpot> spots,
      Color color, {
      Set<int> highlightIndexes = const {},
    }) {
      return LineChartBarData(
        spots: spots,
        isCurved: true,
        color: color,
        barWidth: 2,
        isStrokeCapRound: true,
        dotData: FlDotData(
          show: highlightIndexes.isNotEmpty,
          checkToShowDot: (_, index) => highlightIndexes.contains(index),
          getDotPainter: (spot, percent, barData, index) => FlDotCirclePainter(
            radius: 3,
            color: color,
            strokeWidth: 1.3,
            strokeColor: theme.colorScheme.surface,
          ),
        ),
        belowBarData: BarAreaData(show: false),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 4),
        Text(
          "Behavior Timeline",
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          "Hover over the timeline for exact date, time, and values.",
          style: theme.textTheme.bodySmall,
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _sessionSummaryChip(context, "On Task", textColor: onTaskColor),
            _sessionSummaryChip(context, "Writing", textColor: writingColor),
            _sessionSummaryChip(context, "Disengaged",
                textColor: disengagedColor),
            _sessionSummaryChip(context, "Sleeping", textColor: sleepingColor),
            _sessionSummaryChip(context, "Phone", textColor: phoneColor),
          ],
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: isCompact ? 180 : 220,
          child: LineChart(
            LineChartData(
              minX: minX,
              maxX: maxX,
              minY: 0,
              maxY: maxY,
              gridData: const FlGridData(show: false),
              borderData: FlBorderData(
                show: true,
                border: Border(
                  left: BorderSide(color: theme.dividerColor, width: 1),
                  bottom: BorderSide(color: theme.dividerColor, width: 1),
                ),
              ),
              titlesData: FlTitlesData(
                topTitles:
                    const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles:
                    const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 28,
                    interval: 1,
                    getTitlesWidget: (value, meta) => Text(
                      value.toStringAsFixed(0),
                      style: theme.textTheme.labelSmall,
                    ),
                  ),
                ),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 28,
                    getTitlesWidget: (value, meta) {
                      final tolerance = (maxX - minX) * 0.03;
                      if ((value - minX).abs() > tolerance &&
                          (value - centerX).abs() > tolerance &&
                          (value - maxX).abs() > tolerance) {
                        return const SizedBox.shrink();
                      }

                      final timestamp = (value - centerX).abs() <= tolerance
                          ? centerX
                          : (value - minX).abs() <= tolerance
                              ? minX
                              : maxX;
                      final time = DateTime.fromMillisecondsSinceEpoch(
                          timestamp.toInt());

                      return Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(
                          DateFormat('HH:mm').format(time),
                          style: theme.textTheme.labelSmall,
                        ),
                      );
                    },
                  ),
                ),
              ),
              lineTouchData: LineTouchData(
                enabled: true,
                handleBuiltInTouches: true,
                getTouchedSpotIndicator: (barData, spotIndexes) {
                  final isPrimaryIndicator = barData.color == onTaskColor;
                  return spotIndexes
                      .map(
                        (_) => TouchedSpotIndicatorData(
                          FlLine(
                            color: isPrimaryIndicator
                                ? onTaskColor.withOpacity(0.38)
                                : Colors.transparent,
                            strokeWidth: isPrimaryIndicator ? 1 : 0,
                          ),
                          FlDotData(
                            show: true,
                            getDotPainter: (spot, percent, bar, index) =>
                                FlDotCirclePainter(
                              radius: 2.8,
                              color: bar.color ?? theme.colorScheme.primary,
                              strokeWidth: 1.2,
                              strokeColor: theme.colorScheme.surface,
                            ),
                          ),
                        ),
                      )
                      .toList();
                },
                touchTooltipData: LineTouchTooltipData(
                  tooltipBgColor: theme.colorScheme.surface.withOpacity(0.95),
                  fitInsideHorizontally: true,
                  fitInsideVertically: true,
                  getTooltipItems: (items) {
                    final sorted = [...items]
                      ..sort((a, b) => a.barIndex.compareTo(b.barIndex));
                    return sorted.map((spot) {
                      final logIndex = spot.spotIndex.clamp(0, logs.length - 1);
                      final log = logs[logIndex];
                      String metricLine;
                      if (spot.barIndex == 0) {
                        metricLine = "On Task ${log.onTask}";
                      } else if (spot.barIndex == 1) {
                        metricLine = "Writing ${log.writing}";
                      } else if (spot.barIndex == 2) {
                        metricLine = "Disengaged ${log.disengagedPosture}";
                      } else if (spot.barIndex == 3) {
                        metricLine = "Sleeping ${log.sleeping}";
                      } else {
                        metricLine = "Phone ${log.usingPhone}";
                      }
                      final showTimestamp = spot.barIndex == 0;
                      return LineTooltipItem(
                        "${showTimestamp ? "${_tooltipDateFormat.format(log.timestamp)}\n${_tooltipTimeFormat.format(log.timestamp)}\n" : ""}$metricLine",
                        theme.textTheme.bodySmall!.copyWith(
                          fontWeight: FontWeight.w600,
                          color: spot.bar.color ?? theme.colorScheme.onSurface,
                        ),
                      );
                    }).toList();
                  },
                ),
              ),
              lineBarsData: [
                behaviorBar(onTaskPoints, onTaskColor),
                behaviorBar(writingPoints, writingColor),
                behaviorBar(disengagedPoints, disengagedColor),
                behaviorBar(
                  sleepingPoints,
                  sleepingColor,
                  highlightIndexes: sleepingSpikeIndexes,
                ),
                behaviorBar(
                  phonePoints,
                  phoneColor,
                  highlightIndexes: phoneSpikeIndexes,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Color _engagementColor(BuildContext context, double value) {
    if (value >= 70) return const Color(0xFF2E7D32);
    if (value >= 40) return const Color(0xFFF57C00);
    return Theme.of(context).colorScheme.error;
  }

  Widget _buildMetricsSummary(
      BuildContext context, SessionMetricsModel? metrics) {
    final theme = Theme.of(context);
    if (metrics == null) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              const SizedBox(
                height: 28,
                width: 28,
                child: CircularProgressIndicator(strokeWidth: 2.4),
              ),
              const SizedBox(width: 16),
              Text(
                "Loading engagement metrics...",
                style: theme.textTheme.bodyMedium,
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Expanded(
              child: _MetricTile(
                title: "Avg Engagement",
                value: "${metrics.averageEngagement.toStringAsFixed(1)}%",
                icon: Icons.insights_rounded,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _MetricTile(
                title: "Logs",
                value: metrics.totalLogs.toString(),
                icon: Icons.timeline_rounded,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEngagementChart(
      BuildContext context, SessionMetricsModel? metrics) {
    if (metrics == null || metrics.recentLogs.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Engagement Trend",
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              Text(
                "No engagement data yet. Metrics will appear once logs start streaming.",
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      );
    }

    final values = metrics.recentLogs.map((log) {
      final denominator =
          metrics.studentsPresent <= 0 ? 1 : metrics.studentsPresent;
      final rawScore = (1.0 * log.onTask) +
          (0.8 * log.writing) -
          (1.2 * log.usingPhone) -
          (1.5 * log.sleeping) -
          (1.0 * log.disengagedPosture);
      final score = (rawScore / denominator) * 100;
      if (score < 0) return 0.0;
      if (score > 100) return 100.0;
      return score;
    }).toList();

    if (values.every((value) => value == 0)) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Engagement Trend",
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              Text(
                "No engagement detected yet. Start the detector to see live activity.",
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Engagement Trend",
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 120,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: values.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final value = values[index];
                  final height = (value / 100) * 110;
                  final adjustedHeight = height < 6 && value > 0 ? 6.0 : height;
                  return Align(
                    alignment: Alignment.bottomCenter,
                    child: Container(
                      width: 12,
                      height: adjustedHeight,
                      decoration: BoxDecoration(
                        color: Theme.of(context)
                            .colorScheme
                            .primary
                            .withOpacity(0.8),
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
            Text(
              "Showing the last ${values.length} samples",
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAlertsPreview(
      BuildContext context, SessionMetricsModel? metrics) {
    final alerts = metrics?.alerts ?? [];
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Alerts",
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            if (alerts.isEmpty)
              Text(
                "No active alerts.",
                style: Theme.of(context).textTheme.bodySmall,
              ),
            if (alerts.isNotEmpty)
              ...alerts.take(3).map((alert) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.warning_rounded,
                          color: Colors.orange.shade600, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          alert.message,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
          ],
        ),
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;

  const _MetricTile({
    required this.title,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 10),
          Text(
            value,
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Profile"),
      ),
      body: const _MeTab(),
    );
  }
}

class _MachineLearningSettingsTab extends StatefulWidget {
  const _MachineLearningSettingsTab();

  @override
  State<_MachineLearningSettingsTab> createState() =>
      _MachineLearningSettingsTabState();
}

class _MachineLearningSettingsTabState
    extends State<_MachineLearningSettingsTab> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SessionProvider>().fetchAvailableModels();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Consumer<SessionProvider>(
        builder: (context, session, child) {
          if (session.modelsLoading && session.availableModels.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (session.modelsError != null && session.availableModels.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline,
                        size: 48, color: Colors.red),
                    const SizedBox(height: 10),
                    Text(
                      session.modelsError ?? 'Failed to load models',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 10),
                    FilledButton(
                      onPressed: () => session.fetchAvailableModels(),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => session.fetchAvailableModels(),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
              children: [
                Text(
                  'Detection Settings',
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(
                  'Choose a model:',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 12),
                if (session.availableModels.isEmpty)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(
                        'No .pt models found in server/ml_engine/weights',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ),
                  ),
                if (session.availableModels.isNotEmpty)
                  Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: Theme.of(context).dividerColor.withOpacity(0.45),
                      ),
                    ),
                    child: Column(
                      children: [
                        for (int i = 0;
                            i < session.availableModels.length;
                            i++) ...[
                          _ModelOptionTile(
                            title: session.availableModels[i].displayName,
                            selected: session.availableModels[i].fileName ==
                                session.currentModelFile,
                            enabled: !session.modelsLoading,
                            onTap: () async {
                              final model = session.availableModels[i];
                              final ok =
                                  await session.selectModel(model.fileName);
                              if (!context.mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    ok
                                        ? 'Model set to ${model.displayName}'
                                        : (session.modelsError ??
                                            'Failed to select model'),
                                  ),
                                ),
                              );
                            },
                          ),
                          if (i != session.availableModels.length - 1)
                            Divider(
                              height: 1,
                              thickness: 1,
                              color: Theme.of(context)
                                  .dividerColor
                                  .withOpacity(0.35),
                            ),
                        ],
                      ],
                    ),
                  ),
                const SizedBox(height: 18),
                Text(
                  'Coming Soon',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                Text(
                  'Planned features for upcoming releases.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 2),
                Text(
                  'TEAM KAGWANG',
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.8,
                      ),
                ),
                const SizedBox(height: 10),
                _ComingSoonFeatureTile(
                  icon: Icons.tune_rounded,
                  title: 'Per-Behavior Weights',
                  description:
                      'Adjust engagement scoring weights from settings.',
                ),
                _ComingSoonFeatureTile(
                  icon: Icons.notifications_active_rounded,
                  title: 'Smart Alert Rules',
                  description:
                      'Custom thresholds, cooldowns, and schedule-based alerts.',
                ),
                _ComingSoonFeatureTile(
                  icon: Icons.file_download_rounded,
                  title: 'Session Export',
                  description:
                      'Export session summaries to PDF and CSV for reports.',
                ),
                const SizedBox(height: 24),
                Center(
                  child: Text(
                    'TEAM KAGWANG@2026',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          letterSpacing: 0.7,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ModelOptionTile extends StatelessWidget {
  final String title;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  const _ModelOptionTile({
    required this.title,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: enabled ? onTap : null,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: selected
                      ? theme.colorScheme.primary
                      : theme.dividerColor.withOpacity(0.7),
                  width: 1.6,
                ),
              ),
              child: selected
                  ? Center(
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary,
                          shape: BoxShape.circle,
                        ),
                      ),
                    )
                  : null,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                ),
              ),
            ),
            if (selected)
              Icon(Icons.check_rounded,
                  size: 18, color: theme.colorScheme.primary),
          ],
        ),
      ),
    );
  }
}

class _ComingSoonFeatureTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const _ComingSoonFeatureTile({
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: Icon(icon, color: theme.colorScheme.primary),
        title: Text(
          title,
          style:
              theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(description),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: theme.colorScheme.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            'Soon',
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.primary,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}

class _MeTab extends StatefulWidget {
  const _MeTab();

  @override
  State<_MeTab> createState() => _MeTabState();
}

class _MeTabState extends State<_MeTab> {
  final ImagePicker _imagePicker = ImagePicker();

  Future<void> _pickProfileImage(
    BuildContext context,
    AuthProvider auth,
    ImageSource source,
  ) async {
    final selected = await _imagePicker.pickImage(
      source: source,
      imageQuality: 85,
      maxWidth: 1200,
    );
    if (selected == null) return;
    await auth.setProfileImagePath(selected.path);
    if (!mounted) return;
    ScaffoldMessenger.of(this.context).showSnackBar(
      const SnackBar(content: Text('Profile photo updated')),
    );
  }

  Future<void> _showProfilePhotoSheet(
      BuildContext context, AuthProvider auth) async {
    await showModalBottomSheet(
      context: context,
      useSafeArea: true,
      builder: (sheetContext) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.photo_library_outlined),
                title: const Text('Choose from gallery'),
                onTap: () async {
                  Navigator.pop(sheetContext);
                  await _pickProfileImage(context, auth, ImageSource.gallery);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_camera_outlined),
                title: const Text('Take a photo'),
                onTap: () async {
                  Navigator.pop(sheetContext);
                  await _pickProfileImage(context, auth, ImageSource.camera);
                },
              ),
              if (auth.profileImagePath != null)
                ListTile(
                  leading: const Icon(Icons.delete_outline, color: Colors.red),
                  title: const Text('Remove photo',
                      style: TextStyle(color: Colors.red)),
                  onTap: () async {
                    Navigator.pop(sheetContext);
                    await auth.clearProfileImagePath();
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _showAccountSettingsMenu(
    BuildContext context,
    AuthProvider auth,
  ) async {
    final action = await showDialog<String>(
      context: context,
      builder: (dialogContext) => SimpleDialog(
        title: const Text('Account Settings'),
        children: [
          SimpleDialogOption(
            onPressed: () => Navigator.pop(dialogContext, 'edit_profile'),
            child: const Text('Edit Profile'),
          ),
          SimpleDialogOption(
            onPressed: () => Navigator.pop(dialogContext, 'change_password'),
            child: const Text('Change Password'),
          ),
        ],
      ),
    );

    if (!mounted) return;
    if (action == 'edit_profile') {
      await _showEditProfileDialog(this.context, auth);
      return;
    }
    if (action == 'change_password') {
      await _showChangePasswordDialog(this.context, auth);
    }
  }

  Future<void> _showEditProfileDialog(
    BuildContext context,
    AuthProvider auth,
  ) async {
    final user = auth.user;
    if (user == null) return;

    final usernameController = TextEditingController(text: user.username);
    final emailController = TextEditingController(text: user.email);
    bool isSavingProfile = false;
    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) {
            return AlertDialog(
              title: const Text('Edit Profile'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: usernameController,
                      decoration: const InputDecoration(labelText: 'Username'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration:
                          const InputDecoration(labelText: 'Email Address'),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSavingProfile
                      ? null
                      : () => Navigator.pop(dialogContext),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: isSavingProfile
                      ? null
                      : () async {
                          final username = usernameController.text.trim();
                          final email = emailController.text.trim();
                          if (username.isEmpty || email.isEmpty) {
                            ScaffoldMessenger.of(this.context).showSnackBar(
                              const SnackBar(
                                content:
                                    Text('Username and email are required'),
                              ),
                            );
                            return;
                          }
                          setDialogState(() => isSavingProfile = true);
                          final success = await auth.updateAccount(
                            username: username,
                            email: email,
                          );
                          if (!mounted) return;
                          setDialogState(() => isSavingProfile = false);
                          if (success && dialogContext.mounted) {
                            Navigator.pop(dialogContext);
                          }
                          ScaffoldMessenger.of(this.context).showSnackBar(
                            SnackBar(
                              content: Text(
                                success
                                    ? 'Account updated'
                                    : (auth.error ??
                                        'Failed to update account'),
                              ),
                            ),
                          );
                        },
                  child: isSavingProfile
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );

    usernameController.dispose();
    emailController.dispose();
  }

  Future<void> _showChangePasswordDialog(
    BuildContext context,
    AuthProvider auth,
  ) async {
    final currentPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    bool isChangingPassword = false;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) {
            return AlertDialog(
              title: const Text('Change Password'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: currentPasswordController,
                      obscureText: true,
                      decoration:
                          const InputDecoration(labelText: 'Current Password'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: newPasswordController,
                      obscureText: true,
                      decoration:
                          const InputDecoration(labelText: 'New Password'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: confirmPasswordController,
                      obscureText: true,
                      decoration:
                          const InputDecoration(labelText: 'Confirm Password'),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isChangingPassword
                      ? null
                      : () => Navigator.pop(dialogContext),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: isChangingPassword
                      ? null
                      : () async {
                          final currentPassword =
                              currentPasswordController.text.trim();
                          final newPassword = newPasswordController.text.trim();
                          final confirmPassword =
                              confirmPasswordController.text.trim();
                          if (currentPassword.isEmpty ||
                              newPassword.isEmpty ||
                              confirmPassword.isEmpty) {
                            ScaffoldMessenger.of(this.context).showSnackBar(
                              const SnackBar(
                                content: Text('Fill in all password fields'),
                              ),
                            );
                            return;
                          }
                          if (newPassword.length < 6) {
                            ScaffoldMessenger.of(this.context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'New password must be at least 6 characters',
                                ),
                              ),
                            );
                            return;
                          }
                          if (newPassword != confirmPassword) {
                            ScaffoldMessenger.of(this.context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'New password and confirmation do not match',
                                ),
                              ),
                            );
                            return;
                          }
                          setDialogState(() => isChangingPassword = true);
                          final success = await auth.changePassword(
                            currentPassword: currentPassword,
                            newPassword: newPassword,
                          );
                          if (!mounted) return;
                          setDialogState(() => isChangingPassword = false);
                          if (success && dialogContext.mounted) {
                            Navigator.pop(dialogContext);
                          }
                          ScaffoldMessenger.of(this.context).showSnackBar(
                            SnackBar(
                              content: Text(
                                success
                                    ? 'Password changed successfully'
                                    : (auth.error ??
                                        'Failed to change password'),
                              ),
                            ),
                          );
                        },
                  child: isChangingPassword
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Update'),
                ),
              ],
            );
          },
        );
      },
    );

    currentPasswordController.dispose();
    newPasswordController.dispose();
    confirmPasswordController.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final themeProvider = context.watch<ThemeProvider>();
    final username = user?.username.trim() ?? '';
    final initial = username.isNotEmpty ? username[0].toUpperCase() : '?';
    final theme = Theme.of(context);
    final hasProfileImage = auth.profileImagePath != null &&
        File(auth.profileImagePath!).existsSync();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 24),
      children: [
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            color: theme.colorScheme.surfaceContainerHigh,
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Stack(
                  children: [
                    CircleAvatar(
                      radius: 34,
                      backgroundColor: theme.colorScheme.surface,
                      backgroundImage: hasProfileImage
                          ? FileImage(File(auth.profileImagePath!))
                          : null,
                      child: hasProfileImage
                          ? null
                          : Text(
                              initial,
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w700,
                                color: theme.colorScheme.primary,
                              ),
                            ),
                    ),
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: InkWell(
                        onTap: () => _showProfilePhotoSheet(context, auth),
                        borderRadius: BorderRadius.circular(999),
                        child: Container(
                          padding: const EdgeInsets.all(5),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: theme.colorScheme.primary,
                          ),
                          child: const Icon(
                            Icons.edit_rounded,
                            size: 12,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.username ?? 'Teacher',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        user?.email ?? '',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface.withOpacity(0.7),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 6, 12, 6),
            child: Column(
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.dark_mode_outlined, size: 20),
                  title: const Text('Dark Mode'),
                  trailing: Switch(
                    value: themeProvider.isDarkMode,
                    onChanged: (value) => themeProvider.toggleTheme(value),
                  ),
                ),
                const Divider(height: 10),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.settings_outlined, size: 20),
                  title: const Text('Account Settings'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => _showAccountSettingsMenu(context, auth),
                ),
                const Divider(height: 10),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.help_outline, size: 20),
                  title: const Text('Help & Support'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () {},
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        TextButton.icon(
          onPressed: () async {
            await auth.logout();
            if (!context.mounted) return;
            Navigator.of(context, rootNavigator: true)
                .pushNamedAndRemoveUntil('/', (route) => false);
          },
          icon: Icon(Icons.logout_rounded, color: theme.colorScheme.error),
          label: Text(
            'Log Out',
            style: TextStyle(color: theme.colorScheme.error),
          ),
        ),
      ],
    );
  }
}
