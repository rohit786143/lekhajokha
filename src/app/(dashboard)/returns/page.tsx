"use client";

import React, { useState } from "react";
import { usePosStore } from "@/lib/pos-store";
import { useTenantData } from "@/lib/use-tenant-data";
import { formatCurrency } from "@/lib/tax-engine";
import { CreditNote, DebitNote, ReturnItem, ReturnReason, PaymentMode } from "@/lib/types";
import {
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  X,
  Package,
  Trash2,
  Receipt,
  Building2,
  Users,
} from "lucide-react";

export default function ReturnsPage() {
  const { tenant, addCreditNote, addDebitNote } = usePosStore();
  const { creditNotes, debitNotes, parties, products } = useTenantData();
  const tenantCreditNotes = creditNotes;
  const tenantDebitNotes = debitNotes;
  const tenantParties = parties;
  const tenantProducts = products;

  const [activeTab, setActiveTab] = useState<"SALES_RETURN" | "PURCHASE_RETURN">("SALES_RETURN");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewCreditNote, setPreviewCreditNote] = useState<CreditNote | null>(null);
  const [previewDebitNote, setPreviewDebitNote] = useState<DebitNote | null>(null);

  // Form state
  const [selectedPartyId, setSelectedPartyId] = useState<string>(tenantParties[0]?.id || "");
  const [returnReason, setReturnReason] = useState<ReturnReason>("DEFECTIVE_GOODS");
  const [refundMode, setRefundMode] = useState<PaymentMode>("CREDIT");
  const [originalRefNo, setOriginalRefNo] = useState("");
  const [notes, setNotes] = useState("");

  const [returnRows, setReturnRows] = useState<
    {
      productId: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
    }[]
  >([
    {
      productId: tenantProducts[0]?.id || "",
      quantity: 1,
      unitPrice: tenantProducts[0]?.salePrice || 100,
      taxRate: tenantProducts[0]?.taxRate || 18,
    },
  ]);

  const customers = tenantParties.filter((p) => p.type === "CUSTOMER" || p.type === "BOTH");
  const vendors = tenantParties.filter((p) => p.type === "VENDOR" || p.type === "BOTH");

  const totalCreditReturns = tenantCreditNotes.reduce((sum, c) => sum + c.totalAmount, 0);
  const totalDebitReturns = tenantDebitNotes.reduce((sum, d) => sum + d.totalAmount, 0);

  const handleAddRow = () => {
    const defaultP = tenantProducts[0];
    setReturnRows([
      ...returnRows,
      {
        productId: defaultP?.id || "",
        quantity: 1,
        unitPrice:
          activeTab === "SALES_RETURN" ? defaultP?.salePrice || 100 : defaultP?.purchasePrice || 80,
        taxRate: defaultP?.taxRate || 18,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (returnRows.length === 1) return;
    setReturnRows(returnRows.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, field: string, value: any) => {
    const newRows = [...returnRows];
    if (field === "productId") {
      const prod = tenantProducts.find((p) => p.id === value);
      newRows[index] = {
        ...newRows[index],
        productId: value,
        unitPrice:
          activeTab === "SALES_RETURN" ? prod?.salePrice || 0 : prod?.purchasePrice || 0,
        taxRate: prod?.taxRate || 18,
      };
    } else {
      newRows[index] = { ...newRows[index], [field]: value };
    }
    setReturnRows(newRows);
  };

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    const selParty = tenantParties.find((p) => p.id === selectedPartyId);
    if (!selParty) return;

    let totalAmount = 0;
    let taxAmount = 0;

    const calculatedItems: ReturnItem[] = returnRows.map((r, idx) => {
      const prod = products.find((p) => p.id === r.productId);
      const taxable = (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0);
      const tax = taxable * ((Number(r.taxRate) || 0) / 100);
      const lineTotal = taxable + tax;

      totalAmount += lineTotal;
      taxAmount += tax;

      return {
        id: `ret-item-${Date.now()}-${idx}`,
        productId: r.productId,
        productName: prod?.name || "Product",
        sku: prod?.sku || "SKU",
        quantity: Number(r.quantity),
        unit: prod?.unit || "PCS",
        unitPrice: Number(r.unitPrice),
        taxRate: Number(r.taxRate),
        total: lineTotal,
        reason: returnReason,
      };
    });

    if (activeTab === "SALES_RETURN") {
      const newCreditNote: CreditNote = {
        id: `cn-${Date.now()}`,
        tenantId: tenant.id,
        creditNoteNo: `CN-2627-${String(creditNotes.length + 1).padStart(4, "0")}`,
        originalInvoiceNo: originalRefNo || undefined,
        partyId: selectedPartyId,
        partyName: selParty.name,
        totalAmount,
        taxAmount,
        refundMode,
        reason: returnReason,
        items: calculatedItems,
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
      };

      addCreditNote(newCreditNote);
    } else {
      const newDebitNote: DebitNote = {
        id: `dn-${Date.now()}`,
        tenantId: tenant.id,
        debitNoteNo: `DN-2627-${String(debitNotes.length + 1).padStart(4, "0")}`,
        originalPurchaseBillNo: originalRefNo || undefined,
        partyId: selectedPartyId,
        partyName: selParty.name,
        totalAmount,
        taxAmount,
        adjustmentMode: refundMode,
        reason: returnReason,
        items: calculatedItems,
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
      };

      addDebitNote(newDebitNote);
    }

    setIsModalOpen(false);
    setNotes("");
    setOriginalRefNo("");
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-400/30">
              Returns & Notes Engine
            </span>
            <span className="text-xs text-slate-300">GST: {tenant.gstin}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Sales & Purchase Returns
          </h1>
          <p className="text-xs text-slate-400">
            Issue <b>Credit Notes</b> for customer sales returns (stock restored) and <b>Debit Notes</b> for vendor returns (stock deducted).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>
            {activeTab === "SALES_RETURN" ? "+ Issue Credit Note" : "+ Issue Debit Note"}
          </span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          onClick={() => setActiveTab("SALES_RETURN")}
          className={`p-5 rounded-3xl border transition cursor-pointer space-y-2 ${
            activeTab === "SALES_RETURN"
              ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-md"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Credit Notes (Sales Returns)</span>
            <ArrowDownLeft className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {formatCurrency(totalCreditReturns)}
          </div>
          <div className="text-[11px] text-amber-600 font-semibold">
            {creditNotes.length} Customer Returns • Stock Auto-Restored
          </div>
        </div>

        <div
          onClick={() => setActiveTab("PURCHASE_RETURN")}
          className={`p-5 rounded-3xl border transition cursor-pointer space-y-2 ${
            activeTab === "PURCHASE_RETURN"
              ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-md"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Debit Notes (Purchase Returns)</span>
            <ArrowUpRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {formatCurrency(totalDebitReturns)}
          </div>
          <div className="text-[11px] text-rose-600 font-semibold">
            {debitNotes.length} Vendor Returns • Payable Decremented
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
        {/* Tab Switcher */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("SALES_RETURN")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                activeTab === "SALES_RETURN"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              Credit Notes (Sales Returns)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("PURCHASE_RETURN")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                activeTab === "PURCHASE_RETURN"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              Debit Notes (Purchase Returns)
            </button>
          </div>

          <div className="text-xs text-slate-500 font-semibold">
            Showing {activeTab === "SALES_RETURN" ? creditNotes.length : debitNotes.length} vouchers
          </div>
        </div>

        {/* Tab 1: Credit Notes (Sales Return) */}
        {activeTab === "SALES_RETURN" && (
          <div className="overflow-x-auto">
            {creditNotes.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 mx-auto">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
                    No Credit Notes Created Yet
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    When customers return items, generate a credit note to auto-restore inventory and credit their ledger.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Issue Credit Note</span>
                </button>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Credit Note No</th>
                    <th className="p-3">Customer Party</th>
                    <th className="p-3">Original Invoice</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Refund Mode</th>
                    <th className="p-3 text-right">Total Amount</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {creditNotes.map((cn) => (
                    <tr
                      key={cn.id}
                      onClick={() => setPreviewCreditNote(cn)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                    >
                      <td className="p-3 font-mono font-bold text-indigo-600">{cn.creditNoteNo}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        {cn.partyName}
                      </td>
                      <td className="p-3 text-slate-500 font-mono">
                        {cn.originalInvoiceNo || "-"}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          {cn.reason.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-indigo-600">{cn.refundMode}</td>
                      <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white">
                        {formatCurrency(cn.totalAmount)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewCreditNote(cn);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Debit Notes (Purchase Return) */}
        {activeTab === "PURCHASE_RETURN" && (
          <div className="overflow-x-auto">
            {debitNotes.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 mx-auto">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
                    No Debit Notes Created Yet
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Return defective or expired items back to your suppliers to deduct inventory and reduce accounts payable.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Issue Debit Note</span>
                </button>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Debit Note No</th>
                    <th className="p-3">Vendor / Supplier</th>
                    <th className="p-3">Original Purchase Bill</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Adjustment</th>
                    <th className="p-3 text-right">Total Amount</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {debitNotes.map((dn) => (
                    <tr
                      key={dn.id}
                      onClick={() => setPreviewDebitNote(dn)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                    >
                      <td className="p-3 font-mono font-bold text-indigo-600">{dn.debitNoteNo}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        {dn.partyName}
                      </td>
                      <td className="p-3 text-slate-500 font-mono">
                        {dn.originalPurchaseBillNo || "-"}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          {dn.reason.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-indigo-600">{dn.adjustmentMode}</td>
                      <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white">
                        {formatCurrency(dn.totalAmount)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewDebitNote(dn);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Return Note Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                  {activeTab === "SALES_RETURN" ? "Sales Return (Credit Note)" : "Purchase Return (Debit Note)"}
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {activeTab === "SALES_RETURN" ? "Issue Customer Credit Note" : "Issue Vendor Debit Note"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {activeTab === "SALES_RETURN" ? "Customer *" : "Vendor / Supplier *"}
                  </label>
                  <select
                    value={selectedPartyId}
                    onChange={(e) => setSelectedPartyId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    {(activeTab === "SALES_RETURN" ? customers : vendors).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Original Bill / Invoice No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2627-0001"
                    value={originalRefNo}
                    onChange={(e) => setOriginalRefNo(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Return Reason
                  </label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value as ReturnReason)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    <option value="DEFECTIVE_GOODS">Defective / Damaged Goods</option>
                    <option value="EXPIRED_STOCK">Expired Stock</option>
                    <option value="DAMAGED_IN_TRANSIT">Damaged In Transit</option>
                    <option value="WRONG_ITEM_SHIPPED">Wrong Item Shipped</option>
                    <option value="CUSTOMER_CANCELLATION">Customer Cancellation</option>
                    <option value="OTHER">Other Reason</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Refund / Adjustment Mode
                  </label>
                  <select
                    value={refundMode}
                    onChange={(e) => setRefundMode(e.target.value as PaymentMode)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    <option value="CREDIT">Adjust in Ledger Balance (Khata)</option>
                    <option value="CASH">Cash Refund</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="UPI">UPI Refund</option>
                  </select>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Returned Items
                  </label>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {returnRows.map((r, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      <div className="col-span-6">
                        <select
                          value={r.productId}
                          onChange={(e) => handleRowChange(idx, "productId", e.target.value)}
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                        >
                          {products.length === 0 ? (
                            <option value="">No products in inventory</option>
                          ) : (
                            products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={r.quantity}
                          onChange={(e) =>
                            handleRowChange(idx, "quantity", Math.max(1, Number(e.target.value)))
                          }
                          className="w-full p-2 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold font-mono"
                        />
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Rate"
                          value={r.unitPrice}
                          onChange={(e) =>
                            handleRowChange(idx, "unitPrice", Number(e.target.value))
                          }
                          className="w-full p-2 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                        />
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          disabled={returnRows.length === 1}
                          className="p-1 text-slate-400 hover:text-rose-500 disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-md"
                >
                  {activeTab === "SALES_RETURN"
                    ? "Confirm Credit Note & Restore Stock"
                    : "Confirm Debit Note & Deduct Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credit Note View Modal */}
      {previewCreditNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Credit Note ({previewCreditNote.creditNoteNo})
              </h3>
              <button
                onClick={() => setPreviewCreditNote(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs space-y-1">
              <div>
                <b>Customer:</b> {previewCreditNote.partyName}
              </div>
              <div>
                <b>Reason:</b> {previewCreditNote.reason}
              </div>
              <div>
                <b>Mode:</b> {previewCreditNote.refundMode}
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {previewCreditNote.items.map((it, i) => (
                <div key={i} className="py-2 flex justify-between">
                  <span>
                    {it.productName} ({it.quantity} {it.unit})
                  </span>
                  <span className="font-mono font-bold">{formatCurrency(it.total)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t flex justify-between font-black text-base">
              <span>Total Credit Amount:</span>
              <span className="font-mono text-indigo-600">
                {formatCurrency(previewCreditNote.totalAmount)}
              </span>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md"
            >
              Print Credit Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
