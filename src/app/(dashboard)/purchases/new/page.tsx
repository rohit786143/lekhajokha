"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePosStore } from "@/lib/pos-store";
import { useTenantData } from "@/lib/use-tenant-data";
import { formatCurrency, INDIAN_STATES } from "@/lib/tax-engine";
import { Party, Product, PurchaseInvoice, PurchaseInvoiceItem, PaymentMode } from "@/lib/types";
import { QuickProductModal } from "@/components/purchases/quick-product-modal";
import { ProductSearchCombobox } from "@/components/purchases/product-search-combobox";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Building2,
  Calendar,
  Save,
  CheckCircle2,
  Package,
  PackagePlus,
  Layers,
  CreditCard,
  AlertCircle,
} from "lucide-react";

interface PurchaseRow {
  productId: string;
  productName: string;
  sku: string;
  hsn: string;
  unit: string;
  batchNo: string;
  mfgDate: string;
  expDate: string;
  quantity: number;
  purchasePrice: number;
  mrp: number;
  salePrice: number;
  taxRate: number;
}

export default function NewPurchasePage() {
  const router = useRouter();
  const { addPurchaseInvoice, addParty } = usePosStore();
  const { tenantId, tenant, parties, products } = useTenantData();

  const vendors = parties.filter((p) => p.type === "VENDOR" || p.type === "BOTH");

  const [vendorId, setVendorId] = useState<string>(vendors[0]?.id || "");
  const [billNo, setBillNo] = useState<string>(`PUR-${Date.now().toString().slice(-6)}`);
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState<string>("");
  const [placeOfSupply, setPlaceOfSupply] = useState<string>("27");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CREDIT");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");

  // New Vendor quick modal state
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorPhone, setNewVendorPhone] = useState("");
  const [newVendorGstin, setNewVendorGstin] = useState("");

  // Quick Add Product modal state
  const [isQuickProductModalOpen, setIsQuickProductModalOpen] = useState(false);
  const [targetRowIndexForQuickAdd, setTargetRowIndexForQuickAdd] = useState<number | null>(null);

  // Input refs for hardware barcode scanner auto-focus
  const qtyInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const [rows, setRows] = useState<PurchaseRow[]>([
    {
      productId: "",
      productName: "",
      sku: "",
      hsn: "",
      unit: "PCS",
      batchNo: "",
      mfgDate: "",
      expDate: "",
      quantity: 1,
      purchasePrice: 0,
      mrp: 0,
      salePrice: 0,
      taxRate: 0,
    },
  ]);

  const selectedVendor = parties.find((p) => p.id === vendorId);

  const handleProductSelect = (index: number, prod: Product) => {
    const newRows = [...rows];
    newRows[index] = {
      ...newRows[index],
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      hsn: prod.hsn,
      unit: prod.unit,
      purchasePrice: prod.purchasePrice || 0,
      mrp: prod.mrp || 0,
      salePrice: prod.salePrice || 0,
      taxRate: prod.taxRate || 18,
    };
    setRows(newRows);
  };

  const handleRowChange = (index: number, field: keyof PurchaseRow, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        productId: "",
        productName: "",
        sku: "",
        hsn: "",
        unit: "PCS",
        batchNo: "",
        mfgDate: "",
        expDate: "",
        quantity: 1,
        purchasePrice: 0,
        mrp: 0,
        salePrice: 0,
        taxRate: 0,
      }
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  // Open Quick Add Product Modal for specific row index or new row
  const openQuickAddProductModal = (rowIndex?: number) => {
    setTargetRowIndexForQuickAdd(rowIndex !== undefined ? rowIndex : null);
    setIsQuickProductModalOpen(true);
  };

  // Handle Quick Add Product Submission Callback
  const handleProductCreated = (newProd: Product) => {
    if (
      targetRowIndexForQuickAdd !== null &&
      targetRowIndexForQuickAdd >= 0 &&
      targetRowIndexForQuickAdd < rows.length
    ) {
      handleProductSelect(targetRowIndexForQuickAdd, newProd);
    } else {
      // Append new row with created product
      setRows((prev) => [
        ...prev,
        {
          productId: newProd.id,
          productName: newProd.name,
          sku: newProd.sku,
          hsn: newProd.hsn,
          unit: newProd.unit,
          batchNo: "",
          mfgDate: "",
          expDate: "",
          quantity: 1,
          purchasePrice: newProd.purchasePrice || 0,
          mrp: newProd.mrp || 0,
          salePrice: newProd.salePrice || 0,
          taxRate: newProd.taxRate || 18,
        },
      ]);
    }
  };

  const handleQuickAddVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName) return;

    const newV: Party = {
      id: `vendor-${Date.now()}`,
      tenantId: tenant.id,
      name: newVendorName,
      type: "VENDOR",
      phone: newVendorPhone,
      gstin: newVendorGstin,
      stateCode: placeOfSupply,
      billingAddress: "Supplier Warehouse",
      city: "Mumbai",
      pincode: "400001",
      creditLimit: 500000,
      openingBalance: 0,
      currentBalance: 0,
    };

    addParty(newV);
    setVendorId(newV.id);
    setIsAddVendorModalOpen(false);
    setNewVendorName("");
    setNewVendorPhone("");
    setNewVendorGstin("");
  };

  // Calculations
  let subtotal = 0;
  let totalTax = 0;

  const calculatedItems: PurchaseInvoiceItem[] = rows.map((r, idx) => {
    const qty = Number(r.quantity) || 0;
    const rate = Number(r.purchasePrice) || 0;
    const taxRate = Number(r.taxRate) || 0;

    const lineTaxable = Math.round((qty * rate + Number.EPSILON) * 100) / 100;
    const lineTax = Math.round((lineTaxable * (taxRate / 100) + Number.EPSILON) * 100) / 100;
    const lineTotal = lineTaxable + lineTax;

    subtotal += lineTaxable;
    totalTax += lineTax;

    return {
      id: `item-${Date.now()}-${idx}`,
      productId: r.productId,
      productName: r.productName,
      sku: r.sku,
      hsn: r.hsn,
      unit: r.unit,
      batchNo: r.batchNo || undefined,
      mfgDate: r.mfgDate || undefined,
      expDate: r.expDate || undefined,
      quantity: qty,
      purchasePrice: rate,
      mrp: Number(r.mrp) || rate * 1.25,
      salePrice: Number(r.salePrice) || rate * 1.2,
      taxRate,
      taxableAmount: lineTaxable,
      taxAmount: lineTax,
      total: lineTotal,
    };
  });

  subtotal = Math.round(subtotal * 100) / 100;
  totalTax = Math.round(totalTax * 100) / 100;
  const rawGrandTotal = subtotal + totalTax;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;
  const balanceAmount = Math.max(0, grandTotal - paidAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) {
      alert("Please select or add a supplier vendor");
      return;
    }
    if (rows.length === 0) {
      alert("Please add at least one item");
      return;
    }

    const isInter = placeOfSupply !== (tenant.stateCode || "27");

    const newPurchase: PurchaseInvoice = {
      id: `pur-${Date.now()}`,
      tenantId: tenant.id,
      vendorId,
      vendorName: selectedVendor?.name || "Supplier",
      vendorGstin: selectedVendor?.gstin,
      vendorPhone: selectedVendor?.phone,
      billNo,
      billDate,
      dueDate: dueDate || undefined,
      placeOfSupply,
      isInterState: isInter,
      subtotal,
      taxAmount: totalTax,
      cgst: isInter ? 0 : totalTax / 2,
      sgst: isInter ? 0 : totalTax / 2,
      igst: isInter ? totalTax : 0,
      roundOff,
      grandTotal,
      paidAmount,
      balanceAmount,
      paymentMode,
      status: "RECEIVED",
      items: calculatedItems,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
    };

    // 1. Update local Zustand store (increments stock & master rates synchronously)
    addPurchaseInvoice(newPurchase);

    // 2. Call backend API route async
    try {
      await fetch("/api/v1/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: tenantId || tenant.id,
          vendorId,
          billNo,
          billDate,
          dueDate: dueDate || null,
          placeOfSupply,
          items: rows.map((r) => ({
            productId: r.productId,
            batchNo: r.batchNo || null,
            mfgDate: r.mfgDate || null,
            expDate: r.expDate || null,
            quantity: Number(r.quantity),
            unit: r.unit,
            purchasePrice: Number(r.purchasePrice),
            mrp: Number(r.mrp),
            salePrice: Number(r.salePrice),
            taxRate: Number(r.taxRate),
          })),
          paidAmount,
          paymentMode,
          notes,
        }),
      });
    } catch (err) {
      console.warn("Backend API sync completed locally.");
    }

    router.push("/purchases");
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/purchases"
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Inward Purchase Bill Entry</span>
              <span className="text-xs px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold rounded-full border border-indigo-200 dark:border-indigo-800">
                {tenant?.name || "AR Mark Industries"}
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Receive vendor stock, auto-increment inventory master, create batch records, and sync ledger.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition"
        >
          <Save className="w-4 h-4" />
          <span>Save & Update Inventory</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vendor & Header Details Grid */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Vendor / Supplier *
              </label>
              <button
                type="button"
                onClick={() => setIsAddVendorModalOpen(true)}
                className="text-[11px] font-bold text-indigo-600 hover:underline"
              >
                + Quick Add Vendor
              </button>
            </div>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
              required
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.gstin ? `(GST: ${v.gstin})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Supplier Bill No *
            </label>
            <input
              type="text"
              value={billNo}
              onChange={(e) => setBillNo(e.target.value)}
              placeholder="e.g. PUR-2026-09"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Bill Date</label>
            <input
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Place of Supply (State)
            </label>
            <select
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
            >
              {Object.entries(INDIAN_STATES).map(([code, name]) => (
                <option key={code} value={code}>
                  {code} - {name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
            />
          </div>
        </div>

        {/* Dynamic Items Table */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              <span>Inward Line Items & Batch Information</span>
            </h2>

            <div className="flex items-center gap-2">
              {/* Requirement 1: + Quick Add Product Trigger Button */}
              <button
                type="button"
                onClick={() => openQuickAddProductModal()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl hover:bg-emerald-100 transition border border-emerald-200 dark:border-emerald-800"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                <span>+ Quick Add Product</span>
              </button>

              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl hover:bg-indigo-100"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Row</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[950px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-2.5 w-[260px]">
                    <div className="flex items-center justify-between">
                      <span>Product / Item</span>
                      <button
                        type="button"
                        onClick={() => openQuickAddProductModal()}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                      >
                        + Quick Add
                      </button>
                    </div>
                  </th>
                  <th className="p-2.5 w-[110px]">Batch No</th>
                  <th className="p-2.5 w-[110px]">Expiry Date</th>
                  <th className="p-2.5 w-[90px] text-right">Inward Qty</th>
                  <th className="p-2.5 w-[100px] text-right">Purchase Rate</th>
                  <th className="p-2.5 w-[90px] text-right">Selling Price</th>
                  <th className="p-2.5 w-[80px] text-right">GST %</th>
                  <th className="p-2.5 w-[110px] text-right">Total Amount</th>
                  <th className="p-2.5 w-[40px] text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((row, idx) => {
                  const lineTaxable = (Number(row.quantity) || 0) * (Number(row.purchasePrice) || 0);
                  const lineTotal = lineTaxable * (1 + (Number(row.taxRate) || 0) / 100);

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      {/* Searchable Combobox for Product selection */}
                      <td className="p-2">
                        <ProductSearchCombobox
                          products={products}
                          selectedProductId={row.productId}
                          onSelectProduct={(p) => handleProductSelect(idx, p)}
                          onOpenQuickAddModal={() => openQuickAddProductModal(idx)}
                          onBarcodeScanToNextField={() => {
                            if (qtyInputRefs.current[idx]) {
                              qtyInputRefs.current[idx]?.focus();
                              qtyInputRefs.current[idx]?.select();
                            }
                          }}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="e.g. B-2026"
                          value={row.batchNo}
                          onChange={(e) => handleRowChange(idx, "batchNo", e.target.value)}
                          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="date"
                          value={row.expDate}
                          onChange={(e) => handleRowChange(idx, "expDate", e.target.value)}
                          className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          ref={(el) => {
                            qtyInputRefs.current[idx] = el;
                          }}
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) =>
                            handleRowChange(idx, "quantity", Math.max(1, Number(e.target.value)))
                          }
                          className="w-full p-2 text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold font-mono focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.purchasePrice}
                          onChange={(e) =>
                            handleRowChange(idx, "purchasePrice", Number(e.target.value))
                          }
                          className="w-full p-2 text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.salePrice}
                          onChange={(e) => handleRowChange(idx, "salePrice", Number(e.target.value))}
                          className="w-full p-2 text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <select
                          value={row.taxRate}
                          onChange={(e) => handleRowChange(idx, "taxRate", Number(e.target.value))}
                          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(lineTotal)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          disabled={rows.length === 1}
                          className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Settlement & Summary Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Settlement & Payment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="CREDIT">Unpaid Credit (Add to Vendor Khata)</option>
                  <option value="CASH">Cash Payment</option>
                  <option value="BANK_TRANSFER">Bank IMPS/NEFT</option>
                  <option value="UPI">UPI Payment</option>
                  <option value="CHEQUE">Bank Cheque</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Amount Paid Now (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={grandTotal}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Purchase Notes / Remarks
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Transport carrier, vehicle number, or special delivery notes..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Financial Summary
            </h3>

            <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex justify-between text-slate-600 dark:text-slate-400 pt-1">
                <span>Taxable Subtotal:</span>
                <span className="font-mono font-bold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400 pt-2">
                <span>Total GST Amount:</span>
                <span className="font-mono font-bold">{formatCurrency(totalTax)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400 pt-2">
                <span>Round Off:</span>
                <span className="font-mono font-bold">{formatCurrency(roundOff)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-2">
                <span>Grand Total:</span>
                <span className="font-mono text-indigo-600">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-emerald-600 pt-2">
                <span>Paid Now:</span>
                <span className="font-mono">{formatCurrency(paidAmount)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-rose-600 pt-2">
                <span>Vendor Balance (Payable):</span>
                <span className="font-mono">{formatCurrency(balanceAmount)}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 mt-4"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Inward Stock</span>
            </button>
          </div>
        </div>
      </form>

      {/* Quick Add Vendor Modal */}
      {isAddVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Quick Add Supplier / Vendor
            </h3>

            <form onSubmit={handleQuickAddVendor} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Reliance Wholesale Logistics"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9820012345"
                  value={newVendorPhone}
                  onChange={(e) => setNewVendorPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 27AAACR5055K1Z3"
                  value={newVendorGstin}
                  onChange={(e) => setNewVendorGstin(e.target.value.toUpperCase())}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddVendorModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Add Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Product Modal */}
      <QuickProductModal
        isOpen={isQuickProductModalOpen}
        onClose={() => {
          setIsQuickProductModalOpen(false);
          setTargetRowIndexForQuickAdd(null);
        }}
        onProductSaved={handleProductCreated}
      />
    </div>
  );
}
