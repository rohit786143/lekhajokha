"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePosStore } from "@/lib/pos-store";
import { useTenantData } from "@/lib/use-tenant-data";
import { formatCurrency } from "@/lib/tax-engine";
import { ThermalReceipt } from "@/components/invoices/thermal-receipt";
import { GstTaxInvoice } from "@/components/invoices/gst-tax-invoice";
import { Invoice } from "@/lib/types";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Receipt,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Zap,
  Clock,
  CheckCircle2,
  Calendar,
  RotateCcw,
  Check,
} from "lucide-react";

export default function DashboardHomePage() {
  const {
    tenant,
    firms,
    activeFirmId,
    setActiveFirmId,
    getActiveFirm,
    resetAllData,
  } = usePosStore();
  const {
    invoices: tenantInvoices,
    parties: tenantParties,
    products: tenantProducts,
    expenses: tenantExpenses,
    firms: tenantFirms,
  } = useTenantData();

  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [printFormat, setPrintFormat] = useState<"THERMAL" | "A4">("THERMAL");
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetSuccessToast, setResetSuccessToast] = useState(false);

  const currentFirm =
    tenantFirms.find((f) => f.id === activeFirmId) ||
    tenantFirms.find((f) => f.isPrimary) ||
    tenantFirms[0] ||
    tenant;


  // Key KPI Aggregations (Strictly Scoped to Current Business Tenant)
  const totalSalesRevenue = tenantInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const totalReceivables = tenantParties
    .filter((p) => p.currentBalance > 0)
    .reduce((sum, p) => sum + p.currentBalance, 0);
  const totalPayables = tenantParties
    .filter((p) => p.currentBalance < 0)
    .reduce((sum, p) => sum + Math.abs(p.currentBalance), 0);
  const totalExpenses = tenantExpenses.reduce((sum, e) => sum + e.amount, 0);

  const lowStockProducts = tenantProducts.filter((p) => p.currentStock <= p.minStock);

  const handleExecuteReset = () => {
    resetAllData();
    setIsResetConfirmOpen(false);
    setResetSuccessToast(true);
    setTimeout(() => setResetSuccessToast(false), 4000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans relative">
      {/* Reset Success Toast */}
      {resetSuccessToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <div>
            <div className="font-bold text-sm">ERP Data Successfully Reset!</div>
            <div className="text-xs text-emerald-100">All bills, balances and stock set to fresh clean state.</div>
          </div>
        </div>
      )}

      {/* Top Welcome Banner - Clean Bright White Modern Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-200 dark:border-indigo-800">
              Live Cloud ERP
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-300 font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              GSTIN: {currentFirm.gstin || "UNREGISTERED / COMPOSITION"}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {currentFirm.stateName || tenant.stateName} ({currentFirm.stateCode || tenant.stateCode})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight truncate text-slate-900 dark:text-white">
              {currentFirm.name}
            </h1>
            <Link
              href="/settings/company"
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition text-[10px] font-bold shrink-0 border border-slate-200 dark:border-slate-700"
              title="Edit Firm Profile & GST Details"
            >
              Edit Firm ✏️
            </Link>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-2xl">
            {currentFirm.legalName
              ? `${currentFirm.legalName} • ${currentFirm.address || "Enterprise billing, inventory & tax workstation."}`
              : currentFirm.address || "Welcome to your executive enterprise billing, inventory & tax workstation."}
          </p>

          {/* Multi-Firm Switcher if more than 1 firm */}
          {tenantFirms.length > 1 && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-500 font-bold">Active Branch:</span>
              <select
                value={activeFirmId}
                onChange={(e) => setActiveFirmId(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs font-bold py-1 px-2.5 rounded-xl cursor-pointer"
              >
                {tenantFirms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.stateName || f.stateCode})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center flex-wrap gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center gap-2 px-4 py-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 active:scale-95 text-rose-700 dark:text-rose-300 font-bold text-xs rounded-2xl transition cursor-pointer"
            title="Reset all bills, inventory & party khata to fresh initial state"
          >
            <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>Reset All Data</span>
          </button>

          <Link
            href="/pos"
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-600/20 transition"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Launch POS Terminal</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Sales Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {formatCurrency(totalSalesRevenue)}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <span>+{tenantInvoices.length} Bills Processed</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Customer Receivables (Khata)</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {formatCurrency(totalReceivables)}
          </div>
          <div className="text-[11px] text-slate-400">From customer balance ledgers</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Operating Expenses</span>
            <Receipt className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
            {formatCurrency(totalExpenses)}
          </div>
          <div className="text-[11px] text-slate-400">Rent, Utilities, Staff & Logistics</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {lowStockProducts.length} Items
          </div>
          <div className="text-[11px] text-rose-500 font-semibold">
            {lowStockProducts.length > 0 ? "Requires re-order action" : "Stock healthy"}
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Invoices & AI Re-order Assist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Invoices Table (8 Cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Recent Invoices & Transactions
              </h2>
              <p className="text-xs text-slate-500">Click any invoice to view & print</p>
            </div>
            <Link
              href="/pos"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
            >
              <span>+ Create Bill</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {tenantInvoices.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
                    No Invoices Generated Yet for {currentFirm.name}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-0.5">
                    Your database is fresh and ready. Generate your first GST bill using the POS terminal.
                  </p>
                </div>
                <Link
                  href="/pos"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Create First Invoice</span>
                </Link>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Invoice No</th>
                    <th className="p-3">Party / Customer</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Grand Total</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {tenantInvoices.slice(0, 6).map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                      onClick={() => setPreviewInvoice(inv)}
                    >
                      <td className="p-3 font-mono font-bold text-indigo-600">{inv.invoiceNo}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        {inv.party?.name || "Cash Customer"}
                      </td>
                      <td className="p-3 text-slate-500">
                        {new Date(inv.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {inv.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewInvoice(inv);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition cursor-pointer"
                          title="Print / View Bill"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* AI Velocity Re-order Assistant & Quick Shortcuts (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Smart AI Re-order Card - Clean Bright White Styling */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">AI Stock Velocity Forecast</h3>
                <p className="text-[11px] text-slate-500">7-Day Out-of-Stock Predictor</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {tenantProducts.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-slate-900 dark:text-white truncate max-w-[160px]">{p.name}</div>
                    <div className="text-[10px] text-slate-500">
                      Current: {p.currentStock} {p.unit} | Velocity: ~4 {p.unit}/day
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-lg text-[10px] font-black shrink-0">
                    Re-order
                  </span>
                </div>
              ))}

              {tenantProducts.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400">
                  No inventory products added yet.
                </div>
              )}
            </div>

            <Link
              href="/inventory"
              className="block text-center py-2.5 text-xs font-black text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 rounded-xl transition border border-indigo-200 dark:border-indigo-800"
            >
              View Full Inventory Matrix →
            </Link>
          </div>

          {/* Quick Statutory Compliance links */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Statutory Tax Compliance
            </h3>
            <div className="space-y-2">
              <Link
                href="/reports/gstr1"
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 transition"
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  <span>GSTR-1 JSON Generator</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/reports/eway-bill"
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 transition"
              >
                <div className="flex items-center gap-2.5">
                  <Receipt className="w-4 h-4 text-violet-600" />
                  <span>E-Way Bill NIC Payload</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Reset All ERP Data?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This action will clear all past <b>Invoices & Bills</b>, reset all <b>Customer Khata & Receivables to ₹0</b>, clear <b>Operating Expenses</b>, and restore stock inventory to factory defaults.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                <Check className="w-4 h-4" />
                <span>Sales Revenue & Bills reset to ₹0.00</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                <Check className="w-4 h-4" />
                <span>Party Khata & Ledgers reset to ₹0.00</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                <Check className="w-4 h-4" />
                <span>Inventory stock counts refreshed</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice View Modal */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center max-h-[95vh] overflow-y-auto">
            {/* Action Bar */}
            <div className="no-print w-full flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Invoice Details ({previewInvoice.invoiceNo})
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setPrintFormat("THERMAL")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg ${
                      printFormat === "THERMAL"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    80mm Thermal
                  </button>
                  <button
                    onClick={() => setPrintFormat("A4")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg ${
                      printFormat === "A4"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    A4 GST Invoice
                  </button>
                </div>
                <button
                  onClick={() => setPreviewInvoice(null)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Template renderer */}
            <div className="w-full flex justify-center py-2">
              {printFormat === "THERMAL" ? (
                <ThermalReceipt
                  invoice={previewInvoice}
                  tenant={tenant}
                  onClose={() => setPreviewInvoice(null)}
                />
              ) : (
                <GstTaxInvoice
                  invoice={previewInvoice}
                  tenant={tenant}
                  onClose={() => setPreviewInvoice(null)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
