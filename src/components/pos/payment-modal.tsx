"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { usePosStore } from "@/lib/pos-store";
import { PaymentMode, PaymentSplit } from "@/lib/types";
import { formatCurrency, generateUpiUri } from "@/lib/tax-engine";
import {
  X,
  CreditCard,
  QrCode,
  Banknote,
  Building2,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  HelpCircle,
} from "lucide-react";

export const PaymentModal: React.FC = () => {
  const {
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    tenant,
    selectedParty,
    activeCartItems,
    getCartCalculations,
    completeTransaction,
  } = usePosStore();

  const calc = getCartCalculations();
  const grandTotal = calc.grandTotal;

  // Split payments state
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [upiAmount, setUpiAmount] = useState<number>(0);
  const [upiRef, setUpiRef] = useState<string>("");
  const [bankAmount, setBankAmount] = useState<number>(0);
  const [bankRef, setBankRef] = useState<string>("");
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Submit confirmation dialog state
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);

  if (!isPaymentModalOpen) return null;

  const totalPaid = cashAmount + upiAmount + bankAmount + creditAmount;
  const remainingDue = Math.max(0, grandTotal - totalPaid);
  const changeToReturn = Math.max(0, cashTendered - cashAmount);

  const upiUri = generateUpiUri({
    vpa: tenant.upiVpa || "vyaparflow@icici",
    payeeName: tenant.upiName || tenant.name,
    amount: upiAmount > 0 ? upiAmount : grandTotal,
    invoiceNo: `INV-${Date.now().toString().slice(-4)}`,
  });

  // Fast payment helpers
  const handleQuickCash = () => {
    setCashAmount(grandTotal);
    setCashTendered(grandTotal);
    setUpiAmount(0);
    setBankAmount(0);
    setCreditAmount(0);
  };

  const handleQuickUPI = () => {
    setUpiAmount(grandTotal);
    setCashAmount(0);
    setCashTendered(0);
    setBankAmount(0);
    setCreditAmount(0);
  };

  const handleQuickCredit = () => {
    setCreditAmount(grandTotal);
    setCashAmount(0);
    setUpiAmount(0);
    setBankAmount(0);
  };

  // Trigger confirmation modal before final bill submission
  const handleInitiateCheckout = () => {
    setIsConfirmOpen(true);
  };

  // Final execution after user clicks "Yes" on confirmation dialog
  const executeCheckout = async () => {
    setIsSubmitting(true);
    try {
      const splits: PaymentSplit[] = [];
      if (cashAmount > 0) splits.push({ mode: "CASH", amount: cashAmount });
      if (upiAmount > 0) splits.push({ mode: "UPI", amount: upiAmount, refNumber: upiRef || "UPI-POS" });
      if (bankAmount > 0) splits.push({ mode: "BANK_TRANSFER", amount: bankAmount, refNumber: bankRef || "NEFT" });
      if (creditAmount > 0) splits.push({ mode: "CREDIT", amount: creditAmount });

      // If no explicit split was entered, default to Cash
      if (splits.length === 0) {
        splits.push({ mode: "CASH", amount: grandTotal });
      }

      const state = usePosStore.getState();
      const payload = {
        tenantId: state.tenant.id,
        firmId: state.activeFirmId,
        invoiceType: "TAX_INVOICE",
        partyId: state.selectedParty?.id === "party-walkin-cash" ? null : state.selectedParty?.id,
        godownId: state.activeGodownId,
        placeOfSupply: state.placeOfSupply,
        items: state.activeCartItems.map(item => ({
          productId: item.productId,
          batchId: item.selectedBatch?.id || null,
          selectedSerials: item.selectedSerials,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          isTaxInclusive: item.isTaxInclusive,
          discountPercent: item.discountPercent,
          discountAmount: item.discountAmount,
        })),
        payments: splits,
        billDiscount: state.billDiscount,
        autoRoundOff: state.autoRoundOff,
        notes: notes || null,
      };

      const res = await fetch("/api/v1/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save invoice to database.");
      }

      const resData = await res.json().catch(() => ({}));
      const officialInvoice = resData.invoice || undefined;

      completeTransaction(splits, "TAX_INVOICE", notes, officialInvoice);
      // Immediately sync with cloud database so all devices get the new invoice
      const updatedStore = usePosStore.getState();
      if (typeof updatedStore.syncWithCloud === "function") {
        updatedStore.syncWithCloud().catch((e) => console.warn("Background sync notice:", e));
      }
      setIsSuccess(true);
      setIsConfirmOpen(false);
    } catch (err: any) {
      console.error("Checkout Submission Error:", err);
      alert("Failed to submit bill: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in font-sans">
        <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Payment & Bill Settlement
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Customer: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedParty?.name || "Walk-in Cash"}</span>
                  {selectedParty?.currentBalance !== 0 && (
                    <span className="ml-2 font-mono text-amber-600">
                      (Khata: {formatCurrency(selectedParty?.currentBalance)})
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsPaymentModalOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-6 overflow-y-auto space-y-5">
            {/* Amount Due Banner */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl text-white shadow-md">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-indigo-100">
                  Total Bill Payable
                </span>
                <div className="text-3xl font-black tracking-tight mt-0.5">
                  {formatCurrency(grandTotal)}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleQuickCash}
                  className="px-3.5 py-1.5 text-xs font-bold bg-white/20 hover:bg-white/30 rounded-lg transition backdrop-blur-sm"
                >
                  100% Cash
                </button>
                <button
                  type="button"
                  onClick={handleQuickUPI}
                  className="px-3.5 py-1.5 text-xs font-bold bg-white/20 hover:bg-white/30 rounded-lg transition backdrop-blur-sm"
                >
                  100% UPI
                </button>
                <button
                  type="button"
                  onClick={handleQuickCredit}
                  className="px-3.5 py-1.5 text-xs font-bold bg-white/20 hover:bg-white/30 rounded-lg transition backdrop-blur-sm"
                >
                  Khata (Credit)
                </button>
              </div>
            </div>

            {/* Payment Mode Splits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cash Split */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                  <Banknote className="w-4 h-4 text-emerald-600" /> Cash Settlement
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Cash Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={cashAmount || ""}
                      onChange={(e) => setCashAmount(Number(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full mt-1 px-3 py-2 text-sm font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Cash Tendered by Customer (₹)
                    </label>
                    <input
                      type="number"
                      value={cashTendered || ""}
                      onChange={(e) => setCashTendered(Number(e.target.value) || 0)}
                      placeholder="e.g. 500 / 2000"
                      className="w-full mt-1 px-3 py-2 text-sm font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  {cashTendered > cashAmount && (
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs flex justify-between items-center text-emerald-800 dark:text-emerald-300">
                      <span className="font-semibold">Return Change:</span>
                      <span className="font-black text-sm font-mono">
                        {formatCurrency(changeToReturn)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic UPI Bharat QR Split */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                    <QrCode className="w-4 h-4 text-indigo-600" /> Dynamic Bharat QR UPI
                  </div>
                  <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-bold">
                    Zero MDR
                  </span>
                </div>
                <div className="flex gap-3 items-center">
                  <div className="bg-white p-1.5 rounded-lg border border-slate-300 shadow-xs">
                    <QRCodeSVG value={upiUri} size={74} level="M" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        UPI Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={upiAmount || ""}
                        onChange={(e) => setUpiAmount(Number(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={upiRef}
                        onChange={(e) => setUpiRef(e.target.value)}
                        placeholder="UPI Ref / UTR No"
                        className="w-full px-2.5 py-1 text-[11px] font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bank Transfer / Cheque */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                  <Building2 className="w-4 h-4 text-sky-600" /> Bank Transfer / NEFT / Cheque
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={bankAmount || ""}
                    onChange={(e) => setBankAmount(Number(e.target.value) || 0)}
                    placeholder="Amount ₹"
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                  <input
                    type="text"
                    value={bankRef}
                    onChange={(e) => setBankRef(e.target.value)}
                    placeholder="NEFT / Cheque No"
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              {/* Khata Credit */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                  <BookOpen className="w-4 h-4 text-amber-600" /> Customer Khata (Credit)
                </div>
                <input
                  type="number"
                  value={creditAmount || ""}
                  onChange={(e) => setCreditAmount(Number(e.target.value) || 0)}
                  placeholder="Credit Amount ₹"
                  className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
                <p className="text-[10px] text-slate-500">
                  Will be added to {selectedParty?.name || "Customer"}&apos;s ledger outstanding.
                </p>
              </div>
            </div>

            {/* Settlement Status Indicator */}
            <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold">
              <div>
                <span className="text-slate-500">Total Allocated: </span>
                <span className="font-mono text-slate-900 dark:text-white">
                  {formatCurrency(totalPaid)}
                </span>
              </div>
              {remainingDue > 0 ? (
                <div className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>Unallocated: {formatCurrency(remainingDue)} (Will default to Cash)</span>
                </div>
              ) : (
                <div className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Fully Settled!</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInitiateCheckout}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-500 active:scale-98 rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <span>Complete & Print Bill</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Submit Bill Confirmation Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-center">
            <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <HelpCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Submit Bill Confirmation
              </h3>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Are you sure you want to submit this bill?
              </p>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-0.5 mt-2 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between text-slate-500 font-semibold">
                  <span>Customer:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedParty?.name || "Walk-in Cash"}</span>
                </div>
                <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-bold">
                  <span>Grand Total:</span>
                  <span className="font-mono">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsConfirmOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition disabled:opacity-50"
              >
                No, Cancel
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  executeCheckout();
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? "Submitting..." : "Yes, Submit Bill"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
