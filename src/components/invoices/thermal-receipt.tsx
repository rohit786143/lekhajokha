"use client";

import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Invoice, TenantInfo } from "@/lib/types";
import { formatCurrency, generateUpiUri } from "@/lib/tax-engine";
import { generateInvoiceWhatsAppNotification } from "@/lib/whatsapp-notifier";
import { Printer, Download, Share2, Check, ArrowLeft, MessageSquare } from "lucide-react";

interface ThermalReceiptProps {
  invoice: Invoice;
  tenant: TenantInfo;
  onClose?: () => void;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  invoice,
  tenant,
  onClose,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const firmDetails = invoice.firm;
  const supplierName = firmDetails?.name || tenant.name;
  const supplierLegalName = firmDetails?.legalName || tenant.legalName;
  const supplierAddress = firmDetails?.address || tenant.address;
  const supplierPincode = firmDetails?.pincode || tenant.pincode;
  const supplierGstin = firmDetails?.gstin || tenant.gstin;
  const supplierPhone = firmDetails?.phone || tenant.phone;
  const supplierUpi = firmDetails?.upiId || tenant.upiVpa || "vyaparflow@icici";

  const whatsappNotification = generateInvoiceWhatsAppNotification({
    invoice,
    tenant: {
      ...tenant,
      name: supplierName,
      legalName: supplierLegalName,
      address: supplierAddress,
      pincode: supplierPincode,
      gstin: supplierGstin,
      phone: supplierPhone,
      upiVpa: supplierUpi,
    },
    party: invoice.party,
  });

  const upiUri = generateUpiUri({
    vpa: supplierUpi,
    payeeName: supplierName,
    amount: invoice.balanceAmount > 0 ? invoice.balanceAmount : invoice.grandTotal,
    invoiceNo: invoice.invoiceNo,
  });

