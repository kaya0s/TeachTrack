
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../provider/auth_provider.dart';
import '../widgets/auth_background.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  final _codeController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  int _currentStep = 0; // 0: Email, 1: Code, 2: New Password
  bool _isLoading = false;
  bool _obscurePassword = true;

  Future<void> _handleSendCode() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      _showError("Please enter a valid email address");
      return;
    }

    setState(() => _isLoading = true);
    final success = await context.read<AuthProvider>().forgotPassword(email);
    setState(() => _isLoading = false);

    if (success) {
      setState(() => _currentStep = 1);
      _showSuccess("A verification code has been sent to your email");
    } else {
      _showError(context.read<AuthProvider>().error ?? "Failed to send code");
    }
  }

  Future<void> _handleVerifyCode() async {
    final email = _emailController.text.trim();
    final code = _codeController.text.trim();
    if (code.length != 6) {
      _showError("Please enter the 6-digit code");
      return;
    }

    setState(() => _isLoading = true);
    final success = await context.read<AuthProvider>().verifyResetCode(email, code);
    setState(() => _isLoading = false);

    if (success) {
      setState(() => _currentStep = 2);
    } else {
      _showError(context.read<AuthProvider>().error ?? "Invalid code");
    }
  }

  Future<void> _handleResetPassword() async {
    final email = _emailController.text.trim();
    final code = _codeController.text.trim();
    final password = _passwordController.text.trim();
    final confirmPassword = _confirmPasswordController.text.trim();

    if (password.length < 6) {
      _showError("Password must be at least 6 characters");
      return;
    }

    if (password != confirmPassword) {
      _showError("Passwords do not match");
      return;
    }

    setState(() => _isLoading = true);
    final success = await context.read<AuthProvider>().resetPassword(email, code, password);
    setState(() => _isLoading = false);

    if (success) {
      _showSuccess("Password reset successful. You can now login.");
      Navigator.pop(context);
    } else {
      _showError(context.read<AuthProvider>().error ?? "Failed to reset password");
    }
  }

  void _showError(String message) {
    Fluttertoast.showToast(
      msg: message,
      backgroundColor: Colors.redAccent,
      textColor: Colors.white,
    );
  }

  void _showSuccess(String message) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    Fluttertoast.showToast(
      msg: message,
      backgroundColor: isDark ? Colors.green.shade600 : Colors.green.shade700,
      textColor: Colors.white,
    );
  }

  @override
  Widget build(BuildContext context) {
    return AuthBackground(
      showBackButton: true,
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),
              Text(
                _currentStep == 0
                    ? "Forgot Password"
                    : _currentStep == 1
                        ? "Verify Code"
                        : "Reset Password",
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _currentStep == 0
                    ? "Enter your email address to receive a verification code"
                    : _currentStep == 1
                        ? "Enter the 6-digit code sent to ${_emailController.text}"
                        : "Create a new secure password for your account",
                style: TextStyle(
                  color: Theme.of(context).textTheme.bodyMedium?.color?.withOpacity(0.6),
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 48),
              if (_currentStep == 0) ...[
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: "Email Address",
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: _isLoading ? null : _handleSendCode,
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text("Send Code"),
                ),
              ] else if (_currentStep == 1) ...[
                TextField(
                  controller: _codeController,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 24, letterSpacing: 8, fontWeight: FontWeight.bold),
                  decoration: const InputDecoration(
                    labelText: "Verification Code",
                    counterText: "",
                  ),
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: _isLoading ? null : _handleVerifyCode,
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text("Verify Code"),
                ),
                TextButton(
                  onPressed: _isLoading ? null : _handleSendCode,
                  style: TextButton.styleFrom(
                    foregroundColor: Theme.of(context).colorScheme.primary,
                  ),
                  child: const Text("Resend Code"),
                ),
              ] else ...[
                TextField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    labelText: "New Password",
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword ? Icons.visibility_off : Icons.visibility,
                      ),
                      onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: _confirmPasswordController,
                  obscureText: _obscurePassword,
                  decoration: const InputDecoration(
                    labelText: "Confirm New Password",
                    prefixIcon: Icon(Icons.lock_outline),
                  ),
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: _isLoading ? null : _handleResetPassword,
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text("Reset Password"),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
