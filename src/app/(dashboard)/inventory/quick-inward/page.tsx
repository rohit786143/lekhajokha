"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePosStore } from "@/lib/pos-store";
import { Product, ProductBatch, InwardSessionRecord, QuickInwardPayload } from "@/lib/types";
import { formatCurrency } from "@/lib/tax-engine";
import {
  parseBarcode,
  playAudioFeedback,
  generateSku,
  generateEan13,
  CATEGORY_TAX_HSN_DEFAULTS,
} from "@/lib/barcode-parser";
import {
  ScanLine,
  Package,
  Barcode,
  ArrowLeft,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  Volume2,
  VolumeX,
  Printer,
  ShoppingBag,
  Sparkles,
  Zap,
  Trash2,
  X,
  History,
  FileSpreadsheet,
} from "lucide-react";

function QuickStockInwardContent() {
  const searchParams = useSearchParams();
  const initialBarcodeParam = searchParams?.get("barcode") || "";

  const { products, categories, godowns, inwardStock, addProduct, addCategory } = usePosStore();

  const [barcodeInput, setBarcodeInput] = useState(initialBarcodeParam);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Inward Form State
  const [inwardQty, setInwardQty] = useState<number>(1);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [mrp, setMrp] = useState<number>(0);
  const [selectedGodownId, setSelectedGodownId] = useState<string>("godown-1");
  const [batchNo, setBatchNo] = useState<string>("");
  const [mfgDate, setMfgDate] = useState<string>("");
  const [expDate, setExpDate] = useState<string>("");
  const [serialInput, setSerialInput] = useState<string>("");
  const [serialsList, setSerialsList] = useState<string[]>([]);
  const [inwardNotes, setInwardNotes] = useState<string>("");

  // Quick New Product Registration Modal if Barcode is not found
  const [isQuickRegisterOpen, setIsQuickRegisterOpen] = useState(false);
  const [unrecognizedBarcode, setUnrecognizedBarcode] = useState("");
  const [newProdName, setNewProdName] = useState("");
  const [newProdCategory, setNewProdCategory] = useState(categories[0]?.id || "");
  const [newProdUnit, setNewProdUnit] = useState("PCS");
  const [newProdTaxRate, setNewProdTaxRate] = useState(18);
  const [newProdHsn, setNewProdHsn] = useState("9999");

  // Live session history state
  const [sessionRecords, setSessionRecords] = useState<InwardSessionRecord[]>([]);
  const [lastInwardSuccess, setLastInwardSuccess] = useState<InwardSessionRecord | null>(null);

  // References
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // Focus barcode input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
    if (initialBarcodeParam) {
      handleLookupBarcode(initialBarcodeParam);
    }
  }, []);

  const handleLookupBarcode = (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) return;

    const parsed = parseBarcode(trimmed);

    // Search by exact barcode, plain code, GTIN, SKU, or name
    const found = products.find((p) => {
      const matchBarcode = p.barcode && (p.barcode === trimmed || p.barcode === parsed.gtin || p.barcode === parsed.plainBarcodeOrSku);
      const matchSku = p.sku.toLowerCase() === trimmed.toLowerCase();
      const matchName = p.name.toLowerCase() === trimmed.toLowerCase();
      return matchBarcode || matchSku || matchName;
    });

    if (found) {
      if (soundEnabled) playAudioFeedback("success");
      setSelectedProduct(found);
      setInwardQty(parsed.quantity || 1);
      setPurchasePrice(found.purchasePrice || 0);
      setSalePrice(found.salePrice || 0);
      setMrp(found.mrp || found.salePrice || 0);
      setBatchNo(parsed.batchNo || (found.trackBatch ? `BAT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}` : ""));
      setMfgDate(parsed.mfgDateStr || "");
      setExpDate(parsed.expDateStr || "");
      if (parsed.serialNo) {
        setSerialsList([parsed.serialNo]);
      } else {
        setSerialsList([]);
      }

      // Auto focus Quantity field
      setTimeout(() => {
        qtyInputRef.current?.focus();
        qtyInputRef.current?.select();
      }, 50);
    } else {
      if (soundEnabled) playAudioFeedback("error");
      setUnrecognizedBarcode(parsed.gtin || parsed.plainBarcodeOrSku || trimmed);
      setIsQuickRegisterOpen(true);
    }
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLookupBarcode(barcodeInput);
    }
  };

  const handleAddSerial = () => {
    const trimmed = serialInput.trim();
    if (trimmed && !serialsList.includes(trimmed)) {
      setSerialsList([...serialsList, trimmed]);
      setSerialInput("");
    }
  };

  const handleRemoveSerial = (idx: number) => {
    setSerialsList(serialsList.filter((_, i) => i !== idx));
  };

  const handleCompleteInward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const qty = Number(inwardQty) || 1;
    const pPrice = Number(purchasePrice) || 0;
    const sPrice = Number(salePrice) || selectedProduct.salePrice;
    const mrpValue = Number(mrp) || selectedProduct.mrp;
    const selectedGodown = godowns.find((g) => g.id === selectedGodownId);

    const payload: QuickInwardPayload = {
      productId: selectedProduct.id,
      godownId: selectedGodownId,
      godownName: selectedGodown?.name || "Store Front Counter",
      quantity: qty,
      purchasePrice: pPrice,
      salePrice: sPrice,
      mrp: mrpValue,
      batchNo: batchNo.trim() || undefined,
      mfgDate: mfgDate || undefined,
      expDate: expDate || undefined,
      serials: serialsList.length > 0 ? serialsList : undefined,
      notes: inwardNotes || undefined,
    };

    const updated = inwardStock(payload);

    if (soundEnabled) playAudioFeedback("success");

    const newRecord: InwardSessionRecord = {
      id: `inw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      sku: selectedProduct.sku,
      barcode: selectedProduct.barcode,
      quantity: qty,
      unit: selectedProduct.unit,
      purchasePrice: pPrice,
      salePrice: sPrice,
      mrp: mrpValue,
      totalValue: qty * pPrice,
      godownName: selectedGodown?.name || "Store Front Counter",
      batchNo: batchNo.trim() || undefined,
      mfgDate: mfgDate || undefined,
      expDate: expDate || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };

    setSessionRecords([newRecord, ...sessionRecords]);
    setLastInwardSuccess(newRecord);

    // Reset Form for next scan
    setSelectedProduct(null);
    setBarcodeInput("");
    setInwardQty(1);
    setPurchasePrice(0);
    setSalePrice(0);
    setMrp(0);
    setBatchNo("");
    setMfgDate("");
    setExpDate("");
    setSerialsList([]);
    setInwardNotes("");

    // Re-focus barcode scanner input immediately
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  };

  // Quick register new product handler
  const handleRegisterNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = categories.find((c) => c.id === newProdCategory);
    const prefix = cat?.codePrefix || "GEN";
    const sku = generateSku(prefix, newProdName);
    const barcode = unrecognizedBarcode || generateEan13("890");

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      tenantId: "tenant-vyapar-01",
      name: newProdName,
      sku,
      barcode,
      categoryId: newProdCategory,
      categoryName: cat?.name,
      unit: newProdUnit,
      hsn: newProdHsn,
      taxRate: Number(newProdTaxRate) || 0,
      isTaxInclusive: true,
      purchasePrice: 0,
      salePrice: 0,
      mrp: 0,
      minStock: 5,
      currentStock: 0,
      trackBatch: false,
      trackSerial: false,
    };

    addProduct(newProduct);
    setIsQuickRegisterOpen(false);

    // Immediately load the newly created product into the inward form
    if (soundEnabled) playAudioFeedback("success");
    setSelectedProduct(newProduct);
    setBarcodeInput(barcode);
    setInwardQty(1);
    setPurchasePrice(0);
    setSalePrice(0);
    setMrp(0);

    setTimeout(() => {
      qtyInputRef.current?.focus();
    }, 50);
  };

  // Summary Metrics
  const totalSessionUnits = sessionRecords.reduce((acc, r) => acc + r.quantity, 0);
  const totalSessionValuation = sessionRecords.reduce((acc, r) => acc + r.totalValue, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-4">
          <Link
            href="/inventory"
            className="p-2.5 text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-2xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <span>Quick Stock Inward Terminal</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                SCANNER READY
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              High-speed barcode scanner gun input with instant audio feedback & session batch logging.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold border transition ${
              soundEnabled
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
            }`}
            title={soundEnabled ? "Mute Scanner Sound" : "Enable Scanner Sound"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? "Beep: ON" : "Beep: MUTED"}</span>
          </button>

          <Link
            href="/purchases/new"
            className="flex items-center gap-2 px-4 py-2 text-xs font-black text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-2xl transition"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Full Purchase Bill</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Session Inwards</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {sessionRecords.length} <span className="text-xs font-bold text-slate-400">skus</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Units Added</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            +{totalSessionUnits} <span className="text-xs font-bold text-slate-400">pcs</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Session Valuation</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
            {formatCurrency(totalSessionValuation)}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Master Catalog Size</div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {products.length} <span className="text-xs font-bold text-slate-400">products</span>
          </div>
        </div>
      </div>

      {/* Main Scanner & Inward Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Barcode Gun Input & Active Inward Form */}
        <div className="lg:col-span-7 space-y-5">
          {/* Scanner Gun Input Box */}
          <div className="p-6 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-3xl shadow-xl border border-indigo-800/40 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Barcode Scanner Gun Port (Auto-Focus)</span>
              </label>
              <span className="text-[10px] font-mono text-indigo-300/80 bg-white/10 px-2.5 py-0.5 rounded-full">
                Press [Enter] to scan
              </span>
            </div>

            <div className="relative">
              <input
                ref={barcodeInputRef}
                type="text"
                autoFocus
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="Scan barcode gun or type EAN-13 / SKU..."
                className="w-full pl-4 pr-28 py-3.5 bg-white/10 backdrop-blur-md border-2 border-indigo-400/40 focus:border-emerald-400 focus:bg-white/15 rounded-2xl text-base font-mono font-black text-white placeholder:text-indigo-300/50 focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => handleLookupBarcode(barcodeInput)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition shadow-md"
              >
                Scan / Enter
              </button>
            </div>

            <div className="flex items-center justify-between mt-3 text-[11px] text-indigo-300/70">
              <span>Supports GS1-128, DataMatrix, EAN-13 (890..), and plain SKUs.</span>
              <button
                type="button"
                onClick={() => {
                  setUnrecognizedBarcode("");
                  setIsQuickRegisterOpen(true);
                }}
                className="text-emerald-400 hover:underline font-bold"
              >
                + Register New SKU
              </button>
            </div>
          </div>

          {/* Active Product Inward Card */}
          {selectedProduct ? (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-indigo-500/40 shadow-xl space-y-5 animate-fade-in">
              {/* Product Header Info */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                      {selectedProduct.categoryName || "General"}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      HSN: {selectedProduct.hsn} ({selectedProduct.taxRate}% GST)
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedProduct.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="font-bold text-indigo-600">SKU: {selectedProduct.sku}</span>
                    <span className="text-slate-400">Barcode: {selectedProduct.barcode || "-"}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Current In-Stock</div>
                  <div className="text-xl font-black text-emerald-600 font-mono">
                    {selectedProduct.currentStock} {selectedProduct.unit}
                  </div>
                </div>
              </div>

              {/* Inward Form */}
              <form onSubmit={handleCompleteInward} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Inward Quantity */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Inward Qty ({selectedProduct.unit}) *
                    </label>
                    <input
                      ref={qtyInputRef}
                      type="number"
                      required
                      min="1"
                      value={inwardQty}
                      onChange={(e) => setInwardQty(Math.max(1, Number(e.target.value)))}
                      className="w-full mt-1 px-3.5 py-2 text-sm font-mono font-black text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Purchase Cost */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Inward Buy Rate (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(Number(e.target.value))}
                      className="w-full mt-1 px-3.5 py-2 text-sm font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Target Godown */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Destination Godown
                    </label>
                    <select
                      value={selectedGodownId}
                      onChange={(e) => setSelectedGodownId(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {godowns.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pricing adjustments */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Retail / Sale Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={salePrice}
                      onChange={(e) => setSalePrice(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Printed MRP (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={mrp}
                      onChange={(e) => setMrp(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Batch & Expiry Tracking if enabled */}
                {(selectedProduct.trackBatch || batchNo) && (
                  <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-900/60 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                      <Layers className="w-4 h-4" />
                      <span>Pharma Batch & Expiry Assignment</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[11px] font-bold text-purple-900 dark:text-purple-200">
                          Batch No
                        </label>
                        <input
                          type="text"
                          value={batchNo}
                          onChange={(e) => setBatchNo(e.target.value)}
                          placeholder="e.g. BAT-2026-X1"
                          className="w-full mt-0.5 px-3 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-purple-900 dark:text-purple-200">
                          Mfg Date
                        </label>
                        <input
                          type="date"
                          value={mfgDate}
                          onChange={(e) => setMfgDate(e.target.value)}
                          className="w-full mt-0.5 px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-purple-900 dark:text-purple-200">
                          Exp Date
                        </label>
                        <input
                          type="date"
                          value={expDate}
                          onChange={(e) => setExpDate(e.target.value)}
                          className="w-full mt-0.5 px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Serial / IMEI tracking if enabled */}
                {selectedProduct.trackSerial && (
                  <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                        Serial / IMEI Numbers ({serialsList.length} entered)
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={serialInput}
                        onChange={(e) => setSerialInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSerial();
                          }
                        }}
                        placeholder="Scan or type unique IMEI..."
                        className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={handleAddSerial}
                        className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-xl"
                      >
                        Add
                      </button>
                    </div>

                    {serialsList.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {serialsList.map((sn, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md font-mono text-[10px] font-bold"
                          >
                            {sn}
                            <button
                              type="button"
                              onClick={() => handleRemoveSerial(idx)}
                              className="text-rose-500 hover:text-rose-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Valuation & Submit Bar */}
                <div className="pt-3 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400">Total Inward Value</div>
                    <div className="text-base font-black text-slate-900 dark:text-white font-mono">
                      {formatCurrency(inwardQty * purchasePrice)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null);
                        setBarcodeInput("");
                        barcodeInputRef.current?.focus();
                      }}
                      className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-6 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Inward Stock</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            /* Standby Card */
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-3xl flex items-center justify-center mx-auto">
                <Barcode className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Awaiting Barcode Gun Scan
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Scan any product barcode or sticker label to instantly pop up inward pricing and quantity controls.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Session Summary Table */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Today's Inward Session Log
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {sessionRecords.length} records
              </span>
            </div>

            {sessionRecords.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                <Package className="w-8 h-8 text-slate-300 mx-auto" />
                <p>No items inwarded in this active terminal session yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {sessionRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5 transition hover:border-indigo-300"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {rec.productName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {rec.sku} {rec.batchNo ? `| Batch: ${rec.batchNo}` : ""}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg text-xs font-black font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        +{rec.quantity} {rec.unit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-500 font-mono">
                        Rate: {formatCurrency(rec.purchasePrice)}
                      </span>
                      <span className="font-bold font-mono text-slate-900 dark:text-white">
                        Total: {formatCurrency(rec.totalValue)}
                      </span>
                      <span className="text-[9px] text-slate-400">{rec.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Register New Product Modal */}
      {isQuickRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Quick Register New Product
                </h3>
              </div>
              <button
                onClick={() => setIsQuickRegisterOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterNewProduct} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-xs text-amber-800 dark:text-amber-300">
                Barcode <span className="font-mono font-bold">"{unrecognizedBarcode}"</span> was not found in catalog. Quickly register it below to inward stock immediately.
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="e.g. Dolo 650mg / Fortune Sunlite Oil 1L"
                  className="w-full mt-1 px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => {
                      setNewProdCategory(e.target.value);
                      const cat = categories.find((c) => c.id === e.target.value);
                      if (cat?.defaultGstRate !== undefined) setNewProdTaxRate(cat.defaultGstRate);
                      if (cat?.hsnCode) setNewProdHsn(cat.hsnCode);
                    }}
                    className="w-full mt-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Unit
                  </label>
                  <select
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl font-semibold"
                  >
                    <option value="PCS">PCS</option>
                    <option value="STRIP">STRIP</option>
                    <option value="BOX">BOX</option>
                    <option value="KG">KG</option>
                    <option value="LTR">LTR</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    HSN Code
                  </label>
                  <input
                    type="text"
                    value={newProdHsn}
                    onChange={(e) => setNewProdHsn(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    GST Slab (%)
                  </label>
                  <select
                    value={newProdTaxRate}
                    onChange={(e) => setNewProdTaxRate(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickRegisterOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow transition"
                >
                  Save & Inward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuickStockInwardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Loading Quick Inward...</div>}>
      <QuickStockInwardContent />
    </Suspense>
  );
}
