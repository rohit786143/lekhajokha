"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePosStore } from "@/lib/pos-store";
import {
  Terminal,
  KeyRound,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  Globe,
  ArrowLeft,
} from "lucide-react";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { loginUser } = usePosStore();

  const [email, setEmail] = useState("superadmin@vyaparflow.enterprise");
  const [password, setPassword] = useState("superadmin123");
  const [showPassword, setShowPassword] = useState(false);
  const [securityKey, setSecurityKey] = useState("SUPERADMIN_MASTER_KEY_2026");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuperAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      const res = loginUser(email, password, "SUPER_ADMIN");
      setIsLoading(false);

      if (!res.success) {
        setError(res.error || "Super Admin access denied. Invalid master keys.");
        return;
      }

      router.push("/admin/dashboard");
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-center items-center p-4 selection:bg-slate-900 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        {/* Brand & Developer Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-white font-black text-2xl shadow-md border border-slate-800">
            <Terminal className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-mono font-bold uppercase tracking-widest">
              ● PLATFORM DEVELOPER PORTAL
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Developer Super Admin
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            SaaS Platform Engine • Multi-Tenant Business Registry & Master Control Plane
          </p>
        </div>

        {/* Master Login Card */}
        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="space-y-0.5">
              <h2 className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <KeyRound className="w-4 h-4 text-slate-600" />
                <span>Developer Authentication</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Root access across all registered businesses
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
              ROOT
            </span>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-xs text-rose-800 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSuperAdminLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Developer Root Email</label>
              <div className="relative mt-1.5">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="superadmin@vyaparflow.enterprise"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Master Password</label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Developer Master Key</label>
              <div className="relative mt-1.5">
                <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={securityKey}
                  onChange={(e) => setSecurityKey(e.target.value)}
                  placeholder="SUPERADMIN_MASTER_KEY_2026"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? "Verifying Root Keys..." : "Access Developer Console"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credential Pill */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-[11px] text-slate-600">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>⚡ Quick Developer Demo Keys:</span>
            </div>
            <div className="font-mono text-[10px] space-y-0.5 text-slate-600">
              <div>Email: <span className="font-bold text-slate-900">superadmin@vyaparflow.enterprise</span></div>
              <div>Password: <span className="font-bold text-slate-900">superadmin123</span></div>
              <div>Key: <span className="font-bold text-slate-900">SUPERADMIN_MASTER_KEY_2026</span></div>
            </div>
          </div>
        </div>

        {/* Footer Navigation Link */}
        <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-900 font-bold flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Standard Business Login</span>
          </Link>
          <span>•</span>
          <Link href="/dashboard" className="hover:text-slate-900 font-bold">
            Client ERP
          </Link>
        </div>
      </div>
    </div>
  );
}
