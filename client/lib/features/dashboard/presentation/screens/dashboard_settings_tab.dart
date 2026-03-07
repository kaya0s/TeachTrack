part of 'dashboard_screen.dart';

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

          String currentModelLabel = session.currentModelFile ?? 'Unknown model';
          for (final model in session.availableModels) {
            if (model.fileName == session.currentModelFile) {
              currentModelLabel = model.displayName;
              break;
            }
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
                  'Current model is managed by admin:',
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
                    child: ListTile(
                      contentPadding:
                          const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      leading: Icon(
                        Icons.verified_rounded,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      title: Text(
                        currentModelLabel,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      subtitle: Text(
                        'Model switching is disabled on teacher app. Ask admin to change it.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ),
                if (session.availableModels.isNotEmpty) ...[
                  const SizedBox(height: 12),
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
                        for (int i = 0; i < session.availableModels.length; i++) ...[
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    session.availableModels[i].displayName,
                                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                          fontWeight: FontWeight.w600,
                                        ),
                                  ),
                                ),
                                if (session.availableModels[i].fileName == session.currentModelFile)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: Theme.of(context).colorScheme.primary.withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: Text(
                                      'Current',
                                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                            color: Theme.of(context).colorScheme.primary,
                                            fontWeight: FontWeight.w700,
                                          ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          if (i != session.availableModels.length - 1)
                            Divider(
                              height: 1,
                              thickness: 1,
                              color: Theme.of(context).dividerColor.withOpacity(0.35),
                            ),
                        ],
                      ],
                    ),
                  ),
                ],
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

  bool _isUploading = false;

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
    
    // Set local path for immediate feedback if needed
    await auth.setProfileImagePath(selected.path);
    
    if (!mounted) return;
    setState(() => _isUploading = true);
    
    final success = await auth.uploadProfilePicture(selected.path);
    
    if (!mounted) return;
    setState(() => _isUploading = false);
    
    ScaffoldMessenger.of(this.context).showSnackBar(
      SnackBar(content: Text(success ? 'Profile photo updated' : 'Upload failed')),
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
                      backgroundImage: (user?.profilePictureUrl != null && user!.profilePictureUrl!.isNotEmpty)
                          ? NetworkImage(user.profilePictureUrl!)
                          : (hasProfileImage
                              ? FileImage(File(auth.profileImagePath!))
                              : null) as ImageProvider?,
                      child: _isUploading
                          ? const CircularProgressIndicator(strokeWidth: 2)
                          : ((user?.profilePictureUrl != null && user!.profilePictureUrl!.isNotEmpty) || hasProfileImage
                              ? null
                              : Text(
                                  initial,
                                  style: TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.w700,
                                    color: theme.colorScheme.primary,
                                  ),
                                )),
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


