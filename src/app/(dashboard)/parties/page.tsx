"use client";

import React, { useState } from "react";
import { usePosStore } from "@/lib/pos-store";
import { useTenantData } from "@/lib/use-tenant-data";
import { Party } from "@/lib/types";
import { formatCurrency, generateUpiUri, INDIAN_STATES } from "@/lib/tax-engine";
import {
  Users,
  Plus,
  Search,
  Phone,
  Building2,
  Share2,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowUpRight,
  MessageSquare,
} from "lucide-react";

export default function PartiesPage() {
  const { tenant, firms, activeFirmId, getActiveFirm, addParty, updateParty } = usePosStore();
  const { parties: tenantParties } = useTenantData();
  const [searchQuery, setSearchQuery] = useState("");
  const [partyTypeFilter, setPartyTypeFilter] = useState<"ALL" | "CUSTOMER" | "VENDOR">("ALL");
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
  const [selectedPartyForReminder, setSelectedPartyForReminder] = useState<Party | null>(null);

  const activeFirm =
    (typeof getActiveFirm === "function" ? getActiveFirm() : null) ||
    firms.find((f) => f.id === activeFirmId) ||
    firms.find((f) => f.isPrimary) ||
    firms[0] ||
    tenant;

  // New Party form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gstin, setGstin] = useState("");
  const [type, setType] = useState<"CUSTOMER" | "VENDOR" | "BOTH">("CUSTOMER");
  const [stateCode, setStateCode] = useState(activeFirm.stateCode || "27");
  const [billingAddress, setBillingAddress] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [pincode, setPincode] = useState("400001");
  const [creditLimit, setCreditLimit] = useState(50000);
  const [openingBalance, setOpeningBalance] = useState(0);

  // Tenant-Scoped Parties Data (from useTenantData hook)

  const filteredParties = tenantParties.filter((p) => {
    const matchType =
      partyTypeFilter === "ALL" || p.type === partyTypeFilter || p.type === "BOTH";
    const matchSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery) ||
      (p.gstin && p.gstin.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchType && matchSearch;
  });

  const handleCreateParty = (e: React.FormEvent) => {
    e.preventDefault();
    const newPt: Party = {
      id: `party-${Date.now()}`,
      tenantId: tenant.id,
      name,
      phone,
      email,
      gstin: gstin.toUpperCase(),
      type,
      stateCode,
      billingAddress,
      city,
      pincode,
      creditLimit: Number(creditLimit) || 0,
      openingBalance: Number(openingBalance) || 0,
      currentBalance: Number(openingBalance) || 0,
    };
    addParty(newPt);
    setIsAddPartyModalOpen(false);
    // Reset
    setName("");
    setPhone("");
    setGstin("");
  };

  const generateWhatsAppReminderUrl = (party: Party) => {
    const upiLink = generateUpiUri({
      vpa: activeFirm.upiId || tenant.upiVpa || "vyaparflow@icici",
      payeeName: activeFirm.name || tenant.name,
      amount: party.currentBalance,
      invoiceNo: `KHATA-${party.name.slice(0, 4).toUpperCase()}`,
    });

    const msg = `Namaste ${party.name} ji,\n\nThis is a gentle payment reminder from *${activeFirm.name || tenant.name}*.\nYour current outstanding balance is *${formatCurrency(party.currentBalance)}*.\n\nYou can settle via UPI directly using this link:\n${upiLink}\n\nUPI ID: ${activeFirm.upiId || tenant.upiVpa}\nThank you for your business!`;

    const cleanPhone = party.phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
            Party Khata, Ledgers & Credit Control
          </h1>
          <p className="text-xs text-slate-500">
            Customer balance reminders, vendor payables, and WhatsApp UPI pay links.
          </p>
        </div>

        <button
          onClick={() => setIsAddPartyModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Party</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search party name, phone, or GSTIN..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          {(["ALL", "CUSTOMER", "VENDOR"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setPartyTypeFilter(t)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                partyTypeFilter === t
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {t === "ALL" ? "All Parties" : t === "CUSTOMER" ? "Customers" : "Vendors"}
            </button>
          ))}
        </div>
      </div>

      {/* Parties Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Party Name & Type</th>
                <th className="p-3.5">Contact Details</th>
                <th className="p-3.5">GSTIN & State</th>
                <th className="p-3.5 text-right">Credit Limit</th>
                <th className="p-3.5 text-right">Current Balance (Khata)</th>
                <th className="p-3.5 text-center">Actions & WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredParties.map((party) => {
                const isReceivable = party.currentBalance > 0;
                const isPayable = party.currentBalance < 0;
                return (
                  <tr
                    key={party.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {party.name}
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded">
                        {party.type}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono">
                      <div>{party.phone}</div>
                      <div className="text-[10px] text-slate-400">{party.city}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-indigo-600">
                        {party.gstin || "URP (Unregistered)"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {INDIAN_STATES[party.stateCode] || "State"} ({party.stateCode})
                      </div>
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-600 dark:text-slate-400">
                      {formatCurrency(party.creditLimit)}
                    </td>
                    <td className="p-3.5 text-right font-mono">
                      <div
                        className={`font-black text-sm ${
                          isReceivable
                            ? "text-amber-600 dark:text-amber-400"
                            : isPayable
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-500"
                        }`}
                      >
                        {formatCurrency(party.currentBalance)}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {isReceivable ? "You will receive" : isPayable ? "You owe vendor" : "Settled"}
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {party.currentBalance > 0 && (
                          <a
                            href={generateWhatsAppReminderUrl(party)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold shadow-xs transition"
                            title="Send WhatsApp Payment Reminder with UPI link"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp Remind</span>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Party Modal */}
      {isAddPartyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Register New Party (Customer / Vendor)
              </h3>
              <button
                onClick={() => setIsAddPartyModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateParty} className="p-6 overflow-y-auto space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Business / Party Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Supermart / Rajesh Kumar"
                  className="w-full mt-1 px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9820012345"
                    className="w-full mt-1 px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Party Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="VENDOR">Vendor / Supplier</option>
                    <option value="BOTH">Both Customer & Vendor</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    GSTIN (15 Digits)
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="27AABCU1234F1Z5"
                    maxLength={15}
                    className="w-full mt-1 px-3 py-2 text-xs font-mono uppercase bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    State Code (POS)
                  </label>
                  <select
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  >
                    {Object.entries(INDIAN_STATES).map(([code, stName]) => (
                      <option key={code} value={code}>
                        {code} - {stName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    value={creditLimit || ""}
                    onChange={(e) => setCreditLimit(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Opening Balance (₹)
                  </label>
                  <input
                    type="number"
                    value={openingBalance || ""}
                    onChange={(e) => setOpeningBalance(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Billing Address
                </label>
                <textarea
                  rows={2}
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Street address, building, landmark..."
                  className="w-full mt-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPartyModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow transition"
                >
                  Save Party
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
