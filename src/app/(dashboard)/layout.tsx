"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SidebarContent } from "@/components/layout/sidebar";
import { usePosStore } from "@/lib/pos-store";
import { Menu, X, LogOut, ShieldCheck, User, Building2, Sliders } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { currentUser, staffUsers, logoutUser, tenant, getActiveFirm, firms, activeFirmId, updateCurrentUserCredentials } = usePosStore();
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");

  const activeFirm =
    (typeof getActiveFirm === "function" ? getActiveFirm() : null) ||
    firms.find((f) => f.id === activeFirmId && f.tenantId === tenant.id) ||
    firms.find((f) => f.tenantId === tenant.id) ||
    tenant;

  const activeUser = currentUser || staffUsers[0] || {
    name: "Rajesh Sharma (Owner)",
    email: "admin@vyaparflow.enterprise",
    role: "TENANT_OWNER" as const,
  };

  const handleLogout = () => {
    logoutUser();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const handleSettingsSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail.trim()) return;
    updateCurrentUserCredentials(userEmail, userPassword || undefined);
    setIsSettingsOpen(false);
    setUserPassword("");
    alert("Credentials updated successfully!");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row font-sans">
      {/* ---------------- Sidebar Navigation (Desktop) ---------------- */}
      <aside className="no-print hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* ---------------- Main Content Workspace Container ---------------- */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Header Bar with User Badge & Logout in Top Right Corner */}
        <header className="no-print bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          {/* Left Side: Mobile Toggle & Brand Indicator */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-extrabold text-slate-800 dark:text-white truncate max-w-[200px]">
                  {activeFirm.name}
                </span>
              </span>
            </div>
          </div>

          {/* RIGHT SIDE TOP CORNER: User Info & Logout Button */}
          <div className="flex items-center gap-3 ml-auto">
            {/* User Info Badge */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                {activeUser.name ? activeUser.name[0].toUpperCase() : "U"}
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[140px] leading-tight">
                  {activeUser.name}
                </div>
                <div className="text-[9px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase tracking-wide truncate">
                  {activeUser.role === "TENANT_OWNER" || activeUser.role === "OWNER"
                    ? "👑 Owner (Admin)"
                    : activeUser.role === "ACCOUNTANT"
                    ? "📊 Accountant"
                    : activeUser.role === "CASHIER"
                    ? "⚡ Cashier (POS)"
                    : activeUser.role === "STOREKEEPER"
                    ? "📦 Storekeeper"
                    : "🛡️ Super Admin"}
                </div>
              </div>
            </div>

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => {
                setUserEmail(activeUser.email);
                setIsSettingsOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl text-xs font-extrabold transition shadow-2xs cursor-pointer"
              title="Update Credentials"
            >
              <Sliders className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/70 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs font-extrabold transition shadow-2xs cursor-pointer"
              title="Log Out Session"
            >
              <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Mobile Drawer Menu */}
        {isMobileMenuOpen && (
          <div className="no-print md:hidden fixed inset-0 top-[53px] z-50 bg-white dark:bg-slate-900 p-4 overflow-y-auto">
            <SidebarContent onItemClick={() => setIsMobileMenuOpen(false)} />
          </div>
        )}

        {/* ---------------- Main Content Workspace ---------------- */}
        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
      </div>

      {/* User Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-slate-900" />
                <h3 className="text-base font-black text-slate-900">Update Profile Credentials</h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Update your account login email and password below.
            </p>

            <form onSubmit={handleSettingsSave} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Email Address (Username)</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-700">New Password (Leave blank to keep current)</label>
                <input
                  type="password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full mt-1.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-sm transition cursor-pointer"
                >
                  Update Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
