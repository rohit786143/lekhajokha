"use client";

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { usePosStore } from "@/lib/pos-store";
import { useTenantData } from "@/lib/use-tenant-data";
import { formatCurrency } from "@/lib/tax-engine";
import { Quotation, QuotationItem, QuotationStatus } from "@/lib/types";
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  Printer,
  X,
  Building2,
  Send,
  Trash2,
  Zap,
  Edit3,
  Eye,
} from "lucide-react";

export default function QuotationsPage() {
  const { tenant, addQuotation, updateQuotation, convertQuotationToInvoice } = usePosStore();
  const {
    quotations,
    parties,
    products,
  } = useTenantData();
  const tenantQuotations = quotations;
  const tenantParties = parties;
  const tenantProducts = products;

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);
  const [conversionSuccessMsg, setConversionSuccessMsg] = useState<string | null>(null);

  // Edit quotation state
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [editPartyId, setEditPartyId] = useState<string>("");
  const [editQuoteNo, setEditQuoteNo] = useState<string>("");
  const [editValidDays, setEditValidDays] = useState<number>(15);
  const [editTerms, setEditTerms] = useState<string>("");
  const [editItems, setEditItems] = useState<
    {
      productId: string;
      quantity: number;
      unitPrice: number;
      discountPercent: number;
      taxRate: number;
    }[]
  >([]);

  // Print preview ref
  const printIframeRef = useRef<HTMLIFrameElement | null>(null);

  // New quotation form state
  const [partyId, setPartyId] = useState<string>(tenantParties[0]?.id || "");
  const [quoteNo, setQuoteNo] = useState<string>(`EST-${Date.now().toString().slice(-5)}`);
  const [validDays, setValidDays] = useState<number>(15);
  const [terms, setTerms] = useState<string>("1. Goods once sold will not be taken back.\n2. Warranty as per manufacturer terms.");
  const [quoteItems, setQuoteItems] = useState<
    {
      productId: string;
      quantity: number;
      unitPrice: number;
      discountPercent: number;
      taxRate: number;
    }[]
  >([
    {
      productId: tenantProducts[0]?.id || "",
      quantity: 1,
      unitPrice: tenantProducts[0]?.salePrice || 100,
      discountPercent: 0,
      taxRate: tenantProducts[0]?.taxRate || 18,
    },
  ]);

  const filteredQuotations = tenantQuotations.filter((q) => {
    const matchStatus = statusFilter === "ALL" || q.status === statusFilter;
    const matchSearch =
      !searchQuery ||
      q.quoteNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.partyName && q.partyName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const handleAddItem = () => {
    const defaultP = tenantProducts[0];
    setQuoteItems([
      ...quoteItems,
      {
        productId: defaultP?.id || "",
        quantity: 1,
        unitPrice: defaultP?.salePrice || 100,
        discountPercent: 0,
        taxRate: defaultP?.taxRate || 18,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (quoteItems.length === 1) return;
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...quoteItems];
    if (field === "productId") {
      const prod = products.find((p) => p.id === value);
      newItems[index] = {
        ...newItems[index],
        productId: value,
        unitPrice: prod?.salePrice || 0,
        taxRate: prod?.taxRate || 18,
      };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setQuoteItems(newItems);
  };

  // Helper: calculate quotation from items array
  const calculateQuotationTotals = (items: typeof quoteItems) => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxAmount = 0;

    const calculatedItems: QuotationItem[] = items.map((item, idx) => {
      const prod = products.find((p) => p.id === item.productId);
      
      const inclusivePrice = item.unitPrice;
      const exclusivePrice = inclusivePrice / (1 + item.taxRate / 100);
      
      const base = item.quantity * exclusivePrice;
      const disc = base * (item.discountPercent / 100);
      const taxable = Math.max(0, base - disc);
      const tax = taxable * (item.taxRate / 100);
      const total = taxable + tax;

      subtotal += base;
      discountTotal += disc;
      taxAmount += tax;

      return {
        id: `q-item-${Date.now()}-${idx}`,
        productId: item.productId,
        productName: prod?.name || "Product",
        sku: prod?.sku || "SKU",
        hsn: prod?.hsn || "9999",
        unit: prod?.unit || "PCS",
        quantity: item.quantity,
        unitPrice: inclusivePrice,
        discountPercent: item.discountPercent,
        discountAmount: disc,
        taxRate: item.taxRate,
        taxableAmount: taxable,
        taxAmount: tax,
        total,
      };
    });

    const taxableAmount = subtotal - discountTotal;
    const rawGrandTotal = taxableAmount + taxAmount;
    const grandTotal = Math.round(rawGrandTotal);
    const roundOff = grandTotal - rawGrandTotal;

    return { calculatedItems, subtotal, discountTotal, taxableAmount, taxAmount, roundOff, grandTotal };
  };

  const handleCreateQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    const selParty = parties.find((p) => p.id === partyId);
    const { calculatedItems, subtotal, discountTotal, taxableAmount, taxAmount, roundOff, grandTotal } =
      calculateQuotationTotals(quoteItems);

    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + validDays);

    const newQuotation: Quotation = {
      id: `quote-${Date.now()}`,
      tenantId: tenant.id,
      partyId,
      partyName: selParty?.name || "Customer",
      partyGstin: selParty?.gstin,
      partyPhone: selParty?.phone,
      quoteNo,
      quoteDate: new Date().toISOString(),
      validUntil: validUntilDate.toISOString().split("T")[0],
      subtotal,
      discountTotal,
      taxableAmount,
      taxAmount,
      roundOff,
      grandTotal,
      status: "DRAFT",
      items: calculatedItems,
      terms,
      createdAt: new Date().toISOString(),
    };

    addQuotation(newQuotation);
    setIsCreateModalOpen(false);
    setQuoteNo(`EST-${Date.now().toString().slice(-5)}`);
  };

  // ── Edit Quotation Handlers ──
  const openEditModal = (q: Quotation) => {
    setEditingQuotation(q);
    setEditPartyId(q.partyId || tenantParties[0]?.id || "");
    setEditQuoteNo(q.quoteNo);
    // Calculate remaining valid days from validUntil
    if (q.validUntil) {
      const diff = Math.ceil((new Date(q.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      setEditValidDays(Math.max(1, diff));
    } else {
      setEditValidDays(15);
    }
    setEditTerms(q.terms || "");
    setEditItems(
      q.items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountPercent: it.discountPercent,
        taxRate: it.taxRate,
      }))
    );
  };

  const handleEditItemChange = (index: number, field: string, value: any) => {
    const newItems = [...editItems];
    if (field === "productId") {
      const prod = products.find((p) => p.id === value);
      newItems[index] = {
        ...newItems[index],
        productId: value,
        unitPrice: prod?.salePrice || 0,
        taxRate: prod?.taxRate || 18,
      };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setEditItems(newItems);
  };

  const handleEditAddItem = () => {
    const defaultP = tenantProducts[0];
    setEditItems([
      ...editItems,
      {
        productId: defaultP?.id || "",
        quantity: 1,
        unitPrice: defaultP?.salePrice || 100,
        discountPercent: 0,
        taxRate: defaultP?.taxRate || 18,
      },
    ]);
  };

  const handleEditRemoveItem = (index: number) => {
    if (editItems.length === 1) return;
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuotation) return;

    const selParty = parties.find((p) => p.id === editPartyId);
    const { calculatedItems, subtotal, discountTotal, taxableAmount, taxAmount, roundOff, grandTotal } =
      calculateQuotationTotals(editItems);

    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + editValidDays);

    const updatedQuotation: Quotation = {
      ...editingQuotation,
      partyId: editPartyId,
      partyName: selParty?.name || "Customer",
      partyGstin: selParty?.gstin,
      partyPhone: selParty?.phone,
      quoteNo: editQuoteNo,
      validUntil: validUntilDate.toISOString().split("T")[0],
      subtotal,
      discountTotal,
      taxableAmount,
      taxAmount,
      roundOff,
      grandTotal,
      terms: editTerms,
      items: calculatedItems,
    };

    updateQuotation(updatedQuotation);
    setEditingQuotation(null);

    // Also update preview if same quotation is open
    if (previewQuotation?.id === updatedQuotation.id) {
      setPreviewQuotation(updatedQuotation);
    }

    setConversionSuccessMsg(`Quotation ${updatedQuotation.quoteNo} updated successfully!`);
    setTimeout(() => setConversionSuccessMsg(null), 4000);
  };

  // ── Print Preview via iframe ──
  const handlePrintQuotation = useCallback((q: Quotation) => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      alert("Please allow pop-ups to print quotations.");
      return;
    }

    const itemsHtml = q.items
      .map(
        (it, idx) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${idx + 1}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">
            <div style="font-weight:700;">${it.productName}</div>
            <div style="font-size:10px;color:#94a3b8;">HSN: ${it.hsn} | SKU: ${it.sku}</div>
          </td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${it.quantity} ${it.unit}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;">₹${it.unitPrice.toFixed(2)}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${it.discountPercent}%</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${it.taxRate}%</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;font-weight:700;">₹${it.total.toFixed(2)}</td>
        </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Quotation - ${q.quoteNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 32px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px; }
    .company-name { font-size: 22px; font-weight: 900; color: #4f46e5; }
    .company-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .doc-title { text-align: right; }
    .doc-title h2 { font-size: 20px; font-weight: 900; color: #1e293b; letter-spacing: 1px; }
    .doc-title .quote-no { font-family: monospace; font-size: 14px; color: #4f46e5; font-weight: 700; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .meta-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .meta-label { font-size: 9px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 1px; }
    .meta-value { font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
    th { background: #4f46e5; color: #fff; padding: 10px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800; }
    th:first-child { border-radius: 6px 0 0 0; }
    th:last-child { border-radius: 0 6px 0 0; text-align: right; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-box { width: 280px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
    .total-row.grand { border-top: 2px solid #4f46e5; margin-top: 6px; padding-top: 8px; font-size: 15px; font-weight: 900; color: #4f46e5; }
    .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    @media print {
      body { padding: 16px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">${tenant.name || 'लेखा जोखा Enterprise'}</div>
      <div class="company-sub">GSTIN: ${tenant.gstin || 'UNREGISTERED'}</div>
      <div class="company-sub">${tenant.address || ''}</div>
    </div>
    <div class="doc-title">
      <h2>QUOTATION / ESTIMATE</h2>
      <div class="quote-no">${q.quoteNo}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-card">
      <div class="meta-label">Customer / Party</div>
      <div class="meta-value">${q.partyName || 'Walk-in Customer'}</div>
      ${q.partyGstin ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">GSTIN: ${q.partyGstin}</div>` : ''}
      ${q.partyPhone ? `<div style="font-size:10px;color:#64748b;">Phone: ${q.partyPhone}</div>` : ''}
    </div>
    <div class="meta-card" style="text-align:right;">
      <div class="meta-label">Quotation Date</div>
      <div class="meta-value">${new Date(q.quoteDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
      <div class="meta-label" style="margin-top:8px;">Valid Until</div>
      <div class="meta-value">${q.validUntil ? new Date(q.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '15 Days'}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align:center;width:40px;">#</th>
        <th>Product / Service</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Rate</th>
        <th style="text-align:center;">Disc%</th>
        <th style="text-align:center;">GST%</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-top:10px;">
    <div style="width:60%; padding-right:20px;">
      ${q.terms ? `<div style="font-size:10px; color:#475569;"><strong>Terms & Conditions:</strong><br/><div style="margin-top:4px; line-height:1.4;">${q.terms.replace(/\n/g, '<br/>')}</div></div>` : ''}
      ${q.notes ? `<div style="margin-top:12px;font-size:10px; color:#475569;"><strong>Notes:</strong> ${q.notes}</div>` : ''}
    </div>
    
    <div class="totals-box" style="flex-shrink:0;">
      <div class="total-row"><span>Subtotal</span><span style="font-family:monospace;">₹${q.subtotal.toFixed(2)}</span></div>
      <div class="total-row"><span>Discount</span><span style="font-family:monospace;color:#ef4444;">-₹${q.discountTotal.toFixed(2)}</span></div>
      <div class="total-row"><span>Taxable Amount</span><span style="font-family:monospace;">₹${q.taxableAmount.toFixed(2)}</span></div>
      <div class="total-row"><span>GST</span><span style="font-family:monospace;">₹${q.taxAmount.toFixed(2)}</span></div>
      ${q.roundOff !== 0 ? `<div class="total-row"><span>Round Off</span><span style="font-family:monospace;">₹${q.roundOff.toFixed(2)}</span></div>` : ''}
      <div class="total-row grand"><span>Grand Total</span><span>₹${q.grandTotal.toFixed(2)}</span></div>
    </div>
  </div>

  <div style="display:flex; justify-content:flex-end; margin-top:40px; padding-top:20px;">
    <div style="width:40%; text-align:center;">
      <div style="font-weight:700; font-size:12px; margin-bottom:40px;">For ${tenant.name || 'लेखा जोखा Enterprise'}</div>
      <div style="border-top:1px solid #1e293b; display:inline-block; padding-top:4px; font-size:11px;">Authorized Signatory</div>
    </div>
  </div>

  <div class="footer">
    This is a computer-generated quotation. | Powered by लेखा जोखा Enterprise ERP
  </div>

  <div class="no-print" style="text-align:center;margin-top:24px;">
    <button onclick="window.print()" style="padding:10px 32px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;">🖨️ Print Now</button>
  </div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  }, [tenant]);

  const handleConvert = (quote: Quotation) => {
    if (quote.status === "CONVERTED_TO_INVOICE") {
      alert("This quotation is already converted into an active invoice!");
      return;
    }

    const createdInv = convertQuotationToInvoice(quote.id);
    if (createdInv) {
      setConversionSuccessMsg(
        `Quotation ${quote.quoteNo} converted to Tax Invoice #${createdInv.invoiceNo}! Stock decremented.`
      );
      if (previewQuotation?.id === quote.id) {
        setPreviewQuotation({
          ...quote,
          status: "CONVERTED_TO_INVOICE",
          convertedInvoiceId: createdInv.id,
        });
      }
      setTimeout(() => setConversionSuccessMsg(null), 5000);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Toast alert */}
      {conversionSuccessMsg && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <div className="text-xs font-bold">{conversionSuccessMsg}</div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-400/30">
              Pre-Sales & Estimates
            </span>
            <span className="text-xs text-slate-300">GST: {tenant.gstin}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Quotations & Estimates
          </h1>
          <p className="text-xs text-slate-400">
            Generate formal price estimates for customers. Stock is only deducted upon 1-click invoice conversion.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Quotation</span>
        </button>
      </div>

      {/* Main Quotations Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by estimate number or party..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {["ALL", "DRAFT", "SENT", "ACCEPTED", "CONVERTED_TO_INVOICE"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === st
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {st === "CONVERTED_TO_INVOICE" ? "CONVERTED" : st}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filteredQuotations.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
                  No Quotations Found
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Create formal price proposals and estimates for clients with 1-click conversion to GST Tax Invoices.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Quotation</span>
              </button>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Estimate No</th>
                  <th className="p-3">Party / Customer</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Valid Until</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Actions</th>
                  <th className="p-3 text-center">1-Click Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredQuotations.map((q) => (
                  <tr
                    key={q.id}
                    onClick={() => setPreviewQuotation(q)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                  >
                    <td className="p-3 font-mono font-bold text-indigo-600">{q.quoteNo}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {q.partyName || "Customer"}
                    </td>
                    <td className="p-3 text-slate-500">
                      {new Date(q.quoteDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="p-3 text-slate-500">{q.validUntil || "-"}</td>
                    <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white">
                      {formatCurrency(q.grandTotal)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          q.status === "CONVERTED_TO_INVOICE"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : q.status === "ACCEPTED"
                            ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {q.status === "CONVERTED_TO_INVOICE" ? "CONVERTED" : q.status}
                      </span>
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        {q.status !== "CONVERTED_TO_INVOICE" && (
                          <button
                            type="button"
                            onClick={() => openEditModal(q)}
                            title="Edit Quotation"
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition active:scale-90"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handlePrintQuotation(q)}
                          title="Print Preview"
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition active:scale-90"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewQuotation(q)}
                          title="View Details"
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition active:scale-90"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {q.status === "CONVERTED_TO_INVOICE" ? (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Billed</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConvert(q)}
                          className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-[11px] rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition flex items-center justify-center gap-1.5 mx-auto"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Convert to Invoice</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Quotation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Create New Quotation / Estimate
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Customer / Party
                  </label>
                  <select
                    value={partyId}
                    onChange={(e) => setPartyId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    {tenantParties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Estimate No
                  </label>
                  <input
                    type="text"
                    value={quoteNo}
                    onChange={(e) => setQuoteNo(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Quoted Products & Pricing
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto">
                  {quoteItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      <div className="col-span-5">
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                        >
                          {tenantProducts.length === 0 ? (
                            <option value="">No products in inventory</option>
                          ) : (
                            tenantProducts.map((p) => (
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
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(idx, "quantity", Math.max(1, Number(e.target.value)))
                          }
                          className="w-full p-2 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold font-mono"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Rate"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(idx, "unitPrice", Number(e.target.value))
                          }
                          className="w-full p-2 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                        />
                      </div>

                      <div className="col-span-2 text-right font-mono font-black text-indigo-600">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={quoteItems.length === 1}
                          className="p-1 text-slate-400 hover:text-rose-500 disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Terms & Conditions
                </label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  placeholder="Enter terms and conditions..."
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-md"
                >
                  Save Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                  Estimate / Quotation
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {previewQuotation.quoteNo}
                </h3>
              </div>
              <button
                onClick={() => setPreviewQuotation(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 text-[10px]">Client:</span>
                <div className="font-bold text-slate-900 dark:text-white">
                  {previewQuotation.partyName}
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[10px]">Valid Until:</span>
                <div className="font-bold text-slate-900 dark:text-white">
                  {previewQuotation.validUntil || "15 Days"}
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {previewQuotation.items.map((it, idx) => (
                <div key={idx} className="py-2.5 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {it.productName}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {it.quantity} {it.unit} × {formatCurrency(it.unitPrice)} (+{it.taxRate}% GST)
                    </div>
                  </div>
                  <div className="font-mono font-black text-slate-900 dark:text-white">
                    {formatCurrency(it.total)}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm font-black">
              <span>Estimated Total:</span>
              <span className="font-mono text-indigo-600">
                {formatCurrency(previewQuotation.grandTotal)}
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handlePrintQuotation(previewQuotation)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Estimate</span>
              </button>

              {previewQuotation.status !== "CONVERTED_TO_INVOICE" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      openEditModal(previewQuotation);
                      setPreviewQuotation(null);
                    }}
                    className="px-4 py-2.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConvert(previewQuotation)}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition"
                  >
                    <Zap className="w-4 h-4" />
                    <span>1-Click Convert to Tax Invoice</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ EDIT QUOTATION MODAL ═══════════════ */}
      {editingQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 rounded-xl">
                  <Edit3 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Edit Quotation
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">{editingQuotation.quoteNo}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingQuotation(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Customer / Party
                  </label>
                  <select
                    value={editPartyId}
                    onChange={(e) => setEditPartyId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    {tenantParties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Estimate No
                  </label>
                  <input
                    type="text"
                    value={editQuoteNo}
                    onChange={(e) => setEditQuoteNo(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Quoted Products & Pricing
                  </label>
                  <button
                    type="button"
                    onClick={handleEditAddItem}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto">
                  {editItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      <div className="col-span-5">
                        <select
                          value={item.productId}
                          onChange={(e) => handleEditItemChange(idx, "productId", e.target.value)}
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                        >
                          {tenantProducts.length === 0 ? (
                            <option value="">No products in inventory</option>
                          ) : (
                            tenantProducts.map((p) => (
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
                          value={item.quantity}
                          onChange={(e) =>
                            handleEditItemChange(idx, "quantity", Math.max(1, Number(e.target.value)))
                          }
                          className="w-full p-2 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold font-mono"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Rate"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleEditItemChange(idx, "unitPrice", Number(e.target.value))
                          }
                          className="w-full p-2 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                        />
                      </div>

                      <div className="col-span-2 text-right font-mono font-black text-indigo-600">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleEditRemoveItem(idx)}
                          disabled={editItems.length === 1}
                          className="p-1 text-slate-400 hover:text-rose-500 disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Edit Totals Preview */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-3 space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal (Excl. Tax)</span>
                  <span className="font-mono font-bold">
                    {formatCurrency(
                      editItems.reduce((s, i) => s + (i.quantity * i.unitPrice) / (1 + i.taxRate / 100), 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>GST (Included)</span>
                  <span className="font-mono font-bold">
                    {formatCurrency(
                      editItems.reduce(
                        (s, i) => s + ((i.quantity * i.unitPrice) - ((i.quantity * i.unitPrice) / (1 + i.taxRate / 100))),
                        0
                      )
                    )}
                  </span>
                </div>
                <div className="flex justify-between font-black text-sm text-indigo-600 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Estimated Total</span>
                  <span className="font-mono">
                    {formatCurrency(
                      Math.round(
                        editItems.reduce(
                          (s, i) => s + (i.quantity * i.unitPrice),
                          0
                        )
                      )
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Terms & Conditions
                </label>
                <textarea
                  value={editTerms}
                  onChange={(e) => setEditTerms(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  placeholder="Enter terms and conditions..."
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingQuotation(null)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
