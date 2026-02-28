"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  forgotPassword,
  login,
  resetPasswordWithCode,
  verifyResetCode,
} from "@/features/admin/api";
import { setToken } from "@/lib/auth";

type Mode = "login" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const { notify } = useToast();

  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const authError = sessionStorage.getItem("teachtrack_admin_auth_error");
    if (authError) {
      notify({ tone: "warning", title: "Session Expired", description: authError });
      sessionStorage.removeItem("teachtrack_admin_auth_error");
    }
  }, [notify]);

  async function onLoginSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(username, password);
      setToken(res.access_token);
      notify({ tone: "success", title: "Login successful", description: "Redirecting to dashboard..." });
      router.replace("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed.";
      setError(message);
      notify({ tone: "danger", title: "Login failed", description: message });
    } finally {
      setLoading(false);
    }
  }

  async function onSendCode(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setCodeSent(true);
      notify({ tone: "success", title: "Verification code sent", description: res.message });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send code.";
      setError(message);
      notify({ tone: "danger", title: "Failed to send code", description: message });
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyCode() {
    setError(null);
    setLoading(true);
    try {
      const res = await verifyResetCode(email, code);
      setCodeVerified(true);
      notify({ tone: "success", title: "Code verified", description: res.message });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid code.";
      setError(message);
      notify({ tone: "danger", title: "Verification failed", description: message });
    } finally {
      setLoading(false);
    }
  }

  async function onResetPassword() {
    setError(null);
    setLoading(true);
    try {
      const res = await resetPasswordWithCode(email, code, newPassword);
      notify({ tone: "success", title: "Password updated", description: res.message });
      setMode("login");
      setUsername(email.split("@")[0]);
      setPassword("");
      setCode("");
      setNewPassword("");
      setCodeSent(false);
      setCodeVerified(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reset password.";
      setError(message);
      notify({ tone: "danger", title: "Password reset failed", description: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="relative z-10 grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-border bg-card shadow-lg lg:grid-cols-[1.15fr_1fr]">
        <section className="hidden border-r border-border bg-muted/40 p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <BrandLogo />
            <h1 className="mt-8 text-4xl font-semibold leading-tight">Control your classrooms from one secure command center.</h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground">
              Monitor live engagement, respond to alerts quickly, and manage model behavior with confidence.
            </p>
          </div>
          <div className="space-y-3 rounded-xl border border-border bg-background p-5 text-sm text-muted-foreground">
            <p>Use a dedicated superuser account for operational actions and auditing.</p>
            <p>Use recovery flow if password is forgotten or account access changes.</p>
          </div>
        </section>

        <Card className="w-full rounded-none border-0 bg-transparent shadow-none">
          <CardHeader className="space-y-4 p-8 pb-3 md:p-10 md:pb-4">
            <BrandLogo className="lg:hidden" />
            <div className="inline-flex w-full rounded-xl border border-border bg-background p-1">
              <button
                className={`flex-1 rounded-lg px-3 py-2 text-sm transition ${mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                type="button"
              >
                Sign In
              </button>
              <button
                className={`flex-1 rounded-lg px-3 py-2 text-sm transition ${mode === "forgot" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                }}
                type="button"
              >
                Forgot Password
              </button>
            </div>
            <CardTitle className="text-3xl">{mode === "login" ? "Welcome back" : "Recover your account"}</CardTitle>
          </CardHeader>

          <CardContent className="p-8 pt-2 md:p-10 md:pt-2">
            {mode === "login" ? (
              <div className="space-y-4">
                <form className="space-y-4" onSubmit={onLoginSubmit}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Username</label>
                    <Input value={username} onChange={(e) => setUsername(e.target.value)} required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11" />
                  </div>
                  <Button className="mt-1 h-11 w-full text-base" disabled={loading}>
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={onSendCode}>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
                </div>
                <Button className="h-11 w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send verification code"}
                </Button>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Verification code</label>
                  <div className="flex gap-2">
                    <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} placeholder="6-digit code" className="h-11" />
                    <Button type="button" variant="outline" className="h-11" disabled={loading || !codeSent || code.length !== 6} onClick={onVerifyCode}>
                      Verify
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">New password</label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" className="h-11" />
                </div>

                <Button
                  type="button"
                  className="h-11 w-full"
                  disabled={loading || !codeVerified || newPassword.length < 8}
                  onClick={onResetPassword}
                >
                  {loading ? "Updating..." : "Reset password"}
                </Button>
              </form>
            )}

            {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
