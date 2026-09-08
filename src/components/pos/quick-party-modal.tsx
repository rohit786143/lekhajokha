"use client";

import React, { useState, useEffect } from "react";
import { Party } from "@/lib/types";
import { usePosStore } from "@/lib/pos-store";
import { useTenantData } from "@/lib/use-tenant-data";
import {
  INDIAN_STATES,
  extractStateFromGstin,
  isValidGstin,
} from "@/lib/tax-engine";
import {
  UserPlus,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  X,
  CreditCard,
  Check,
  ShieldCheck,
} from "lucide-react";

interface QuickPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialParty?: Party | null;
  defaultMode?: "B2C" | "B2B";
  onPartySaved?: (party: Party) => void;
}

export function QuickPartyModal({
  isOpen,
  onClose,
  initialParty,
  defaultMode = "B2C",
  onPartySaved,
}: QuickPartyModalProps) {
  const { tenant } = useTenantData();
  const { activeFirmId, firms, addParty, updateParty, setSelectedParty } = usePosStore();

  const activeFirm = firms.find((f) => f.id === activeFirmId) || firms[0] || tenant;
  const defaultState = activeFirm?.stateCode || tenant?.stateCode || "27";

  // Form State
  const [isB2B, setIsB2B] = useState<boolean>(
    Boolean(initialParty?.gstin && initialParty.gstin.trim().length >= 15) || defaultMode === "B2B"
  );
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [gstin, setGstin] = useState<string>("");
  const [stateCode, setStateCode] = useState<string>(defaultState);
  const [billingAddress, setBillingAddress] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");

  const [sameAsBilling, setSameAsBilling] = useState<boolean>(true);
  const [shippingAddress, setShippingAddress] = useState<string>("");
  const [creditLimit, setCreditLimit] = useState<number>(0);

  const [gstinError, setGstinError] = useState<string>("");

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialParty && initialParty.id !== "party-walkin-cash") {
        setIsB2B(Boolean(initialParty.gstin && initialParty.gstin.trim().length >= 15));
        setName(initialParty.name || "");
        setPhone(initialParty.phone || "");
        setEmail(initialParty.email || "");
        setGstin(initialParty.gstin || "");
        setStateCode(initialParty.stateCode || defaultState);
        setBillingAddress(initialParty.billingAddress || "");
        setCity(initialParty.city || "");
        setPincode(initialParty.pincode || "");
        setSameAsBilling(!initialParty.shippingAddress || initialParty.shippingAddress === initialParty.billingAddress);
        setShippingAddress(initialParty.shippingAddress || "");
        setCreditLimit(initialParty.creditLimit || 0);
      } else {
        setIsB2B(defaultMode === "B2B");
        setName("");
        setPhone("");
        setEmail("");
        setGstin("");
        setStateCode(defaultState);
        setBillingAddress("");
        setCity(activeFirm?.stateName || tenant?.stateName || "Mumbai");
        setPincode("400001");
        setSameAsBilling(true);
        setShippingAddress("");
        setCreditLimit(0);
      }
      setGstinError("");
    }
  }, [isOpen, initialParty, defaultMode, defaultState, activeFirm, tenant]);

  // Handle GSTIN Input with Auto State Extraction
  const handleGstinChange = (val: string) => {
    const uppercaseVal = val.toUpperCase().trim();
    setGstin(uppercaseVal);

    if (uppercaseVal.length >= 2) {
      const extracted = extractStateFromGstin(uppercaseVal);
      if (extracted?.stateCode) {
        setStateCode(extracted.stateCode);
      }
    }

    if (uppercaseVal.length > 0 && uppercaseVal.length < 15) {
      setGstinError("GSTIN must be 15 alphanumeric characters");
    } else if (uppercaseVal.length === 15 && !isValidGstin(uppercaseVal)) {
      setGstinError("Invalid GSTIN format structure");
    } else {
      setGstinError("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Please enter Customer / Company Name");
      return;
    }

    const partyId = initialParty && initialParty.id !== "party-walkin-cash"
      ? initialParty.id
      : `party-${Date.now()}`;

    const newParty: Party = {
      id: partyId,
      tenantId: tenant.id,
      name: name.trim(),
      type: "CUSTOMER",
      phone: phone.trim() || "+91 00000 00000",
      email: email.trim(),
      gstin: isB2B && gstin.trim() ? gstin.trim().toUpperCase() : undefined,
      stateCode: stateCode,
      billingAddress: billingAddress.trim() || `${city}, ${INDIAN_STATES[stateCode] || ""}`,
      shippingAddress: sameAsBilling ? billingAddress.trim() : shippingAddress.trim(),
      city: city.trim() || INDIAN_STATES[stateCode] || "Main City",
      pincode: pincode.trim() || "400001",
      creditLimit: Number(creditLimit) || 0,
      openingBalance: initialParty?.openingBalance || 0,
      currentBalance: initialParty?.currentBalance || 0,
    };

    if (initialParty && initialParty.id !== "party-walkin-cash") {
      updateParty(newParty);
    } else {
      addParty(newParty);
    }

    // Set as active selected party for current bill
    setSelectedParty(newParty);

    if (onPartySaved) {
      onPartySaved(newParty);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                {initialParty && initialParty.id !== "party-walkin-cash"
                  ? "Edit Customer Details"
                  : "Quick Add Customer / B2B Party"}
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                Saves customer to master ledger & links to current active invoice.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-2xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs font-semibold">
          {/* Mode Selector Radio Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/70 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsB2B(false)}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                !isB2B
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Unregistered Consumer (B2C)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsB2B(true)}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                isB2B
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>GST Registered Business (B2B)</span>
            </button>
          </div>

          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                Customer / Business Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isB2B ? "e.g. Apex Traders Pvt Ltd" : "e.g. Rahul Sharma"}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98200 12345"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* B2B GSTIN & State */}
          {isB2B && (
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1 flex items-center justify-between">
                    <span>GSTIN Number (15 Chars)</span>
                    <span className="text-[10px] text-indigo-600 font-bold">Auto-Detects State</span>
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    placeholder="27AABCU9603R1ZM"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 uppercase"
                  />
                  {gstinError && (
                    <span className="text-[10px] text-rose-500 font-bold mt-0.5 block">{gstinError}</span>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                    State / Place of Supply
                  </label>
                  <select
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {Object.entries(INDIAN_STATES).map(([code, stateName]) => (
                      <option key={code} value={code}>
                        {code} - {stateName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Email & State (If not B2B) */}
          {!isB2B && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@gmail.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                  State / Place of Supply
                </label>
                <select
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                >
                  {Object.entries(INDIAN_STATES).map(([code, stateName]) => (
                    <option key={code} value={code}>
                      {code} - {stateName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Billing Address */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
              Billing Address
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <textarea
                rows={2}
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Shop/House No, Street Name, Commercial Hub"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* City & Pincode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                City / Town
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Mumbai / Delhi"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                Pincode
              </label>
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="400086"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Shipping Address Checkbox */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-slate-800 dark:text-slate-200 select-none">
              <input
                type="checkbox"
                checked={sameAsBilling}
                onChange={(e) => setSameAsBilling(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <span>Shipping Address same as Billing Address</span>
            </label>

            {!sameAsBilling && (
              <div className="pt-2">
                <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                  Separate Shipping Address
                </label>
                <textarea
                  rows={2}
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Enter destination delivery address..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Footer Submit Button */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save & Select Customer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
