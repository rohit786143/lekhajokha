"use client";

import React, { useState, useEffect } from "react";
import { usePosStore } from "@/lib/pos-store";
import { Firm } from "@/lib/types";
import { RbacGuard } from "@/components/auth/rbac-guard";
import { GoogleSheetSync } from "@/components/settings/google-sheet-sync";
import {
  INDIAN_STATES,
  extractStateFromGstin,
  isValidGstin,
  generateInvoicePrefixSuggestions,
  STATE_SHORT_CODES,
} from "@/lib/tax-engine";
import {
  Building2,
  Plus,
  CheckCircle2,
  Trash2,
  Edit3,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  Sparkles,
  QrCode,
  Landmark,
  FileText,
  Phone,
  Mail,
  MapPin,
  X,
  AlertCircle,
  Zap,
} from "lucide-react";
import { useTenantData } from "@/lib/use-tenant-data";

export default function CompanySettingsPage() {
  const { tenant, activeFirmId, setActiveFirmId, addFirm, updateFirm, deleteFirm } =
    usePosStore();
  const { firms } = useTenantData();

  const activeFirm =
    firms.find((f) => f.id === activeFirmId) ||
    firms.find((f) => f.isPrimary) ||
    firms[0] || {
      id: "firm-default",
      tenantId: tenant.id,
      name: tenant.name,
      legalName: tenant.legalName,
      gstin: tenant.gstin,
      stateCode: tenant.stateCode || "27",
      stateName: tenant.stateName || "Maharashtra",
      address: tenant.address,
      pincode: tenant.pincode,
      phone: tenant.phone,
      email: tenant.email,
      upiId: tenant.upiVpa,
      bankName: tenant.bankName,
      accountNo: tenant.bankAccountNumber,
      ifsc: tenant.bankIfsc,
      invoicePrefix: "INV",
      isPrimary: true,
    };

  // Active Editing Form State
  const [name, setName] = useState(activeFirm.name || "");
  const [legalName, setLegalName] = useState(activeFirm.legalName || "");
  const [gstin, setGstin] = useState(activeFirm.gstin || "");
  const [stateCode, setStateCode] = useState(activeFirm.stateCode || "27");
  const [stateName, setStateName] = useState(activeFirm.stateName || "Maharashtra");
  const [address, setAddress] = useState(activeFirm.address || "");
  const [pincode, setPincode] = useState(activeFirm.pincode || "");
  const [phone, setPhone] = useState(activeFirm.phone || "");
  const [email, setEmail] = useState(activeFirm.email || "");
  const [upiId, setUpiId] = useState(activeFirm.upiId || "");
  const [bankName, setBankName] = useState(activeFirm.bankName || "");
  const [accountNo, setAccountNo] = useState(activeFirm.accountNo || "");
  const [ifsc, setIfsc] = useState(activeFirm.ifsc || "");
  const [invoicePrefix, setInvoicePrefix] = useState(activeFirm.invoicePrefix || "INV");
  const [isPrimary, setIsPrimary] = useState(activeFirm.isPrimary || false);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(activeFirm.logoUrl);
  const [signatureUrl, setSignatureUrl] = useState<string | undefined>(activeFirm.signatureUrl);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [firmToDelete, setFirmToDelete] = useState<Firm | null>(null);

  // New Firm Modal State
  const [newFirmName, setNewFirmName] = useState("");
  const [newFirmLegalName, setNewFirmLegalName] = useState("");
  const [newFirmGstin, setNewFirmGstin] = useState("");
  const [newFirmStateCode, setNewFirmStateCode] = useState("27");
  const [newFirmStateName, setNewFirmStateName] = useState("Maharashtra");
  const [newFirmAddress, setNewFirmAddress] = useState("");
  const [newFirmPincode, setNewFirmPincode] = useState("");
  const [newFirmPhone, setNewFirmPhone] = useState("");
  const [newFirmEmail, setNewFirmEmail] = useState("");
  const [newFirmUpiId, setNewFirmUpiId] = useState("");
  const [newFirmBankName, setNewFirmBankName] = useState("");
  const [newFirmAccountNo, setNewFirmAccountNo] = useState("");
  const [newFirmIfsc, setNewFirmIfsc] = useState("");
  const [newFirmPrefix, setNewFirmPrefix] = useState("INV");
  const [newFirmIsPrimary, setNewFirmIsPrimary] = useState(false);
  const [newFirmLogo, setNewFirmLogo] = useState<string | undefined>();
  const [newFirmSignature, setNewFirmSignature] = useState<string | undefined>();

  // Auto-clean any legacy AR Mark Industries if other firms exist
  useEffect(() => {
    const arMarkFirm = firms.find(
      (f) =>
        f.name.toLowerCase().includes("ar mark") ||
        (f.legalName && f.legalName.toLowerCase().includes("ar mark"))
    );
    if (arMarkFirm && firms.length > 1) {
      deleteFirm(arMarkFirm.id);
    }
  }, [firms, deleteFirm]);

  // Synchronize editing form whenever active firm changes
  useEffect(() => {
    if (activeFirm) {
      setName(activeFirm.name || "");
      setLegalName(activeFirm.legalName || "");
      setGstin(activeFirm.gstin || "");
      setStateCode(activeFirm.stateCode || "27");
      setStateName(activeFirm.stateName || INDIAN_STATES[activeFirm.stateCode] || "Maharashtra");
      setAddress(activeFirm.address || "");
      setPincode(activeFirm.pincode || "");
      setPhone(activeFirm.phone || "");
      setEmail(activeFirm.email || "");
      setUpiId(activeFirm.upiId || "");
      setBankName(activeFirm.bankName || "");
      setAccountNo(activeFirm.accountNo || "");
      setIfsc(activeFirm.ifsc || "");
      setInvoicePrefix(activeFirm.invoicePrefix || "INV");
      setIsPrimary(activeFirm.isPrimary || false);
      setLogoUrl(activeFirm.logoUrl);
      setSignatureUrl(activeFirm.signatureUrl);
    }
  }, [activeFirmId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Auto-extract state from active form GSTIN
  const handleGstinChange = (val: string) => {
    const formatted = val.toUpperCase().trim();
    setGstin(formatted);

    const extracted = extractStateFromGstin(formatted);
    if (extracted) {
      setStateCode(extracted.stateCode);
      setStateName(extracted.stateName);
      // Auto-suggest invoice prefix if current prefix is default or uncustomized
      if (!invoicePrefix || invoicePrefix === "INV" || invoicePrefix === "VF-MUM" || invoicePrefix.startsWith("VF-")) {
        const sugs = generateInvoicePrefixSuggestions(name, extracted.stateCode);
        if (sugs.length > 0) {
          setInvoicePrefix(sugs[0]);
        }
      }
    }
  };

  // Auto-extract state from New Firm modal GSTIN
  const handleNewFirmGstinChange = (val: string) => {
    const formatted = val.toUpperCase().trim();
    setNewFirmGstin(formatted);

    const extracted = extractStateFromGstin(formatted);
    if (extracted) {
      setNewFirmStateCode(extracted.stateCode);
      setNewFirmStateName(extracted.stateName);
      if (!newFirmPrefix || newFirmPrefix === "INV" || newFirmPrefix.startsWith("VF-")) {
        const sugs = generateInvoicePrefixSuggestions(newFirmName, extracted.stateCode);
        if (sugs.length > 0) {
          setNewFirmPrefix(sugs[0]);
        }
      }
    }
  };

  const handleStateSelectChange = (code: string) => {
    setStateCode(code);
    const sName = INDIAN_STATES[code] || "";
    setStateName(sName);
    // Auto-suggest invoice prefix if current prefix is default or state-related
    if (!invoicePrefix || invoicePrefix === "INV" || invoicePrefix === "VF-MUM" || invoicePrefix.startsWith("VF-") || invoicePrefix.endsWith("-27")) {
      const sugs = generateInvoicePrefixSuggestions(name, code);
      if (sugs.length > 0) {
        setInvoicePrefix(sugs[0]);
      }
    }
  };

  const handleNewFirmStateChange = (code: string) => {
    setNewFirmStateCode(code);
    const sName = INDIAN_STATES[code] || "";
    setNewFirmStateName(sName);
    if (!newFirmPrefix || newFirmPrefix === "INV" || newFirmPrefix.startsWith("VF-")) {
      const sugs = generateInvoicePrefixSuggestions(newFirmName, code);
      if (sugs.length > 0) {
        setNewFirmPrefix(sugs[0]);
      }
    }
  };

  // Image Upload helper
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string | undefined) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("⚠️ Image size exceeds 2MB limit.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save active firm
  const handleSaveActiveFirm = (e: React.FormEvent) => {
    e.preventDefault();

    if (gstin && !isValidGstin(gstin)) {
      showToast("⚠️ Please enter a valid 15-character alphanumeric GSTIN (e.g. 27AABCU9603R1ZM)");
      return;
    }

    const updated: Firm = {
      ...activeFirm,
      name,
      legalName: legalName || undefined,
      gstin: gstin ? gstin.toUpperCase() : undefined,
      stateCode,
      stateName,
      address,
      pincode,
      phone,
      email,
      upiId,
      bankName,
      accountNo,
      ifsc: ifsc ? ifsc.toUpperCase() : undefined,
      invoicePrefix: invoicePrefix.toUpperCase(),
      isPrimary,
      logoUrl,
      signatureUrl,
      updatedAt: new Date().toISOString(),
    };

    updateFirm(updated);
    showToast("✅ Company Profile & GST details updated successfully!");
  };

  // Create new firm
  const handleCreateNewFirm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newFirmName) {
      showToast("⚠️ Firm Trade Name is required");
      return;
    }

    if (newFirmGstin && !isValidGstin(newFirmGstin)) {
      showToast("⚠️ Please enter a valid 15-character alphanumeric GSTIN");
      return;
    }

    const newFirm: Firm = {
      id: `firm-${Date.now()}`,
      tenantId: tenant.id,
      name: newFirmName,
      legalName: newFirmLegalName || undefined,
      gstin: newFirmGstin ? newFirmGstin.toUpperCase() : undefined,
      stateCode: newFirmStateCode,
      stateName: newFirmStateName,
      address: newFirmAddress,
      pincode: newFirmPincode,
      phone: newFirmPhone,
      email: newFirmEmail,
      upiId: newFirmUpiId,
      bankName: newFirmBankName,
      accountNo: newFirmAccountNo,
      ifsc: newFirmIfsc ? newFirmIfsc.toUpperCase() : undefined,
      invoicePrefix: (newFirmPrefix || "INV").toUpperCase(),
      isPrimary: newFirmIsPrimary,
      logoUrl: newFirmLogo,
      signatureUrl: newFirmSignature,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addFirm(newFirm);
    setActiveFirmId(newFirm.id);
    setIsAddModalOpen(false);

    // Reset modal form
    setNewFirmName("");
    setNewFirmLegalName("");
    setNewFirmGstin("");
    setNewFirmAddress("");
    setNewFirmPincode("");
    setNewFirmPhone("");
    setNewFirmEmail("");
    setNewFirmUpiId("");
    setNewFirmBankName("");
    setNewFirmAccountNo("");
    setNewFirmIfsc("");
    setNewFirmPrefix("INV");
    setNewFirmIsPrimary(false);
    setNewFirmLogo(undefined);
    setNewFirmSignature(undefined);

    showToast(`🏢 New Firm "${newFirm.name}" added and activated!`);
  };

  const handleConfirmDelete = () => {
    if (!firmToDelete) return;
    if (firms.length <= 1) {
      showToast("⚠️ You must keep at least one registered business firm.");
      setFirmToDelete(null);
      return;
    }
    deleteFirm(firmToDelete.id);
    showToast(`🗑️ Firm "${firmToDelete.name}" was removed.`);
    setFirmToDelete(null);
  };

  return (
    <RbacGuard
      allowedRoles={["OWNER", "TENANT_OWNER", "SUPER_ADMIN"]}
      featureTitle="Company & Multi-Firm Settings"
    >
      <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-bold animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
              Multi-Firm Management
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              State-Based GST Engine
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight">
            Company Profile, Multiple Firms & Branches
          </h1>
          <p className="text-xs text-slate-400">
            Configure trade name, GSTIN compliance, state of origin, banking details, logo, and digital signature for invoices.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-600/30 transition self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Firm / Branch</span>
        </button>
      </div>

      {/* MULTI-FIRM SELECTOR CARDS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Registered Business Entities & Branches ({firms.length})</span>
          </h2>
          <span className="text-xs text-slate-500">
            Click any firm card to switch active billing entity
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {firms.map((f) => {
            const isActive = f.id === activeFirm.id;
            return (
              <div
                key={f.id}
                onClick={() => setActiveFirmId(f.id)}
                className={`group relative p-5 rounded-3xl border transition cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-xs"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white line-clamp-1">
                          {f.name}
                        </span>
                        {f.isPrimary && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-black text-[9px] rounded-md border border-amber-300 dark:border-amber-800">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {f.legalName || "Proprietorship / Entity"}
                      </p>
                    </div>

                    {isActive ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 group-hover:text-indigo-600 font-bold">
                        Switch ➔
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 py-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">GSTIN:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {f.gstin || "Unregistered (Composition/Retail)"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">State:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        [{f.stateCode}] {f.stateName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Bill Prefix:</span>
                      <span className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                        {f.invoicePrefix}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 truncate max-w-[180px]">
                    {f.address || "No address specified"}
                  </span>
                  {firms.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFirmToDelete(f);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                      title="Delete Firm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ACTIVE FIRM CONFIGURATION FORM */}
      <form
        onSubmit={handleSaveActiveFirm}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-0.5">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-indigo-600" />
              <span>Editing Active Profile: {activeFirm.name}</span>
            </h2>
            <p className="text-xs text-slate-500">
              Updates made here will automatically reflect on all POS bills, thermal slips, and A4 tax invoices.
            </p>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition self-start sm:self-auto"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save Profile & GST Settings</span>
          </button>
        </div>

        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* SECTION 1: Business & GST Details */}
          <div className="space-y-4">
            <div className="text-xs font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>1. Business Identity & GSTIN</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Trade Name (Display on Bills) *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. VyaparFlow Mega Retail"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Legal Entity Name (As per GST Certificate)
              </label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="e.g. VyaparFlow Enterprise India Pvt Ltd"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  GSTIN (15 Alphanumeric Characters)
                </label>
                {gstin && (
                  <span
                    className={`text-[10px] font-bold ${
                      isValidGstin(gstin) ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {isValidGstin(gstin) ? "✓ Valid GSTIN" : "⚠ 15 Digits Required"}
                  </span>
                )}
              </div>
              <input
                type="text"
                maxLength={15}
                value={gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                placeholder="e.g. 27AABCU9603R1ZM"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold tracking-wider uppercase focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Typing GSTIN automatically detects & locks the State Code.</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  State Code
                </label>
                <input
                  type="text"
                  readOnly
                  value={stateCode}
                  className="w-full p-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-indigo-600 text-center cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  State (Place of Origin) *
                </label>
                <select
                  value={stateCode}
                  onChange={(e) => handleStateSelectChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  {Object.entries(INDIAN_STATES).map(([code, sName]) => (
                    <option key={code} value={code}>
                      {code} - {sName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Invoice Number Prefix *
                </label>
                <span className="text-[10px] text-slate-400">
                  State Short: <span className="font-mono font-bold text-indigo-600">{STATE_SHORT_CODES[stateCode] || stateCode}</span>
                </span>
              </div>
              <input
                type="text"
                required
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                placeholder="e.g. HP-INV / ARM-HP / VF-MUM"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold uppercase focus:ring-1 focus:ring-indigo-500"
              />
              {/* Smart Suggestion Chips based on State & Name */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-bold">Suggestions:</span>
                {generateInvoicePrefixSuggestions(name, stateCode).slice(0, 5).map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setInvoicePrefix(sug)}
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg border transition ${
                      invoicePrefix === sug
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                    }`}
                  >
                    {sug}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 pt-0.5">
                Bills generated under this firm will be numbered e.g. <span className="font-mono font-bold text-indigo-600">{invoicePrefix}-2627-0001</span>
              </p>
            </div>
          </div>

          {/* SECTION 2: Contact, Address & Primary Toggle */}
          <div className="space-y-4">
            <div className="text-xs font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>2. Contact & Address Details</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Shop / Office Address *
              </label>
              <textarea
                rows={3}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop 104-106, Commercial Arcade, LBS Marg..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pincode</label>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="400086"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Business Phone *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98200 12345"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Billing Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="billing@vyaparflow.enterprise"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">
                    Set as Primary Default Firm
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Primary firm is selected automatically upon system login.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* SECTION 3: Banking, UPI & Branding Media */}
          <div className="space-y-4">
            <div className="text-xs font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5" />
              <span>3. Bank, UPI & Print Branding</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                UPI VPA ID (For Dynamic Invoice QR)
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="vyaparflow@icici"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-indigo-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="ICICI Bank Ltd"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">IFSC Code</label>
                <input
                  type="text"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  placeholder="ICIC0000011"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold uppercase"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Bank Account Number
              </label>
              <input
                type="text"
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                placeholder="001105023456"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
              />
            </div>

            {/* Logo & Signature Upload Fields */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Company Logo
                </label>
                <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center min-h-[90px] bg-slate-50/50 dark:bg-slate-800/40">
                  {logoUrl ? (
                    <div className="relative group">
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="h-12 max-w-full object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setLogoUrl(undefined)}
                        className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full text-[10px]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center space-y-1">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-[10px] font-bold text-indigo-600 hover:underline">
                        Upload Logo
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, setLogoUrl)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Auth Signature / Stamp
                </label>
                <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center min-h-[90px] bg-slate-50/50 dark:bg-slate-800/40">
                  {signatureUrl ? (
                    <div className="relative group">
                      <img
                        src={signatureUrl}
                        alt="Signature"
                        className="h-12 max-w-full object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setSignatureUrl(undefined)}
                        className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full text-[10px]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center space-y-1">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-[10px] font-bold text-indigo-600 hover:underline">
                        Upload Signature
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, setSignatureUrl)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Google Sheets Live Backup Section */}
      <div className="mt-8">
        <GoogleSheetSync />
      </div>

      {/* ADD NEW FIRM MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Add New Business Firm / Branch
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Create a secondary entity with distinct GSTIN, address & banking.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewFirm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Trade Name (Display on Bills) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newFirmName}
                    onChange={(e) => setNewFirmName(e.target.value)}
                    placeholder="e.g. VyaparFlow Karnataka Digital Hub"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Legal Entity Name
                  </label>
                  <input
                    type="text"
                    value={newFirmLegalName}
                    onChange={(e) => setNewFirmLegalName(e.target.value)}
                    placeholder="e.g. VyaparFlow South India LLP"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    GSTIN (15 Alphanumeric)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={newFirmGstin}
                    onChange={(e) => handleNewFirmGstinChange(e.target.value)}
                    placeholder="e.g. 29AAACV5432R1Z2"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-mono font-bold uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    State (Place of Origin) *
                  </label>
                  <select
                    value={newFirmStateCode}
                    onChange={(e) => handleNewFirmStateChange(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                  >
                    {Object.entries(INDIAN_STATES).map(([code, sName]) => (
                      <option key={code} value={code}>
                        {code} - {sName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Invoice Prefix *
                    </label>
                    <span className="text-[10px] text-slate-400">
                      State: <span className="font-mono font-bold text-indigo-600">{STATE_SHORT_CODES[newFirmStateCode] || newFirmStateCode}</span>
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={newFirmPrefix}
                    onChange={(e) => setNewFirmPrefix(e.target.value.toUpperCase())}
                    placeholder="e.g. VF-BLR / INV-KA"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-mono font-bold uppercase"
                  />
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    {generateInvoicePrefixSuggestions(newFirmName, newFirmStateCode).slice(0, 4).map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setNewFirmPrefix(sug)}
                        className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded border transition ${
                          newFirmPrefix === sug
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                        }`}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Address
                  </label>
                  <input
                    type="text"
                    value={newFirmAddress}
                    onChange={(e) => setNewFirmAddress(e.target.value)}
                    placeholder="Plot 42, Brigade Road, Ashok Nagar, Bengaluru"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone</label>
                  <input
                    type="text"
                    value={newFirmPhone}
                    onChange={(e) => setNewFirmPhone(e.target.value)}
                    placeholder="+91 80 4123 4567"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">UPI ID</label>
                  <input
                    type="text"
                    value={newFirmUpiId}
                    onChange={(e) => setNewFirmUpiId(e.target.value)}
                    placeholder="vyaparflow.blr@hdfcbank"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-mono font-bold text-indigo-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition"
                >
                  Save & Create Firm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE FIRM CONFIRMATION MODAL */}
      {firmToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Delete Business Firm?
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove <span className="font-bold text-slate-900 dark:text-white">"{firmToDelete.name}"</span> from your multi-firm registry?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFirmToDelete(null)}
                className="w-full py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="w-full py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md transition"
              >
                Delete Firm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </RbacGuard>
  );
}
