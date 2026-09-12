"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";
import { usePosStore } from "@/lib/pos-store";
import { useTenantData } from "@/lib/use-tenant-data";
import { Product, Category } from "@/lib/types";
import { formatCurrency } from "@/lib/tax-engine";
import {
  generateEan13,
  generateSku,
  CATEGORY_TAX_HSN_DEFAULTS,
} from "@/lib/barcode-parser";
import {
  Package,
  Plus,
  Search,
  Layers,
  Barcode,
  Printer,
  Trash2,
  AlertOctagon,
  X,
  PackagePlus,
  ShoppingBag,
  Sparkles,
  Check,
  ScanLine,
  FolderPlus,
  UploadCloud,
} from "lucide-react";
import { HsnSearchAutocomplete } from "@/components/ui/hsn-search-autocomplete";

export default function InventoryPage() {
  const { tenant, addCategory, addProduct, deleteProduct, clearAllInventory, inwardStock } = usePosStore();
  const { products, categories } = useTenantData();
  const tenantProducts = products;
  const tenantCategories = categories;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBarcodePrintModalOpen, setIsBarcodePrintModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New product form state
  const [newProdName, setNewProdName] = useState("");
  const [newProdSku, setNewProdSku] = useState("");
  const [newProdBarcode, setNewProdBarcode] = useState("");
  const [newProdCategory, setNewProdCategory] = useState(tenantCategories[0]?.id || "");
  const [newProdUnit, setNewProdUnit] = useState("PCS");
  const [newProdHsn, setNewProdHsn] = useState("9999");
  const [newProdTaxRate, setNewProdTaxRate] = useState(18);
  const [newProdPurchasePrice, setNewProdPurchasePrice] = useState(0);
  const [newProdSalePrice, setNewProdSalePrice] = useState(0);
  const [newProdMrp, setNewProdMrp] = useState(0);
  const [newProdStock, setNewProdStock] = useState(10);
  const [newProdTrackBatch, setNewProdTrackBatch] = useState(false);
  const [newProdTrackSerial, setNewProdTrackSerial] = useState(false);

  // Inline Category Creation Modal state
  const [isInlineCategoryModalOpen, setIsInlineCategoryModalOpen] = useState(false);
  const [inlineCatName, setInlineCatName] = useState("");
  const [inlineCatPrefix, setInlineCatPrefix] = useState("");
  const [inlineCatGstRate, setInlineCatGstRate] = useState<number>(18);
  const [inlineCatHsn, setInlineCatHsn] = useState("9999");
  const [inlineCatDesc, setInlineCatDesc] = useState("");

  // Status feedback toasts/flags
  const [skuGeneratedNotice, setSkuGeneratedNotice] = useState(false);
  const [barcodeGeneratedNotice, setBarcodeGeneratedNotice] = useState(false);

  // Cascade category default HSN and Tax Rate whenever category changes
  const handleCategoryChange = (catId: string) => {
    if (catId === "__CREATE_NEW__") {
      setIsInlineCategoryModalOpen(true);
      return;
    }

    setNewProdCategory(catId);
    const cat = tenantCategories.find((c) => c.id === catId);
    if (cat) {
      if (cat.defaultGstRate !== undefined) setNewProdTaxRate(cat.defaultGstRate);
      if (cat.hsnCode) setNewProdHsn(cat.hsnCode);
    } else {
      // Fallback matching
      const lower = catId.toLowerCase();
      for (const [key, cfg] of Object.entries(CATEGORY_TAX_HSN_DEFAULTS)) {
        if (lower.includes(key)) {
          setNewProdTaxRate(cfg.defaultGstRate);
          setNewProdHsn(cfg.hsnCode);
          break;
        }
      }
    }
  };

  // Save Inline Category and auto-select in product form
  const handleSaveInlineCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineCatName.trim()) return;

    const prefix = inlineCatPrefix.trim().toUpperCase() || inlineCatName.trim().slice(0, 4).toUpperCase();
    const newCat = addCategory({
      tenantId: tenant.id,
      name: inlineCatName.trim(),
      codePrefix: prefix,
      defaultGstRate: Number(inlineCatGstRate) || 18,
      hsnCode: inlineCatHsn.trim() || "9999",
      description: inlineCatDesc.trim(),
      isActive: true,
    });

    // Auto-select in parent modal
    setNewProdCategory(newCat.id);
    setNewProdTaxRate(newCat.defaultGstRate);
    setNewProdHsn(newCat.hsnCode || "9999");

    // Re-generate SKU with new prefix if current SKU was default/empty
    if (!newProdSku || newProdSku.startsWith("GEN-") || newProdSku.startsWith("PROD-")) {
      setNewProdSku(generateSku(prefix, newProdName));
    }

    // Reset and close sub-modal
    setInlineCatName("");
    setInlineCatPrefix("");
    setInlineCatGstRate(18);
    setInlineCatHsn("9999");
    setInlineCatDesc("");
    setIsInlineCategoryModalOpen(false);
  };

  // Auto Generate SKU
  const handleAutoGenerateSku = () => {
    const cat = tenantCategories.find((c) => c.id === newProdCategory);
    const prefix = cat?.codePrefix || "GEN";
    const generated = generateSku(prefix, newProdName);
    setNewProdSku(generated);
    setSkuGeneratedNotice(true);
    setTimeout(() => setSkuGeneratedNotice(false), 2000);
  };

  // Auto Generate EAN-13 Barcode with Modulo-10 Checksum
  const handleGenerateBarcode = () => {
    const generated = generateEan13("890");
    setNewProdBarcode(generated);
    setBarcodeGeneratedNotice(true);
    setTimeout(() => setBarcodeGeneratedNotice(false), 2000);
  };

  // Reset & open Add Product Modal
  const openAddModal = () => {
    const defaultCat = tenantCategories[0];
    const initialCatId = defaultCat?.id || "";
    setNewProdCategory(initialCatId);
    setNewProdName("");
    setNewProdUnit("PCS");
    setNewProdTaxRate(defaultCat?.defaultGstRate ?? 18);
    setNewProdHsn(defaultCat?.hsnCode ?? "9999");
    setNewProdPurchasePrice(0);
    setNewProdSalePrice(0);
    setNewProdMrp(0);
    setNewProdStock(10);
    setNewProdTrackBatch(false);
    setNewProdTrackSerial(false);

    // Auto-generate initial SKU & Barcode
    const prefix = defaultCat?.codePrefix || "GEN";
    setNewProdSku(generateSku(prefix, ""));
    setNewProdBarcode(generateEan13("890"));
    setIsAddModalOpen(true);
  };

  const filteredProducts = tenantProducts.filter((p) => {
    const matchCat = selectedCategory === "ALL" || p.categoryId === selectedCategory;
    const matchSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery));
    return matchCat && matchSearch;
  });

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = tenantCategories.find((c) => c.id === newProdCategory);
    const prefix = cat?.codePrefix || "GEN";
    const finalSku = newProdSku.trim() || generateSku(prefix, newProdName);
    const finalBarcode = newProdBarcode.trim() || generateEan13("890");

    const newP: Product = {
      id: `prod-${Date.now()}`,
      tenantId: tenant.id,
      name: newProdName,
      sku: finalSku,
      barcode: finalBarcode,
      categoryId: newProdCategory,
      categoryName: cat?.name,
      unit: newProdUnit,
      hsn: newProdHsn || "9999",
      taxRate: Number(newProdTaxRate) || 0,
      isTaxInclusive: true,
      purchasePrice: Number(newProdPurchasePrice) || 0,
      salePrice: Number(newProdSalePrice) || 0,
      mrp: Number(newProdMrp) || Number(newProdSalePrice) || 0,
      minStock: 5,
      currentStock: Number(newProdStock) || 0,
      trackBatch: newProdTrackBatch,
      trackSerial: newProdTrackSerial,
      batches: newProdTrackBatch
        ? [
            {
              id: `b-${Date.now()}`,
              productId: `prod-${Date.now()}`,
              godownId: "godown-1",
              godownName: "Store Front Counter",
              batchNo: `BAT-${new Date().getFullYear()}-01`,
              mfgDate: "2026-01-01",
              expDate: "2027-12-31",
              stockQty: Number(newProdStock) || 0,
              purchasePrice: Number(newProdPurchasePrice) || 0,
              salePrice: Number(newProdSalePrice) || 0,
              mrp: Number(newProdMrp) || 0,
            },
          ]
        : undefined,
    };

    addProduct(newP);
    setIsAddModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let importedCount = 0;
        let updatedCount = 0;

        for (const row of data) {
          const hsnCode = row.HSN?.toString() || row.hsn?.toString() || row.HSNCode?.toString();
          if (!hsnCode) continue;

          // Check if product with this HSN exists
          const existingProduct = tenantProducts.find((p) => p.hsn === hsnCode);
          const stockQty = Number(row.Stock) || Number(row.StockQuantity) || Number(row.stock) || 0;
          const purchasePrice = Number(row.PurchasePrice) || Number(row.purchasePrice) || 0;
          const salePrice = Number(row.SalePrice) || Number(row.salePrice) || 0;
          const mrp = Number(row.MRP) || Number(row.mrp) || salePrice;
          
          if (existingProduct) {
            // Inward stock based on HSN Code
            inwardStock({
              productId: existingProduct.id,
              godownId: "godown-1",
              quantity: stockQty,
              purchasePrice: purchasePrice || existingProduct.purchasePrice,
              salePrice: salePrice || existingProduct.salePrice,
              mrp: mrp || existingProduct.mrp,
            });
            updatedCount++;
          } else {
            // Create new product if it doesn't exist
            const catPrefix = tenantCategories[0]?.codePrefix || "GEN";
            const newSku = row.SKU?.toString() || generateSku(catPrefix, row.Name?.toString() || "Imported Product");
            const newBarcode = row.Barcode?.toString() || generateEan13("890");

            addProduct({
              id: `prod-imp-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
              tenantId: tenant.id,
              name: row.Name?.toString() || row.name?.toString() || "Imported Product",
              sku: newSku,
              barcode: newBarcode,
              categoryId: tenantCategories[0]?.id || "",
              categoryName: tenantCategories[0]?.name || "",
              unit: row.Unit?.toString() || "PCS",
              hsn: hsnCode,
              taxRate: Number(row.TaxRate) || Number(row.taxRate) || tenantCategories[0]?.defaultGstRate || 18,
              isTaxInclusive: true,
              purchasePrice: purchasePrice,
              salePrice: salePrice,
              mrp: mrp,
              minStock: 5,
              currentStock: stockQty,
              trackBatch: false,
              trackSerial: false,
            });
            importedCount++;
          }
        }
        alert(`Successfully imported/updated inventory!\nNew Products: ${importedCount}\nUpdated Products (HSN match): ${updatedCount}`);
      } catch (error) {
        console.error("Error parsing Excel:", error);
        alert("Error parsing Excel file. Please ensure it is a valid .xlsx or .csv format.");
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmClearAll = () => {
    clearAllInventory();
    setIsClearModalOpen(false);
  };

  const handleConfirmDeleteProduct = () => {
    if (productToDelete) {
      deleteProduct(productToDelete.id);
      setProductToDelete(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>Inventory, Batch & Serial Control Matrix</span>
          </h1>
          <p className="text-xs text-slate-500">
            Dynamic tenant categories, automated SKU/EAN-13 barcodes, multi-godown stock, and quick inward.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/inventory/categories"
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-2xl transition shadow-xs"
          >
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Category Master ({tenantCategories.length})</span>
          </Link>

          <Link
            href="/inventory/quick-inward"
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-2xl transition shadow-xs"
          >
            <ScanLine className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Quick Stock Inward</span>
          </Link>

          {tenantProducts.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70 border border-rose-200 dark:border-rose-900/50 rounded-2xl transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove All Inventory</span>
            </button>
          )}

          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-black text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl shadow-sm transition border border-slate-200 dark:border-slate-700"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import Excel</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar with Dynamic Categories */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items, SKU, or Barcode..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === "ALL"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            All ({tenantProducts.length})
          </button>
          {tenantCategories.map((cat) => {
            const count = tenantProducts.filter((p) => p.categoryId === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="py-20 px-6 text-center space-y-4">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Package className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                No Products in Inventory
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Your inventory catalog is currently empty. You can add master products directly or record an Inward Purchase Bill / Quick Inward.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={openAddModal}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Product</span>
              </button>
              <Link
                href="/inventory/quick-inward"
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-md transition"
              >
                <ScanLine className="w-4 h-4" />
                <span>Quick Stock Inward</span>
              </Link>
              <Link
                href="/purchases/new"
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Record Purchase Bill</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Product Name & Category</th>
                  <th className="p-3.5">SKU & Barcode</th>
                  <th className="p-3.5">HSN & GST %</th>
                  <th className="p-3.5 text-right">Purchase Rate</th>
                  <th className="p-3.5 text-right">Sale Price (MRP)</th>
                  <th className="p-3.5 text-center">Current Stock</th>
                  <th className="p-3.5 text-center">Batch / IMEI Status</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredProducts.map((p) => {
                  const isLowStock = p.currentStock <= p.minStock;
                  const catName = categories.find((c) => c.id === p.categoryId)?.name || p.categoryName || "General";

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                        <div className="text-[10px] text-slate-400">{catName}</div>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="font-bold text-indigo-600">{p.sku}</div>
                        <div className="text-[10px] text-slate-400">{p.barcode || "-"}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-mono">{p.hsn}</div>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded">
                          {p.taxRate}% GST
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-600 dark:text-slate-300">
                        {formatCurrency(p.purchasePrice)}
                      </td>
                      <td className="p-3.5 text-right font-mono">
                        <div className="font-black text-slate-900 dark:text-white">
                          {formatCurrency(p.salePrice)}
                        </div>
                        <div className="text-[10px] text-slate-400">MRP: {formatCurrency(p.mrp)}</div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`font-black font-mono px-2.5 py-1 rounded-lg text-xs ${
                            isLowStock
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}
                        >
                          {p.currentStock} {p.unit}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {p.trackBatch && p.batches ? (
                          <div className="text-[10px] space-y-0.5">
                            {p.batches.map((b) => (
                              <div
                                key={b.id}
                                className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded font-mono font-semibold"
                              >
                                {b.batchNo} ({b.stockQty} {p.unit})
                              </div>
                            ))}
                          </div>
                        ) : p.trackSerial && p.serials ? (
                          <div className="text-[10px] font-mono text-blue-600 font-bold">
                            {p.serials.filter((s) => s.status === "AVAILABLE").length} IMEIs Available
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">Standard Qty</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/inventory/quick-inward?barcode=${encodeURIComponent(p.barcode || p.sku)}`}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition"
                            title="Quick Stock Top-Up"
                          >
                            <ScanLine className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductForBarcode(p);
                              setIsBarcodePrintModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                            title="Print Barcode Labels"
                          >
                            <Barcode className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setProductToDelete(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Clear All Inventory Confirmation Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Remove All Inventory?
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to completely remove all {products.length} products from the inventory? This will clear all stock matrices, batches, and serial records.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="w-full py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="w-full py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md transition"
              >
                Yes, Remove All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Product Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Delete Product?
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">"{productToDelete.name}"</span>?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="w-full py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                className="w-full py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md transition"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Product Modal with Inline Category Creation */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-slate-50 dark:from-slate-800/80 dark:to-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/20">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Add New Master Product
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Auto-generated SKU, GS1 EAN-13 barcode, and category-cascaded HSN/GST tax rates.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Product Trade Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="e.g. Paracetamol 500mg IP / Tata Salt Vacuum Evaporated 1kg"
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Category with Inline Addition */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Category & Classification
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsInlineCategoryModalOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline transition"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Create New Category</span>
                    </button>
                  </div>
                  <select
                    value={newProdCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.codePrefix ? `[${c.codePrefix}]` : ""}
                      </option>
                    ))}
                    <option value="__CREATE_NEW__" className="text-indigo-600 font-bold">
                      ➕ + Create New Category...
                    </option>
                  </select>
                </div>

                {/* Unit of Measurement */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Primary Unit of Measurement
                  </label>
                  <select
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="STRIP">STRIP (Pharma Tablets)</option>
                    <option value="BOX">BOX (Outer Packaging)</option>
                    <option value="KG">KG (Kilograms)</option>
                    <option value="GM">GM (Grams)</option>
                    <option value="LTR">LTR (Litres)</option>
                    <option value="ML">ML (Millilitres)</option>
                    <option value="BAG">BAG (Sack)</option>
                    <option value="PACK">PACK</option>
                  </select>
                </div>

                {/* Auto-Generate SKU Field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Product SKU Code
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateSku}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline transition"
                    >
                      {skuGeneratedNotice ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500 font-black">Generated!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          <span>Auto Generate</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={newProdSku}
                      onChange={(e) => setNewProdSku(e.target.value)}
                      placeholder="e.g. PHARM-PAR-4821"
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-indigo-700 dark:text-indigo-300"
                    />
                  </div>
                </div>

                {/* Auto-Generate EAN-13 Barcode Field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      EAN-13 / Code-128 Barcode
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateBarcode}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 hover:underline transition"
                    >
                      {barcodeGeneratedNotice ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500 font-black">Generated!</span>
                        </>
                      ) : (
                        <>
                          <Barcode className="w-3 h-3" />
                          <span>Generate System Barcode</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={newProdBarcode}
                      onChange={(e) => setNewProdBarcode(e.target.value)}
                      placeholder="e.g. 8904512398124"
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* HSN Code Field (Beside GST Tax Slab) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>HSN / SAC Code</span>
                    <span className="text-[10px] text-slate-400">Auto-filled</span>
                  </label>
                  <HsnSearchAutocomplete
                    value={newProdHsn}
                    onChange={(code, gst) => {
                      setNewProdHsn(code);
                      if (gst !== undefined) {
                        setNewProdTaxRate(gst);
                      }
                    }}
                  />
                </div>

                {/* GST Tax Slab (%) (Beside HSN Code) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>GST Tax Slab (%)</span>
                    <span className="text-[10px] text-indigo-600 font-bold">Cascade Active</span>
                  </label>
                  <select
                    value={newProdTaxRate}
                    onChange={(e) => setNewProdTaxRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value={0}>0% GST (Exempt Goods)</option>
                    <option value={5}>5% GST (Essential Groceries/FMCG)</option>
                    <option value={12}>12% GST (Medicines/Apparel)</option>
                    <option value={18}>18% GST (Standard Rate / Electronics)</option>
                    <option value={28}>28% GST (Luxury/Hardware/Automotive)</option>
                  </select>
                </div>

                {/* Purchase Rate */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Purchase Rate (₹ per unit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newProdPurchasePrice || ""}
                    onChange={(e) => setNewProdPurchasePrice(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Sale Price */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Wholesale / Retail Sale Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={newProdSalePrice || ""}
                    onChange={(e) => setNewProdSalePrice(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs font-mono font-black text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Maximum Retail Price (MRP) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Maximum Retail Price (MRP ₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newProdMrp || ""}
                    onChange={(e) => setNewProdMrp(Number(e.target.value))}
                    placeholder="Optional printed MRP"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Opening Stock */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Initial Opening Stock Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newProdStock || ""}
                    onChange={(e) => setNewProdStock(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tracking checkboxes */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProdTrackBatch}
                    onChange={(e) => setNewProdTrackBatch(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Enable Pharma Batch & Expiry Tracking</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProdTrackSerial}
                    onChange={(e) => setNewProdTrackSerial(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Enable IMEI / Serial Number Tracking</span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Product to Catalog</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline Category Creation Sub-Dialog */}
      {isInlineCategoryModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-indigo-500/40 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Create New Category
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInlineCategoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInlineCategory} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={inlineCatName}
                  onChange={(e) => setInlineCatName(e.target.value)}
                  placeholder="e.g. Surgical & Disposables"
                  className="w-full mt-1 px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    SKU Code Prefix
                  </label>
                  <input
                    type="text"
                    value={inlineCatPrefix}
                    onChange={(e) => setInlineCatPrefix(e.target.value.toUpperCase())}
                    placeholder="e.g. SURG"
                    className="w-full mt-1 px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Default HSN Code
                  </label>
                  <input
                    type="text"
                    value={inlineCatHsn}
                    onChange={(e) => setInlineCatHsn(e.target.value)}
                    placeholder="e.g. 9018"
                    className="w-full mt-1 px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Default GST Tax Slab (%)
                  </label>
                  <select
                    value={inlineCatGstRate}
                    onChange={(e) => setInlineCatGstRate(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  >
                    <option value={0}>0% GST (Exempt Goods)</option>
                    <option value={5}>5% GST (Essentials / Food)</option>
                    <option value={12}>12% GST (Medicines / Garments)</option>
                    <option value={18}>18% GST (Standard Rate / Electronics)</option>
                    <option value={28}>28% GST (Luxury / Hardware)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInlineCategoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow transition"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Label Printing Modal */}
      {isBarcodePrintModalOpen && selectedProductForBarcode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Barcode Label Preview
              </h3>
              <button
                onClick={() => setIsBarcodePrintModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Label Canvas */}
            <div className="p-4 bg-white border-2 border-dashed border-slate-300 rounded-2xl text-center text-slate-900 space-y-2">
              <div className="text-xs font-extrabold uppercase truncate">
                {selectedProductForBarcode.name}
              </div>
              <div className="font-mono font-bold text-lg tracking-widest bg-slate-100 py-1.5 rounded border border-slate-200">
                ||| | |||| | ||||| |||| |
              </div>
              <div className="text-[11px] font-mono font-black">
                {selectedProductForBarcode.barcode || selectedProductForBarcode.sku}
              </div>
              <div className="flex justify-between text-[11px] font-bold border-t border-slate-200 pt-1.5 px-2">
                <span>MRP: {formatCurrency(selectedProductForBarcode.mrp)}</span>
                <span className="text-indigo-600">
                  OUR PRICE: {formatCurrency(selectedProductForBarcode.salePrice)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow transition"
              >
                <Printer className="w-4 h-4" /> Print 24x Label Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
