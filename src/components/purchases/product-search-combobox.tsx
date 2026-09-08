"use client";

import React, { useState, useEffect, useRef } from "react";
import { Product } from "@/lib/types";
import { playAudioFeedback } from "@/lib/barcode-parser";
import { Search, Plus, Package, Barcode, Check, ChevronDown } from "lucide-react";

interface ProductSearchComboboxProps {
  products: Product[];
  selectedProductId: string;
  onSelectProduct: (product: Product) => void;
  onOpenQuickAddModal: () => void;
  onBarcodeScanToNextField?: () => void;
  disabled?: boolean;
}

export function ProductSearchCombobox({
  products,
  selectedProductId,
  onSelectProduct,
  onOpenQuickAddModal,
  onBarcodeScanToNextField,
  disabled = false,
}: ProductSearchComboboxProps) {
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize display term when selected product changes
  useEffect(() => {
    if (selectedProduct) {
      setSearchTerm(selectedProduct.name);
    } else {
      setSearchTerm("");
    }
  }, [selectedProductId, selectedProduct]);

  // Handle Outside Click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (selectedProduct) setSearchTerm(selectedProduct.name);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedProduct]);

  // Filter products by Name, SKU, or Barcode
  const filteredProducts = products.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  });

  // Handle selecting a product from dropdown
  const handleSelect = (prod: Product) => {
    onSelectProduct(prod);
    setSearchTerm(prod.name);
    setIsOpen(false);
  };

  // Hardware Barcode Scanner & Search Input Change Handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true);
    setHighlightedIndex(0);

    if (!val.trim()) return;
    const clean = val.trim().toLowerCase();

    // Check for exact Barcode or SKU match (Hardware scanner auto-match)
    const exactMatch = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === clean) ||
        p.sku.toLowerCase() === clean
    );

    if (exactMatch) {
      playAudioFeedback("success");
      onSelectProduct(exactMatch);
      setSearchTerm(exactMatch.name);
      setIsOpen(false);

      if (onBarcodeScanToNextField) {
        setTimeout(() => {
          onBarcodeScanToNextField();
        }, 50);
      }
    }
  };

  // Keyboard navigation inside Combobox
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) =>
        prev < filteredProducts.length ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }

      if (highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
        const prod = filteredProducts[highlightedIndex];
        handleSelect(prod);
        if (onBarcodeScanToNextField) {
          onBarcodeScanToNextField();
        }
      } else if (highlightedIndex === filteredProducts.length) {
        // Trigger Quick Add Product
        onOpenQuickAddModal();
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      if (selectedProduct) setSearchTerm(selectedProduct.name);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full text-xs font-sans">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search Product, SKU, or Scan Barcode..."
          className="w-full pl-8 pr-7 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition"
        />
        <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
        <ChevronDown
          onClick={() => setIsOpen(!isOpen)}
          className="w-3.5 h-3.5 absolute right-2.5 text-slate-400 cursor-pointer"
        />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in duration-150">
          <div className="p-1">
            {filteredProducts.length === 0 ? (
              <div className="p-3 text-center text-slate-500">
                <p className="font-medium">No matching products</p>
              </div>
            ) : (
              filteredProducts.map((p, idx) => {
                const isSelected = p.id === selectedProductId;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold"
                        : isHighlighted
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Package className="w-4 h-4 text-indigo-500 shrink-0" />
                      <div className="truncate">
                        <div className="font-bold truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                          <span>SKU: {p.sku}</span>
                          {p.barcode && (
                            <span className="flex items-center gap-0.5">
                              <Barcode className="w-2.5 h-2.5" />
                              {p.barcode}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2 font-mono">
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        ₹{p.purchasePrice || 0}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Stock: {p.currentStock || 0} {p.unit}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Add Product Trigger Option inside Dropdown */}
          <div className="p-1 bg-slate-50/50 dark:bg-slate-800/40">
            <button
              type="button"
              onClick={() => {
                onOpenQuickAddModal();
                setIsOpen(false);
              }}
              onMouseEnter={() => setHighlightedIndex(filteredProducts.length)}
              className={`w-full flex items-center justify-center gap-1.5 p-2 rounded-xl text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition ${
                highlightedIndex === filteredProducts.length
                  ? "bg-indigo-100 dark:bg-indigo-950/80"
                  : ""
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Quick Add New Product</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
