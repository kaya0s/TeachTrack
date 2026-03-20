"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Activity, Bell, Chrome, Settings, Users } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import Particles from "./Particles";
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
    event.stopPropagation();
    setError(null);
    setLoading(true);
    try {
      const res = await login(username, password);
      setToken(res.access_token);
      notify({ tone: "success", title: "Login successful", description: "Redirecting to dashboard..." });
      router.replace("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed.";
      const friendly = message === "Not authenticated" ? "Invalid username or password." : message;
      setError(friendly);
      notify({ tone: "danger", title: "Login failed", description: friendly });
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 p-4 text-foreground">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(135deg,rgba(10,10,10,0.2),rgba(10,10,10,0.55))]" />
      <div className="pointer-events-none absolute inset-0 z-10">
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
          <Particles
            particleColors={["#ffffff"]}
            particleCount={200}
            particleSpread={10}
            speed={0.05}
            particleBaseSize={100}
            moveParticlesOnHover
            alphaParticles={false}
            disableRotation={false}
            pixelRatio={1}
          />
        </div>
      </div>

      <div className="relative z-20 flex w-full items-center justify-center">
        <Card className="w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-background/90 backdrop-blur">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col justify-between gap-8 border-b border-border/70 bg-muted/30 px-10 py-10 lg:border-b-0 lg:border-r">
              <div>
                <BrandLogo />
                <CardTitle className="mt-6 text-3xl">{mode === "login" ? "Admin Console" : "Account Recovery"}</CardTitle>
                <p className="mt-3 text-sm text-muted-foreground">
                  {mode === "login"
                    ? "Operate the classroom intelligence stack with real-time monitoring and secure controls."
                    : "Reset access securely with a verification code and a new password."}
                </p>
              </div>
              <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
                  <span className="mt-0.5 rounded-xl bg-muted p-2 text-foreground/80">
                    <Bell className="h-4 w-4" />
                  </span>
                  <span>Live alerts and incident review</span>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
                  <span className="mt-0.5 rounded-xl bg-muted p-2 text-foreground/80">
                    <Users className="h-4 w-4" />
                  </span>
                  <span>Teacher roster and class access</span>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
                  <span className="mt-0.5 rounded-xl bg-muted p-2 text-foreground/80">
                    <Activity className="h-4 w-4" />
                  </span>
                  <span>Engagement analytics and exports</span>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
                  <span className="mt-0.5 rounded-xl bg-muted p-2 text-foreground/80">
                    <Settings className="h-4 w-4" />
                  </span>
                  <span>AI model governance and tuning</span>
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-xs text-muted-foreground">
                Tip: Use a dedicated admin account and rotate credentials regularly.
              </div>
            </div>

            <div className="px-10 py-10">
              <CardHeader className="space-y-2 p-0 text-left">
                <h2 className="text-xl font-semibold">{mode === "login" ? "Welcome back" : "Verify your account"}</h2>
                <p className="text-xs text-muted-foreground">
                  {mode === "login" ? "Enter your credentials to continue." : "We'll send a verification code to your email."}
                </p>
              </CardHeader>

              <CardContent className="p-0 pt-6">
                {mode === "login" ? (
                  <form className="w-full max-w-sm space-y-3" onSubmit={onLoginSubmit}>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Username</label>
                      <Input value={username} onChange={(e) => setUsername(e.target.value)} required className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Password</label>
                      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-10" />
                    </div>
                <Button className="h-10 w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  or
                  <span className="h-px flex-1 bg-border" />
                </div>
                <Button type="button" variant="outline" className="h-10 w-full" disabled={loading}>
                  <Chrome className="mr-2 h-4 w-4" />
                  Continue with Google
                </Button>
                    <button
                      type="button"
                      className="w-full text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      onClick={() => {
                        setMode("forgot");
                        setError(null);
                      }}
                    >
                      Forgot password?
                    </button>
                  </form>
                ) : (
                  <form className="w-full max-w-sm space-y-3" onSubmit={onSendCode}>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-10" />
                    </div>
                    <Button className="h-10 w-full" disabled={loading}>
                      {loading ? "Sending..." : "Send code"}
                    </Button>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Verification code</label>
                      <div className="flex gap-2">
                        <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} placeholder="6-digit code" className="h-10" />
                        <Button type="button" variant="outline" className="h-10" disabled={loading || !codeSent || code.length !== 6} onClick={onVerifyCode}>
                          Verify
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">New password</label>
                      <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" className="h-10" />
                    </div>

                    <Button
                      type="button"
                      className="h-10 w-full"
                      disabled={loading || !codeVerified || newPassword.length < 8}
                      onClick={onResetPassword}
                    >
                      {loading ? "Updating..." : "Reset password"}
                    </Button>
                    <button
                      type="button"
                      className="w-full text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      onClick={() => {
                        setMode("login");
                        setError(null);
                      }}
                    >
                      Back to sign in
                    </button>
                  </form>
                )}

                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Protected by admin security policies and audit logging.
                </p>
              </CardContent>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
