import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../provider/auth_provider.dart';
import '../widgets/auth_background.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _usernameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  void _handleRegister() async {
    final username = _usernameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (username.isEmpty || email.isEmpty || password.isEmpty) {
      final isDark = Theme.of(context).brightness == Brightness.dark;
      Fluttertoast.showToast(
        msg: "Please fill in all fields",
        backgroundColor: isDark ? Colors.white : Colors.black87,
        textColor: isDark ? Colors.black87 : Colors.white,
      );
      return;
    }

    final success = await context.read<AuthProvider>().register(username, email, password);
    if (success && mounted) {
      Navigator.pop(context); // Go back to login or it will auto-switch to dashboard in main.dart
    } else if (mounted) {
      final error = context.read<AuthProvider>().error;
      Fluttertoast.showToast(
        msg: error ?? "Registration failed",
        backgroundColor: Colors.redAccent,
        textColor: Colors.white,
      );
    }
  }

  void _handleGoogleSignIn() async {
    final success = await context.read<AuthProvider>().signInWithGoogle();
    if (!success && mounted) {
      final error = context.read<AuthProvider>().error;
      Fluttertoast.showToast(
        msg: error ?? "Google Sign-In failed",
        backgroundColor: Colors.redAccent,
        textColor: Colors.white,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return AuthBackground(
      showBackButton: true,
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 20),
              // Updated Logo Section
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Theme.of(context).primaryColor.withOpacity(0.2),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: Image.asset(
                    'assets/images/ml_bg.png',
                    height: 80,
                    width: 80,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    "Teach",
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                          letterSpacing: -1,
                          color: Theme.of(context).primaryColor,
                        ),
                  ),
                  Text(
                    "Track",
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w400,
                          letterSpacing: -1,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                "Create an account to start monitoring",
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.6),
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 32),
              // Input Fields
              TextFormField(
                controller: _usernameController,
                decoration: InputDecoration(
                  labelText: "Username",
                  prefixIcon: const Icon(Icons.person_outline_rounded),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  filled: true,
                  fillColor: Theme.of(context).cardColor,
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  labelText: "Email Address",
                  prefixIcon: const Icon(Icons.email_outlined),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  filled: true,
                  fillColor: Theme.of(context).cardColor,
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                decoration: InputDecoration(
                  labelText: "Password",
                  prefixIcon: const Icon(Icons.lock_outline_rounded),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                    ),
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  filled: true,
                  fillColor: Theme.of(context).cardColor,
                ),
              ),
              const SizedBox(height: 24),
              // Action Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: auth.status == AuthStatus.authenticating ? null : _handleRegister,
                  style: ElevatedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 4,
                  ),
                  child: auth.status == AuthStatus.authenticating
                      ? const SizedBox(
                          height: 24,
                          width: 24,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text(
                          "Create Account",
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(child: Divider(color: Theme.of(context).dividerColor.withOpacity(0.2))),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      "OR",
                      style: TextStyle(
                        color: Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.5),
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  Expanded(child: Divider(color: Theme.of(context).dividerColor.withOpacity(0.2))),
                ],
              ),
              const SizedBox(height: 24),
              OutlinedButton(
                onPressed: auth.status == AuthStatus.authenticating ? null : _handleGoogleSignIn,
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 56),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  side: BorderSide(color: Theme.of(context).dividerColor.withOpacity(0.2)),
                  backgroundColor: Theme.of(context).brightness == Brightness.dark ? Colors.white.withOpacity(0.05) : Colors.white,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Image.network(
                      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/512px-Google_%22G%22_logo.svg.png',
                      height: 24,
                      errorBuilder: (context, error, stackTrace) => const Icon(Icons.g_mobiledata, size: 24),
                    ),
                    const SizedBox(width: 16),
                    Text(
                      "Google Account",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Theme.of(context).textTheme.bodyLarge?.color,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    "Already have an account? ",
                    style: TextStyle(
                      color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.6),
                    ),
                  ),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Text(
                      "Sign In",
                      style: TextStyle(
                        color: Theme.of(context).primaryColor,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