  return (
    <div className="flex flex-col items-center">
      {/* Top action toolbar (hidden on print) */}
      <div className="no-print w-full max-w-[360px] flex items-center justify-between gap-2 mb-4 bg-slate-900 text-white p-3 rounded-xl shadow-lg">
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        )}
        <div className="flex items-center gap-2">
          <a
            href={whatsappNotification.clientDispatchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow transition-colors"
            title="Send Bill & Dynamic UPI Pay Link via WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
          </a>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Print Receipt
          </button>
        </div>
      </div>

      {/* 80mm Thermal Receipt Canvas */}
      <div
        ref={receiptRef}
        className="printable-thermal-area w-[80mm] min-h-[140mm] bg-white text-black p-4 text-[11px] font-mono leading-tight shadow-md border border-slate-200 rounded-sm"
        style={{ boxSizing: "border-box" }}
      >
        {/* Header */}
        <div className="text-center border-b border-dashed border-black pb-2 mb-2">
          <h1 className="text-[14px] font-extrabold uppercase tracking-wide">
            {supplierName}
          </h1>
          {supplierLegalName && supplierLegalName !== supplierName && (
            <p className="text-[9px] text-gray-700">({supplierLegalName})</p>
          )}
          <p className="text-[10px] mt-0.5">{supplierAddress}</p>
          {supplierGstin && <p className="text-[10px] font-bold mt-1">GSTIN: {supplierGstin}</p>}
          {supplierPhone && <p className="text-[10px]">Ph: {supplierPhone}</p>}
          <div className="mt-1 text-[11px] font-black uppercase tracking-wider bg-black text-white py-0.5 px-2 inline-block rounded-xs">
            *** {invoice.invoiceType.replace(/_/g, " ")} ***
          </div>
        </div>

        {/* Invoice Metadata */}
        <div className="border-b border-dashed border-black pb-2 mb-2 text-[10px] space-y-0.5">
          <div className="flex justify-between">
            <span>Invoice No:</span>
            <span className="font-bold">{invoice.invoiceNo}</span>
          </div>
          <div className="flex justify-between">
            <span>Date & Time:</span>
            <span>
              {new Date(invoice.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}{" "}
              {new Date(invoice.createdAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Customer:</span>
            <span className="font-semibold truncate max-w-[150px]">
              {invoice.party?.name || "Cash Customer"}
            </span>
          </div>
          {invoice.party?.phone && (
            <div className="flex justify-between">
              <span>Cust Phone:</span>
              <span>{invoice.party.phone}</span>
            </div>
          )}
          {invoice.party?.gstin && (
            <div className="flex justify-between">
              <span>Cust GSTIN:</span>
              <span className="font-bold">{invoice.party.gstin}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Place of Supply:</span>
            <span>State Code {invoice.placeOfSupply}</span>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-b border-dashed border-black pb-2 mb-2 text-[10px]">
          <thead>
            <tr className="border-b border-black text-left font-bold">
              <th className="py-1">ITEM</th>
              <th className="py-1 text-center">QTY</th>
              <th className="py-1 text-right">RATE</th>
              <th className="py-1 text-right">AMT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dotted divide-gray-300">
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="align-top">
                <td className="py-1 pr-1">
                  <div className="font-bold leading-none">{item.product?.name}</div>
                  <div className="text-[9px] text-gray-600 mt-0.5">
                    HSN:{item.hsn} | GST:{item.taxRate}%
                    {item.selectedBatch && ` | B:${item.selectedBatch.batchNo}`}
                  </div>
                  {item.selectedSerials && item.selectedSerials.length > 0 && (
                    <div className="text-[8px] text-gray-600">
                      S/N: {item.selectedSerials.join(", ")}
                    </div>
                  )}
                </td>
                <td className="py-1 text-center font-semibold">
                  {item.quantity} {item.unit}
                </td>
                <td className="py-1 text-right">
                  {item.unitPrice.toFixed(2)}
                </td>
                <td className="py-1 text-right font-bold">
                  {item.total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals & Tax Summary */}
        <div className="space-y-1 text-[10px] border-b border-dashed border-black pb-2 mb-2">
          <div className="flex justify-between">
            <span>Total Qty / Items:</span>
            <span className="font-bold">
              {invoice.items.reduce((s, i) => s + i.quantity, 0)} ({invoice.items.length} Items)
            </span>
          </div>
          <div className="flex justify-between">
            <span>Taxable Value:</span>
            <span>{formatCurrency(invoice.taxableAmount)}</span>
          </div>
          {!invoice.isInterState ? (
            <>
              <div className="flex justify-between">
                <span>CGST:</span>
                <span>{formatCurrency(invoice.cgst)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST:</span>
                <span>{formatCurrency(invoice.sgst)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <span>IGST (Inter-State):</span>
              <span>{formatCurrency(invoice.igst)}</span>
            </div>
          )}
          {invoice.discountTotal > 0 && (
            <div className="flex justify-between text-emerald-800">
              <span>Total Discount:</span>
              <span>- {formatCurrency(invoice.discountTotal)}</span>
            </div>
          )}
          {invoice.roundOff !== 0 && (
            <div className="flex justify-between">
              <span>Round Off:</span>
              <span>{invoice.roundOff > 0 ? `+${invoice.roundOff}` : invoice.roundOff}</span>
            </div>
          )}
          <div className="flex justify-between text-[13px] font-black border-t border-black pt-1 mt-1">
            <span>NET PAYABLE:</span>
            <span>{formatCurrency(invoice.grandTotal)}</span>
          </div>
        </div>

        {/* Payment Splits */}
        <div className="border-b border-dashed border-black pb-2 mb-2 text-[10px]">
          <div className="font-bold uppercase tracking-wider mb-1">Payment Details:</div>
          {invoice.paymentSplits && invoice.paymentSplits.length > 0 ? (
            invoice.paymentSplits.map((sp, idx) => (
              <div key={idx} className="flex justify-between">
                <span>
                  {sp.mode} {sp.refNumber ? `(${sp.refNumber})` : ""}:
                </span>
                <span className="font-bold">{formatCurrency(sp.amount)}</span>
              </div>
            ))
          ) : (
            <div className="flex justify-between">
              <span>PAID:</span>
              <span className="font-bold">{formatCurrency(invoice.paidAmount)}</span>
            </div>
          )}
          {invoice.balanceAmount > 0 && (
            <div className="flex justify-between text-red-600 font-bold mt-1">
              <span>Khata / Balance Due:</span>
              <span>{formatCurrency(invoice.balanceAmount)}</span>
            </div>
          )}
        </div>

        {/* Dynamic Bharat QR UPI */}
        <div className="flex flex-col items-center justify-center my-3 text-center">
          <div className="bg-white p-1.5 border border-black rounded">
            <QRCodeSVG
              value={upiUri}
              size={90}
              level="M"
              includeMargin={false}
            />
          </div>
          <p className="text-[9px] font-bold mt-1">SCAN & PAY VIA ANY UPI APP</p>
          <p className="text-[8px] text-gray-700">UPI ID: {supplierUpi}</p>
        </div>

        {/* Footer */}
        <div className="text-center text-[9px] space-y-1 text-gray-700">
          <p className="font-bold whitespace-pre-line">
            {tenant.thermalFooter || "Thank you for visiting! Have a wonderful day."}
          </p>
          <p className="text-[8px] text-gray-500">Powered by लेखा जोखा Enterprise ERP</p>
        </div>
      </div>
    </div>
  );
};
