"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loginUser } from "../../lib/api";
import { useRouter } from "next/navigation";
import AuthShell from "../../components/auth/auth-shell";
import AuthSidePanel from "../../components/auth/auth-side-panel";
import AuthFormField from "../../components/auth/auth-form-field";
import { useToast } from "../../components/toast-provider";

export default function LoginPage() {
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const result = await loginUser(form);
      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("refresh_token", result.refresh_token);
      localStorage.setItem("auth_user", JSON.stringify(result.user));

      let destination = "/user";

      if (result.user.role === "ADMIN") {
        destination = "/admin";
      } else if (result.user.role === "COURIER") {
        destination = "/courier";
      }

      setRedirecting(true);
      showToast({
        type: "success",
        message: "Signed in successfully. Opening your workspace now."
      });

      redirectTimerRef.current = setTimeout(() => {
        router.push(destination);
      }, 1600);
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Sign-in could not be completed. Please try again."
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      sidePanel={
        <AuthSidePanel
          title="Welcome back"
          subtitle="Sign in to manage your shipments, deliveries and couriers."
        />
      }
      formPanel={
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">
            Sign in
          </h2>
          <p className="landing-muted mt-2 text-sm">
            Enter your credentials to continue.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <AuthFormField
              label="Email"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              required
              disabled={submitting || redirecting}
            />

            <AuthFormField
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              required
              disabled={submitting || redirecting}
            />

            <button
              type="submit"
              disabled={submitting || redirecting}
              className="landing-gradient-btn w-full"
            >
              {submitting
                ? "Signing In..."
                : redirecting
                  ? "Redirecting..."
                  : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            New to Smart Logistics?{" "}
            <Link
              href="/register"
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Create your account
            </Link>
          </p>
        </div>
      }
    />
  );
}
