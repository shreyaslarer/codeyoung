"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, Eye, EyeOff, ArrowRight, ArrowLeft, ShieldCheck, Zap } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already logged in, navigate straight to /dashboard
  useEffect(() => {
    try {
      const stored = localStorage.getItem("codeyoung_admin_session");
      if (stored) {
        const session = JSON.parse(stored);
        if (session?.email) {
          router.replace("/dashboard");
        }
      }
    } catch {
      // Ignore parse error
    }
  }, [router]);

  const handleFillDemo = (role: "admin" | "mentor") => {
    setErrorMessage(null);
    if (role === "admin") {
      setEmail("admin@codeyoung.com");
      setPassword("codeyoung2026");
    } else {
      setEmail("mentor@codeyoung.dev");
      setPassword("codeyoung2026");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password, rememberMe }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.title || "Authentication failed.");
      }

      // Persist session to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("codeyoung_admin_session", JSON.stringify(data.user));
      }

      // Smooth navigation to dashboard
      router.push(data.redirectUrl || "/dashboard");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to log in.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between py-8 px-4 sm:px-6">
      {/* Top Bar: Return Link */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Parent Booking</span>
        </Link>

        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Internal Gateway
        </span>
      </div>

      {/* Center Auth Card */}
      <div className="max-w-[440px] w-full mx-auto my-auto animate-in fade-in zoom-in-98 duration-150">
        <div className="bg-white rounded-2xl border border-[#CBD5E1] p-6 sm:p-8 shadow-card flex flex-col">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <Link href="/" className="mb-3 hover:opacity-90 transition-opacity">
              <Image
                src="/primary_logo.png"
                alt="Codeyoung"
                width={150}
                height={46}
                priority
                className="h-9 w-auto object-contain"
              />
            </Link>

            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
              Admin &amp; Mentor Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xs">
              Sign in to monitor live trial sessions, mentor allocations, and scheduling invariants.
            </p>
          </div>

          {/* Quick Demo Autofill Bar */}
          <div className="mb-5 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
              <span className="flex items-center gap-1 text-[#784E00]">
                <Zap className="w-3.5 h-3.5 text-[#F5A623]" />
                <span>Quick Demo Fill:</span>
              </span>
              <span className="text-slate-400">One-click testing</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo("admin")}
                className="py-1.5 px-2.5 rounded-lg bg-white border border-[#CBD5E1] hover:border-[#D98B0F] hover:bg-amber-50/40 text-xs font-semibold text-slate-800 transition-all shadow-control text-center cursor-pointer"
              >
                Ops Admin
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo("mentor")}
                className="py-1.5 px-2.5 rounded-lg bg-white border border-[#CBD5E1] hover:border-[#4A60E8] hover:bg-indigo-50/40 text-xs font-semibold text-slate-800 transition-all shadow-control text-center cursor-pointer"
              >
                Lead Mentor
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 leading-relaxed animate-in fade-in duration-100"
            >
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Field: Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-email" className="text-xs font-bold text-slate-800 tracking-wide">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoFocus
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@codeyoung.com"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#F8FAFC] focus:bg-white border border-[#CBD5E1] text-[#0F172A] text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#D98B0F] focus:ring-2 focus:ring-[#F5A623]/25 transition-all shadow-control disabled:opacity-50"
                />
              </div>
            </div>

            {/* Field: Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="admin-password"
                  className="text-xs font-bold text-slate-800 tracking-wide"
                >
                  Password
                </label>
                <span className="text-[11px] text-slate-500">Min 6 characters</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#F8FAFC] focus:bg-white border border-[#CBD5E1] text-[#0F172A] text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#D98B0F] focus:ring-2 focus:ring-[#F5A623]/25 transition-all shadow-control disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#F5A623] focus:ring-[#F5A623]/30"
                />
                <span className="text-xs font-medium text-slate-700">Remember this session</span>
              </label>

              <Link
                href="/dashboard"
                className="text-xs font-semibold text-[#D98B0F] hover:underline"
              >
                Skip to Dashboard &rarr;
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full h-11 rounded-xl bg-[#F5A623] hover:bg-[#E89918] active:bg-[#D98B0F] text-slate-950 text-sm font-bold inline-flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isLoading ? "Signing in..." : "Sign in to Dashboard"}</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          </form>

          {/* Security & Invariant Note */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Encrypted engineering session · v2.4.0-stable</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="text-center text-xs text-slate-500 mt-6">
        &copy; 2026 Codeyoung. Engineering Operations &amp; Mentor Allocation.
      </footer>
    </div>
  );
}
