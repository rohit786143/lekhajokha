"use client";

import React from "react";
import { usePosStore } from "@/lib/pos-store";
import { Sparkles, Layers, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function BillingSettingsPage() {
  const { tenant } = usePosStore();
  const plan = tenant.plan || "BASIC";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl mx-auto flex items-center justify-center">
          <Layers className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Subscription & Billing</h1>
        <p className="text-slate-500 max-w-lg mx-auto text-sm">
          You are currently on the <strong className="text-slate-700 dark:text-slate-300">{plan}</strong> plan.
          {plan === "BASIC" && " Upgrade to PRO to unlock advanced features."}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* BASIC PLAN */}
        <div className={`p-6 rounded-3xl border ${plan === "BASIC" ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800" : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"}`}>
          <h3 className="text-lg font-black mb-2 text-slate-900 dark:text-white">BASIC Plan</h3>
          <div className="text-2xl font-black mb-4">₹1,143<span className="text-sm font-normal text-slate-500"> / year</span></div>
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Single User</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Basic Billing & GST Invoices</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Basic Reports</li>
          </ul>
          {plan === "BASIC" && (
            <div className="mt-6 p-3 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-xl text-center font-bold text-sm">
              Current Plan
            </div>
          )}
        </div>

        {/* PRO PLAN */}
        <div className={`p-6 rounded-3xl border ${plan === "PRO" ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800" : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"}`}>
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-black mb-2 flex items-center gap-2 text-slate-900 dark:text-white">
              <Sparkles className="w-5 h-5 text-amber-500" /> PRO Plan
            </h3>
          </div>
          <div className="text-2xl font-black mb-4">₹1,843<span className="text-sm font-normal text-slate-500"> / year</span></div>
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> POS Billing Terminal</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Multi-Branch & Multi-GSTIN</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Advanced Reports & E-Way Bill</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Staff Roles & Management</li>
          </ul>
          
          {plan === "PRO" ? (
            <div className="mt-6 p-3 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-xl text-center font-bold text-sm">
              Current Plan
            </div>
          ) : (
            <button className="mt-6 w-full p-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm transition">
              Upgrade to PRO
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
