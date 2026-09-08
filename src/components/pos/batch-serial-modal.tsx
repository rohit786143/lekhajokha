"use client";

import React, { useState } from "react";
import { Product, ProductBatch, ProductSerial } from "@/lib/types";
import { formatCurrency } from "@/lib/tax-engine";
import { X, Calendar, ShieldCheck, Check, AlertTriangle } from "lucide-react";

interface BatchSerialModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (batch?: ProductBatch, serials?: string[], qty?: number) => void;
}

export const BatchSerialModal: React.FC<BatchSerialModalProps> = ({
  product,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const availableSerials = product.serials?.filter((s) => s.status === "AVAILABLE") || [];

  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    product.batches?.[0]?.id || ""
  );
  const [selectedSerials, setSelectedSerials] = useState<string[]>(
    availableSerials.length > 0 ? [availableSerials[0].serialOrImei] : []
  );
  const [quantity, setQuantity] = useState<number>(1);

  if (!isOpen) return null;

  const handleToggleSerial = (serial: string) => {
    if (selectedSerials.includes(serial)) {
      setSelectedSerials(selectedSerials.filter((s) => s !== serial));
    } else {
      setSelectedSerials([...selectedSerials, serial]);
    }
  };

  const handleConfirm = () => {
    const batch = product.batches?.find((b) => b.id === selectedBatchId) || product.batches?.[0];
    const serials = product.trackSerial
      ? selectedSerials.length > 0
        ? selectedSerials
        : availableSerials.length > 0
        ? [availableSerials[0].serialOrImei]
        : []
      : [];
    const qty = product.trackSerial ? Math.max(1, serials.length) : Math.max(1, quantity);
    onConfirm(batch, serials, qty);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Select Batch / Serial Number
            </h3>
            <p className="text-xs text-slate-500 truncate max-w-[280px]">
              {product.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Batches Selection */}
          {product.trackBatch && product.batches && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Available Batches:
              </label>
              <div className="space-y-2">
                {product.batches.map((batch) => {
                  const isNearExpiry = batch.expDate && new Date(batch.expDate) < new Date("2026-12-31");
                  const isSelected = selectedBatchId === batch.id;
                  return (
                    <div
                      key={batch.id}
                      onClick={() => setSelectedBatchId(batch.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold flex items-center gap-2">
                          <span>Batch: {batch.batchNo}</span>
                          {isNearExpiry && (
                            <span className="text-[9px] bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> Near Expiry
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Godown: {batch.godownName} | Stock: {batch.stockQty} {product.unit}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          EXP: {batch.expDate ? new Date(batch.expDate).toLocaleDateString("en-IN") : "N/A"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-sm text-slate-900 dark:text-white">
                          {formatCurrency(batch.salePrice)}
                        </div>
                        <div className="text-[10px] text-slate-400">MRP: {formatCurrency(batch.mrp)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Serials / IMEI Selection */}
          {product.trackSerial && product.serials && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Select IMEI / Unique Serials:
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {product.serials
                  .filter((s) => s.status === "AVAILABLE")
                  .map((serial) => {
                    const isSelected = selectedSerials.includes(serial.serialOrImei);
                    return (
                      <button
                        key={serial.id}
                        type="button"
                        onClick={() => handleToggleSerial(serial.serialOrImei)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-mono transition ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-indigo-500" />
                          {serial.serialOrImei}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Quantity selector */}
          {!product.trackSerial && (
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Quantity to Add:
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-base"
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  className="w-16 text-center py-1 font-bold text-sm bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-base"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow"
          >
            Confirm & Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};
