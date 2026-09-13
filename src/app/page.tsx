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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | "Platform Admin" | "Business Owner" | "Accountant / CA" | "Store Assistant">("Business Owner");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    let mappedRole: UserRole = "OWNER";
    if (selectedRole === "Platform Admin") mappedRole = "SUPER_ADMIN";
    else if (selectedRole === "Business Owner") mappedRole = "OWNER";
    else if (selectedRole === "Accountant / CA") mappedRole = "ACCOUNTANT";
    else if (selectedRole === "Store Assistant") mappedRole = "STOREKEEPER";

    const res = await loginUser(email, password, mappedRole);
    setIsLoading(false);

    if (!res.success) {
      setError(res.error || "Authentication failed. Please check credentials.");
      return;
    }

    const role = res.user?.role;
    if (role === "SUPER_ADMIN") {
      router.push("/admin/dashboard");
    } else if (role === "CASHIER") {
      router.push("/pos");
    } else if (role === "STOREKEEPER") {
      router.push("/inventory");
    } else {
      router.push("/dashboard");
    }
  };

  const handleQuickLogin = (role: UserRole, userEmail: string) => {
    setSelectedRole(role);
    setEmail(userEmail);
    setPassword("password123");
    setIsLoading(true);

    setTimeout(async () => {
      const res = await loginUser(userEmail, "password123", role);
      setIsLoading(false);
      if (role === "SUPER_ADMIN") {
        router.push("/admin/dashboard");
      } else if (role === "CASHIER") {
        router.push("/pos");
      } else if (role === "STOREKEEPER") {
        router.push("/inventory");
      } else {
        router.push("/dashboard");
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col justify-center items-center p-4 font-sans text-slate-900">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <img
            src="/logo.png"
            alt="लेखा जोखा ENTERPRISE ERP"
            className="h-16 w-auto object-contain drop-shadow-sm"
          />
          <p className="text-xs text-slate-500">
            Multi-Tenant Cloud ERP • Role-Based Authentication & Staff Terminal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 p-8 rounded-3xl shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                <span>Sign In to Workstation</span>
              </h2>

            </div>
            {currentUser && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                ● Logged in as {currentUser.name.split(" ")[0]}
              </span>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600">Email Address / Username</label>
              <div className="relative mt-1">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Username"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Password / Security PIN</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Select Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="w-full mt-1 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs"
              >
                <option value="Platform Admin">🛡️ Platform Admin</option>
                <option value="Business Owner">👑 Business Owner</option>
                <option value="Accountant / CA">📊 Accountant / CA</option>
                <option value="Store Assistant">📦 Store Assistant</option>
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


        </div>


      </div>
    </div>
  );
}
