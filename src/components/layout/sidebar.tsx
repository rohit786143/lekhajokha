"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePosStore } from "@/lib/pos-store";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Wallet,
  FileSpreadsheet,
  Settings,
  Truck,
  Sparkles,
  ChevronDown,
  Building2,
  Receipt,
  RotateCcw,
  FileText,
  Barcode,
  TrendingUp,
  Database,
  ShieldCheck,
  Tag,
  ArrowRightLeft,
  DollarSign,
  ScanLine,
  Layers,
} from "lucide-react";

export interface NavSection {
  title: string;
  items: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    highlight?: boolean;
    badge?: string;
  }[];
}

export const ERP_NAV_SECTIONS: NavSection[] = [
  {
    title: "Billing & Sales",
    items: [
      { name: "Dashboard Hub", href: "/", icon: LayoutDashboard },
      { name: "POS Billing Terminal", href: "/pos", icon: ShoppingCart, highlight: true },
      { name: "Billing Details", href: "/sales/invoices", icon: Receipt },
      { name: "Quotations & Estimates", href: "/quotations", icon: FileText },
      { name: "Sales & Purchase Returns", href: "/returns", icon: RotateCcw },
    ],
  },
  {
    title: "Inventory & Purchasing",
    items: [
      { name: "Inventory & Batches", href: "/inventory", icon: Package },
      { name: "Categories Master", href: "/inventory/categories", icon: Layers },
      { name: "Quick Stock Inward", href: "/inventory/quick-inward", icon: ScanLine },
      { name: "Purchases & Inward", href: "/purchases", icon: Truck },
      { name: "Barcode Label Studio", href: "/tools/barcode-generator", icon: Barcode },
    ],
  },
  {
    title: "Accounting & Ledgers",
    items: [
      { name: "Party Khata & Ledgers", href: "/parties", icon: Users },
      { name: "Expenses & Cash Drawer", href: "/expenses", icon: Wallet },
      { name: "Profit & Loss Analytics", href: "/reports/profit-loss", icon: TrendingUp },
    ],
  },
  {
    title: "Statutory Tax & Audit",
    items: [
      { name: "GSTR-1 Tax Filing", href: "/reports/gstr1", icon: FileSpreadsheet },
      { name: "Daybook & Cashflow", href: "/reports/daybook", icon: Receipt },
      { name: "E-Way Bill NIC Hub", href: "/reports/eway-bill", icon: Truck },
    ],
  },
  {
    title: "Administration",
    items: [
      { name: "Company & Multi-Firm", href: "/settings/company", icon: Building2 },
      { name: "Team & Employees Hub", href: "/staff", icon: ShieldCheck },
      { name: "Backup & Recovery", href: "/settings/backup", icon: Database },
    ],
  },
];

export function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();
  const {
    tenant,
    firms,
    activeFirmId,
    setActiveFirmId,
    getActiveFirm,
    currentUser,
    staffUsers,
    logoutUser,
    switchUserRole,
  } = usePosStore();

  const tenantFirms = firms.filter(
    (f) => f.tenantId === tenant.id || (!f.tenantId && tenant.id === "tenant-vyapar-01")
  );

  const currentFirm =
    tenantFirms.find((f) => f.id === activeFirmId) ||
    tenantFirms.find((f) => f.isPrimary) ||
    tenantFirms[0] ||
    tenant;

  const activeUser = currentUser || staffUsers[0] || {
    name: "Rajesh Sharma (Owner)",
    email: "admin@vyaparflow.enterprise",
    role: "TENANT_OWNER" as const,
  };

  const handleLogout = () => {
    logoutUser();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  return (
    <div className="flex flex-col h-full select-none min-h-0 overflow-hidden">
      {/* Top Header & Firm Info */}
      <div className="space-y-3 shrink-0 pb-2">
        {/* Brand Header */}
        <div className="flex items-center px-1 py-0.5">
          <Link href="/" className="flex items-center gap-2 group">
            <img
              src="/logo.png"
              alt="लेखा जोखा ENTERPRISE ERP & GST SUITE"
              className="h-16 w-auto object-contain max-w-[243px] transition group-hover:scale-[1.02] drop-shadow-xs"
            />
          </Link>
        </div>

        {/* Business Active Firm Info Card */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between gap-1">
            <Link
              href="/settings/company"
              onClick={onItemClick}
              className="text-xs font-black text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition truncate"
              title="Click to view or edit company firm details"
            >
              {currentFirm.name}
            </Link>
            <Link
              href="/settings/company"
              onClick={onItemClick}
              className="text-[9px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold shrink-0"
            >
              Manage
            </Link>
          </div>

          <div className="text-[10px] font-mono text-slate-500 truncate flex items-center justify-between">
            <span className="truncate">GST: {currentFirm.gstin || "UNREGISTERED"}</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[9px] shrink-0">
              {currentFirm.stateCode || "27"} • ONLINE
            </span>
          </div>

          {/* Quick Firm Switcher if multiple firms exist for THIS tenant */}
          {tenantFirms.length > 1 && (
            <select
              value={activeFirmId}
              onChange={(e) => setActiveFirmId(e.target.value)}
              className="w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-1 px-2 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              title="Switch Active Business Firm"
            >
              {tenantFirms.map((f) => (
                <option key={f.id} value={f.id}>
                  🏢 {f.name} ({f.stateName || f.stateCode})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Categorized Navigation Sections - Full Height Scrollable */}
      <nav className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
        {ERP_NAV_SECTIONS.map((sec) => (
          <div key={sec.title} className="space-y-1">
            <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {sec.title}
            </div>
            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onItemClick}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                      item.highlight
                        ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/20 hover:from-indigo-500 hover:to-violet-500"
                        : isActive
                        ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-black border border-indigo-200/50 dark:border-indigo-800/50"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${item.highlight ? "text-white" : ""}`} />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px] font-black rounded-md">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
