"use client";

import React, { useState, useMemo } from "react";
import { useTenantData } from "@/lib/use-tenant-data";
import { usePosStore } from "@/lib/pos-store";
import { Invoice, InvoiceStatus, PaymentStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/tax-engine";
import { GstTaxInvoice } from "@/components/invoices/gst-tax-invoice";
import { ThermalReceipt } from "@/components/invoices/thermal-receipt";
import {
  FileText,
  Search,
  Calendar,
  Filter,
  Download,
  Printer,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Receipt,
  Building2,
  X,
  CreditCard,
  Wallet,
  QrCode,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

type DatePreset = "ALL" | "TODAY" | "YESTERDAY" | "THIS_WEEK" | "THIS_MONTH" | "CUSTOM";

export default function InvoicesRegisterPage() {
  const { invoices: tenantInvoices, tenant, firms } = useTenantData();
  const { activeFirmId, getActiveFirm } = usePosStore();

  const activeFirm =
    (typeof getActiveFirm === "function" ? getActiveFirm() : null) ||
    firms.find((f) => f.id === activeFirmId) ||
    firms[0] ||
    tenant;

  // Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>("THIS_MONTH");
  const [fromDate, setFromDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [toDate, setToDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"ALL" | PaymentStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal / Preview state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [previewFormat, setPreviewFormat] = useState<"A4" | "THERMAL">("A4");

  // Handle Preset Changes
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();

    if (preset === "TODAY") {
      const dateStr = today.toISOString().split("T")[0];
      setFromDate(dateStr);
      setToDate(dateStr);
    } else if (preset === "YESTERDAY") {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const dateStr = yest.toISOString().split("T")[0];
      setFromDate(dateStr);
      setToDate(dateStr);
    } else if (preset === "THIS_WEEK") {
      const firstDayOfWeek = new Date(today);
      const day = today.getDay() || 7; // Get current day (1 = Mon, 7 = Sun)
      firstDayOfWeek.setDate(today.getDate() - day + 1);
      setFromDate(firstDayOfWeek.toISOString().split("T")[0]);
      setToDate(today.toISOString().split("T")[0]);
    } else if (preset === "THIS_MONTH") {
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(firstDayOfMonth.toISOString().split("T")[0]);
      setToDate(today.toISOString().split("T")[0]);
    } else if (preset === "ALL") {
      setFromDate("");
      setToDate("");
    }
  };

  // Filter Invoices
  const filteredInvoices = useMemo(() => {
    return tenantInvoices.filter((inv) => {
      // Date Filter
      if (datePreset !== "ALL") {
        const invDate = new Date(inv.createdAt).toISOString().split("T")[0];
        if (fromDate && invDate < fromDate) return false;
        if (toDate && invDate > toDate) return false;
      }

      // Payment Status Filter
      if (paymentStatusFilter !== "ALL") {
        if (inv.paymentStatus !== paymentStatusFilter) return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const invNo = (inv.invoiceNo || "").toLowerCase();
        const partyName = (inv.party?.name || "").toLowerCase();
        const partyPhone = (inv.party?.phone || "").toLowerCase();
        const partyGstin = (inv.party?.gstin || "").toLowerCase();

        const matches =
          invNo.includes(q) ||
          partyName.includes(q) ||
          partyPhone.includes(q) ||
          partyGstin.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [tenantInvoices, datePreset, fromDate, toDate, paymentStatusFilter, searchQuery]);

  // Metrics summary
  const metrics = useMemo(() => {
    let totalCount = filteredInvoices.length;
    let totalTurnover = 0;
    let totalTaxable = 0;
    let totalTax = 0;
    let totalPaid = 0;
    let totalDue = 0;

    filteredInvoices.forEach((inv) => {
      totalTurnover += inv.grandTotal || 0;
      totalTaxable += inv.taxableAmount || 0;
      totalTax += (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0) + (inv.cess || 0);
      totalPaid += inv.paidAmount || 0;
      totalDue += inv.balanceAmount || 0;
    });

    return {
      totalCount,
      totalTurnover,
      totalTaxable,
      totalTax,
      totalPaid,
      totalDue,
    };
  }, [filteredInvoices]);

  // Export Filtered List to CSV
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      alert("No invoices found to export for the selected filters.");
      return;
    }

    const headers = [
      "Invoice No",
      "Date & Time",
      "Customer Name",
      "Customer Phone",
      "Customer GSTIN",
      "Type",
      "Payment Mode",
      "Payment Status",
      "Taxable Amount (INR)",
      "CGST (INR)",
      "SGST (INR)",
      "IGST (INR)",
      "Total Tax (INR)",
      "Grand Total (INR)",
      "Paid Amount (INR)",
      "Balance Due (INR)",
    ];

    const rows = filteredInvoices.map((inv) => {
      const modes = inv.paymentSplits?.map((s) => s.mode).join(" / ") || "CASH";
      const totalTax = (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0) + (inv.cess || 0);
      const createdStr = new Date(inv.createdAt).toLocaleString("en-IN");
      const isB2B = Boolean(inv.party?.gstin && inv.party.gstin.trim().length >= 15);

      return [
        `"${inv.invoiceNo}"`,
        `"${createdStr}"`,
        `"${inv.party?.name || "Walk-in Customer"}"`,
        `"${inv.party?.phone || "-"}"`,
        `"${inv.party?.gstin || "-"}"`,
        `"${isB2B ? "B2B" : "B2C / Walk-in"}"`,
        `"${modes}"`,
        `"${inv.paymentStatus}"`,
        (inv.taxableAmount || 0).toFixed(2),
        (inv.cgst || 0).toFixed(2),
        (inv.sgst || 0).toFixed(2),
        (inv.igst || 0).toFixed(2),
        totalTax.toFixed(2),
        (inv.grandTotal || 0).toFixed(2),
        (inv.paidAmount || 0).toFixed(2),
        (inv.balanceAmount || 0).toFixed(2),
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `invoices-register-${activeFirm.name.replace(/[^a-zA-Z0-9]/g, "_")}-${new Date()
        .toISOString()
        .split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPaymentModeBadge = (inv: Invoice) => {
    const modes = inv.paymentSplits?.map((s) => String(s.mode)) || ["CASH"];
    if (modes.includes("UPI")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold text-[10px]">
          <QrCode className="w-3 h-3" /> UPI
        </span>
      );
    }
    if (modes.includes("CARD")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold text-[10px]">
          <CreditCard className="w-3 h-3" /> CARD
        </span>
      );
    }
    if (modes.includes("BANK_TRANSFER") || modes.includes("NETBANKING") || modes.includes("CHEQUE")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 font-bold text-[10px]">
          <Building2 className="w-3 h-3" /> BANK
        </span>
      );
    }
    if (modes.includes("CREDIT")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px]">
          <Wallet className="w-3 h-3" /> KHATA/CREDIT
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
        <DollarSign className="w-3 h-3" /> CASH
      </span>
    );
  };

  const getStatusBadge = (status: PaymentStatus) => {
    if (status === "PAID") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-black text-xs">
          <CheckCircle2 className="w-3.5 h-3.5" /> PAID
        </span>
      );
    }
    if (status === "PARTIAL") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-black text-xs">
          <Clock className="w-3.5 h-3.5" /> PARTIAL
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-black text-xs">
        <AlertCircle className="w-3.5 h-3.5" /> UNPAID
      </span>
    );
  };

  return (
    <div className="p-3 sm:p-4 md:p-5 space-y-3 select-none pb-16">
      {/* Compact Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 p-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-100 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Billing Details & Invoices Register
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
              Track, filter, view details, and reprint past tax invoices & POS retail slips.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV / Excel</span>
        </button>
      </div>

      {/* Ultra-Compact Summary Ribbon Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Metric 1: Total Invoices */}
        <div className="p-3 px-4 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
              Total Invoices Count
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {metrics.totalCount}
              </span>
              <span className="text-[11px] text-slate-500 font-bold">Bills Issued</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              {fromDate || "Start"} to {toDate || "Present"}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 2: Total Sales Turnover */}
        <div className="p-3 px-4 bg-gradient-to-br from-emerald-50 to-white dark:from-slate-900 dark:to-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              Total Sales Turnover
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(metrics.totalTurnover)}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-semibold">
              <span>Taxable: {formatCurrency(metrics.totalTaxable)}</span>
              <span>Tax: {formatCurrency(metrics.totalTax)}</span>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 3: Paid vs Balance Due */}
        <div className="p-3 px-4 bg-gradient-to-br from-amber-50 to-white dark:from-slate-900 dark:to-amber-950/40 rounded-2xl border border-amber-100 dark:border-amber-900/40 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5 flex-1">
            <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">
              Settlement Breakdown
            </span>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div>
                <div className="text-[9px] uppercase font-extrabold text-emerald-600 dark:text-emerald-400">
                  Collected
                </div>
                <div className="text-base font-black text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(metrics.totalPaid)}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase font-extrabold text-rose-600 dark:text-rose-400">
                  Balance Due
                </div>
                <div className="text-base font-black text-rose-700 dark:text-rose-300">
                  {formatCurrency(metrics.totalDue)}
                </div>
              </div>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 ml-2">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Compact Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-2.5 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
          {/* Preset Buttons */}
          <div className="flex items-center flex-wrap gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            {(["TODAY", "YESTERDAY", "THIS_WEEK", "THIS_MONTH", "ALL", "CUSTOM"] as DatePreset[]).map(
              (preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetChange(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                    datePreset === preset
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {preset.replace("_", " ")}
                </button>
              )
            )}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Invoice No, Customer Name, Phone..."
              className="w-full pl-9 pr-7 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Secondary Row: Status & Count */}
        <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {datePreset === "CUSTOM" && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold">
                  <Calendar className="w-3 h-3 text-indigo-500" />
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase">From:</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs"
                  />
                </div>
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold">
                  <Calendar className="w-3 h-3 text-indigo-500" />
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase">To:</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-bold flex items-center gap-1">
                <Filter className="w-3 h-3" /> Status:
              </span>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-0.5 px-2 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="PAID">PAID</option>
                <option value="PARTIAL">PARTIAL</option>
                <option value="UNPAID">UNPAID / PENDING</option>
              </select>
            </div>
          </div>

          <div className="text-slate-500 font-bold">
            Showing <span className="text-indigo-600 dark:text-indigo-400 font-black">{filteredInvoices.length}</span> of {tenantInvoices.length} invoices
          </div>
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center text-slate-400">
              <Receipt className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                No Invoices Found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No billing records match your current date range or filter criteria. Try adjusting the search query or date presets above.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDatePreset("ALL");
                setPaymentStatusFilter("ALL");
                setSearchQuery("");
              }}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-bold text-xs rounded-xl transition"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4">Invoice No</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Customer Details</th>
                  <th className="py-3.5 px-4">Payment Mode</th>
                  <th className="py-3.5 px-4 text-right">Taxable (₹)</th>
                  <th className="py-3.5 px-4 text-right">Total Tax (₹)</th>
                  <th className="py-3.5 px-4 text-right">Grand Total (₹)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                {filteredInvoices.map((inv) => {
                  const isB2B = Boolean(inv.party?.gstin && inv.party.gstin.trim().length >= 15);
                  const totalTax = (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0) + (inv.cess || 0);

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                    >
                      {/* Invoice No */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setPreviewFormat("A4");
                          }}
                          className="font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{inv.invoiceNo}</span>
                          <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                        </button>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        <div className="font-bold">
                          {new Date(inv.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(inv.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Customer Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{inv.party?.name || "Walk-in Customer"}</span>
                          {isB2B ? (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-extrabold text-[9px]">
                              B2B
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-bold text-[9px]">
                              B2C
                            </span>
                          )}
                        </div>
                        {inv.party?.phone && (
                          <div className="text-[10px] font-mono text-slate-500">
                            Ph: {inv.party.phone}
                          </div>
                        )}
                        {inv.party?.gstin && (
                          <div className="text-[9px] font-mono text-slate-400">
                            GSTIN: {inv.party.gstin}
                          </div>
                        )}
                      </td>

                      {/* Payment Mode */}
                      <td className="py-3.5 px-4">{getPaymentModeBadge(inv)}</td>

                      {/* Taxable Amount */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatCurrency(inv.taxableAmount || 0)}
                      </td>

                      {/* Total Tax */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatCurrency(totalTax)}
                      </td>

                      {/* Grand Total */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                        {formatCurrency(inv.grandTotal || 0)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">{getStatusBadge(inv.paymentStatus)}</td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPreviewFormat("A4");
                            }}
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-xl transition cursor-pointer"
                            title="View Full Invoice Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPreviewFormat("THERMAL");
                            }}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-600 dark:text-emerald-300 rounded-xl transition cursor-pointer"
                            title="Quick Print 3-inch POS Slip"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Details & Print Preview Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-xs">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    Invoice Details: {selectedInvoice.invoiceNo}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    Customer: {selectedInvoice.party?.name || "Walk-in Customer"} | Total: {formatCurrency(selectedInvoice.grandTotal)}
                  </p>
                </div>
              </div>

              {/* Format Toggle Tabs */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setPreviewFormat("A4")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                      previewFormat === "A4"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    📄 A4 Tax Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFormat("THERMAL")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                      previewFormat === "THERMAL"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    🧾 3-inch POS Slip
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-2xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable Invoice Renderer */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950 flex justify-center">
              {previewFormat === "A4" ? (
                <div className="w-full max-w-3xl">
                  <GstTaxInvoice
                    invoice={selectedInvoice}
                    tenant={tenant}
                    firm={selectedInvoice.firm || activeFirm}
                    onClose={() => setSelectedInvoice(null)}
                  />
                </div>
              ) : (
                <div className="w-full max-w-md">
                  <ThermalReceipt
                    invoice={selectedInvoice}
                    tenant={tenant}
                    onClose={() => setSelectedInvoice(null)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
