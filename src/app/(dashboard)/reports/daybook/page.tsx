"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePosStore } from "@/lib/pos-store";
import { useTenantData } from "@/lib/use-tenant-data";
import { formatCurrency } from "@/lib/tax-engine";
import {
  Receipt,
  Calendar,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Banknote,
  Building2,
  Printer,
  Download,
} from "lucide-react";

export default function DaybookPage() {
  const { tenant } = usePosStore();
  const { invoices, expenses } = useTenantData();
  const [selectedDate, setSelectedDate] = useState<string>("2026-09-07");

  // Filter today's transactions
  const dayInvoices = invoices.filter((i) => i.createdAt.startsWith("2026-09"));
  const dayExpenses = expenses.filter((e) => e.expenseDate.startsWith("2026-09"));

  const totalInflow = dayInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
  const totalOutflow = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netMovement = totalInflow - totalOutflow;


  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
              Daybook & Cash Flow Journal
            </h1>
          </div>
          <p className="text-xs text-slate-500 pl-10">
            Consolidated chronological audit trail of all receipts and disbursements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition"
          >
            <Printer className="w-4 h-4" /> Print Daybook
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Inflow (Receipts)
          </span>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <ArrowDownLeft className="w-6 h-6 text-emerald-500" />
            <span>{formatCurrency(totalInflow)}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Outflow (Payments)
          </span>
          <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <ArrowUpRight className="w-6 h-6 text-rose-500" />
            <span>{formatCurrency(totalOutflow)}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-5 rounded-3xl shadow-md space-y-2">
          <span className="text-xs font-bold text-indigo-100 uppercase tracking-wider">
            Net Daily Balance Movement
          </span>
          <div className="text-2xl font-black font-mono">{formatCurrency(netMovement)}</div>
        </div>
      </div>

      {/* Combined Ledger Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-black text-sm text-slate-900 dark:text-white">
          Chronological Vouchers & Receipts
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Voucher Type & Reference</th>
                <th className="p-3.5">Particulars / Account</th>
                <th className="p-3.5">Date & Time</th>
                <th className="p-3.5">Payment Channel</th>
                <th className="p-3.5 text-right">Debit (₹ Out)</th>
                <th className="p-3.5 text-right">Credit (₹ In)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
              {/* Invoices as Credit */}
              {dayInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3.5 font-bold text-indigo-600">
                    SALE / {inv.invoiceNo}
                  </td>
                  <td className="p-3.5 font-sans font-bold text-slate-900 dark:text-white">
                    {inv.party?.name || "Cash Customer"}
                  </td>
                  <td className="p-3.5 text-slate-500">
                    {new Date(inv.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="p-3.5 font-sans">
                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-bold text-[10px]">
                      {inv.paymentSplits?.map((s) => s.mode).join(" + ") || "PAID"}
                    </span>
                  </td>
                  <td className="p-3.5 text-right text-slate-400">-</td>
                  <td className="p-3.5 text-right font-bold text-emerald-600">
                    {formatCurrency(inv.paidAmount)}
                  </td>
                </tr>
              ))}

              {/* Expenses as Debit */}
              {dayExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3.5 font-bold text-rose-600">EXPENSE</td>
                  <td className="p-3.5 font-sans font-bold text-slate-900 dark:text-white">
                    {exp.title} ({exp.category})
                  </td>
                  <td className="p-3.5 text-slate-500">{exp.expenseDate}</td>
                  <td className="p-3.5 font-sans">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold text-[10px]">
                      {exp.paymentMode}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-bold text-rose-600">
                    {formatCurrency(exp.amount)}
                  </td>
                  <td className="p-3.5 text-right text-slate-400">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
