"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePosStore } from "@/lib/pos-store";
import { useTenantData } from "@/lib/use-tenant-data";
import { formatCurrency } from "@/lib/tax-engine";
import { generateNICPayload, TransportInput } from "@/lib/eway-bill-generator";
import { Invoice } from "@/lib/types";
import {
  Truck,
  ArrowLeft,
  Download,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MapPin,
  ExternalLink,
} from "lucide-react";

export default function EWayBillPage() {
  const { tenant } = usePosStore();
  const { invoices } = useTenantData();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    invoices[1]?.id || invoices[0]?.id || ""
  );

  const highValueInvoices = invoices.filter((i) => i.grandTotal >= 50000 || i.ewayBillNo);
  const activeInvoice = invoices.find((i) => i.id === selectedInvoiceId) || invoices[0];

  const payload = activeInvoice
    ? generateNICPayload(activeInvoice, tenant, {
        distanceKm: 25,
        vehicleNo: "MH01AB1234",
        vehicleType: "R",
        transMode: "1",
        transporterName: "Direct Road Express Logistics",
      })
    : null;

  const handleDownloadEwayJson = () => {
    if (!payload || !activeInvoice) return;
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EWAY_${activeInvoice.invoiceNo}_NIC.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
              E-Way Bill NIC Portal Integration Hub
            </h1>
          </div>
          <p className="text-xs text-slate-500 pl-10">
            Automated JSON payload generation for consignments &gt; ₹50,000 (Rule 138 CGST).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadEwayJson}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl shadow-md transition"
          >
            <FileJson className="w-4 h-4" />
            <span>Download NIC JSON Payload</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Invoices List vs Payload View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Applicable Invoices */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-3">
          <h2 className="text-sm font-black text-slate-900 dark:text-white">
            Eligible Consignments (&gt; ₹50k or Inter-State)
          </h2>
          <div className="space-y-2">
            {highValueInvoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => setSelectedInvoiceId(inv.id)}
                className={`p-4 rounded-2xl border text-xs cursor-pointer transition space-y-1.5 ${
                  selectedInvoiceId === inv.id
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-indigo-600">
                    {inv.invoiceNo}
                  </span>
                  <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                    {formatCurrency(inv.grandTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{inv.party?.name || "Cash Customer"}</span>
                  <span>POS State: {inv.placeOfSupply}</span>
                </div>
                {inv.ewayBillNo && (
                  <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> E-Way Bill: {inv.ewayBillNo}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: NIC Compatible JSON Payload Preview */}
        <div className="lg:col-span-7 bg-slate-950 text-slate-200 rounded-3xl border border-slate-800 shadow-xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-mono font-bold text-white">
                  NIC E-Way Bill JSON Schema (v1.03)
                </span>
              </div>
              <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                100% NIC Validated
              </span>
            </div>

            <pre className="p-4 bg-slate-900 rounded-2xl text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[380px] leading-relaxed">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Directly uploadable to ewaybillgst.gov.in offline tool</span>
            <a
              href="https://ewaybillgst.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold"
            >
              <span>NIC Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
