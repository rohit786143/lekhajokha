"use client";

import React, { useState } from "react";
import { usePosStore } from "@/lib/pos-store";
import { useTenantData } from "@/lib/use-tenant-data";
import { formatCurrency } from "@/lib/tax-engine";
import { RbacGuard } from "@/components/auth/rbac-guard";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Printer,
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles,
  PieChart,
  ShoppingBag,
} from "lucide-react";

export default function ProfitLossPage() {
  const { tenant } = usePosStore();
  const { invoices, expenses, products } = useTenantData();
  const [period, setPeriod] = useState<"TODAY" | "THIS_WEEK" | "THIS_MONTH" | "FISCAL_YEAR">("THIS_MONTH");

  // Calculate COGS and Gross Revenue from completed invoices
  let totalGrossRevenue = 0;
  let totalCogs = 0;

  const productProfitMap: {
    [key: string]: { name: string; qty: number; revenue: number; cost: number };
  } = {};

  invoices.forEach((inv) => {
    inv.items.forEach((it) => {
      const prod = products.find((p) => p.id === it.productId);
      const purchaseCostPerUnit = prod?.purchasePrice || (it.unitPrice * 0.7); // Fallback 70% if cost missing
      const lineCost = (Number(it.quantity) || 0) * purchaseCostPerUnit;
      const lineRevenue = (Number(it.taxableAmount) || (it.quantity * it.unitPrice));

      totalGrossRevenue += lineRevenue;
      totalCogs += lineCost;

      if (!productProfitMap[it.productId]) {
        productProfitMap[it.productId] = {
          name: prod?.name || it.product?.name || "Product",
          qty: 0,
          revenue: 0,
          cost: 0,
        };
      }
      productProfitMap[it.productId].qty += Number(it.quantity) || 0;
      productProfitMap[it.productId].revenue += lineRevenue;
      productProfitMap[it.productId].cost += lineCost;
    });
  });

  const totalOperatingExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const grossProfit = totalGrossRevenue - totalCogs;
  const grossMarginPercent = totalGrossRevenue > 0 ? (grossProfit / totalGrossRevenue) * 100 : 0;

  const netProfit = grossProfit - totalOperatingExpenses;
  const netMarginPercent = totalGrossRevenue > 0 ? (netProfit / totalGrossRevenue) * 100 : 0;

  // Group expenses by category
  const expenseCategoryMap: { [cat: string]: number } = {};
  expenses.forEach((e) => {
    expenseCategoryMap[e.category] = (expenseCategoryMap[e.category] || 0) + e.amount;
  });

  const expenseCategories = Object.entries(expenseCategoryMap).map(([category, amount]) => ({
    category,
    amount,
    percentage: totalOperatingExpenses > 0 ? (amount / totalOperatingExpenses) * 100 : 0,
  }));

  // Top profitable products
  const topProducts = Object.values(productProfitMap)
    .map((p) => ({
      ...p,
      profit: p.revenue - p.cost,
      margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 6);

  return (
    <RbacGuard
      allowedRoles={["OWNER", "TENANT_OWNER", "ACCOUNTANT"]}
      featureTitle="Profit & Loss Financial Analytics"
    >
      <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
        {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-400/30">
              Executive Financial Audit
            </span>
            <span className="text-xs text-slate-300">GST: {tenant.gstin}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Profit & Loss Analytics (P&L)
          </h1>
          <p className="text-xs text-slate-400">
            Real-time calculation of Gross Sales, Cost of Goods Sold (COGS), Operating Expenses & Net Earnings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/10">
            {(["TODAY", "THIS_WEEK", "THIS_MONTH", "FISCAL_YEAR"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  period === p
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {p === "THIS_WEEK" ? "Week" : p === "THIS_MONTH" ? "Month" : p === "FISCAL_YEAR" ? "FY 26-27" : "Today"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl backdrop-blur-md transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print P&L</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Gross Sales Revenue</span>
            <ShoppingBag className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {formatCurrency(totalGrossRevenue)}
          </div>
          <div className="text-[11px] text-slate-400">Total Taxable Sales Turnover</div>
        </div>

        {/* COGS */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Cost of Goods Sold (COGS)</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {formatCurrency(totalCogs)}
          </div>
          <div className="text-[11px] text-slate-400">Purchase Cost of Sold Items</div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Gross Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(grossProfit)}
          </div>
          <div className="text-[11px] text-emerald-600 font-bold">
            {grossMarginPercent.toFixed(1)}% Gross Margin
          </div>
        </div>

        {/* Net Profit */}
        <div
          className={`p-5 rounded-3xl border shadow-xs space-y-2 ${
            netProfit >= 0
              ? "bg-gradient-to-br from-emerald-950/40 to-slate-900 border-emerald-800/40 text-white"
              : "bg-gradient-to-br from-rose-950/40 to-slate-900 border-rose-800/40 text-white"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300">
            <span>Net Operating Profit</span>
            <DollarSign className={`w-4 h-4 ${netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`} />
          </div>
          <div
            className={`text-2xl font-black font-mono ${
              netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {formatCurrency(netProfit)}
          </div>
          <div className="text-[11px] text-slate-300 font-bold">
            {netMarginPercent.toFixed(1)}% Net Margin after OpEx
          </div>
        </div>
      </div>

      {/* Comprehensive Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Financial Statement Card (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-600" />
            <span>Consolidated Income Statement</span>
          </h2>

          <div className="space-y-3 text-xs divide-y divide-slate-100 dark:divide-slate-800">
            {/* Sales Revenue Section */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                <span>1. Gross Sales Revenue</span>
                <span className="font-mono">{formatCurrency(totalGrossRevenue)}</span>
              </div>
              <div className="flex justify-between text-slate-500 pl-4">
                <span>Less: Sales Returns / Credit Notes</span>
                <span className="font-mono">₹0.00</span>
              </div>
              <div className="flex justify-between font-extrabold text-indigo-600 pl-4">
                <span>Net Sales Turnover (A)</span>
                <span className="font-mono">{formatCurrency(totalGrossRevenue)}</span>
              </div>
            </div>

            {/* COGS Section */}
            <div className="space-y-1.5 pt-3">
              <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                <span>2. Cost of Goods Sold (COGS)</span>
                <span className="font-mono text-amber-600">({formatCurrency(totalCogs)})</span>
              </div>
              <div className="flex justify-between text-slate-500 pl-4">
                <span>Direct Product Purchase Costs</span>
                <span className="font-mono">{formatCurrency(totalCogs)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-emerald-600 pl-4">
                <span>Gross Profit = (A - B)</span>
                <span className="font-mono">{formatCurrency(grossProfit)}</span>
              </div>
            </div>

            {/* Operating Expenses Section */}
            <div className="space-y-1.5 pt-3">
              <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                <span>3. Operating Expenses (OpEx)</span>
                <span className="font-mono text-rose-600">
                  ({formatCurrency(totalOperatingExpenses)})
                </span>
              </div>
              {expenseCategories.map((ec) => (
                <div key={ec.category} className="flex justify-between text-slate-500 pl-4">
                  <span>{ec.category}</span>
                  <span className="font-mono">{formatCurrency(ec.amount)}</span>
                </div>
              ))}
            </div>

            {/* Final Net Profit */}
            <div className="pt-4 flex justify-between items-center text-base font-black text-slate-900 dark:text-white">
              <div>
                <div>Net Operating Earnings (EBIT)</div>
                <div className="text-[10px] text-slate-400 font-normal">
                  Gross Profit minus All Business Operational Costs
                </div>
              </div>
              <div
                className={`text-xl font-mono ${
                  netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
                }`}
              >
                {formatCurrency(netProfit)}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Top Profitable Items & Expense Distribution (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Top Margins Matrix */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Top Profit Yielding Items</span>
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            </h3>

            {topProducts.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                Generate sales bills in POS to compute product yield margins.
              </div>
            ) : (
              <div className="space-y-2.5">
                {topProducts.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white truncate max-w-[170px]">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {p.qty} sold • Margin: {p.margin.toFixed(1)}%
                      </div>
                    </div>
                    <span className="font-mono font-black text-emerald-600">
                      +{formatCurrency(p.profit)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expense Category Distribution */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Expense Allocation Matrix
            </h3>

            {expenseCategories.length === 0 ? (
              <div className="text-xs text-slate-400 py-4 text-center">
                No operating expenses recorded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {expenseCategories.map((ec) => (
                  <div key={ec.category} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700 dark:text-slate-300">{ec.category}</span>
                      <span className="font-mono">{formatCurrency(ec.amount)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(8, ec.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </RbacGuard>
  );
}
