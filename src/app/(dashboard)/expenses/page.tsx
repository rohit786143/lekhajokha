"use client";

import React, { useState } from "react";
import { usePosStore } from "@/lib/pos-store";
import { useTenantData } from "@/lib/use-tenant-data";
import { ExpenseItem, PaymentMode } from "@/lib/types";
import { formatCurrency } from "@/lib/tax-engine";
import {
  Wallet,
  Plus,
  Receipt,
  Banknote,
  Building2,
  Calendar,
  Search,
  Filter,
  X,
  TrendingDown,
  CheckCircle2,
} from "lucide-react";

export default function ExpensesPage() {
  const { tenant, addExpense } = usePosStore();
  const { expenses: tenantExpenses, invoices: tenantInvoices } = useTenantData();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);

  // New Expense state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Tea, Coffee & Staff Welfare");
  const [amount, setAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [notes, setNotes] = useState("");

  const totalExpenseAmount = tenantExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Total cash collected from POS invoices vs cash expenses
  const totalCashCollected = tenantInvoices
    .flatMap((i) => i.paymentSplits || [])
    .filter((sp) => sp.mode === "CASH")
    .reduce((sum, sp) => sum + sp.amount, 0);

  const totalCashSpent = tenantExpenses
    .filter((e) => e.paymentMode === "CASH")
    .reduce((sum, e) => sum + e.amount, 0);

  const netCashInDrawer = totalCashCollected - totalCashSpent;

  const filteredExpenses = tenantExpenses.filter(
    (e) =>
      !searchQuery ||
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const newExp: ExpenseItem = {
      id: `exp-${Date.now()}`,
      tenantId: tenant.id,
      category,
      title,
      amount: Number(amount) || 0,
      paymentMode,
      notes,
      expenseDate: new Date().toISOString().split("T")[0],
    };
    addExpense(newExp);
    setIsAddExpenseModalOpen(false);
    setTitle("");
    setAmount(0);
    setNotes("");
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
            Expense Tracking & Cash Drawer Reconciliation
          </h1>
          <p className="text-xs text-slate-500">
            Maintain exact cash-in-hand integrity and manage business operating costs.
          </p>
        </div>

        <button
          onClick={() => setIsAddExpenseModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Month Expenses</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
            {formatCurrency(totalExpenseAmount)}
          </div>
          <p className="text-[11px] text-slate-400">Across {tenantExpenses.length} expense vouchers</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>POS Cash Sales Inflow</span>
            <Banknote className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalCashCollected)}
          </div>
          <p className="text-[11px] text-slate-400">Total cash collected at till</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-5 rounded-3xl shadow-md space-y-2">
          <div className="flex items-center justify-between text-indigo-100 text-xs font-bold uppercase tracking-wider">
            <span>Net Drawer Cash-In-Hand</span>
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl font-black font-mono">{formatCurrency(netCashInDrawer)}</div>
          <p className="text-[11px] text-indigo-100">Live physical cash reconciliation</p>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Expense Title & Category</th>
                <th className="p-3.5">Payment Mode</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Notes</th>
                <th className="p-3.5 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredExpenses.map((exp) => (
                <tr
                  key={exp.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                >
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900 dark:text-white">{exp.title}</div>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded">
                      {exp.category}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[11px]">
                      {exp.paymentMode}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-500">{exp.expenseDate}</td>
                  <td className="p-3.5 text-slate-500">{exp.notes || "-"}</td>
                  <td className="p-3.5 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                    {formatCurrency(exp.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isAddExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Record Operating Expense
              </h3>
              <button
                onClick={() => setIsAddExpenseModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Expense Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Electricity bill / Staff snacks"
                  className="w-full mt-1 px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border rounded-xl"
                >
                  <option value="Rent & Utilities">Rent & Utilities</option>
                  <option value="Electricity & Power">Electricity & Power</option>
                  <option value="Tea, Coffee & Staff Welfare">Tea, Coffee & Staff Welfare</option>
                  <option value="Packaging & Stationery">Packaging & Stationery</option>
                  <option value="Transport & Freight">Transport & Freight</option>
                  <option value="Staff Salary & Wages">Staff Salary & Wages</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full mt-1 px-3 py-2 text-xs font-mono font-bold text-rose-600 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Payment Source
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  >
                    <option value="CASH">Cash Drawer</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Account</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Notes / Reference
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional bill or voucher reference"
                  className="w-full mt-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow transition"
                >
                  Save Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
