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
  Zap,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col md:flex-row justify-center items-center p-6 md:p-16 gap-12 md:gap-24 font-sans text-slate-900">
      
      {/* Left Column: Info & Plans */}
      <div className="w-full max-w-xl space-y-6 flex-1">
        {/* Brand Header */}
        <div className="space-y-3">
          <img
            src="/logo.png"
            alt="लेखा जोखा ERP"
            className="h-20 w-auto object-contain drop-shadow-sm -mt-4"
          />
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 mt-2">
            Cloud Billing & POS System
          </h1>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Manage your inventory, GST billing, and multi-branch business from one powerful workstation.
          </p>
        </div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* BASIC PLAN */}
          <div className="bg-white border-2 border-emerald-400 rounded-2xl shadow-lg relative overflow-hidden group hover:-translate-y-1 transition duration-300">
            <div className="bg-emerald-500 text-white px-4 py-2.5 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-1.5 shadow-sm">
              <Sparkles className="w-4 h-4" /> Basic Plan
            </div>
            <div className="p-5 space-y-3">
              <div className="text-2xl font-black text-slate-900">₹1,143<span className="text-xs text-slate-500 font-medium">/yr</span></div>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Single User Access</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Basic GST Billing</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Simple Inventory</li>
              </ul>
            </div>
          </div>
          
          {/* PRO PLAN */}
          <div className="bg-gradient-to-b from-indigo-50 to-white border-2 border-indigo-500 rounded-2xl shadow-xl shadow-indigo-200/50 relative overflow-hidden group hover:-translate-y-1 transition duration-300">
            <div className="bg-indigo-600 text-white px-4 py-2.5 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-1.5 shadow-sm">
              <Zap className="w-4 h-4" /> Pro Plan
            </div>
            <div className="absolute top-10 right-0 p-4 opacity-10 group-hover:scale-125 transition duration-500"><Zap className="w-24 h-24 text-indigo-600" /></div>
            <div className="p-5 relative z-10 space-y-3">
              <div className="text-3xl font-black text-indigo-900">₹1,843<span className="text-xs text-indigo-500 font-medium">/yr</span></div>
              <ul className="text-xs text-slate-700 space-y-2 mt-3 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> Multi-branch POS</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> Advanced Reports</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> E-Way & Batches</li>
              </ul>
            </div>
          </div>
        </div>

        {/* WhatsApp Link */}
        <div className="-mt-2">
          <a
            href="https://wa.me/919857640014"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 bg-[#25D366] hover:bg-[#1ebd5a] active:scale-95 text-white font-black text-sm rounded-xl shadow-lg shadow-[#25D366]/30 transition"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Contact on WhatsApp to Buy
          </a>
        </div>
      </div>

      {/* Right Column: Login Card */}
      <div className="w-full max-w-md flex-1">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 p-8 rounded-3xl shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-500" />
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
              className="w-full mt-4 py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-98 rounded-xl font-bold text-sm text-white shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
