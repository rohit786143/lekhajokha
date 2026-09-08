"use client";

import React, { useState, useRef, useEffect } from "react";
import { Party } from "@/lib/types";
import { usePosStore } from "@/lib/pos-store";
import { useTenantData } from "@/lib/use-tenant-data";
import { INDIAN_STATES, formatCurrency } from "@/lib/tax-engine";
import { QuickPartyModal } from "./quick-party-modal";
import {
  User,
  Building2,
  Search,
  UserPlus,
  Edit3,
  X,
  ChevronDown,
  Phone,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export function CustomerSelectorBar() {
  const { parties: tenantParties, invoices: tenantInvoices } = useTenantData();
  const {
    selectedParty,
    setSelectedParty,
    placeOfSupply,
    setPlaceOfSupply,
    activeFirmId,
    firms,
    tenant,
    addParty,
  } = usePosStore();

  const activeFirm = firms.find((f) => f.id === activeFirmId) || firms[0] || tenant;
  const activeFirmState = activeFirm?.stateCode || "27";

  // Component States
  const [mode, setMode] = useState<"WALKIN" | "B2B">("WALKIN");
  const [mobileInput, setMobileInput] = useState<string>("");
  const [newCustomerName, setNewCustomerName] = useState<string>("");
  const [isNewCustomerPrompt, setIsNewCustomerPrompt] = useState<boolean>(false);
  const [welcomeBanner, setWelcomeBanner] = useState<{
    name: string;
    visits: number;
    due: number;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editParty, setEditParty] = useState<Party | null>(null);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const newNameInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Focus helper to move cashier focus to barcode product search
  const focusProductSearch = () => {
    setTimeout(() => {
      const searchEl = document.getElementById("pos-product-search-input") as HTMLInputElement;
      if (searchEl) {
        searchEl.focus();
        searchEl.select();
      }
    }, 100);
  };

  // Global F2 Keyboard Shortcut Listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "F2") {
        e.preventDefault();
        phoneInputRef.current?.focus();
        phoneInputRef.current?.select();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sync mode and mobile input when selectedParty changes externally
  useEffect(() => {
    if (selectedParty && selectedParty.id !== "party-walkin-cash") {
      const isRegisteredB2B = Boolean(selectedParty.gstin && selectedParty.gstin.trim().length >= 15);
      setMode(isRegisteredB2B ? "B2B" : "WALKIN");
      if (selectedParty.phone && selectedParty.phone !== "+91 00000 00000") {
        setMobileInput(selectedParty.phone.replace(/\D/g, "").slice(-10));
      }
    } else if (selectedParty?.id === "party-walkin-cash") {
      setWelcomeBanner(null);
      setIsNewCustomerPrompt(false);
    }
  }, [selectedParty]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Automated 10-digit mobile lookup logic
  const handleMobileInputChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 10);
    setMobileInput(cleaned);
    setIsNewCustomerPrompt(false);
    setWelcomeBanner(null);

    if (cleaned.length === 10) {
      performMobileLookup(cleaned);
    }
  };

  const performMobileLookup = (phoneDigits: string) => {
    const matchedParty = tenantParties.find((p) => {
      if (p.id === "party-walkin-cash") return false;
      const pPhone = (p.phone || "").replace(/\D/g, "").slice(-10);
      return pPhone === phoneDigits;
    });

    if (matchedParty) {
      const visits = tenantInvoices.filter(
        (i) => i.partyId === matchedParty.id || (i.party?.phone || "").replace(/\D/g, "").slice(-10) === phoneDigits
      ).length;

      setSelectedParty(matchedParty);
      setWelcomeBanner({
        name: matchedParty.name,
        visits: Math.max(1, visits),
        due: matchedParty.currentBalance || 0,
      });
      setIsNewCustomerPrompt(false);
      focusProductSearch();
    } else {
      setIsNewCustomerPrompt(true);
      setTimeout(() => {
        newNameInputRef.current?.focus();
      }, 80);
    }
  };

  // Create & Register New Customer
  const handleQuickRegisterNewCustomer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCustomerName.trim()) {
      alert("Please enter Customer Name");
      return;
    }

    const cleanDigits = mobileInput.replace(/\D/g, "").slice(-10) || "0000000000";

    const newParty: Party = {
      id: `party-cust-${Date.now()}`,
      tenantId: tenant.id,
      name: newCustomerName.trim(),
      type: "CUSTOMER",
      phone: `+91 ${cleanDigits}`,
      stateCode: activeFirmState,
      billingAddress: `Retail Customer, ${activeFirm?.stateName || "Local"}`,
      city: activeFirm?.stateName || "Local Market",
      pincode: "400001",
      creditLimit: 0,
      openingBalance: 0,
      currentBalance: 0,
    };

    addParty(newParty);
    setSelectedParty(newParty);

    setWelcomeBanner({
      name: newParty.name,
      visits: 1,
      due: 0,
    });
    setIsNewCustomerPrompt(false);
    setNewCustomerName("");
    focusProductSearch();
  };

  const handleSelectParty = (party: Party) => {
    setSelectedParty(party);
    setIsDropdownOpen(false);
    setSearchQuery("");
    if (party.phone && party.phone !== "+91 00000 00000") {
      setMobileInput(party.phone.replace(/\D/g, "").slice(-10));
    }
    focusProductSearch();
  };

  const handleResetToWalkin = () => {
    const walkinParty = tenantParties.find((p) => p.id === "party-walkin-cash") || {
      id: "party-walkin-cash",
      tenantId: tenant.id,
      name: "Walk-in Retail Customer (Cash)",
      type: "CUSTOMER",
      phone: "+91 00000 00000",
      stateCode: activeFirmState,
      billingAddress: "Counter Cash Retail Sale",
      city: activeFirm?.stateName || "Mumbai",
      pincode: "400001",
      creditLimit: 0,
      openingBalance: 0,
      currentBalance: 0,
    };
    setSelectedParty(walkinParty);
    setMode("WALKIN");
    setMobileInput("");
    setIsNewCustomerPrompt(false);
    setWelcomeBanner(null);
    setSearchQuery("");
  };

  const isSelectedWalkin = !selectedParty || selectedParty.id === "party-walkin-cash";

  // Filter parties for autocomplete dropdown (only matches when user enters a query)
  const currentSearchTerm = (searchQuery || mobileInput).trim().toLowerCase();

  const filteredParties = tenantParties.filter((p) => {
    if (p.id === "party-walkin-cash") return false;
    if (!currentSearchTerm) return false; // Hide all until user types

    const cleanDigits = currentSearchTerm.replace(/\D/g, "");

    // 1. Phone number starting/prefix match (e.g. 985 matches 9857640014)
    if (cleanDigits.length > 0 && p.phone) {
      const pClean = p.phone.replace(/\D/g, "");
      const pLast10 = pClean.slice(-10);
      if (pLast10.startsWith(cleanDigits) || pClean.startsWith(cleanDigits) || pClean.includes(cleanDigits)) {
        return true;
      }
    }

    // 2. Name starting / word prefix match
    const nameLower = p.name.toLowerCase();
    if (
      nameLower.startsWith(currentSearchTerm) ||
      nameLower.split(/\s+/).some((word) => word.startsWith(currentSearchTerm)) ||
      nameLower.includes(currentSearchTerm)
    ) {
      return true;
    }

    // 3. GSTIN match
    if (p.gstin && p.gstin.toLowerCase().includes(currentSearchTerm)) {
      return true;
    }

    return false;
  });

  return (
    <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
      {/* 1. Ultra-compact Single Row Customer Selection Header */}
      <div className="flex items-center justify-between gap-1.5">
        {/* Mode Toggle Buttons */}
        <div className="flex items-center gap-0.5 bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg shrink-0">
          <button
            type="button"
            onClick={handleResetToWalkin}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 ${
              isSelectedWalkin
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <User className="w-3 h-3" />
            <span>Walk-in</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("B2B");
              if (phoneInputRef.current) {
                phoneInputRef.current.focus();
              }
            }}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 ${
              !isSelectedWalkin && selectedParty?.gstin
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-3 h-3" />
            <span>B2B</span>
          </button>
        </div>

        {/* Customer Search / Mobile Input */}
        <div ref={searchContainerRef} className="relative flex-1 min-w-[140px]">
          <div className="relative flex items-center">
            <Phone className="w-3 h-3 absolute left-2 text-indigo-500 pointer-events-none" />
            <input
              ref={phoneInputRef}
              type="text"
              value={searchQuery || mobileInput}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                setMobileInput(val);
                const digits = val.replace(/\D/g, "");
                if (digits.length === 10) {
                  handleMobileInputChange(digits);
                }
                if (val.trim()) {
                  setIsDropdownOpen(true);
                } else {
                  setIsDropdownOpen(false);
                }
              }}
              onFocus={() => {
                if ((searchQuery || mobileInput).trim()) {
                  setIsDropdownOpen(true);
                }
              }}
              placeholder="Mobile, Name, or GSTIN [F2]"
              className="w-full pl-6 pr-6 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white placeholder:font-sans placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500"
            />
            <span className="absolute right-1.5 font-mono text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded pointer-events-none">
              F2
            </span>
          </div>

          {/* Autocomplete Search Dropdown (Only shown when user types a non-empty search term) */}
          {isDropdownOpen && currentSearchTerm.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              <button
                type="button"
                onClick={handleResetToWalkin}
                className="w-full text-left p-2 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Walk-in Retail Customer (Cash)</span>
                </div>
                <span className="text-[10px] text-slate-400">Default</span>
              </button>

              {filteredParties.length === 0 ? (
                <div className="p-3 text-center space-y-1.5">
                  <p className="text-xs text-slate-500 font-semibold">No saved customer matches</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setEditParty(null);
                      setIsModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-xs transition"
                  >
                    + Create New Customer
                  </button>
                </div>
              ) : (
                filteredParties.map((p) => {
                  const isB2B = Boolean(p.gstin && p.gstin.trim().length >= 15);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectParty(p)}
                      className="w-full text-left p-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                          <span>{p.name}</span>
                          {isB2B && (
                            <span className="px-1 py-0.2 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-extrabold text-[9px] font-mono">
                              B2B
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          {p.phone && <span>Ph: {p.phone}</span>}
                          {p.gstin && <span className="font-mono">GST: {p.gstin}</span>}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                        Select ➔
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Quick Add Customer Button */}
        <button
          type="button"
          onClick={() => {
            setEditParty(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-[11px] font-bold transition shrink-0"
        >
          <UserPlus className="w-3 h-3" />
          <span className="hidden sm:inline">+ Customer</span>
        </button>
      </div>

      {/* Inline New Customer Registration Box */}
      {isNewCustomerPrompt && (
        <form
          onSubmit={handleQuickRegisterNewCustomer}
          className="p-2 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 rounded-lg space-y-1.5 animate-fade-in"
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900 dark:text-indigo-200">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> New Customer (+91 {mobileInput})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              ref={newNameInputRef}
              type="text"
              required
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              placeholder="Enter Customer Name..."
              className="flex-1 px-2 py-1 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded text-xs font-bold text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded transition shrink-0 flex items-center gap-1"
            >
              <span>Save</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </form>
      )}

      {/* Welcome Banner */}
      {welcomeBanner && !isNewCustomerPrompt && (
        <div className="p-1.5 px-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-bold text-slate-900 dark:text-white truncate">
              ✓ Welcome, {welcomeBanner.name}! ({welcomeBanner.visits} visits)
            </span>
          </div>
          {welcomeBanner.due > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px] shrink-0">
              Due: {formatCurrency(welcomeBanner.due)}
            </span>
          )}
        </div>
      )}

      {/* Active Customer Detail Bar if Selected */}
      {!isSelectedWalkin && selectedParty && !isNewCustomerPrompt && (
        <div className="p-1.5 px-2 bg-indigo-50/80 dark:bg-indigo-950/60 rounded-lg border border-indigo-200 dark:border-indigo-800 text-[11px] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-slate-900 dark:text-white truncate">
              👤 {selectedParty.name}
            </span>
            {selectedParty.phone && <span className="text-slate-500 font-mono text-[10px]">({selectedParty.phone})</span>}
            {selectedParty.gstin && (
              <span className="px-1 py-0.2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 font-mono text-[9px] font-bold rounded">
                GST: {selectedParty.gstin}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditParty(selectedParty);
                setIsModalOpen(true);
              }}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
              title="Edit Details"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleResetToWalkin}
              className="p-1 hover:bg-rose-100 text-rose-600 rounded"
              title="Reset to Walk-in"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Sub-Bar: Active Billing Firm, Place of Supply & Tax Rule */}
      <div className="flex items-center justify-between text-[10px] px-0.5 text-slate-500 pt-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-indigo-600 dark:text-indigo-400">
            [{activeFirm?.stateCode || "27"}] {activeFirm?.name?.slice(0, 14)}
          </span>
          <span>•</span>
          <select
            value={placeOfSupply}
            onChange={(e) => setPlaceOfSupply(e.target.value)}
            className="bg-transparent font-bold text-slate-700 dark:text-slate-300 border-none p-0 focus:ring-0 cursor-pointer text-[10px]"
            title="Select Place of Supply State"
          >
            {Object.entries(INDIAN_STATES).map(([code, stateName]) => (
              <option key={code} value={code}>
                POS: {code} - {stateName.slice(0, 10)}
              </option>
            ))}
          </select>
        </div>

        <span
          className={`px-1.5 py-0.2 rounded font-mono font-bold text-[9px] ${
            placeOfSupply !== activeFirmState
              ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          }`}
        >
          {placeOfSupply !== activeFirmState ? "100% IGST" : "CGST + SGST"}
        </span>
      </div>

      {/* Modal */}
      <QuickPartyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialParty={editParty}
        defaultMode={mode === "B2B" ? "B2B" : "B2C"}
        onPartySaved={(party) => {
          setSelectedParty(party);
          if (party.phone && party.phone !== "+91 00000 00000") {
            setMobileInput(party.phone.replace(/\D/g, "").slice(-10));
          }
          focusProductSearch();
        }}
      />
    </div>
  );
}
