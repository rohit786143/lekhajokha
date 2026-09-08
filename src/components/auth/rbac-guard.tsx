"use client";

import React from "react";
import Link from "next/link";
import { usePosStore } from "@/lib/pos-store";
import { UserRole } from "@/lib/types";
import { ShieldAlert, Lock, ArrowLeft, ShoppingCart, LayoutDashboard } from "lucide-react";

interface RbacGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  featureTitle?: string;
}

export function RbacGuard({
  allowedRoles,
  children,
  featureTitle = "Restricted Operational Module",
}: RbacGuardProps) {
  const { currentUser, staffUsers } = usePosStore();
  const activeUser = currentUser || staffUsers[0];

  const userRole = (activeUser?.role || "CASHIER") as UserRole;
  const isOwner = userRole === "OWNER" || userRole === "TENANT_OWNER";
  const isSuperAdmin = userRole === "SUPER_ADMIN";

  // Check role authorization
  const hasAccess =
    isSuperAdmin ||
    allowedRoles.includes(userRole) ||
    (isOwner && (allowedRoles.includes("OWNER") || allowedRoles.includes("TENANT_OWNER")));

  if (hasAccess) {
    return <>{children}</>;
  }

  // Graceful Access Denied Screen
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/60 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-rose-200 dark:border-rose-900/40">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
            Access Restricted • RBAC Tier 3
          </span>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Permission Required
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your current assigned role (
            <strong className="text-slate-800 dark:text-slate-200 font-mono">
              {userRole}
            </strong>
            ) does not have authorization to access <strong>"{featureTitle}"</strong>.
          </p>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1 text-left">
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-500" />
            <span>Policy Guidelines:</span>
          </div>
          <div>• <strong>Cashiers</strong> are restricted exclusively to POS Billing.</div>
          <div>• <strong>Accountants</strong> have ledger and statutory tax access.</div>
          <div>• Contact your <strong>Business Owner (Admin)</strong> for permission elevation.</div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          {userRole === "CASHIER" ? (
            <Link
              href="/pos"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Go to POS Billing Terminal</span>
            </Link>
          ) : (
            <Link
              href="/"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Main Dashboard</span>
            </Link>
          )}

          <Link
            href="/login"
            className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
          >
            Switch Staff Account
          </Link>
        </div>
      </div>
    </div>
  );
}
