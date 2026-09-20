"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePosStore } from "@/lib/pos-store";
import {
  Sheet,
  Link2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Unplug,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  Shield,
  Zap,
} from "lucide-react";

interface SheetStatus {
  googleSheetId: string | null;
  isConnected: boolean;
  sheetTitle?: string;
}

const PERMANENT_SERVICE_EMAIL =
  "lekhajokha-bot@lekhajokha-509206.iam.gserviceaccount.com";

function getCleanInitialEmail(): string {
  const envEmail = process.env.NEXT_PUBLIC_GOOGLE_SERVICE_EMAIL;
  if (
    envEmail &&
    !envEmail.includes("your-gcp-project") &&
    !envEmail.includes("example.com") &&
    !envEmail.includes("lekha-jokha-sync")
  ) {
    return envEmail.trim();
  }
  return PERMANENT_SERVICE_EMAIL;
}

export function GoogleSheetSync() {
  const { tenant } = usePosStore();
  const tenantId = tenant?.id || "tenant-vyapar-01";

  const [serviceEmail, setServiceEmail] = useState<string>(getCleanInitialEmail);

  const [sheetUrl, setSheetUrl] = useState("");
  const [status, setStatus] = useState<SheetStatus>({
    googleSheetId: null,
    isConnected: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch current sheet settings on mount
  const fetchStatus = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await fetch(
        `/api/v1/sheet-settings?tenantId=${encodeURIComponent(tenantId)}`
      );
      const data = await res.json();
      if (data.success) {
        setStatus({
          googleSheetId: data.googleSheetId,
          isConnected: data.isConnected,
          sheetTitle: data.sheetTitle,
        });
        if (
          data.serviceEmail &&
          !data.serviceEmail.includes("your-gcp-project") &&
          !data.serviceEmail.includes("example.com") &&
          !data.serviceEmail.includes("lekha-jokha-sync")
        ) {
          setServiceEmail(data.serviceEmail.trim());
        }
      }
    } catch {
      // Silently fail — settings page should still render
    }
    setIsFetching(false);
  }, [tenantId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Copy email to clipboard
  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(serviceEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = serviceEmail;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Save & Test Connection
  const handleSaveAndTest = async () => {
    if (!sheetUrl.trim()) {
      setFeedback({
        type: "error",
        message: "Please enter your Google Sheet URL or ID.",
      });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/v1/sheet-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          sheetUrlOrId: sheetUrl.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus({
          googleSheetId: data.googleSheetId,
          isConnected: true,
          sheetTitle: data.sheetTitle,
        });
        setFeedback({
          type: data.warning ? "warning" : "success",
          message: data.warning || `✅ Connected to "${data.sheetTitle}"! Live sync is now active.`,
        });
        setSheetUrl("");
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Failed to connect. Please check the URL and try again.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: "Network error. Please check your connection and try again.",
      });
    }

    setIsLoading(false);
  };

  // Disconnect Sheet
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Google Sheet backup?")) return;

    try {
      await fetch(
        `/api/v1/sheet-settings?tenantId=${encodeURIComponent(tenantId)}`,
        { method: "DELETE" }
      );
      setStatus({ googleSheetId: null, isConnected: false });
      setFeedback({
        type: "success",
        message: "Google Sheet disconnected. Live sync is paused.",
      });
    } catch {
      setFeedback({ type: "error", message: "Failed to disconnect." });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Header with gradient accent */}
      <div className="relative px-6 pt-6 pb-4">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                Google Sheets Live Backup
                <span className="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold rounded-full border border-emerald-200 dark:border-emerald-800">
                  REAL-TIME
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Auto-sync Sales, Purchases, and Inventory to your private Google Sheet
              </p>
            </div>
          </div>

          {/* Connection Status Badge */}
          {!isFetching && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border ${
                status.isConnected
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  status.isConnected
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-slate-400"
                }`}
              />
              {status.isConnected ? "Connected" : "Not Connected"}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 pb-6 space-y-5">
        {/* Connected Sheet Info */}
        {status.isConnected && status.googleSheetId && (
          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  {status.sheetTitle || "Google Sheet Connected"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://docs.google.com/spreadsheets/d/${status.googleSheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:underline"
                >
                  Open Sheet <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-600 transition"
                >
                  <Unplug className="w-3 h-3" />
                  Disconnect
                </button>
              </div>
            </div>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/60 font-mono truncate">
              ID: {status.googleSheetId}
            </p>
          </div>
        )}

        {/* Setup Instructions */}
        {!status.isConnected && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Quick Setup (2 Minutes)
            </h4>
            <ol className="text-[11px] text-slate-600 dark:text-slate-400 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Create a new{" "}
                <a
                  href="https://sheets.new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  Google Sheet ↗
                </a>
              </li>
              <li>
                Rename the default tab to{" "}
                <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-mono text-[10px] font-bold">
                  Inventory_Live
                </code>{" "}
                and add two more tabs:{" "}
                <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-mono text-[10px] font-bold">
                  Sales_Log
                </code>{" "}
                and{" "}
                <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-mono text-[10px] font-bold">
                  Purchases_Log
                </code>
                <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  ✓ Column headers (Date, Item Name, Quantity, Price, Total, etc.) will be automatically set up on Row 1.
                </span>
              </li>
              <li>
                Click <strong>Share</strong> → Add the bot email below as <strong>Editor</strong>
              </li>
              <li>Paste the Sheet URL below and click <strong>Save & Test</strong></li>
            </ol>
          </div>
        )}

        {/* Service Account Email — Copyable */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-indigo-500" />
            Service Account Bot Email (share your sheet with this as Editor)
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={serviceEmail}
                readOnly
                className="w-full pl-3 pr-10 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 cursor-text select-all"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopyEmail}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 transition rounded-lg"
                title="Copy email"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
          {copied && (
            <p className="text-[10px] text-emerald-600 font-bold animate-in fade-in duration-200">
              ✓ Copied to clipboard!
            </p>
          )}
        </div>

        {/* Sheet URL Input */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Link2 className="w-3 h-3" />
            Google Sheet URL or ID
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="https://docs.google.com/spreadsheets/d/1aBcD.../edit or Sheet ID"
              value={sheetUrl}
              onChange={(e) => {
                setSheetUrl(e.target.value);
                setFeedback(null);
              }}
              className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
            <button
              onClick={handleSaveAndTest}
              disabled={isLoading || !sheetUrl.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white disabled:text-slate-500 font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition active:scale-95"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              <span>{isLoading ? "Testing..." : "Save & Test"}</span>
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {feedback && (
          <div
            className={`flex items-start gap-2 p-3 rounded-xl border text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              feedback.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : feedback.type === "warning"
                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Sync Info — What Gets Synced */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { label: "Inventory_Live", desc: "Real-time stock levels", icon: "📦" },
            { label: "Sales_Log", desc: "Every sale recorded", icon: "🧾" },
            { label: "Purchases_Log", desc: "Every inward entry", icon: "📥" },
          ].map((tab) => (
            <div
              key={tab.label}
              className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-center space-y-1"
            >
              <div className="text-lg">{tab.icon}</div>
              <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono">
                {tab.label}
              </div>
              <div className="text-[9px] text-slate-500">{tab.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
