"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePosStore } from "@/lib/pos-store";
import { parseBarcode } from "@/lib/barcode-parser";
import { X, Scan, Barcode, CheckCircle2, AlertCircle, Camera, Zap, Sparkles } from "lucide-react";

export const BarcodeScannerModal: React.FC = () => {
  const { isBarcodeModalOpen, setIsBarcodeModalOpen, products, addItemToCart } = usePosStore();
  const [manualCode, setManualCode] = useState<string>("");
  const [scanFeedback, setScanFeedback] = useState<{ success: boolean; message: string; isGs1?: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isBarcodeModalOpen) {
      setScanFeedback(null);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isBarcodeModalOpen]);

  if (!isBarcodeModalOpen) return null;

  const handleProcessCode = (codeToScan: string) => {
    const clean = codeToScan.trim();
    if (!clean) return;

    // Parse via GS1-128 / DataMatrix parser
    const parsed = parseBarcode(clean);

    // Search by GTIN, Barcode, SKU, or Serial/IMEI
    const matchedProduct = products.find((p) => {
      if (parsed.gtin) {
        const cleanGtin = parsed.gtin.replace(/^0+/, "");
        if (p.barcode && (p.barcode === parsed.gtin || p.barcode.endsWith(cleanGtin) || cleanGtin.endsWith(p.barcode))) {
          return true;
        }
      }
      if (p.barcode === clean || p.sku.toLowerCase() === clean.toLowerCase()) return true;
      if (parsed.serialNo && p.serials?.some((s) => s.serialOrImei === parsed.serialNo)) return true;
      if (p.serials?.some((s) => s.serialOrImei === clean)) return true;
      return false;
    });

    if (matchedProduct) {
      // Find matching batch if parsed from GS1
      let matchedBatch = matchedProduct.batches?.[0];
      if (parsed.batchNo && matchedProduct.batches) {
        const specificBatch = matchedProduct.batches.find((b) =>
          b.batchNo.toLowerCase().includes(parsed.batchNo!.toLowerCase())
        );
        if (specificBatch) matchedBatch = specificBatch;
      }

      // Check serials
      const serialNo = parsed.serialNo || clean;
      const matchedSerial = matchedProduct.serials?.find((s) => s.serialOrImei === serialNo);
      const serialsList = matchedSerial ? [matchedSerial.serialOrImei] : undefined;

      addItemToCart(matchedProduct, matchedBatch, serialsList, parsed.quantity || 1);

      let msg = `Added: ${matchedProduct.name} (₹${matchedProduct.salePrice})`;
      if (parsed.isGs1) {
        msg += ` | GS1 Parsed: ${parsed.batchNo ? `Batch ${parsed.batchNo}` : ""} ${parsed.expDateStr ? `Exp: ${parsed.expDateStr}` : ""}`;
      }

      setScanFeedback({
        success: true,
        message: msg,
        isGs1: parsed.isGs1,
      });
      setManualCode("");
    } else {
      setScanFeedback({
        success: false,
        message: `No item found for Barcode / SKU / IMEI: "${clean}"`,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleProcessCode(manualCode);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Barcode & QR Hardware Scanner
              </h3>
              <p className="text-xs text-slate-500">Camera & USB HID Auto-Listener</p>
            </div>
          </div>
          <button
            onClick={() => setIsBarcodeModalOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Canvas */}
        <div className="p-6 space-y-4">
          <div className="relative aspect-video w-full bg-slate-950 rounded-xl overflow-hidden flex flex-col items-center justify-center border-2 border-indigo-500/30">
            {/* Viewfinder corner guides */}
            <div className="absolute inset-8 border-2 border-dashed border-indigo-400/60 rounded-lg pointer-events-none flex items-center justify-center">
              {/* Laser Line Animation */}
              <div className="w-full h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse" />
            </div>

            <div className="z-10 text-center text-white/80 space-y-1">
              <Camera className="w-8 h-8 mx-auto text-indigo-400 animate-bounce" />
              <p className="text-xs font-semibold">Align Barcode or QR Code within box</p>
              <p className="text-[10px] text-slate-400">Works with Camera & USB Scanners</p>
            </div>
          </div>

          {/* Manual Input / HID Barcode Receiver */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Manual Barcode / SKU / IMEI Input
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Scan or type barcode (e.g. 8901117001015)..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="button"
                onClick={() => handleProcessCode(manualCode)}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition"
              >
                Add Item
              </button>
            </div>
          </div>

          {/* Feedback message */}
          {scanFeedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                scanFeedback.success
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
              }`}
            >
              {scanFeedback.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span className="font-semibold">{scanFeedback.message}</span>
            </div>
          )}

          {/* Quick Demo Barcode Chips */}
          <div>
            <span className="text-[11px] font-bold text-slate-500">Quick Test Barcodes:</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {products.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProcessCode(p.barcode || p.sku)}
                  className="px-2.5 py-1 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 rounded-lg border border-slate-200 dark:border-slate-700 transition"
                >
                  ⚡ {p.name.split(" ")[0]} ({p.barcode?.slice(-4) || p.sku})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex justify-end">
          <button
            onClick={() => setIsBarcodeModalOpen(false)}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
          >
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
};
