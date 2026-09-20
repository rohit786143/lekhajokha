"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePosStore } from "@/lib/pos-store";
import { useTenantData } from "@/lib/use-tenant-data";
import { Product, ProductBatch } from "@/lib/types";
import { formatCurrency, INDIAN_STATES } from "@/lib/tax-engine";
import { PaymentModal } from "@/components/pos/payment-modal";
import { BarcodeScannerModal } from "@/components/pos/barcode-scanner-modal";
import { VoiceBillingModal } from "@/components/pos/voice-billing-modal";
import { HoldCartDrawer } from "@/components/pos/hold-cart-drawer";
import { BatchSerialModal } from "@/components/pos/batch-serial-modal";
import { CustomerSelectorBar } from "@/components/pos/customer-selector-bar";
import { ThermalReceipt } from "@/components/invoices/thermal-receipt";
import { GstTaxInvoice } from "@/components/invoices/gst-tax-invoice";
import {
  Search,
  Barcode,
  Mic,
  PauseCircle,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Building2,
  UserCheck,
  ShoppingBag,
  Sparkles,
  Layers,
  Percent,
  RefreshCw,
  LayoutDashboard,
  CheckCircle2,
  FileText,
  Printer,
  ChevronRight,
  Package,
} from "lucide-react";

export default function PosPage() {
  const { categories, products, parties, firms } = useTenantData();
  const {
    tenant,
    activeFirmId,
    setActiveFirmId,
    godowns,
    activeGodownId,
    setActiveGodownId,
    selectedParty,
    setSelectedParty,
    placeOfSupply,
    setPlaceOfSupply,
    activeCartItems,
    saleType,
    setSaleType,
    billDiscount,
    setBillDiscount,
    autoRoundOff,
    toggleAutoRoundOff,
    addItemToCart,
    updateCartItemQty,
    updateCartItemPrice,
    updateCartItemDiscount,
    removeCartItem,
    clearActiveCart,
    holdCurrentCart,
    parkedCarts,
    setIsPaymentModalOpen,
    setIsBarcodeModalOpen,
    setIsVoiceBillingOpen,
    setIsHoldDrawerOpen,
    lastCompletedInvoice,
    setLastCompletedInvoice,
    getCartCalculations,
    syncWithCloud,
  } = usePosStore();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [batchModalProduct, setBatchModalProduct] = useState<Product | null>(null);
  const [printInvoiceFormat, setPrintInvoiceFormat] = useState<"THERMAL" | "A4">("THERMAL");
  const [discountPopoverItemId, setDiscountPopoverItemId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cloud sync for POS terminals across all PCs
  useEffect(() => {
    if (typeof syncWithCloud === "function") {
      syncWithCloud().catch(() => {});
      const interval = setInterval(() => {
        syncWithCloud().catch(() => {});
      }, 20000);
      return () => clearInterval(interval);
    }
  }, [tenant?.id, syncWithCloud]);

  // Tenant-Scoped Data
  const tenantProducts = products.filter((p) => !p.tenantId || p.tenantId === tenant.id);
  const tenantCategories = categories.filter((c) => !c.tenantId || c.tenantId === tenant.id);
  const tenantParties = parties.filter((p) => !p.tenantId || p.tenantId === tenant.id);

  const activeFirm =
    firms.find((f) => f.id === activeFirmId) ||
    firms.find((f) => f.isPrimary) ||
    firms[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2200);
  };

  // Sync place of supply with active firm if current party is Walk-in retail customer
  useEffect(() => {
    if (activeFirm && (!selectedParty || selectedParty.id === "party-walkin-cash" || !selectedParty.gstin)) {
      if (placeOfSupply !== activeFirm.stateCode) {
        setPlaceOfSupply(activeFirm.stateCode);
      }
    }
  }, [activeFirmId, activeFirm?.stateCode]);

  // USB HID Barcode Scanner buffer listener
  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in text inputs or textareas
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        barcodeBuffer = "";
      }
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (barcodeBuffer.length >= 3) {
          e.preventDefault();
          const clean = barcodeBuffer.trim();
          const matched = tenantProducts.find(
            (p) =>
              p.barcode === clean ||
              p.sku.toLowerCase() === clean.toLowerCase() ||
              p.serials?.some((s) => s.serialOrImei === clean)
          );
          if (matched) {
            addItemToCart(matched, matched.batches?.[0]);
            showToast(`✓ Scanned & Added: ${matched.name.slice(0, 20)}`);
          }
          barcodeBuffer = "";
        }
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tenantProducts, addItemToCart]);

  const calc = getCartCalculations();

  // Filter products by category & search query
  const filteredProducts = tenantProducts.filter((p) => {
    const matchesCategory =
      selectedCategory === "ALL" || p.categoryId === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery));
    return matchesCategory && matchesSearch;
  });

  const handleProductCardClick = (p: Product) => {
    const maxStock =
      p.trackBatch && p.batches && p.batches.length > 0
        ? p.batches[0].stockQty
        : p.trackSerial && p.serials
        ? p.serials.filter((s) => s.status === "AVAILABLE").length
        : p.currentStock;

    const inCartQty = activeCartItems
      .filter((it) => it.productId === p.id)
      .reduce((sum, it) => sum + it.quantity, 0);

    if (maxStock <= 0) {
      showToast(`⚠️ Out of Stock: 0 ${p.unit} available in inventory!`);
      return;
    }

    if (inCartQty >= maxStock) {
      showToast(`⚠️ Stock Limit: Only ${maxStock} ${p.unit} available in inventory!`);
      return;
    }

    addItemToCart(p);
    showToast(`✓ Added: ${p.name.slice(0, 18)} (${inCartQty + 1}/${maxStock} ${p.unit})`);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredProducts.length > 0) {
      const top = filteredProducts[0];
      handleProductCardClick(top);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans select-none">
      {/* ---------------- Top High-Speed POS Header ---------------- */}
      <header className="no-print h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shadow-xs shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-black text-lg transition group shadow-xs"
          >
            <img
              src="/logo.png"
              alt="लेखा जोखा"
              className="h-8 w-auto object-contain transition group-hover:scale-105"
            />
            <span className="hidden sm:inline font-black text-lg text-indigo-950 dark:text-indigo-200">
              लेखा जोखा
            </span>
          </Link>

          <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

          {/* Active Firm Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <select
              value={activeFirmId}
              onChange={(e) => {
                setActiveFirmId(e.target.value);
                const newF = firms.find((f) => f.id === e.target.value);
                if (newF) {
                  showToast(`🏢 Switched to: ${newF.name} [State: ${newF.stateCode}]`);
                }
              }}
              className="bg-indigo-50/80 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 py-1 px-2.5 rounded-lg font-bold text-xs focus:ring-1 focus:ring-indigo-500 max-w-[210px] truncate cursor-pointer shadow-xs"
              title="Switch Active Billing Entity / Firm"
            >
              {firms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.stateCode})
                </option>
              ))}
            </select>
          </div>

          <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

          {/* Godown Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <Package className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={activeGodownId}
              onChange={(e) => setActiveGodownId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 py-1 px-2.5 rounded-lg font-semibold text-xs focus:ring-1 focus:ring-indigo-500"
            >
              {godowns.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons: Voice AI, Hardware Scanner, Parked Bills */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsVoiceBillingOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-xs transition shadow-indigo-500/20 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span className="hidden md:inline">Voice AI Dictation</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBarcodeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
          >
            <Barcode className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Scanner</span>
          </button>

          <button
            type="button"
            onClick={() => setIsHoldDrawerOpen(true)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-xl border border-amber-200 dark:border-amber-800 transition"
          >
            <PauseCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Hold Bills</span>
            {parkedCarts.length > 0 && (
              <span className="ml-1 w-4 h-4 bg-amber-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                {parkedCarts.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ---------------- Main Split Workstation ---------------- */}
      <div className="no-print flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT COLUMN: Product Catalog & Fast Search */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          {/* Search Bar & Categories Header */}
          <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="pos-product-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search by Product Name, SKU, or Barcode (Press Enter to quick-add)..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === "ALL"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                All Items ({tenantProducts.length})
              </button>
              {tenantCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                    selectedCategory === cat.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 p-3.5 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-16 text-center space-y-3">
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-3xl flex items-center justify-center mx-auto">
                  <Package className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
                    No Products Found in Inventory
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Your catalog is currently empty. Add products in the Inventory module or record a Purchase Inward bill to stock items.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Link
                    href="/inventory"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition"
                  >
                    + Add Product
                  </Link>
                  <Link
                    href="/purchases/new"
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition"
                  >
                    Inward Purchase
                  </Link>
                </div>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const inCartQty = activeCartItems
                  .filter((it) => it.productId === p.id)
                  .reduce((sum, it) => sum + it.quantity, 0);

                const defaultBatch = p.batches?.[0];
                const availableSerialsCount =
                  p.serials?.filter((s) => s.status === "AVAILABLE").length || 0;

                const maxStock =
                  p.trackBatch && p.batches && p.batches.length > 0
                    ? p.batches[0].stockQty
                    : p.trackSerial && p.serials
                    ? availableSerialsCount
                    : p.currentStock;

                return (
                  <div
                    key={p.id}
                    onClick={() => handleProductCardClick(p)}
                    className={`group relative bg-white dark:bg-slate-900 border rounded-2xl p-3 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between ${
                      inCartQty > 0
                        ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-indigo-400"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {p.sku}
                        </span>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                          GST {p.taxRate}%
                        </span>
                      </div>
                      <h3 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        {p.name}
                      </h3>
                    </div>

                    {/* Badges for Batch & IMEI selection */}
                    {(p.trackBatch || p.trackSerial) && (
                      <div className="flex items-center gap-1.5 my-1.5">
                        {p.trackBatch && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBatchModalProduct(p);
                            }}
                            className="text-[10px] bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold px-2 py-0.5 rounded-lg border border-purple-300 dark:border-purple-800 flex items-center gap-1 transition"
                            title="Click to select specific batch"
                          >
                            <span>Batch: {defaultBatch?.batchNo || "DL"}</span>
                            <span className="text-[9px]">▾</span>
                          </button>
                        )}
                        {p.trackSerial && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBatchModalProduct(p);
                            }}
                            className="text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold px-2 py-0.5 rounded-lg border border-blue-300 dark:border-blue-800 flex items-center gap-1 transition"
                            title="Click to select IMEI"
                          >
                            <span>IMEI ({availableSerialsCount} Avail)</span>
                            <span className="text-[9px]">▾</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between gap-1">
                      <div>
                        <div className="text-sm font-black font-mono text-slate-900 dark:text-white">
                          {formatCurrency(p.salePrice)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Stock: {p.currentStock} {p.unit}
                        </div>
                      </div>

                      {/* Quantity Stepper / Direct Add Button */}
                      <div className="flex items-center">
                        {inCartQty > 0 ? (
                          <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/80 p-0.5 rounded-xl border border-indigo-300 dark:border-indigo-700">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const item = activeCartItems.find((it) => it.productId === p.id);
                                if (item) updateCartItemQty(item.id, item.quantity - 1);
                              }}
                              className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center font-bold text-xs hover:bg-slate-100 text-slate-700 dark:text-slate-200 transition"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center font-black text-xs text-indigo-600 dark:text-indigo-400">
                              {inCartQty}
                            </span>
                            <button
                              type="button"
                              disabled={inCartQty >= maxStock}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (inCartQty >= maxStock) {
                                  showToast(`⚠️ Stock Limit: Only ${maxStock} ${p.unit} available!`);
                                } else {
                                  handleProductCardClick(p);
                                }
                              }}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs transition ${
                                inCartQty >= maxStock
                                  ? "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
                                  : "bg-indigo-600 text-white hover:bg-indigo-500"
                              }`}
                              title={inCartQty >= maxStock ? `Max stock (${maxStock} ${p.unit}) reached` : "Add 1 more"}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={maxStock <= 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProductCardClick(p);
                            }}
                            className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition flex items-center gap-1 active:scale-95 shadow-xs ${
                              maxStock <= 0
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                : "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 hover:text-white border-indigo-200 dark:border-indigo-800"
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{maxStock <= 0 ? "Out of Stock" : "Add"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Cart, Party Selection & Checkout */}
        <div className="w-full lg:w-[480px] xl:w-[520px] bg-white dark:bg-slate-900 flex flex-col h-full overflow-hidden shrink-0 shadow-lg">
          {/* Compact Customer & Place of Supply Header */}
          <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <CustomerSelectorBar />
          </div>

          {/* Cart Section Header Bar with Clear Cart */}
          <div className="px-3 py-1.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 font-black text-slate-800 dark:text-slate-200">
                <ShoppingBag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Billing Items</span>
                <span className="px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-full font-mono text-[10px]">
                  {activeCartItems.length}
                </span>
              </div>
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
              {/* Sale Type Toggle */}
              <div className="flex items-center bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 p-0.5">
                <button
                  type="button"
                  onClick={() => setSaleType("RETAIL")}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${saleType === "RETAIL" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                >
                  Retail
                </button>
                <button
                  type="button"
                  onClick={() => setSaleType("WHOLESALE")}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${saleType === "WHOLESALE" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                >
                  Wholesale
                </button>
              </div>
            </div>
            {activeCartItems.length > 0 && (
              <button
                type="button"
                onClick={clearActiveCart}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-bold hover:underline"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart Items Table */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {activeCartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-12">
                <ShoppingBag className="w-10 h-10 stroke-1" />
                <p className="text-sm font-semibold">Cart is empty</p>
                <p className="text-xs text-slate-500 max-w-[240px] text-center">
                  Click items from catalog, scan with barcode reader, or use Voice AI.
                </p>
              </div>
            ) : (
              activeCartItems.map((item) => {
                const itemMaxStock = item.selectedBatch
                  ? Number(item.selectedBatch.stockQty) || 0
                  : item.product.trackSerial && item.product.serials
                  ? item.product.serials.filter((s) => s.status === "AVAILABLE").length
                  : Number(item.product.currentStock) || 0;

                const isAtMaxStock = item.quantity >= itemMaxStock;

                return (
                  <div
                    key={item.id}
                    className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                          {item.product.name}
                        </h4>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span>HSN: {item.hsn}</span>
                          <span>•</span>
                          <span>GST: {item.taxRate}%</span>
                          {item.selectedBatch && (
                            <span className="text-purple-600 font-bold">
                              Batch: {item.selectedBatch.batchNo}
                            </span>
                          )}
                          {item.selectedSerials && item.selectedSerials.length > 0 && (
                            <span className="text-blue-600 font-bold">
                              S/N: {item.selectedSerials[0]}
                            </span>
                          )}
                          <span className="text-slate-400 font-medium">
                            Stock: {itemMaxStock} {item.unit}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-black font-mono text-slate-900 dark:text-white">
                          {formatCurrency(item.total)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          @{formatCurrency(item.unitPrice)}
                        </div>
                      </div>
                    </div>

                    {/* Quantity Stepper & Price / Discount Controls */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateCartItemQty(item.id, item.quantity - 1)}
                          className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center font-bold text-xs hover:bg-slate-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={itemMaxStock}
                          value={item.quantity}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 1;
                            if (val > itemMaxStock) {
                              showToast(`⚠️ Clamped to max stock: ${itemMaxStock} ${item.unit}!`);
                            }
                            updateCartItemQty(item.id, val);
                          }}
                          className={`w-10 text-center py-0.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border rounded-md ${
                            isAtMaxStock
                              ? "border-amber-400 text-amber-600 dark:text-amber-400 ring-1 ring-amber-400/20"
                              : "border-slate-300 dark:border-slate-700"
                          }`}
                        />
                        <button
                          type="button"
                          disabled={isAtMaxStock}
                          onClick={() => {
                            if (isAtMaxStock) {
                              showToast(`⚠️ Maximum stock reached: Only ${itemMaxStock} ${item.unit} available!`);
                            } else {
                              updateCartItemQty(item.id, item.quantity + 1);
                            }
                          }}
                          className={`w-6 h-6 rounded-md border flex items-center justify-center font-bold text-xs transition ${
                            isAtMaxStock
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed border-slate-200 dark:border-slate-800"
                              : "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:bg-slate-100 text-slate-700 dark:text-slate-200"
                          }`}
                          title={isAtMaxStock ? `Max stock (${itemMaxStock} ${item.unit}) reached` : "Add 1 more"}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] font-bold text-slate-500 ml-0.5">{item.unit}</span>
                        {isAtMaxStock && (
                          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1 py-0.2 rounded ml-1">
                            Max
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Discount button */}
                        <button
                          type="button"
                          onClick={() =>
                            setDiscountPopoverItemId(
                              discountPopoverItemId === item.id ? null : item.id
                            )
                          }
                          className={`text-[10px] px-1.5 py-0.5 rounded border font-bold flex items-center gap-0.5 ${
                            item.discountAmount > 0 || item.discountPercent > 0
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          <Percent className="w-2.5 h-2.5" />
                          {item.discountAmount > 0
                            ? `₹${item.discountAmount}`
                            : item.discountPercent > 0
                            ? `${item.discountPercent}%`
                            : "Disc"}
                        </button>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeCartItem(item.id)}
                          className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline Discount edit popup */}
                    {discountPopoverItemId === item.id && (
                      <div className="p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 mt-1">
                        <input
                          type="number"
                          placeholder="% Disc"
                          value={item.discountPercent || ""}
                          onChange={(e) =>
                            updateCartItemDiscount(item.id, Number(e.target.value) || 0, 0)
                          }
                          className="w-1/2 px-1.5 py-0.5 text-xs border rounded font-mono"
                        />
                        <input
                          type="number"
                          placeholder="₹ Flat"
                          value={item.discountAmount || ""}
                          onChange={(e) =>
                            updateCartItemDiscount(item.id, 0, Number(e.target.value) || 0)
                          }
                          className="w-1/2 px-1.5 py-0.5 text-xs border rounded font-mono"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Bottom Summary & Checkout Panel */}
          <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2">
            {/* Calculation summary rows */}
            {/* Calculation summary rows */}
            <div className="space-y-0.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px] items-center">
                <span>Subtotal ({calc.totalQuantity} items):</span>
                <span className="font-mono font-semibold">{formatCurrency(calc.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px] items-center py-0.5">
                <div className="flex items-center gap-1.5">
                  <span>Bill Discount (%):</span>
                  {billDiscount > 0 && calc.billDiscountAmount !== undefined && calc.billDiscountAmount > 0 && (
                    <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-semibold">
                      (-{formatCurrency(calc.billDiscountAmount)})
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={billDiscount || ""}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setBillDiscount(Math.min(100, Math.max(0, val)));
                    }}
                    placeholder="0"
                    className="w-20 pr-5 pl-1.5 py-0.5 text-right font-mono border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 focus:ring-1 focus:ring-indigo-500 font-bold"
                  />
                  <span className="absolute right-1.5 text-[11px] font-bold text-slate-400 pointer-events-none">
                    %
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                <span>Taxable Amount:</span>
                <span className="font-mono">{formatCurrency(calc.taxableAmount)}</span>
              </div>
              {!calc.igst ? (
                <div className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                  <span>CGST + SGST ({(calc.cgst + calc.sgst).toFixed(2)}):</span>
                  <span className="font-mono">{formatCurrency(calc.cgst + calc.sgst)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                  <span>IGST (Inter-State):</span>
                  <span className="font-mono">{formatCurrency(calc.igst)}</span>
                </div>
              )}
              {calc.roundOff !== 0 && (
                <div className="flex justify-between text-slate-500 text-[10px]">
                  <span>Round Off:</span>
                  <span className="font-mono">{calc.roundOff > 0 ? `+${calc.roundOff}` : calc.roundOff}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-slate-300 dark:border-slate-700">
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  Grand Total:
                </span>
                <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(calc.grandTotal)}
                </span>
              </div>
            </div>

            {/* Bottom buttons: Hold Bill & Checkout */}
            <div className="grid grid-cols-3 gap-2 pt-0.5">
              <button
                type="button"
                disabled={activeCartItems.length === 0}
                onClick={() => holdCurrentCart()}
                className="py-2 px-2 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 hover:bg-amber-200 rounded-xl transition disabled:opacity-50"
              >
                Hold Bill
              </button>

              <button
                type="button"
                disabled={activeCartItems.length === 0}
                onClick={() => setIsPaymentModalOpen(true)}
                className="col-span-2 py-2.5 px-4 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 active:scale-98 rounded-xl shadow-md shadow-indigo-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>Pay & Settle</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- Modals ---------------- */}
      <PaymentModal />
      <BarcodeScannerModal />
      <VoiceBillingModal />
      <HoldCartDrawer />
      {batchModalProduct && (
        <BatchSerialModal
          product={batchModalProduct}
          isOpen={Boolean(batchModalProduct)}
          onClose={() => setBatchModalProduct(null)}
          onConfirm={(batch?: ProductBatch, serials?: string[], qty?: number) => {
            addItemToCart(batchModalProduct, batch, serials, qty || 1);
            setBatchModalProduct(null);
          }}
        />
      )}

      {/* Completed Invoice Print Preview Modal */}
      {lastCompletedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center max-h-[95vh] overflow-y-auto">
            {/* Top Toolbar in Preview */}
            <div className="no-print w-full flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Bill Generated: {lastCompletedInvoice.invoiceNo}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Grand Total: {formatCurrency(lastCompletedInvoice.grandTotal)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Format switcher */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPrintInvoiceFormat("THERMAL")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                      printInvoiceFormat === "THERMAL"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    80mm Thermal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintInvoiceFormat("A4")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                      printInvoiceFormat === "A4"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    A4 GST Invoice
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setLastCompletedInvoice(null)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
                >
                  Close & New Bill
                </button>
              </div>
            </div>

            {/* Render selected print preview format */}
            <div className="w-full flex justify-center py-2">
              {printInvoiceFormat === "THERMAL" ? (
                <ThermalReceipt
                  invoice={lastCompletedInvoice}
                  tenant={tenant}
                  onClose={() => setLastCompletedInvoice(null)}
                />
              ) : (
                <GstTaxInvoice
                  invoice={lastCompletedInvoice}
                  tenant={tenant}
                  firm={activeFirm}
                  onClose={() => setLastCompletedInvoice(null)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Instant Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs border border-slate-700/50 dark:border-slate-300 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
