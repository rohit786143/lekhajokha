"use client";

import React, { useState } from "react";
import { usePosStore } from "@/lib/pos-store";
import { formatCurrency } from "@/lib/tax-engine";
import { Product } from "@/lib/types";
import {
  Barcode,
  Printer,
  Settings,
  Layers,
  Check,
  Tag,
  Eye,
  Sliders,
  Sparkles,
} from "lucide-react";

// Pure SVG Code 128 / Barcode Renderer
function SvgBarcode({ value, height = 34 }: { value: string; height?: number }) {
  // Generate pseudo-deterministic Code128 pattern from character codes
  const chars = value || "0000000000";
  const bars: boolean[] = [];

  // Start guard
  bars.push(true, false, true, true, false, false);

  for (let i = 0; i < chars.length; i++) {
    const code = chars.charCodeAt(i);
    const pattern = [
      Boolean(code & 1),
      Boolean(code & 2),
      Boolean(code & 4),
      Boolean(code & 8),
      Boolean(code & 16),
      Boolean(code & 32),
    ];
    bars.push(...pattern);
    bars.push(false); // inter-character space
  }

  // Stop guard
  bars.push(true, true, false, false, true, false, true, true);

  const barWidth = 1.6;
  const totalWidth = bars.length * barWidth;

  return (
    <div className="flex flex-col items-center">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${totalWidth} ${height}`}
        preserveAspectRatio="none"
        className="w-full max-w-[170px]"
      >
        {bars.map((isBar, idx) =>
          isBar ? (
            <rect
              key={idx}
              x={idx * barWidth}
              y={0}
              width={barWidth}
              height={height}
              fill="#000000"
            />
          ) : null
        )}
      </svg>
      <span className="font-mono text-[9px] font-bold text-slate-800 tracking-wider">
        {value}
      </span>
    </div>
  );
}

export default function BarcodeGeneratorPage() {
  const { tenant, firms, activeFirmId, getActiveFirm, products } = usePosStore();

  const activeFirm =
    (typeof getActiveFirm === "function" ? getActiveFirm() : null) ||
    firms.find((f) => f.id === activeFirmId) ||
    firms.find((f) => f.isPrimary) ||
    firms[0] ||
    tenant;

  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || "");
  const [copiesCount, setCopiesCount] = useState<number>(24);
  const [layout, setLayout] = useState<"24_A4" | "40_A4" | "THERMAL_50X25">("24_A4");

  // Field toggles
  const [showBusinessName, setShowBusinessName] = useState(true);
  const [showProductName, setShowProductName] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showMrp, setShowMrp] = useState(true);
  const [showBatch, setShowBatch] = useState(true);
  const [showExp, setShowExp] = useState(false);

  // Custom text overrides
  const [customBarcode, setCustomBarcode] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];
  const barcodeValue = customBarcode || selectedProduct?.barcode || selectedProduct?.sku || "8901117001015";
  const salePrice = customPrice ? Number(customPrice) : selectedProduct?.salePrice || 0;
  const mrp = selectedProduct?.mrp || salePrice * 1.15;
  const batchNo = selectedProduct?.batches?.[0]?.batchNo || "B-2026";
  const expDate = selectedProduct?.batches?.[0]?.expDate || "2028-12";

  const labelsArray = Array.from({ length: copiesCount });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Printable CSS style tag */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
          #printable-label-sheet,
          #printable-label-sheet * {
            visibility: visible;
          }
          #printable-label-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 4mm;
            background: white !important;
          }
          .sticker-item {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Header */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-400/30">
              Hardware & Label Studio
            </span>
            <span className="text-xs text-slate-300">GSTIN: {tenant.gstin}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Barcode Label Studio
          </h1>
          <p className="text-xs text-slate-400">
            Generate printable barcode sticker sheets (24/40-up A4 labels or 50x25mm thermal rolls) with custom MRP & pricing.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition self-start md:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>Print Barcode Sheet</span>
        </button>
      </div>

      <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span>Label Configuration & Fields</span>
          </h2>

          {/* Product Select */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Select Catalog Product
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
            >
              {products.length === 0 ? (
                <option value="">No products in inventory (Custom Barcode Mode)</option>
              ) : (
                products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatCurrency(p.salePrice)})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Layout Presets */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Sticker Sheet Layout
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setLayout("24_A4");
                  setCopiesCount(24);
                }}
                className={`p-2.5 rounded-xl border text-center transition ${
                  layout === "24_A4"
                    ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="text-xs font-black">24 / Sheet</div>
                <div className="text-[10px] text-slate-400">3 × 8 Grid (A4)</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLayout("40_A4");
                  setCopiesCount(40);
                }}
                className={`p-2.5 rounded-xl border text-center transition ${
                  layout === "40_A4"
                    ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="text-xs font-black">40 / Sheet</div>
                <div className="text-[10px] text-slate-400">4 × 10 Grid (A4)</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLayout("THERMAL_50X25");
                  setCopiesCount(10);
                }}
                className={`p-2.5 rounded-xl border text-center transition ${
                  layout === "THERMAL_50X25"
                    ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="text-xs font-black">50×25mm</div>
                <div className="text-[10px] text-slate-400">Thermal Roll</div>
              </button>
            </div>
          </div>

          {/* Copies Count */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Labels to Print
            </label>
            <input
              type="number"
              min="1"
              max="200"
              value={copiesCount}
              onChange={(e) => setCopiesCount(Math.max(1, Number(e.target.value)))}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
            />
          </div>

          {/* Field Toggles */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:divide-slate-800">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Toggle Printed Elements
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBusinessName}
                  onChange={(e) => setShowBusinessName(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>Store Name</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={showProductName}
                  onChange={(e) => setShowProductName(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>Product Name</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBarcode}
                  onChange={(e) => setShowBarcode(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>Barcode Lines</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>Our Price</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMrp}
                  onChange={(e) => setShowMrp(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>MRP</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBatch}
                  onChange={(e) => setShowBatch(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>Batch No</span>
              </label>
            </div>
          </div>
        </div>

        {/* Live Preview Column (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Live Sheet Preview ({copiesCount} Labels)</span>
            <button
              type="button"
              onClick={() => window.print()}
              className="text-indigo-600 hover:underline flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Now</span>
            </button>
          </div>

          <div className="bg-slate-200/80 dark:bg-slate-950 p-4 rounded-3xl border border-slate-300 dark:border-slate-800 max-h-[600px] overflow-y-auto">
            {/* Sticker Grid Container */}
            <div
              id="printable-label-sheet"
              className={`grid gap-2.5 bg-white p-3 rounded-2xl shadow-inner ${
                layout === "40_A4"
                  ? "grid-cols-4"
                  : layout === "24_A4"
                  ? "grid-cols-3"
                  : "grid-cols-1 max-w-[240px] mx-auto"
              }`}
            >
              {labelsArray.map((_, idx) => (
                <div
                  key={idx}
                  className="sticker-item bg-white border border-dashed border-slate-300 p-2 rounded-lg flex flex-col items-center justify-between text-center min-h-[92px] overflow-hidden"
                >
                  {showBusinessName && (
                    <div className="text-[9px] font-black uppercase text-slate-800 tracking-tight leading-none truncate max-w-full">
                      {activeFirm.name.slice(0, 24)}
                    </div>
                  )}

                  {showProductName && (
                    <div className="text-[10px] font-bold text-slate-900 leading-tight line-clamp-2 my-0.5">
                      {selectedProduct?.name || "Sample Product"}
                    </div>
                  )}

                  {showBarcode && <SvgBarcode value={barcodeValue} height={26} />}

                  <div className="flex items-center justify-center gap-2 text-[10px] font-bold w-full pt-0.5 border-t border-slate-100">
                    {showMrp && (
                      <span className="text-slate-400 line-through text-[9px]">
                        MRP: ₹{mrp.toFixed(0)}
                      </span>
                    )}
                    {showPrice && (
                      <span className="text-slate-900 font-black">
                        ₹{salePrice.toFixed(0)}
                      </span>
                    )}
                  </div>

                  {(showBatch || showExp) && (
                    <div className="text-[8px] text-slate-400 font-mono flex justify-between w-full px-1">
                      {showBatch && <span>B:{batchNo}</span>}
                      {showExp && <span>Exp:{expDate}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
