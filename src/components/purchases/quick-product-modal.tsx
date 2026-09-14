"use client";

import React, { useState } from "react";
import { Product, Category } from "@/lib/types";
import { usePosStore } from "@/lib/pos-store";
import { useTenantData } from "@/lib/use-tenant-data";
import {
  generateSku,
  generateEan13,
  CATEGORY_TAX_HSN_DEFAULTS,
} from "@/lib/barcode-parser";
import {
  PackagePlus,
  Sparkles,
  X,
  Check,
  Barcode,
  Layers,
  IndianRupee,
} from "lucide-react";
import { HsnSearchAutocomplete } from "@/components/ui/hsn-search-autocomplete";

interface QuickProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductSaved: (newProduct: Product) => void;
}

export function QuickProductModal({
  isOpen,
  onClose,
  onProductSaved,
}: QuickProductModalProps) {
  const { tenant, addProduct } = usePosStore();
  const { categories } = useTenantData();

  // Form State
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [unit, setUnit] = useState("PCS");
  const [hsn, setHsn] = useState("9999");
  const [taxRate, setTaxRate] = useState<number>(18);
  const [purchasePrice, setPurchasePrice] = useState<number | "">("");
  const [salePrice, setSalePrice] = useState<number | "">("");
  const [wholesalePrice, setWholesalePrice] = useState<number | "">("");
  const [mrp, setMrp] = useState<number | "">("");

  if (!isOpen) return null;

  // Auto-generate SKU
  const handleGenerateSku = () => {
    const selectedCat = categories.find((c) => c.id === categoryId);
    const catCode = selectedCat?.codePrefix || "GEN";
    const generated = generateSku(catCode, name || "ITEM");
    setSku(generated);
  };

  // Auto-generate EAN-13 Barcode
  const handleGenerateBarcode = () => {
    const generated = generateEan13("890");
    setBarcode(generated);
  };

  // Auto-fill HSN and GST Rate when category changes
  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
    const cat = categories.find((c) => c.id === catId);
    if (cat) {
      if (cat.defaultGstRate !== undefined) setTaxRate(cat.defaultGstRate);
      if (cat.hsnCode) setHsn(cat.hsnCode);
    } else {
      const lower = catId.toLowerCase();
      for (const [key, cfg] of Object.entries(CATEGORY_TAX_HSN_DEFAULTS)) {
        if (lower.includes(key)) {
          setTaxRate(cfg.defaultGstRate);
          setHsn(cfg.hsnCode);
          break;
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please enter Product Name");
      return;
    }

    if (!categoryId) {
      alert("Please select a Product Category first.");
      return;
    }

    const finalSku = sku.trim() || generateSku("GEN", name);
    const finalMrp = Number(mrp) > 0 ? Number(mrp) : (Number(salePrice) > 0 ? Number(salePrice) : Number(purchasePrice) * 1.25);

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      tenantId: tenant?.id || "tenant-vyapar-01",
      name: name.trim(),
      sku: finalSku,
      barcode: barcode.trim() || undefined,
      categoryId: categoryId || undefined,
      unit: unit || "PCS",
      hsn: hsn.trim() || "9999",
      taxRate: Number(taxRate) || 18,
      purchasePrice: Number(purchasePrice) || 0,
      salePrice: Number(salePrice) || 0,
      wholesalePrice: Number(wholesalePrice) || 0,
      mrp: Number(finalMrp) || 0,
      currentStock: 0,
      minStock: 5,
      isTaxInclusive: false,
      trackBatch: true,
      trackSerial: false,
    };

    // 1. Save to local Zustand store & permanent storage
    addProduct(newProduct);

    // 2. Call backend API asynchronously
    try {
      await fetch("/api/v1/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });
    } catch (err) {
      console.warn("Product saved to local state.");
    }

    // 3. Callback to parent page to auto-select product on inward row
    onProductSaved(newProduct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Quick Add Product / Item
              </h2>
              <p className="text-xs text-slate-500">
                In-place creation for new inward inventory items
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          {/* Row 1: Product Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Product Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Parle-G Biscuit 250g"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
                required
              >
                {categories.length === 0 && <option value="">No Categories Found</option>}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.defaultGstRate}% GST)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: HSN, Tax Rate & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                HSN Code
              </label>
              <HsnSearchAutocomplete
                value={hsn}
                onChange={(code, gst) => {
                  setHsn(code);
                  if (gst !== undefined) {
                    setTaxRate(gst);
                  }
                }}
                className="p-2.5"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                GST Tax Rate (%)
              </label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="0">0% (Exempt)</option>
                <option value="5">5% GST</option>
                <option value="12">12% GST</option>
                <option value="18">18% GST</option>
                <option value="28">28% GST</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Unit of Measure
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="PCS">PCS (Pieces)</option>
                <option value="BOX">BOX</option>
                <option value="KG">KG (Kilograms)</option>
                <option value="LTR">LTR (Liters)</option>
                <option value="MTR">MTR (Meters)</option>
                <option value="PACK">PACK</option>
              </select>
            </div>
          </div>

          {/* Row 3: Rates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Sale Price (Retail) ₹
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value ? Number(e.target.value) : "")}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Wholesale Price ₹
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(e.target.value ? Number(e.target.value) : "")}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-purple-600 dark:text-purple-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Default Purchase Rate ₹
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value ? Number(e.target.value) : "")}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                MRP ₹
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={mrp}
                onChange={(e) => setMrp(e.target.value ? Number(e.target.value) : "")}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
              />
            </div>
          </div>

          {/* Row 4: Barcode & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Item SKU Code
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSku}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Auto-Gen
                </button>
              </div>
              <input
                type="text"
                placeholder="e.g. GROC-PAR-1092"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Barcode / EAN-13
                </label>
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Barcode className="w-3 h-3" /> EAN-13
                </button>
              </div>
              <input
                type="text"
                placeholder="e.g. 8901234567890"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Create & Add to Purchase</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
