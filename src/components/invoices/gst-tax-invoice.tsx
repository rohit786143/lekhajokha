"use client";

import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Invoice, TenantInfo, Firm } from "@/lib/types";
import {
  formatCurrency,
  generateUpiUri,
  numberToWordsINR,
  INDIAN_STATES,
} from "@/lib/tax-engine";
import { generateInvoiceWhatsAppNotification } from "@/lib/whatsapp-notifier";
import { Printer, Download, Share2, ArrowLeft, Building2, CheckCircle2, MessageSquare } from "lucide-react";

interface GstTaxInvoiceProps {
  invoice: Invoice;
  tenant: TenantInfo;
  firm?: Firm;
  onClose?: () => void;
}

export const GstTaxInvoice: React.FC<GstTaxInvoiceProps> = ({
  invoice,
  tenant,
  firm,
  onClose,
}) => {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const firmDetails = firm || invoice.firm;
  const supplierName = firmDetails?.name || tenant.name;
  const supplierLegalName = firmDetails?.legalName || tenant.legalName;
  const supplierGstin = firmDetails?.gstin || tenant.gstin;
  const supplierStateCode = firmDetails?.stateCode || tenant.stateCode || "27";
  const supplierStateName = firmDetails?.stateName || INDIAN_STATES[supplierStateCode] || "Maharashtra";
  const supplierAddress = firmDetails?.address || `${tenant.address}, ${tenant.city} - ${tenant.pincode}`;
  const supplierPhone = firmDetails?.phone || tenant.phone;
  const supplierEmail = firmDetails?.email || tenant.email;
  const supplierBankName = firmDetails?.bankName || tenant.bankName;
  const supplierAccountNo = firmDetails?.accountNo || tenant.bankAccountNumber;
  const supplierIfsc = firmDetails?.ifsc || tenant.bankIfsc;
  const supplierLogoUrl = firmDetails?.logoUrl || tenant.logoUrl;
  const supplierSignatureUrl = firmDetails?.signatureUrl;
  const supplierUpi = firmDetails?.upiId || tenant.upiVpa || "vyaparflow@icici";

  const whatsappNotification = generateInvoiceWhatsAppNotification({
    invoice,
    tenant: {
      ...tenant,
      name: supplierName,
      legalName: supplierLegalName,
      gstin: supplierGstin,
      phone: supplierPhone,
      email: supplierEmail,
    },
    party: invoice.party,
  });

  const upiUri = generateUpiUri({
    vpa: supplierUpi,
    payeeName: supplierName,
    amount: invoice.balanceAmount > 0 ? invoice.balanceAmount : invoice.grandTotal,
    invoiceNo: invoice.invoiceNo,
  });

  // HSN Tax Breakdown aggregation
  const hsnSummary: Record<
    string,
    {
      hsn: string;
      taxableAmount: number;
      cgstRate: number;
      cgstAmount: number;
      sgstRate: number;
      sgstAmount: number;
      igstRate: number;
      igstAmount: number;
      totalTax: number;
    }
  > = {};

  for (const item of invoice.items) {
    const code = item.hsn || "9999";
    if (!hsnSummary[code]) {
      hsnSummary[code] = {
        hsn: code,
        taxableAmount: 0,
        cgstRate: invoice.isInterState ? 0 : item.taxRate / 2,
        cgstAmount: 0,
        sgstRate: invoice.isInterState ? 0 : item.taxRate / 2,
        sgstAmount: 0,
        igstRate: invoice.isInterState ? item.taxRate : 0,
        igstAmount: 0,
        totalTax: 0,
      };
    }
    hsnSummary[code].taxableAmount += item.taxableAmount;
    hsnSummary[code].cgstAmount += item.cgst;
    hsnSummary[code].sgstAmount += item.sgst;
    hsnSummary[code].igstAmount += item.igst;
    hsnSummary[code].totalTax += item.cgst + item.sgst + item.igst;
  }

  const posStateName = INDIAN_STATES[invoice.placeOfSupply] || "Maharashtra";

  return (
    <div className="flex flex-col items-center w-full">
      {/* Top Action Toolbar */}
      <div className="no-print w-full max-w-[210mm] flex items-center justify-between gap-3 mb-6 bg-slate-900 text-white p-4 rounded-xl shadow-xl">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back to POS
            </button>
          )}
          <span className="text-sm font-bold text-indigo-400">
            GST Tax Invoice Preview ({invoice.invoiceNo})
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <a
            href={whatsappNotification.clientDispatchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow transition"
            title="Dispatch Bill & UPI Deep Link to Customer's WhatsApp"
          >
            <MessageSquare className="w-4 h-4" /> Share WhatsApp
          </a>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md transition"
          >
            <Printer className="w-4 h-4" /> Print A4 GST Invoice
          </button>
        </div>
      </div>

      {/* A4 Tax Invoice Canvas */}
      <div
        ref={invoiceRef}
        className="printable-a4-area w-[210mm] min-h-[297mm] bg-white text-slate-900 p-8 shadow-2xl border border-slate-300 rounded-sm font-sans text-xs"
      >
        {/* Top Header Title */}
        <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
          <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
            TAX INVOICE
          </h1>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
            (Issued under Section 31 of Central Goods and Services Tax Act, 2017)
          </p>
        </div>

        {/* Company & Supplier Info */}
        <div className="grid grid-cols-12 gap-4 border border-slate-900 p-3 mb-3 rounded-xs">
          <div className="col-span-7 pr-3 border-r border-slate-300">
            <div className="flex items-start gap-2.5">
              {supplierLogoUrl ? (
                <img
                  src={supplierLogoUrl}
                  alt="Company Logo"
                  className="w-12 h-12 object-contain rounded-lg border border-slate-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-lg">
                  {supplierName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-base font-black text-slate-900 leading-tight">
                  {supplierName}
                </h2>
                {supplierLegalName && (
                  <p className="text-[11px] text-slate-600 font-medium">
                    {supplierLegalName}
                  </p>
                )}
              </div>
            </div>
            <p className="mt-2 text-slate-700 leading-relaxed text-[11px]">
              {supplierAddress}
            </p>
            <div className="grid grid-cols-2 gap-x-2 mt-2 text-[11px]">
              <div>
                <span className="font-bold text-slate-900">GSTIN: </span>
                <span className="font-mono font-bold text-indigo-900">{supplierGstin || "URP"}</span>
              </div>
              <div>
                <span className="font-bold text-slate-900">State: </span>
                <span>
                  {supplierStateName} (Code: {supplierStateCode})
                </span>
              </div>
              {supplierPhone && (
                <div>
                  <span className="font-bold text-slate-900">Phone: </span>
                  <span>{supplierPhone}</span>
                </div>
              )}
              {supplierEmail && (
                <div>
                  <span className="font-bold text-slate-900">Email: </span>
                  <span>{supplierEmail}</span>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-5 flex flex-col justify-between pl-2 text-[11px] space-y-1.5">
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <div className="flex justify-between py-0.5">
                <span className="font-bold text-slate-700">Invoice No:</span>
                <span className="font-mono font-black text-indigo-700 text-sm">
                  {invoice.invoiceNo}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="font-bold text-slate-700">Invoice Date:</span>
                <span className="font-semibold">
                  {new Date(invoice.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="font-bold text-slate-700">Place of Supply:</span>
                <span className="font-bold text-slate-900">
                  {posStateName} ({invoice.placeOfSupply})
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="font-bold text-slate-700">Supply Type:</span>
                <span className="font-bold uppercase text-slate-900">
                  {invoice.isInterState ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}
                </span>
              </div>
              {invoice.ewayBillNo && (
                <div className="flex justify-between py-0.5 border-t border-slate-200 mt-1 pt-1">
                  <span className="font-bold text-slate-700">E-Way Bill No:</span>
                  <span className="font-mono font-bold text-emerald-700">{invoice.ewayBillNo}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bill To & Ship To section */}
        <div className="grid grid-cols-2 gap-3 border border-slate-900 p-3 mb-3 rounded-xs bg-slate-50/50">
          <div>
            <h3 className="text-[11px] font-black uppercase text-indigo-900 border-b border-slate-300 pb-1 mb-1.5">
              Details of Receiver / Billed To:
            </h3>
            <p className="font-bold text-slate-900 text-sm">
              {invoice.party?.name || "Cash Customer"}
            </p>
            <p className="text-slate-700 text-[11px] mt-0.5">
              {invoice.party?.billingAddress || "Counter Retail Sale"}
            </p>
            <p className="text-slate-700 text-[11px]">
              {invoice.party?.city ? `${invoice.party.city} - ${invoice.party.pincode || ""}` : ""}
            </p>
            <div className="mt-1.5 text-[11px] space-y-0.5">
              <div>
                <span className="font-bold">GSTIN: </span>
                <span className="font-mono font-bold text-slate-900">
                  {invoice.party?.gstin || "URP (Unregistered Person)"}
                </span>
              </div>
              <div>
                <span className="font-bold">State: </span>
                <span>
                  {INDIAN_STATES[invoice.party?.stateCode || invoice.placeOfSupply]} (Code:{" "}
                  {invoice.party?.stateCode || invoice.placeOfSupply})
                </span>
              </div>
              {invoice.party?.phone && (
                <div>
                  <span className="font-bold">Contact: </span>
                  <span>{invoice.party.phone}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-black uppercase text-indigo-900 border-b border-slate-300 pb-1 mb-1.5">
              Details of Consignee / Shipped To:
            </h3>
            <p className="font-bold text-slate-900 text-sm">
              {invoice.party?.name || "Cash Customer"}
            </p>
            <p className="text-slate-700 text-[11px] mt-0.5">
              {invoice.party?.shippingAddress ||
                invoice.party?.billingAddress ||
                "Counter Delivery, Store"}
            </p>
            <p className="text-slate-700 text-[11px]">
              {invoice.party?.city ? `${invoice.party.city} - ${invoice.party.pincode || ""}` : ""}
            </p>
            <div className="mt-1.5 text-[11px]">
              <span className="font-bold">Place of Delivery: </span>
              <span>
                {posStateName} (Code: {invoice.placeOfSupply})
              </span>
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <table className="w-full border-collapse border border-slate-900 text-[10px] mb-3">
          <thead>
            <tr className="bg-slate-900 text-white font-bold text-center">
              <th className="border border-slate-700 p-1.5 w-8">#</th>
              <th className="border border-slate-700 p-1.5 text-left">Item Description</th>
              <th className="border border-slate-700 p-1.5 w-16">HSN/SAC</th>
              <th className="border border-slate-700 p-1.5 w-12">Qty</th>
              <th className="border border-slate-700 p-1.5 w-12">Unit</th>
              <th className="border border-slate-700 p-1.5 text-right w-16">Rate (₹)</th>
              <th className="border border-slate-700 p-1.5 text-right w-14">Disc (₹)</th>
              <th className="border border-slate-700 p-1.5 text-right w-20">Taxable Val</th>
              {!invoice.isInterState ? (
                <>
                  <th className="border border-slate-700 p-1.5 text-right w-16">CGST</th>
                  <th className="border border-slate-700 p-1.5 text-right w-16">SGST</th>
                </>
              ) : (
                <th className="border border-slate-700 p-1.5 text-right w-20">IGST</th>
              )}
              <th className="border border-slate-700 p-1.5 text-right w-20">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="border-b border-slate-300">
                <td className="border-r border-slate-300 p-1.5 text-center font-bold">
                  {idx + 1}
                </td>
                <td className="border-r border-slate-300 p-1.5">
                  <div className="font-bold text-slate-900">{item.product?.name}</div>
                  {item.product?.description && (
                    <div className="text-[9px] text-slate-500">{item.product.description}</div>
                  )}
                  {item.selectedBatch && (
                    <div className="text-[9px] text-indigo-700 font-medium">
                      Batch: {item.selectedBatch.batchNo} | Exp:{" "}
                      {item.selectedBatch.expDate ? new Date(item.selectedBatch.expDate).toLocaleDateString("en-IN") : "N/A"}
                    </div>
                  )}
                  {item.selectedSerials && item.selectedSerials.length > 0 && (
                    <div className="text-[8px] text-slate-600 font-mono">
                      IMEI/Serial: {item.selectedSerials.join(", ")}
                    </div>
                  )}
                </td>
                <td className="border-r border-slate-300 p-1.5 text-center font-mono">
                  {item.hsn}
                </td>
                <td className="border-r border-slate-300 p-1.5 text-center font-bold">
                  {item.quantity}
                </td>
                <td className="border-r border-slate-300 p-1.5 text-center text-slate-600">
                  {item.unit}
                </td>
                <td className="border-r border-slate-300 p-1.5 text-right font-mono">
                  {item.unitPrice.toFixed(2)}
                </td>
                <td className="border-r border-slate-300 p-1.5 text-right font-mono text-emerald-700">
                  {item.discountAmount > 0 ? item.discountAmount.toFixed(2) : "-"}
                </td>
                <td className="border-r border-slate-300 p-1.5 text-right font-mono font-semibold">
                  {item.taxableAmount.toFixed(2)}
                </td>
                {!invoice.isInterState ? (
                  <>
                    <td className="border-r border-slate-300 p-1.5 text-right font-mono">
                      <div>{item.cgst.toFixed(2)}</div>
                      <div className="text-[8px] text-slate-500">({(item.taxRate / 2)}%)</div>
                    </td>
                    <td className="border-r border-slate-300 p-1.5 text-right font-mono">
                      <div>{item.sgst.toFixed(2)}</div>
                      <div className="text-[8px] text-slate-500">({(item.taxRate / 2)}%)</div>
                    </td>
                  </>
                ) : (
                  <td className="border-r border-slate-300 p-1.5 text-right font-mono">
                    <div>{item.igst.toFixed(2)}</div>
                    <div className="text-[8px] text-slate-500">({item.taxRate}%)</div>
                  </td>
                )}
                <td className="p-1.5 text-right font-mono font-black text-slate-900">
                  {item.total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
              <td colSpan={3} className="p-2 text-right">
                TOTAL:
              </td>
              <td className="p-2 text-center">
                {invoice.items.reduce((s, i) => s + i.quantity, 0)}
              </td>
              <td colSpan={3}></td>
              <td className="p-2 text-right font-mono font-bold">
                {formatCurrency(invoice.taxableAmount)}
              </td>
              {!invoice.isInterState ? (
                <>
                  <td className="p-2 text-right font-mono">{formatCurrency(invoice.cgst)}</td>
                  <td className="p-2 text-right font-mono">{formatCurrency(invoice.sgst)}</td>
                </>
              ) : (
                <td className="p-2 text-right font-mono">{formatCurrency(invoice.igst)}</td>
              )}
              <td className="p-2 text-right font-mono font-black text-indigo-900">
                {formatCurrency(invoice.grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* HSN Summary Table */}
        <div className="mb-3">
          <h4 className="text-[10px] font-black uppercase text-slate-800 mb-1">
            HSN/SAC Tax Breakdown Summary:
          </h4>
          <table className="w-full border border-slate-400 text-[9px] text-center">
            <thead className="bg-slate-200 font-bold">
              <tr>
                <th className="border border-slate-400 p-1">HSN/SAC</th>
                <th className="border border-slate-400 p-1 text-right">Taxable Val (₹)</th>
                {!invoice.isInterState ? (
                  <>
                    <th className="border border-slate-400 p-1">CGST Rate</th>
                    <th className="border border-slate-400 p-1 text-right">CGST Amt (₹)</th>
                    <th className="border border-slate-400 p-1">SGST Rate</th>
                    <th className="border border-slate-400 p-1 text-right">SGST Amt (₹)</th>
                  </>
                ) : (
                  <>
                    <th className="border border-slate-400 p-1">IGST Rate</th>
                    <th className="border border-slate-400 p-1 text-right">IGST Amt (₹)</th>
                  </>
                )}
                <th className="border border-slate-400 p-1 text-right font-black">Total Tax (₹)</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(hsnSummary).map((row, idx) => (
                <tr key={idx} className="border-b border-slate-300">
                  <td className="border border-slate-300 p-1 font-mono">{row.hsn}</td>
                  <td className="border border-slate-300 p-1 text-right font-mono">
                    {row.taxableAmount.toFixed(2)}
                  </td>
                  {!invoice.isInterState ? (
                    <>
                      <td className="border border-slate-300 p-1">{row.cgstRate}%</td>
                      <td className="border border-slate-300 p-1 text-right font-mono">
                        {row.cgstAmount.toFixed(2)}
                      </td>
                      <td className="border border-slate-300 p-1">{row.sgstRate}%</td>
                      <td className="border border-slate-300 p-1 text-right font-mono">
                        {row.sgstAmount.toFixed(2)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border border-slate-300 p-1">{row.igstRate}%</td>
                      <td className="border border-slate-300 p-1 text-right font-mono">
                        {row.igstAmount.toFixed(2)}
                      </td>
                    </>
                  )}
                  <td className="border border-slate-300 p-1 text-right font-mono font-bold">
                    {row.totalTax.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Invoice Amount in Words & Totals Block */}
        <div className="grid grid-cols-12 gap-3 border border-slate-900 p-3 mb-3">
          <div className="col-span-7 pr-3 border-r border-slate-300 flex flex-col justify-between">
            <div>
              <span className="font-bold text-slate-800">Total Amount in Words:</span>
              <p className="font-serif italic font-bold text-slate-900 text-[11px] mt-0.5">
                {numberToWordsINR(invoice.grandTotal)}
              </p>
            </div>

            {/* Bank Details & Dynamic UPI Bharat QR */}
            <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
              <div className="text-[10px] space-y-0.5">
                <span className="font-black uppercase text-indigo-900">
                  Bank Settlement Details:
                </span>
                {supplierBankName && (
                  <div>
                    <span className="font-bold">Bank:</span> {supplierBankName}
                  </div>
                )}
                {supplierAccountNo && (
                  <div>
                    <span className="font-bold">A/C No:</span>{" "}
                    <span className="font-mono font-bold">{supplierAccountNo}</span>
                  </div>
                )}
                {supplierIfsc && (
                  <div>
                    <span className="font-bold">IFSC:</span>{" "}
                    <span className="font-mono font-bold">{supplierIfsc}</span>
                  </div>
                )}
                {tenant.bankBranch && (
                  <div>
                    <span className="font-bold">Branch:</span> {tenant.bankBranch}
                  </div>
                )}
                <div>
                  <span className="font-bold">UPI VPA:</span> {supplierUpi}
                </div>
              </div>
              <div className="text-center">
                <QRCodeSVG value={upiUri} size={68} level="M" />
                <p className="text-[7px] font-bold mt-0.5">Scan to Pay via UPI</p>
              </div>
            </div>
          </div>

          <div className="col-span-5 pl-2 space-y-1 text-[11px]">
            <div className="flex justify-between py-0.5">
              <span>Taxable Value:</span>
              <span className="font-mono">{formatCurrency(invoice.taxableAmount)}</span>
            </div>
            {!invoice.isInterState ? (
              <>
                <div className="flex justify-between py-0.5">
                  <span>Total CGST:</span>
                  <span className="font-mono">{formatCurrency(invoice.cgst)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>Total SGST:</span>
                  <span className="font-mono">{formatCurrency(invoice.sgst)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between py-0.5">
                <span>Total IGST:</span>
                <span className="font-mono">{formatCurrency(invoice.igst)}</span>
              </div>
            )}
            {invoice.discountTotal > 0 && (
              <div className="flex justify-between py-0.5 text-emerald-700">
                <span>Total Discount:</span>
                <span className="font-mono">- {formatCurrency(invoice.discountTotal)}</span>
              </div>
            )}
            {invoice.roundOff !== 0 && (
              <div className="flex justify-between py-0.5">
                <span>Round Off:</span>
                <span className="font-mono">{invoice.roundOff > 0 ? `+${invoice.roundOff}` : invoice.roundOff}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5 border-t-2 border-slate-900 font-black text-sm text-slate-900">
              <span>Grand Total:</span>
              <span className="font-mono text-indigo-900">{formatCurrency(invoice.grandTotal)}</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-700">
              <span>Amount Paid:</span>
              <span className="font-mono font-bold">{formatCurrency(invoice.paidAmount)}</span>
            </div>
            {invoice.balanceAmount > 0 && (
              <div className="flex justify-between py-0.5 text-red-600 font-bold">
                <span>Balance Khata:</span>
                <span className="font-mono">{formatCurrency(invoice.balanceAmount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Declarations & Signatures */}
        <div className="grid grid-cols-12 gap-3 border border-slate-900 p-3 text-[10px]">
          <div className="col-span-7 pr-3 border-r border-slate-300">
            <h5 className="font-bold text-slate-900 uppercase">Terms & Conditions:</h5>
            <p className="text-slate-600 whitespace-pre-line text-[9px] mt-1 leading-relaxed">
              {tenant.termsAndConditions ||
                "1. Goods once sold will not be accepted back without bill.\n2. Warranty handled by respective brand service centers.\n3. Subject to jurisdiction of supplier state courts."}
            </p>
          </div>
          <div className="col-span-5 flex flex-col justify-between text-center pl-2">
            <div>
              <p className="text-[10px] font-bold text-slate-800">For {supplierName}</p>
            </div>
            <div className="mt-4 flex flex-col items-center justify-end">
              {supplierSignatureUrl ? (
                <img
                  src={supplierSignatureUrl}
                  alt="Authorized Signatory"
                  className="h-10 object-contain mb-1"
                />
              ) : (
                <div className="h-8" />
              )}
              <div className="w-full border-t border-dashed border-slate-400 pt-1">
                <p className="font-bold text-slate-900 text-[10px]">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
