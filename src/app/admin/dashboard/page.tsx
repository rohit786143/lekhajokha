"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePosStore } from "@/lib/pos-store";
import { 
  getTenantsFromDb, 
  createTenantInDb, 
  updateTenantStatusInDb, 
  resetTenantOwnerPasswordInDb,
  deleteTenantInDb,
  updateTenantSubscriptionInDb
} from "@/lib/actions";
import { TenantRegistryItem, TenantPlan, SubscriptionStatus, OnboardTenantPayload } from "@/lib/types";
import { INDIAN_STATES, extractStateFromGstin, isValidGstin } from "@/lib/tax-engine";
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  KeyRound,
  RotateCcw,
  LogIn,
  Sliders,
  Sparkles,
  Users,
  Server,
  Zap,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Layers,
  ArrowLeft,
  ShieldCheck,
  Globe,
  Terminal,
  LogOut,
  RefreshCw,
  Eye,
  EyeOff,
  Briefcase,
  UserCheck,
  ShieldAlert,
  Trash2,
} from "lucide-react";

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const {
    firms,
    parties,
    products,
    staffUsers,
    currentUser,
    superAdminUser,
    masqueradeTenant,
    logoutUser,
    updateCurrentUserCredentials,
  } = usePosStore();

  const [tenants, setTenants] = useState<TenantRegistryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    async function loadTenants() {
      setIsLoading(true);
      const res = await getTenantsFromDb();
      if (res.success && res.tenants) {
        setTenants(res.tenants as any);
      }
      setIsLoading(false);
    }
    loadTenants();
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [resetModalTenant, setResetModalTenant] = useState<TenantRegistryItem | null>(null);
  const [changePlanTenant, setChangePlanTenant] = useState<TenantRegistryItem | null>(null);
  const [newPlan, setNewPlan] = useState<TenantPlan>("PRO");
  const [newStatus, setNewStatus] = useState<SubscriptionStatus>("ACTIVE");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Payment method for plan upgrade
  const [paymentMethod, setPaymentMethod] = useState("");
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [saEmail, setSaEmail] = useState("");
  const [saPassword, setSaPassword] = useState("");

  const handleExportBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      version: "vyaparflow-permanent-vault-v1",
      tenants,
      firms,
      parties,
      products,
      staffUsers,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vyaparflow-clients-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    showToast("✓ Backup exported! All clients, businesses, and ledgers saved to file.");
  };

  // Onboard Form State
  const [businessName, setBusinessName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [gstin, setGstin] = useState("");
  const [stateCode, setStateCode] = useState("27");
  const [stateName, setStateName] = useState("Maharashtra");
  const [plan, setPlan] = useState<TenantPlan>("PRO");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [tempPassword, setTempPassword] = useState("welcome123");

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setGstin(val);
    if (val.length >= 2) {
      const extracted = extractStateFromGstin(val);
      if (extracted) {
        setStateCode(extracted.stateCode);
        setStateName(extracted.stateName);
      }
    }
  };

  const handleStateChange = (code: string) => {
    setStateCode(code);
    setStateName(INDIAN_STATES[code] || "Maharashtra");
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !ownerName.trim() || !ownerEmail.trim()) {
      showToast("Please fill in Business Name, Owner Name, and Owner Email.", "error");
      return;
    }

    if (gstin && !isValidGstin(gstin)) {
      showToast("Invalid 15-digit GSTIN format.", "error");
      return;
    }

    const payload = {
      name: businessName.trim(),
      legalName: legalName.trim() || businessName.trim(),
      gstin: gstin.trim() || undefined,
      stateCode,
      stateName,
      plan,
      ownerName: ownerName.trim(),
      email: ownerEmail.trim().toLowerCase(),
      phone: ownerPhone.trim() || "",
      temporaryPassword: tempPassword.trim() || "welcome123",
    };

    const result = await createTenantInDb(payload);
    if (!result.success) {
      showToast(result.error || "Failed to create business", "error");
      return;
    }

    setIsOnboardModalOpen(false);
    showToast(`🏢 Business Owner "${payload.name}" (${payload.ownerName}) onboarded successfully!`);

    // Reload tenants
    const reloadRes = await getTenantsFromDb();
    if (reloadRes.success && reloadRes.tenants) {
      setTenants(reloadRes.tenants as any);
    }

    // Reset Form
    setBusinessName("");
    setLegalName("");
    setGstin("");
    setOwnerName("");
    setOwnerEmail("");
    setOwnerPhone("");
    setTempPassword("welcome123");
  };

  const handleToggleStatus = async (tenant: TenantRegistryItem) => {
    const res = await updateTenantStatusInDb(tenant.id, !tenant.isActive);
    if (res.success) {
      showToast(
        `Business "${tenant.name}" is now ${!tenant.isActive ? "ACTIVATED" : "SUSPENDED"}.`
      );
      setTenants(tenants.map(t => t.id === tenant.id ? { ...t, isActive: !t.isActive } : t));
    } else {
      showToast(res.error || "Failed to update status", "error");
    }
  };

  const handleDeleteBusiness = async (tenant: TenantRegistryItem) => {
    if (!window.confirm(`Are you sure you want to completely delete the business "${tenant.name}"? This action cannot be undone.`)) {
      return;
    }
    
    const res = await deleteTenantInDb(tenant.id);
    if (res.success) {
      showToast(`Business "${tenant.name}" has been permanently deleted.`);
      setTenants(tenants.filter(t => t.id !== tenant.id));
    } else {
      showToast(res.error || "Failed to delete business", "error");
    }
  };

  const handleMasquerade = (tenant: TenantRegistryItem) => {
    masqueradeTenant(tenant);
    showToast(`👑 Logged in as Owner: ${tenant.ownerName} (${tenant.name})`);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 300);
  };

  const handleSavePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalTenant || !newPasswordInput.trim()) return;

    const res = await resetTenantOwnerPasswordInDb(resetModalTenant.id, newPasswordInput.trim());
    if (res.success) {
      showToast(`🔑 Password updated for owner of "${resetModalTenant.name}"`);
      setResetModalTenant(null);
      setNewPasswordInput("");
    } else {
      showToast(res.error || "Failed to reset password", "error");
    }
  };

  const handleChangePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePlanTenant) return;

    // Passing paymentMethod as a detail to the backend (via updated args or just in audit log if implemented)
    // For now we rely on the existing backend method which might ignore it if not updated, but we capture it.
    const res = await updateTenantSubscriptionInDb(changePlanTenant.id, newPlan, newStatus);
    if (res.success) {
      showToast(`Subscription updated for "${changePlanTenant.name}"`);
      setTenants(tenants.map(t => t.id === changePlanTenant.id ? { ...t, plan: newPlan, subscriptionStatus: newStatus, isActive: newStatus === "ACTIVE" } : t));
      usePosStore.getState().updateTenantPlan(changePlanTenant.id, newPlan, newStatus);
      setChangePlanTenant(null);
      setPaymentMethod("");
    } else {
      showToast(res.error || "Failed to update subscription", "error");
    }
  };

  const handleAdminLogout = () => {
    logoutUser();
    router.push("/");
  };

  const handleAdminSettingsSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saEmail.trim()) return;
    updateCurrentUserCredentials(saEmail, saPassword || undefined);
    showToast("Super Admin credentials updated successfully!");
    setIsSettingsOpen(false);
    setSaPassword("");
  };

  // Filtered Businesses (Super Admin sees ONLY Business Owners & Businesses)
  const filteredTenants = tenants.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      t.name.toLowerCase().includes(q) ||
      (t.legalName && t.legalName.toLowerCase().includes(q)) ||
      (t.gstin && t.gstin.toLowerCase().includes(q)) ||
      t.ownerName.toLowerCase().includes(q) ||
      t.ownerEmail.toLowerCase().includes(q);

    const matchesPlan = planFilter === "ALL" || t.plan === planFilter;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && t.isActive) ||
      (statusFilter === "SUSPENDED" && !t.isActive);

    return matchesQuery && matchesPlan && matchesStatus;
  });

  // Platform Metrics
  const totalTenantsCount = tenants.length;
  const activeTenantsCount = tenants.filter((t) => t.isActive).length;
  const proCount = tenants.filter((t) => t.plan === "PRO").length;
  const basicCount = tenants.filter((t) => t.plan === "BASIC").length;
  const estimatedArr = tenants.reduce((acc, t) => {
    if (!t.isActive) return acc;
    if (t.plan === "PRO") return acc + 1843;
    if (t.plan === "BASIC") return acc + 1143;
    return acc;
  }, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* Super Admin Developer Bright White Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-6 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-md">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-slate-900 tracking-tight">
                  लेखा जोखा SaaS Cloud
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                  DEVELOPER CONSOLE
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Tier 1 Super Admin • Business Owners Directory & Multi-Tenant Control Plane
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Update Credentials Button */}
            <button
              type="button"
              onClick={() => {
                setSaEmail(currentUser?.email || "superadmin@vyaparflow.enterprise");
                setIsSettingsOpen(true);
              }}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Sliders className="w-4 h-4" />
              <span>Update Credentials</span>
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleAdminLogout}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Console Workspace */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 border animate-fade-in ${
              toastMessage.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm"
                : "bg-rose-50 border-rose-300 text-rose-900 shadow-sm"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Hero Banner in Bright White */}
        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-mono font-bold uppercase tracking-wider">
              <Briefcase className="w-3.5 h-3.5 text-slate-700" />
              <span>Multi-Tenant Business Owner Registry</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Business Directory & SaaS Lifecycle Hub
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Platform Developer Portal: Manage registered Business Owners across India, onboard new businesses, configure subscription plans, and manage tenant credentials.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportBackup}
              title="Download full JSON backup of all registered businesses & clients"
              className="px-4 py-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Save & Download Backup JSON</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOnboardModalOpen(true)}
              className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>+ Onboard New Business Owner</span>
            </button>
          </div>
        </div>

        {/* Platform KPI Metrics in Bright White Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-[10px] text-slate-500">Total Businesses</span>
              <Building2 className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {totalTenantsCount}
            </div>
            <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
              <span>● {activeTenantsCount} Active Businesses</span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-[10px] text-slate-500">Basic Plans</span>
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {basicCount}
            </div>
            <p className="text-[11px] text-slate-500">Single User & Basic Billing</p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-[10px] text-slate-500">Pro Business Tier</span>
              <Zap className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {proCount}
            </div>
            <p className="text-[11px] text-slate-500">POS, Batches & Daybook</p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-[10px] text-slate-500">Estimated Platform ARR</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              ₹{(estimatedArr / 1000).toFixed(1)}k
            </div>
            <p className="text-[11px] text-slate-500">Active Tenant Subscriptions</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search business name, GSTIN, owner..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Plan Filter */}
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer"
            >
              <option value="ALL">All Plans</option>
              <option value="BASIC">Basic</option>
              <option value="PRO">PRO - Multi-branch, POS, Advanced</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="SUSPENDED">Suspended Only</option>
            </select>
          </div>
        </div>

        {/* Business Owners Directory Table in Bright White */}
        <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-700" />
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Registered Business Owners & Enterprises</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono font-medium">
              Showing {filteredTenants.length} of {tenants.length} Businesses
            </span>
          </div>

          {filteredTenants.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">No Businesses Found</h3>
              <p className="text-xs text-slate-500">No registered business matched your search or filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Business & GSTIN</th>
                    <th className="p-4">State & Region</th>
                    <th className="p-4">Subscription Plan</th>
                    <th className="p-4">Primary Business Owner</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Super Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTenants.map((t) => {
                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black shrink-0 text-sm font-mono shadow-xs">
                              {t.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2 font-mono">
                                <span>GSTIN: {t.gstin || "UNREGISTERED"}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-slate-900">
                            {t.stateName || "Maharashtra"}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            State Code: {t.stateCode || "27"}
                          </div>
                        </td>

                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                              t.plan === "PRO"
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-emerald-100 text-emerald-800 border-emerald-300"
                            }`}
                          >
                            {t.plan}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs shrink-0">
                              👑
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{t.ownerName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{t.ownerEmail}</div>
                              {t.ownerPhone && (
                                <div className="text-[10px] text-slate-400 font-mono">{t.ownerPhone}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                              t.isActive
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : "bg-rose-50 text-rose-800 border-rose-300"
                            }`}
                          >
                            {t.isActive ? "● ACTIVE" : "SUSPENDED"}
                          </span>
                        </td>

                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Support Masquerade Button */}
                            <button
                              type="button"
                              onClick={() => handleMasquerade(t)}
                              title="Masquerade / Switch into Business Owner session to assist customer"
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-[11px] transition flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <LogIn className="w-3 h-3" />
                              <span>Support Login</span>
                            </button>

                            {/* Change Plan */}
                            <button
                              type="button"
                              onClick={() => {
                                setChangePlanTenant(t);
                                setNewPlan(t.plan);
                                setNewStatus(t.subscriptionStatus || "ACTIVE");
                              }}
                              title="Change Plan & Status"
                              className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 border border-indigo-200 rounded-xl transition cursor-pointer"
                            >
                              <Layers className="w-4 h-4" />
                            </button>

                            {/* Reset Password */}
                            <button
                              type="button"
                              onClick={() => {
                                setResetModalTenant(t);
                                setNewPasswordInput("welcome" + Math.floor(100 + Math.random() * 900));
                              }}
                              title="Reset Owner Credentials"
                              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>

                            {/* Toggle Suspend / Activate */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(t)}
                              title={t.isActive ? "Suspend Business" : "Activate Business"}
                              className={`p-2 rounded-xl border transition cursor-pointer ${
                                t.isActive
                                  ? "text-amber-600 hover:bg-amber-50 border-amber-200"
                                  : "text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                              }`}
                            >
                              <Sliders className="w-4 h-4" />
                            </button>

                            {/* Delete Business */}
                            <button
                              type="button"
                              onClick={() => handleDeleteBusiness(t)}
                              title="Permanently Delete Business"
                              className="p-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Onboard New Business Modal in Bright White */}
      {isOnboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-900 text-white">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Onboard New Business & Primary Owner
                  </h3>
                  <p className="text-xs text-slate-500">
                    Creates business tenant and initial owner credentials
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOnboardModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="font-bold text-slate-700">Business Trade Name *</label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Mahavir Supermarket"
                    className="w-full mt-1.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="font-bold text-slate-700">Legal Registered Name</label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="e.g. Mahavir Retailers Pvt Ltd"
                    className="w-full mt-1.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">GSTIN (15 Digits)</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={gstin}
                    onChange={handleGstinChange}
                    placeholder="27AABCU9603R1ZM"
                    className="w-full mt-1.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">State / Region *</label>
                  <select
                    value={stateCode}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="w-full mt-1.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer"
                  >
                    {Object.entries(INDIAN_STATES).map(([code, name]) => (
                      <option key={code} value={code}>
                        {code} - {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="font-bold text-slate-700">Subscription Plan Tier *</label>
                  <div className="grid grid-cols-2 gap-3 mt-1.5">
                    {(["BASIC", "PRO"] as TenantPlan[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPlan(p)}
                        className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                          plan === p
                            ? "bg-slate-900 border-slate-900 text-white font-black shadow-sm"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <div className="text-xs font-bold">{p}</div>
                        <div className="text-[10px] opacity-75 mt-0.5">
                          {p === "PRO" ? "Pro ERP" : "Basic"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Primary Owner Initial Account */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">👑</span>
                  <h4 className="font-bold text-slate-900 text-xs">Primary Business Owner Account</h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700">Owner Full Name *</label>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Anand Mahindra"
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">Owner Login Email (Username) *</label>
                    <input
                      type="email"
                      required
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="anand@mahindra.com"
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">Owner Phone</label>
                    <input
                      type="text"
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="+91 98200 12345"
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">Temporary Password *</label>
                    <input
                      type="text"
                      required
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      placeholder="welcome123"
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="px-4 py-2.5 text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-sm transition cursor-pointer"
                >
                  Onboard Business Owner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal in Bright White */}
      {resetModalTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-slate-900" />
                <h3 className="text-base font-black text-slate-900">Reset Owner Password</h3>
              </div>
              <button
                onClick={() => setResetModalTenant(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Set a new login password for business owner{" "}
              <strong className="text-slate-900">{resetModalTenant.ownerName}</strong> (
              <span className="font-mono text-slate-700">{resetModalTenant.ownerEmail}</span>) of{" "}
              <strong className="text-slate-900">{resetModalTenant.name}</strong>.
            </p>

            <form onSubmit={handleSavePasswordReset} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">New Temporary Password</label>
                <input
                  type="text"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="welcome123"
                  className="w-full mt-1.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalTenant(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-sm transition cursor-pointer"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Plan Modal in Bright White */}
      {changePlanTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-slate-900" />
                <h3 className="text-base font-black text-slate-900">Change Subscription Plan</h3>
              </div>
              <button
                onClick={() => setChangePlanTenant(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Update the subscription plan and status for{" "}
              <strong className="text-slate-900">{changePlanTenant.name}</strong>.
            </p>

            <form onSubmit={handleChangePlanSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Subscription Plan</label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value as any)}
                  className="w-full mt-1.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                >
                  <option value="BASIC">BASIC - Single User, Basic Billing</option>
                  <option value="PRO">PRO - Multi-branch, POS, Advanced</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Subscription Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full mt-1.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="EXPIRED">EXPIRED (Read-only)</option>
                  <option value="SUSPENDED">SUSPENDED (Locked)</option>
                  <option value="CANCELLED">CANCELLED (Locked)</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-700">Payment Method / Reference (Optional)</label>
                <input
                  type="text"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="e.g. UPI/Card/Bank Transfer Reference"
                  className="w-full mt-1.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChangePlanTenant(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-sm transition cursor-pointer"
                >
                  Save Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-slate-900" />
                <h3 className="text-base font-black text-slate-900">Super Admin Settings</h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Update your Platform Developer email and password here.
            </p>

            <form onSubmit={handleAdminSettingsSave} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Email Address (Username)</label>
                <input
                  type="email"
                  required
                  value={saEmail}
                  onChange={(e) => setSaEmail(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-700">New Password (Leave blank to keep current)</label>
                <input
                  type="password"
                  value={saPassword}
                  onChange={(e) => setSaPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full mt-1.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-sm transition cursor-pointer"
                >
                  Update Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
