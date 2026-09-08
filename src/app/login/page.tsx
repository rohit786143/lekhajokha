"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePosStore } from "@/lib/pos-store";
import { UserRole } from "@/lib/types";
import {
  ShieldCheck,
  User,
  Lock,
  ArrowRight,
  Sparkles,
  Building2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Globe,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { tenant, firms, activeFirmId, getActiveFirm, staffUsers, currentUser, loginUser } = usePosStore();

  const activeFirm =
    (typeof getActiveFirm === "function" ? getActiveFirm() : null) ||
    firms.find((f) => f.id === activeFirmId) ||
    firms.find((f) => f.isPrimary) ||
    firms[0] ||
    tenant;

  const [email, setEmail] = useState("admin@vyaparflow.enterprise");
  const [password, setPassword] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("TENANT_OWNER");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      const res = loginUser(email, password, selectedRole);
      setIsLoading(false);

      if (!res.success) {
        setError(res.error || "Authentication failed. Please check credentials.");
        return;
      }

      const role = res.user?.role || selectedRole;
      if (role === "SUPER_ADMIN") {
        router.push("/admin/dashboard");
      } else if (role === "CASHIER") {
        router.push("/pos");
      } else if (role === "STOREKEEPER") {
        router.push("/inventory");
      } else {
        router.push("/");
      }
    }, 300);
  };

  const handleQuickLogin = (role: UserRole, userEmail: string) => {
    setSelectedRole(role);
    setEmail(userEmail);
    setPassword("password123");
    setIsLoading(true);

    setTimeout(() => {
      const res = loginUser(userEmail, "password123", role);
      setIsLoading(false);
      if (role === "SUPER_ADMIN") {
        router.push("/admin/dashboard");
      } else if (role === "CASHIER") {
        router.push("/pos");
      } else if (role === "STOREKEEPER") {
        router.push("/inventory");
      } else {
        router.push("/");
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex flex-col justify-center items-center p-4 font-sans text-slate-100">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <img
            src="/logo.png"
            alt="लेखा जोखा ENTERPRISE ERP"
            className="h-16 w-auto object-contain drop-shadow-xl"
          />
          <p className="text-xs text-slate-400">
            Multi-Tenant Cloud ERP • Role-Based Authentication & Staff Terminal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Sign In to Workstation</span>
              </h2>
              <p className="text-xs text-slate-400">
                Business Tenant: <span className="font-semibold text-indigo-300">{activeFirm.name}</span>
              </p>
            </div>
            {currentUser && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ● Logged in as {currentUser.name.split(" ")[0]}
              </span>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300">Email Address / Username</label>
              <div className="relative mt-1">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@vyaparflow.enterprise"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-white/15 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Password / Security PIN</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-white/15 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Assigned Role Persona</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full mt-1 px-3 py-2.5 bg-slate-950/80 border border-white/15 rounded-xl text-xs text-white font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="TENANT_OWNER">👑 Business Owner (Admin) - Full Control</option>
                <option value="OWNER">🏢 Primary Business Owner</option>
                <option value="ACCOUNTANT">📊 Accountant / Manager - Reports & P&L</option>
                <option value="CASHIER">⚡ Billing Cashier - Fast POS Terminal Only</option>
                <option value="STOREKEEPER">📦 Storekeeper - Inventory & Inward Stock</option>
                <option value="SUPER_ADMIN">🛡️ SaaS Super Admin - Platform Control</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-98 rounded-xl font-bold text-xs text-white shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? "Authenticating Session..." : "Sign In to ERP Terminal"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* 1-Click Fast Staff Persona Switcher */}
          <div className="space-y-2 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                1-Click Quick Demo Staff Logins:
              </span>
              <Link
                href="/staff"
                className="text-[10px] font-bold text-indigo-400 hover:underline"
              >
                + Staff Hub
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {staffUsers.slice(0, 4).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickLogin(u.role, u.email)}
                  className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition group"
                >
                  <div className="text-xs font-bold text-white group-hover:text-indigo-300 line-clamp-1">
                    {u.role === "TENANT_OWNER" || u.role === "OWNER" ? "👑 " : u.role === "ACCOUNTANT" ? "📊 " : u.role === "CASHIER" ? "⚡ " : "📦 "}
                    {u.name.split(" ")[0]}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono line-clamp-1">
                    {u.role.replace(/_/g, " ")}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Super Admin Console Portal banner */}
          <div className="p-3 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-200">Platform Developer Portal</div>
                <div className="text-[10px] text-slate-400">Global SaaS Super Admin Access</div>
              </div>
            </div>
            <Link
              href="/admin/login"
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center gap-1 shadow-md shadow-amber-500/20"
            >
              <span>Super Admin</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Footer Navigation Links */}
        <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
          <Link href="/" className="hover:text-white font-semibold">
            ← Dashboard
          </Link>
          <span>•</span>
          <Link href="/pos" className="hover:text-white font-semibold">
            POS Terminal
          </Link>
          <span>•</span>
          <Link href="/staff" className="hover:text-white font-semibold">
            Team & Roles
          </Link>
        </div>
      </div>
    </div>
  );
}
