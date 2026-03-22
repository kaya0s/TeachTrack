import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:teachtrack/features/auth/presentation/providers/auth_provider.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _emailController;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    _firstNameController = TextEditingController(text: user?.firstname);
    _lastNameController = TextEditingController(text: user?.lastname);
    _emailController = TextEditingController(text: user?.email);
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(AuthProvider auth) async {
    final picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.gallery);
    
    if (image != null && mounted) {
      final success = await auth.uploadProfilePicture(image.path);
      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile picture updated successfully!')));
        } else {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(auth.error ?? 'Upload failed')));
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final initial = user?.firstname?.isNotEmpty == true ? user!.firstname![0].toUpperCase() : '?';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Profile', style: TextStyle(fontWeight: FontWeight.w800)),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Profile Picture Section with Indicator ────────────────────────
              Center(
                child: GestureDetector(
                  onTap: auth.isLoading ? null : () => _pickImage(auth),
                  child: Stack(
                    children: [
                      Container(
                        width: 110,
                        height: 110,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: theme.colorScheme.primary.withOpacity(0.2), width: 4),
                        ),
                        child: CircleAvatar(
                          radius: 50,
                          backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                          backgroundImage: user?.profilePictureUrl != null 
                              ? NetworkImage(user!.profilePictureUrl!) 
                              : null,
                          child: user?.profilePictureUrl == null 
                              ? Text(initial, style: TextStyle(fontSize: 40, fontWeight: FontWeight.w800, color: theme.colorScheme.primary))
                              : null,
                        ),
                      ),
                      if (auth.isLoading)
                        Positioned.fill(
                          child: Container(
                            decoration: BoxDecoration(color: Colors.black.withOpacity(0.4), shape: BoxShape.circle),
                            child: const Center(child: CircularProgressIndicator(color: Colors.white, strokeWidth: 3)),
                          ),
                        ),
                      Positioned(
                        bottom: 4,
                        right: 4,
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.primary, 
                            shape: BoxShape.circle,
                            border: Border.all(color: theme.scaffoldBackgroundColor, width: 2.5),
                          ),
                          child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 18),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Center(
                child: Text(
                  'Tap to change profile picture',
                  style: theme.textTheme.labelSmall?.copyWith(color: theme.hintColor, fontWeight: FontWeight.w600),
                ),
              ),
              const SizedBox(height: 32),

              _Label('First Name', theme),
              _TextField(controller: _firstNameController, hint: 'Enter first name', theme: theme),
              const SizedBox(height: 20),
              _Label('Last Name', theme),
              _TextField(controller: _lastNameController, hint: 'Enter last name', theme: theme),
              const SizedBox(height: 20),
              _Label('Email Address', theme),
              _TextField(controller: _emailController, hint: 'Enter email', theme: theme, enabled: false),
              const SizedBox(height: 40),
              
              SizedBox(
                width: double.infinity,
                height: 56,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  onPressed: auth.isLoading ? null : _save,
                  child: auth.isLoading 
                    ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Save Changes', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _save() async {
    if (!_formKey.currentState!.validate()) return;
    
    final success = await context.read<AuthProvider>().updateAccount(
      firstname: _firstNameController.text,
      lastname: _lastNameController.text,
      email: _emailController.text,
    );
    
    if (!context.mounted) return;
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated successfully!')));
      Navigator.pop(context);
    } else {
      final error = context.read<AuthProvider>().error ?? 'Update failed';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
    }
  }
}

class _Label extends StatelessWidget {
  final String text;
  final ThemeData theme;
  const _Label(this.text, this.theme);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(left: 4, bottom: 8),
    child: Text(text, style: theme.textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w700, color: theme.hintColor)),
  );
}

class _TextField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final ThemeData theme;
  final bool enabled;
  const _TextField({required this.controller, required this.hint, required this.theme, this.enabled = true});

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      enabled: enabled,
      style: const TextStyle(fontWeight: FontWeight.w600),
      decoration: InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: theme.cardColor,
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: theme.dividerColor)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: theme.dividerColor.withOpacity(0.5))),
      ),
    );
  }
}
