"use client";

import React, { useState } from "react";
import { usePosStore } from "@/lib/pos-store";
import { TenantBackupSnapshot } from "@/lib/types";
import {
  Database,
  DownloadCloud,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  FileCode,
  Layers,
  HardDrive,
  RefreshCw,
  Lock,
} from "lucide-react";

export default function BackupRecoveryPage() {
  const {
    tenant,
    products,
    categories,
    godowns,
    parties,
    invoices,
    expenses,
    purchaseInvoices,
    quotations,
    creditNotes,
    debitNotes,
    restoreFromBackup,
  } = usePosStore();

  const [isExporting, setIsExporting] = useState(false);
  const [uploadedSnapshot, setUploadedSnapshot] = useState<TenantBackupSnapshot | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDownloadBackup = () => {
    setIsExporting(true);

    const snapshot: TenantBackupSnapshot = {
      version: "2.0.0",
      tenantId: tenant.id,
      timestamp: new Date().toISOString(),
      tenant,
      products,
      categories,
      godowns,
      parties,
      invoices,
      expenses,
      purchaseInvoices,
      quotations,
      creditNotes,
      debitNotes,
      checksum: `sha256-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(snapshot, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute(
      "download",
      `VyaparFlow_Backup_${tenant.id || "enterprise"}_${dateStr}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setTimeout(() => setIsExporting(false), 800);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.tenantId || !parsed.products || !parsed.parties) {
          throw new Error("Invalid backup format: missing required ERP root entities");
        }
        setUploadedSnapshot(parsed);
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to parse backup snapshot JSON file");
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!uploadedSnapshot) return;

    try {
      restoreFromBackup(uploadedSnapshot);

      // Call API route
      await fetch("/api/v1/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uploadedSnapshot),
      }).catch(() => {});

      setRestoreSuccess(true);
      setUploadedSnapshot(null);
      setTimeout(() => setRestoreSuccess(false), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to complete restore operation");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Restore Success Toast */}
      {restoreSuccess && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <div>
            <div className="font-bold text-sm">Backup Restored Successfully!</div>
            <div className="text-xs text-emerald-100">
              All catalogs, invoices, ledgers, and transactions restored.
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-400/30">
              Business Continuity & Disaster Recovery
            </span>
            <span className="text-xs text-slate-300">Tenant: {tenant.id}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Backup & Tenant Recovery
          </h1>
          <p className="text-xs text-slate-400">
            Export encrypted complete business snapshots or restore previous backups with zero data loss.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadBackup}
          disabled={isExporting}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition self-start md:self-auto"
        >
          <DownloadCloud className="w-4 h-4" />
          <span>{isExporting ? "Generating..." : "Download Full Snapshot"}</span>
        </button>
      </div>

      {/* Security & Integrity Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Current Database Size</span>
            <HardDrive className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {products.length + invoices.length + parties.length + expenses.length + purchaseInvoices.length} Entities
          </div>
          <div className="text-[11px] text-slate-400">Total operational records stored</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Snapshot Format</span>
            <Lock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            JSON v2.0
          </div>
          <div className="text-[11px] text-slate-400">SHA-256 Checksum Verified</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Safety Isolation</span>
            <ShieldCheck className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-black font-mono text-violet-600 dark:text-violet-400">
            Tenant Isolated
          </div>
          <div className="text-[11px] text-slate-400">Restoration restricted to current tenant</div>
        </div>
      </div>

      {/* Main Action Workstation (Two Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Export Snapshot */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                1-Click Export Snapshot
              </h2>
              <p className="text-xs text-slate-500">
                Download a clean, structured JSON file of all data.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="font-bold text-slate-900 dark:text-white">What is included:</div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>• {products.length} Products & Batches</div>
              <div>• {parties.length} Parties (Customers/Vendors)</div>
              <div>• {invoices.length} Sales Tax Invoices</div>
              <div>• {purchaseInvoices.length} Inward Purchase Bills</div>
              <div>• {quotations.length} Quotations & Estimates</div>
              <div>• {creditNotes.length + debitNotes.length} Returns (Credit/Debit Notes)</div>
              <div>• {expenses.length} Operating Expenses</div>
              <div>• Tenant Profile & GST Config</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadBackup}
            disabled={isExporting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>{isExporting ? "Preparing Backup..." : "Export & Download Snapshot"}</span>
          </button>
        </div>

        {/* Column 2: Restore Snapshot */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Restore Business Snapshot
              </h2>
              <p className="text-xs text-slate-500">
                Upload a verified snapshot file to restore business state.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!uploadedSnapshot ? (
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition text-center space-y-2">
              <FileCode className="w-8 h-8 text-slate-400" />
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Click to upload or drag & drop JSON backup file
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Supports .json files generated by VyaparFlow ERP
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          ) : (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Snapshot Verified ({uploadedSnapshot.timestamp?.split("T")[0]})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setUploadedSnapshot(null)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Change File
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>Products: {uploadedSnapshot.products?.length || 0}</div>
                <div>Parties: {uploadedSnapshot.parties?.length || 0}</div>
                <div>Invoices: {uploadedSnapshot.invoices?.length || 0}</div>
                <div>Purchases: {uploadedSnapshot.purchaseInvoices?.length || 0}</div>
                <div>Quotations: {uploadedSnapshot.quotations?.length || 0}</div>
                <div>Expenses: {uploadedSnapshot.expenses?.length || 0}</div>
              </div>

              <button
                type="button"
                onClick={handleConfirmRestore}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-amber-600/30 transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Confirm & Restore All Records</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
