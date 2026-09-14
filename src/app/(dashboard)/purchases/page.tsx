"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePosStore } from "@/lib/pos-store";
import { useTenantData } from "@/lib/use-tenant-data";
import { formatCurrency } from "@/lib/tax-engine";
import { PurchaseInvoice } from "@/lib/types";
import {
  Truck,
  Plus,
  Search,
  Filter,
  Calendar,
  Building2,
  Receipt,
  ArrowUpRight,
  TrendingDown,
  Clock,
  CheckCircle2,
  Printer,
  X,
  CreditCard,
  ShoppingBag,
  Trash2,
} from "lucide-react";

export default function PurchasesPage() {
  const { tenant, deletePurchaseInvoice } = usePosStore();
  const { purchaseInvoices, parties, products } = useTenantData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseInvoice | null>(null);

  // Key KPI Aggregations
  const totalPurchaseSpend = purchaseInvoices.reduce((sum, p) => sum + p.grandTotal, 0);
  const totalVendorPayables = parties
    .filter((p) => p.currentBalance < 0)
    .reduce((sum, p) => sum + Math.abs(p.currentBalance), 0);
  const totalPaid = purchaseInvoices.reduce((sum, p) => sum + p.paidAmount, 0);

  const filteredPurchases = purchaseInvoices.filter(
    (p) =>
      !searchQuery ||
      p.billNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.vendorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-400/30">
              Procurement & Supply Chain
            </span>
            <span className="text-xs text-slate-300">GST: {tenant.gstin}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Purchases & Material Inward
          </h1>
          <p className="text-xs text-slate-400">
            Record supplier bills, automate inventory stock increments, and manage vendor payables.
          </p>
        </div>

        <Link
          href="/purchases/new"
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Inward Purchase Bill</span>
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Purchase Spend</span>
            <ShoppingBag className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {formatCurrency(totalPurchaseSpend)}
          </div>
          <div className="text-[11px] text-slate-400 font-semibold">
            {purchaseInvoices.length} Bills Processed
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Vendor Payables</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
            {formatCurrency(totalVendorPayables)}
          </div>
          <div className="text-[11px] text-slate-400">Due to suppliers (Khata)</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Settled Outward</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalPaid)}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold">Cleared via Bank / Cash</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Active Suppliers</span>
            <Building2 className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {parties.filter((p) => p.type === "VENDOR" || p.type === "BOTH").length} Vendors
          </div>
          <div className="text-[11px] text-slate-400">Registered Vendor Partners</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by vendor name or bill number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <Link
            href="/purchases/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl hover:bg-indigo-100 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Purchase</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          {filteredPurchases.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 mx-auto">
                <Truck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
                  No Purchase Invoices Found
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Record inward purchase bills from your suppliers to automatically update inventory stock and vendor payables.
                </p>
              </div>
              <Link
                href="/purchases/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Inward Bill</span>
              </Link>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Bill No</th>
                  <th className="p-3">Vendor / Supplier</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-center">Items</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3 text-right">Paid Amount</th>
                  <th className="p-3 text-right">Balance Due</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredPurchases.map((pur) => (
                  <tr
                    key={pur.id}
                    onClick={() => setSelectedPurchase(pur)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                  >
                    <td className="p-3 font-mono font-bold text-indigo-600">{pur.billNo}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      <div>{pur.vendorName}</div>
                      {pur.vendorGstin && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          GST: {pur.vendorGstin}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-slate-500">
                      {new Date(pur.billDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="p-3 text-center font-bold text-slate-700 dark:text-slate-300">
                      {pur.items.length} items
                    </td>
                    <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white">
                      {formatCurrency(pur.grandTotal)}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-emerald-600">
                      {formatCurrency(pur.paidAmount)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600">
                      {formatCurrency(pur.balanceAmount)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          pur.balanceAmount <= 0
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : pur.paidAmount > 0
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        }`}
                      >
                        {pur.balanceAmount <= 0 ? "PAID" : pur.paidAmount > 0 ? "PARTIAL" : "UNPAID"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPurchase(pur);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Are you sure you want to delete this inward bill?")) {
                              deletePurchaseInvoice(pur.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Purchase Detail Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Purchase Invoice Voucher
                </span>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Bill #{selectedPurchase.billNo}
                </h2>
              </div>
              <button
                onClick={() => setSelectedPurchase(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vendor and Meta Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block">Vendor</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedPurchase.vendorName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Bill Date</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {new Date(selectedPurchase.billDate).toLocaleDateString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Payment Mode</span>
                <span className="font-bold text-indigo-600">{selectedPurchase.paymentMode}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Place of Supply</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  State {selectedPurchase.placeOfSupply}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5">Batch / Exp</th>
                    <th className="p-2.5 text-right">Qty</th>
                    <th className="p-2.5 text-right">Purchase Rate</th>
                    <th className="p-2.5 text-right">GST %</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedPurchase.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.productName}
                        </div>
                        <div className="text-[10px] text-slate-400">HSN: {item.hsn}</div>
                      </td>
                      <td className="p-2.5 text-[11px] text-slate-600 dark:text-slate-400">
                        {item.batchNo ? (
                          <div>
                            <span className="font-mono font-bold">{item.batchNo}</span>
                            {item.expDate && (
                              <div className="text-[10px]">Exp: {item.expDate}</div>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="p-2.5 text-right font-mono">
                        {formatCurrency(item.purchasePrice)}
                      </td>
                      <td className="p-2.5 text-right font-mono">{item.taxRate}%</td>
                      <td className="p-2.5 text-right font-mono font-black text-slate-900 dark:text-white">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                {selectedPurchase.notes && <div>Notes: {selectedPurchase.notes}</div>}
              </div>

              <div className="space-y-1 text-right text-xs">
                <div className="flex justify-between gap-8 text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold">
                    {formatCurrency(selectedPurchase.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between gap-8 text-slate-500">
                  <span>Tax Amount:</span>
                  <span className="font-mono font-bold">
                    {formatCurrency(selectedPurchase.taxAmount)}
                  </span>
                </div>
                <div className="flex justify-between gap-8 text-base font-black text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span>Grand Total:</span>
                  <span className="font-mono text-indigo-600">
                    {formatCurrency(selectedPurchase.grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPurchase(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
