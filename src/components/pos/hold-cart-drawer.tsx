"use client";

import React from "react";
import { usePosStore } from "@/lib/pos-store";
import { formatCurrency } from "@/lib/tax-engine";
import { X, PauseCircle, Play, Trash2, ShoppingBag, Clock } from "lucide-react";

export const HoldCartDrawer: React.FC = () => {
  const { isHoldDrawerOpen, setIsHoldDrawerOpen, parkedCarts, resumeParkedCart, deleteParkedCart } =
    usePosStore();

  if (!isHoldDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <PauseCircle className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Parked Bills ({parkedCarts.length})
              </h3>
              <p className="text-xs text-slate-500">Hold & Switch parallel customer carts</p>
            </div>
          </div>
          <button
            onClick={() => setIsHoldDrawerOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {parkedCarts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <ShoppingBag className="w-10 h-10 stroke-1" />
              <p className="text-sm font-semibold">No parked bills</p>
              <p className="text-xs text-slate-500">
                Click &quot;Hold Bill&quot; on the POS screen to pause a customer cart.
              </p>
            </div>
          ) : (
            parkedCarts.map((cart) => {
              const totalAmount = cart.items.reduce((sum, it) => sum + it.total, 0);
              return (
                <div
                  key={cart.id}
                  className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 hover:border-indigo-500/50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {cart.cartName}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {cart.createdAt}
                        </span>
                        <span>•</span>
                        <span>{cart.items.length} Items</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(totalAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Quick items preview */}
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                    {cart.items.map((it, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="truncate max-w-[200px]">{it.product.name}</span>
                        <span className="font-mono">
                          {it.quantity} {it.unit}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => deleteParkedCart(cart.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                      title="Discard Hold"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resumeParkedCart(cart.id);
                        setIsHoldDrawerOpen(false);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Resume Bill
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
