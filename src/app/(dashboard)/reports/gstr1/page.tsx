"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePosStore } from "@/lib/pos-store";
import { useTenantData } from "@/lib/use-tenant-data";
import {
  formatCurrency,
  generateGstr1Payload,
  generateCaOfflineCsv,
  generateCaAuditSummaryCsv,
  INDIAN_STATES,
} from "@/lib/tax-engine";
import {
  Gstr1Payload,
  Gstr1B2BGroup,
  Gstr1B2CSItem,
  Gstr1CdnrRecord,
  Gstr1CdnurRecord,
  Gstr1ExportRecord,
  Gstr1DocCategorySummary,
  Gstr1HsnItem,
} from "@/lib/types";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  Building2,
  Users,
  CheckCircle2,
  FileJson,
  ArrowLeft,
  Search,
  Filter,
  AlertCircle,
  ChevronDown,
  FileText,
  FileCheck,
  Globe,
  Tag,
  TrendingUp,
  Receipt,
  FileCode,
} from "lucide-react";

type Gstr1Tab = "B2B" | "B2CS" | "CDNR" | "DOCS" | "EXP" | "HSN";

export default function Gstr1ReportPage() {
  const { tenant, firms, activeFirmId, getActiveFirm } = usePosStore();
  const { invoices, creditNotes, debitNotes } = useTenantData();

  const [activeTab, setActiveTab] = useState<Gstr1Tab>("B2B");
  const [financialPeriod, setFinancialPeriod] = useState<string>("092026"); // Sep 2026
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [isCaMenuOpen, setIsCaMenuOpen] = useState(false);

  // Active Firm Identity Consistent with Company Settings Page
  const activeFirm =
    (typeof getActiveFirm === "function" ? getActiveFirm() : null) ||
    firms.find((f) => f.id === activeFirmId) ||
    firms.find((f) => f.isPrimary) ||
    firms[0] ||
    tenant;

  const gstin = activeFirm?.gstin || tenant?.gstin || "UNREGISTERED";
  const legalName = activeFirm?.legalName || tenant?.legalName || activeFirm?.name || tenant?.name || "N/A";
  const tradeName = activeFirm?.name || tenant?.name || "N/A";

  const isUnregistered = !gstin || gstin.toUpperCase() === "UNREGISTERED" || gstin.trim().length < 15;
  const isComposition =
    (activeFirm as any)?.gstType === "COMPOSITION" || (tenant as any)?.gstType === "COMPOSITION";

  // Compute GSTR-1 Statutory Data
  const payload: Gstr1Payload = generateGstr1Payload(
    gstin,
    financialPeriod,
    invoices,
    creditNotes,
    debitNotes
  );

  // Total Tax Analytics
  const totalTaxable = invoices.reduce((sum, inv) => sum + inv.taxableAmount, 0);
  const totalCgst = invoices.reduce((sum, inv) => sum + inv.cgst, 0);
  const totalSgst = invoices.reduce((sum, inv) => sum + inv.sgst, 0);
  const totalIgst = invoices.reduce((sum, inv) => sum + inv.igst, 0);
  const totalTaxLiability = totalCgst + totalSgst + totalIgst;

  // JSON Export Trigger for India GST Portal
  const handleExportJson = () => {
    if (isUnregistered || isComposition) return;
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GSTR1_${gstin}_${financialPeriod}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // CA Offline Utility Export (.csv format)
  const handleExportCaOffline = () => {
    const csvContent = generateCaOfflineCsv(payload);
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GSTR1_CA_Offline_Excel_${gstin}_${financialPeriod}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // CA Audit Summary Register Export (.csv format)
  const handleExportCaAuditRegister = () => {
    const csvContent = generateCaAuditSummaryCsv(invoices, creditNotes, debitNotes);
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GSTR1_CA_Audit_Register_${gstin}_${financialPeriod}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 font-sans space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
              GSTR-1 Statutory Return Filing Hub
            </h1>
          </div>
          {/* Sub-header identity badge conforming to Company Settings */}
          <div className="text-xs text-slate-500 pl-10 flex flex-wrap items-center gap-2 pt-0.5">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono font-bold border border-indigo-200 dark:border-indigo-800">
              GSTIN: {gstin}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">Legal: {legalName}</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="font-semibold text-slate-600 dark:text-slate-400">Trade: {tradeName}</span>
          </div>
        </div>

        {/* Financial Period & Export Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-700 dark:text-slate-300">Period:</span>
            <select
              value={financialPeriod}
              onChange={(e) => setFinancialPeriod(e.target.value)}
              className="bg-transparent font-black text-slate-900 dark:text-white font-mono cursor-pointer outline-hidden"
            >
              <option value="092026">Sep 2026 (092026)</option>
              <option value="082026">Aug 2026 (082026)</option>
              <option value="072026">Jul 2026 (072026)</option>
            </select>
          </div>

          {/* CA Export Options Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCaMenuOpen(!isCaMenuOpen)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-black text-slate-800 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>CA Export Options</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {isCaMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 py-2 text-xs font-medium divide-y divide-slate-100 dark:divide-slate-800 animate-fade-in">
                <button
                  type="button"
                  onClick={() => {
                    handleExportCaOffline();
                    setIsCaMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-emerald-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-start gap-2.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Download CA Offline Excel</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                      Multi-sheet GST Offline Utility CSV/Excel (b2b, b2cs, cdnr, hsn, docs)
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleExportCaAuditRegister();
                    setIsCaMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-start gap-2.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">CA Audit Summary (.csv)</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                      Flat detailed register of all transactions with tax breakdowns
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* GST Portal JSON Export Button */}
          <div className="relative group">
            <button
              type="button"
              disabled={isUnregistered || isComposition}
              onClick={handleExportJson}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-xl transition shadow-sm ${
                isUnregistered || isComposition
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-300 dark:border-slate-700"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 cursor-pointer active:scale-95"
              }`}
            >
              <FileJson className="w-4 h-4" />
              <span>Export GST Portal JSON</span>
            </button>
            {(isUnregistered || isComposition) && (
              <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50 w-64 p-3 bg-slate-900 text-white text-[11px] rounded-xl shadow-xl border border-slate-700 font-sans leading-snug">
                Regular 15-digit GSTIN registration is required to export GSTR-1 JSON for portal filing.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unregistered / Composition State Warning Banner */}
      {(isUnregistered || isComposition) && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-medium shadow-xs animate-fade-in">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            Firm is currently <strong>Unregistered</strong> or under <strong>Composition Scheme</strong>. GSTR-1 statutory generation and GST Portal JSON filing are applicable only to Regular GSTIN holders.
          </span>
        </div>
      )}

      {/* KPI Cards: Turnover, Tax Liability */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Gross Taxable Turnover
          </span>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {formatCurrency(totalTaxable)}
          </div>
          <p className="text-[11px] text-slate-500">Across {invoices.length} Registered Outward Bills</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Output CGST + SGST
          </span>
          <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
            {formatCurrency(totalCgst + totalSgst)}
          </div>
          <p className="text-[11px] text-slate-500">
            CGST: {formatCurrency(totalCgst)} | SGST: {formatCurrency(totalSgst)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Output IGST
          </span>
          <div className="text-2xl font-black font-mono text-violet-600 dark:text-violet-400">
            {formatCurrency(totalIgst)}
          </div>
          <p className="text-[11px] text-slate-500">Inter-State outward supplies</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-5 rounded-2xl shadow-md space-y-2">
          <span className="text-xs font-bold text-indigo-100 uppercase tracking-wider">
            Total Output Tax Liability
          </span>
          <div className="text-2xl font-black font-mono">{formatCurrency(totalTaxLiability)}</div>
          <p className="text-[11px] text-indigo-100">Ready for GSTR-3B tax offset</p>
        </div>
      </div>

      {/* Tabs & Table Explorer */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 px-6 pt-4 gap-2 md:gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={() => setActiveTab("B2B")}
            className={`pb-3 text-xs font-black transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === "B2B"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Table 4A - B2B Invoices ({payload.b2b.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("B2CS")}
            className={`pb-3 text-xs font-black transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === "B2CS"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Table 7 - B2C Small ({payload.b2cs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("CDNR")}
            className={`pb-3 text-xs font-black transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === "CDNR"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Table 9B - Credit/Debit Notes ({payload.cdnr.length + payload.cdnur.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("DOCS")}
            className={`pb-3 text-xs font-black transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === "DOCS"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Table 13 - Doc Summary ({payload.doc_issue.doc_det.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("EXP")}
            className={`pb-3 text-xs font-black transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === "EXP"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Table 6A/6B - Exports & SEZ ({payload.exp.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("HSN")}
            className={`pb-3 text-xs font-black transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === "HSN"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Table 12 - HSN Summary ({payload.hsn.data.length})</span>
          </button>
        </div>

        {/* Tab 1: Table 4A B2B */}
        {activeTab === "B2B" && (
          <div className="p-6 overflow-x-auto">
            {payload.b2b.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold">No B2B invoices found for this financial period.</p>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Customer GSTIN</th>
                    <th className="p-3">Invoice No</th>
                    <th className="p-3">Invoice Date</th>
                    <th className="p-3 text-right">Invoice Value</th>
                    <th className="p-3">POS State</th>
                    <th className="p-3 text-right">Taxable Value</th>
                    <th className="p-3 text-right">IGST</th>
                    <th className="p-3 text-right">CGST</th>
                    <th className="p-3 text-right">SGST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                  {payload.b2b.map((group) =>
                    group.inv.map((inv, idx) => (
                      <tr
                        key={`${group.ctin}-${idx}`}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="p-3 font-bold text-indigo-600">{group.ctin}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {inv.inum}
                        </td>
                        <td className="p-3">{inv.idt}</td>
                        <td className="p-3 text-right font-bold">
                          {formatCurrency(inv.val)}
                        </td>
                        <td className="p-3">
                          {inv.pos} - {INDIAN_STATES[inv.pos] || "State"}
                        </td>
                        <td className="p-3 text-right font-semibold">
                          {formatCurrency(inv.itms[0]?.itm_det.txval || 0)}
                        </td>
                        <td className="p-3 text-right">
                          {formatCurrency(inv.itms[0]?.itm_det.iamt || 0)}
                        </td>
                        <td className="p-3 text-right">
                          {formatCurrency(inv.itms[0]?.itm_det.camt || 0)}
                        </td>
                        <td className="p-3 text-right">
                          {formatCurrency(inv.itms[0]?.itm_det.samt || 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Table 7 B2CS */}
        {activeTab === "B2CS" && (
          <div className="p-6 overflow-x-auto">
            {payload.b2cs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold">No B2C small retail sales recorded for this period.</p>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Type</th>
                    <th className="p-3">Place of Supply</th>
                    <th className="p-3 text-center">Rate (%)</th>
                    <th className="p-3 text-right">Taxable Value</th>
                    <th className="p-3 text-right">IGST</th>
                    <th className="p-3 text-right">CGST</th>
                    <th className="p-3 text-right">SGST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                  {payload.b2cs.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="p-3 font-bold">{item.sply_ty}</td>
                      <td className="p-3">
                        {item.pos} - {INDIAN_STATES[item.pos] || "State"}
                      </td>
                      <td className="p-3 text-center font-bold text-indigo-600">{item.rt}%</td>
                      <td className="p-3 text-right font-bold">
                        {formatCurrency(item.txval)}
                      </td>
                      <td className="p-3 text-right">{formatCurrency(item.iamt)}</td>
                      <td className="p-3 text-right">{formatCurrency(item.camt)}</td>
                      <td className="p-3 text-right">{formatCurrency(item.samt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Table 9B Credit / Debit Notes (CDNR & CDNUR) */}
        {activeTab === "CDNR" && (
          <div className="p-6 overflow-x-auto space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Registered Buyer Notes (CDNR)
              </h3>
              {payload.cdnr.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  No credit or debit notes issued to registered buyers.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Note No & Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Customer GSTIN / Name</th>
                      <th className="p-3">Original Inv No</th>
                      <th className="p-3 text-right">Note Value</th>
                      <th className="p-3 text-right">Taxable Value</th>
                      <th className="p-3 text-right">IGST</th>
                      <th className="p-3 text-right">CGST</th>
                      <th className="p-3 text-right">SGST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                    {payload.cdnr.map((note, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3 font-bold text-indigo-600">
                          {note.nt_num} ({note.nt_dt})
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              note.ntty === "C"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            }`}
                          >
                            {note.ntty === "C" ? "CREDIT NOTE" : "DEBIT NOTE"}
                          </span>
                        </td>
                        <td className="p-3 font-bold">{note.ctin} ({note.cname || "Customer"})</td>
                        <td className="p-3">{note.inum}</td>
                        <td className="p-3 text-right font-bold">{formatCurrency(note.val)}</td>
                        <td className="p-3 text-right">{formatCurrency(note.txval)}</td>
                        <td className="p-3 text-right">{formatCurrency(note.iamt)}</td>
                        <td className="p-3 text-right">{formatCurrency(note.camt)}</td>
                        <td className="p-3 text-right">{formatCurrency(note.samt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Unregistered Buyer Notes (CDNUR)
              </h3>
              {payload.cdnur.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  No credit or debit notes issued to unregistered buyers.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Note No & Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Original Inv No</th>
                      <th className="p-3 text-right">Note Value</th>
                      <th className="p-3 text-right">Taxable Value</th>
                      <th className="p-3 text-right">IGST</th>
                      <th className="p-3 text-right">CGST</th>
                      <th className="p-3 text-right">SGST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                    {payload.cdnur.map((note, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3 font-bold text-indigo-600">
                          {note.nt_num} ({note.nt_dt})
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              note.ntty === "C"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            }`}
                          >
                            {note.ntty === "C" ? "CREDIT NOTE" : "DEBIT NOTE"}
                          </span>
                        </td>
                        <td className="p-3">{note.inum}</td>
                        <td className="p-3 text-right font-bold">{formatCurrency(note.val)}</td>
                        <td className="p-3 text-right">{formatCurrency(note.txval)}</td>
                        <td className="p-3 text-right">{formatCurrency(note.iamt)}</td>
                        <td className="p-3 text-right">{formatCurrency(note.camt)}</td>
                        <td className="p-3 text-right">{formatCurrency(note.samt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Table 13 Document Summary */}
        {activeTab === "DOCS" && (
          <div className="p-6 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Doc Code</th>
                  <th className="p-3">Nature of Document Category</th>
                  <th className="p-3">Serial No From</th>
                  <th className="p-3">Serial No To</th>
                  <th className="p-3 text-center">Total Count</th>
                  <th className="p-3 text-center">Cancelled</th>
                  <th className="p-3 text-center font-bold text-indigo-600">Net Issued Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                {payload.doc_issue.doc_det.map((doc) => (
                  <tr key={doc.doc_num} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3 font-bold text-slate-500">#{doc.doc_num}</td>
                    <td className="p-3 font-sans font-bold text-slate-900 dark:text-white">
                      {doc.doc_name}
                    </td>
                    <td className="p-3 text-indigo-600 font-bold">{doc.from}</td>
                    <td className="p-3 text-indigo-600 font-bold">{doc.to}</td>
                    <td className="p-3 text-center font-bold">{doc.totcnt}</td>
                    <td className="p-3 text-center text-rose-600 font-bold">{doc.cancnt}</td>
                    <td className="p-3 text-center font-black text-indigo-600 text-sm">
                      {doc.net_issue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Table 6A/6B Exports & SEZ Supplies */}
        {activeTab === "EXP" && (
          <div className="p-6 overflow-x-auto">
            {payload.exp.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Globe className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold">No export or SEZ zero-rated supplies found for this period.</p>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Export Type</th>
                    <th className="p-3">Invoice No & Date</th>
                    <th className="p-3">Shipping Bill / Port</th>
                    <th className="p-3 text-right">Invoice Value</th>
                    <th className="p-3 text-right">Taxable Value</th>
                    <th className="p-3 text-right">IGST Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                  {payload.exp.map((exp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3 font-bold text-indigo-600">{exp.exp_typ}</td>
                      <td className="p-3 font-bold">{exp.inum} ({exp.idt})</td>
                      <td className="p-3">
                        {exp.sbnum || "N/A"} ({exp.port_code || "PORT"})
                      </td>
                      <td className="p-3 text-right font-bold">{formatCurrency(exp.val)}</td>
                      <td className="p-3 text-right">{formatCurrency(exp.txval)}</td>
                      <td className="p-3 text-right text-indigo-600 font-bold">{formatCurrency(exp.iamt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 6: Table 12 HSN Summary */}
        {activeTab === "HSN" && (
          <div className="p-6 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">HSN Code</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">UQC</th>
                  <th className="p-3 text-center">Total Qty</th>
                  <th className="p-3 text-right">Total Value</th>
                  <th className="p-3 text-right">Taxable Value</th>
                  <th className="p-3 text-right">Integrated Tax</th>
                  <th className="p-3 text-right">Central Tax</th>
                  <th className="p-3 text-right">State Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                {payload.hsn.data.map((hsnItem) => (
                  <tr
                    key={hsnItem.num}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="p-3 font-bold">{hsnItem.num}</td>
                    <td className="p-3 font-bold text-indigo-600">{hsnItem.hsn_sc}</td>
                    <td className="p-3 font-sans font-medium text-slate-800 dark:text-slate-200">
                      {hsnItem.desc}
                    </td>
                    <td className="p-3">{hsnItem.uqc}</td>
                    <td className="p-3 text-center font-bold">{hsnItem.qty}</td>
                    <td className="p-3 text-right">{formatCurrency(hsnItem.val)}</td>
                    <td className="p-3 text-right font-bold">
                      {formatCurrency(hsnItem.txval)}
                    </td>
                    <td className="p-3 text-right">{formatCurrency(hsnItem.iamt)}</td>
                    <td className="p-3 text-right">{formatCurrency(hsnItem.camt)}</td>
                    <td className="p-3 text-right">{formatCurrency(hsnItem.samt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
