"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePosStore } from "@/lib/pos-store";
import { StaffUser, UserRole } from "@/lib/types";
import {
  Users,
  UserPlus,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Lock,
  Mail,
  Phone,
  ArrowLeft,
  Crown,
  Calculator,
  Zap,
  Package,
  Building2,
  Edit2,
  Trash2,
  RotateCcw,
  LogIn,
  Eye,
  EyeOff,
  Sliders,
} from "lucide-react";
import { useTenantData } from "@/lib/use-tenant-data";

export default function StaffManagementPage() {
  const router = useRouter();
  const { firms } = useTenantData();
  const {
    tenant,
    staffUsers,
    currentUser,
    addStaffUser,
    updateStaffUser,
    deleteStaffUser,
    setCurrentUser,
    logoutUser,
  } = usePosStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<StaffUser | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("CASHIER");
  const [assignedFirmId, setAssignedFirmId] = useState<string>("");
  const [canEditBackdated, setCanEditBackdated] = useState(false);
  const [canViewPurchaseRates, setCanViewPurchaseRates] = useState(false);
  const [canViewProfitMargins, setCanViewProfitMargins] = useState(false);
  const [canGiveBillDiscounts, setCanGiveBillDiscounts] = useState(true);
  const [canDeleteInvoices, setCanDeleteInvoices] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const activeUser = currentUser || staffUsers[0];

  // Filter staff scoped to active tenant
  const tenantStaff = staffUsers.filter(
    (u) => !u.tenantId || u.tenantId === tenant.id
  );

  const filteredUsers = tenantStaff.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q));

    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesQuery && matchesRole;
  });

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRole("CASHIER");
    setAssignedFirmId(firms[0]?.id || "");
    setCanEditBackdated(false);
    setCanViewPurchaseRates(false);
    setCanViewProfitMargins(false);
    setCanGiveBillDiscounts(true);
    setCanDeleteInvoices(false);
    setIsAddUserModalOpen(true);
  };

  const handleOpenEditModal = (u: StaffUser) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPhone(u.phone || "");
    setPassword(u.password || "");
    setRole(u.role);
    setAssignedFirmId(u.firmId || "");
    setCanEditBackdated(u.permissions.canEditBackdatedInvoices);
    setCanViewPurchaseRates(u.permissions.canViewPurchaseRates);
    setCanViewProfitMargins(u.permissions.canViewProfitMargins);
    setCanGiveBillDiscounts(u.permissions.canGiveBillDiscounts);
    setCanDeleteInvoices(u.permissions.canDeleteInvoices);
    setIsAddUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast("Please provide both name and email.", "error");
      return;
    }

    if (editingUser) {
      updateStaffUser({
        id: editingUser.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: password.trim() || editingUser.password,
        role,
        firmId: assignedFirmId || undefined,
        permissions: {
          canEditBackdatedInvoices: canEditBackdated,
          canViewPurchaseRates: canViewPurchaseRates,
          canViewProfitMargins: canViewProfitMargins,
          canGiveBillDiscounts: canGiveBillDiscounts,
          canDeleteInvoices: canDeleteInvoices,
          canManageUsers: role === "OWNER" || role === "TENANT_OWNER" || role === "SUPER_ADMIN",
          canAccessSettings: role === "OWNER" || role === "TENANT_OWNER" || role === "SUPER_ADMIN",
        },
      });
      showToast(`Team member "${name}" updated successfully!`);
    } else {
      if (staffUsers.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
        showToast("A user with this email already exists!", "error");
        return;
      }

      addStaffUser({
        id: `usr-${Date.now()}`,
        tenantId: tenant.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: password.trim() || "123456",
        role,
        firmId: assignedFirmId || undefined,
        isActive: true,
        permissions: {
          canEditBackdatedInvoices: canEditBackdated,
          canViewPurchaseRates: canViewPurchaseRates,
          canViewProfitMargins: canViewProfitMargins,
          canGiveBillDiscounts: canGiveBillDiscounts,
          canDeleteInvoices: canDeleteInvoices,
          canManageUsers: role === "OWNER" || role === "TENANT_OWNER" || role === "SUPER_ADMIN",
          canAccessSettings: role === "OWNER" || role === "TENANT_OWNER" || role === "SUPER_ADMIN",
        },
        createdAt: new Date().toISOString(),
      });
      showToast(`New team member "${name}" created!`);
    }

    setIsAddUserModalOpen(false);
  };

  const handleSwitchUser = (user: StaffUser) => {
    setCurrentUser(user);
    showToast(`Switched active session to: ${user.name} (${user.role})`);
  };

  const handleToggleStatus = (user: StaffUser) => {
    updateStaffUser({ id: user.id, isActive: !user.isActive });
    showToast(
      `User "${user.name}" is now ${!user.isActive ? "ACTIVE" : "SUSPENDED"}.`
    );
  };

  const handleConfirmDelete = () => {
    if (!userToDelete) return;
    if (activeUser && activeUser.id === userToDelete.id) {
      showToast("You cannot delete the currently active logged-in user!", "error");
      setUserToDelete(null);
      return;
    }
    deleteStaffUser(userToDelete.id);
    showToast(`Staff member "${userToDelete.name}" was removed.`);
    setUserToDelete(null);
  };

  const handleLogout = () => {
    logoutUser();
    router.push("/login");
  };

  const getRoleIcon = (r: UserRole) => {
    switch (r) {
      case "OWNER":
      case "TENANT_OWNER":
        return <Crown className="w-4 h-4 text-amber-500" />;
      case "ACCOUNTANT":
        return <Calculator className="w-4 h-4 text-indigo-500" />;
      case "CASHIER":
        return <Zap className="w-4 h-4 text-emerald-500" />;
      case "STOREKEEPER":
        return <Package className="w-4 h-4 text-blue-500" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-purple-500" />;
    }
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case "OWNER":
      case "TENANT_OWNER":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "ACCOUNTANT":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
      case "CASHIER":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "STOREKEEPER":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      default:
        return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800";
    }
  };

  // Stats
  const countOwners = tenantStaff.filter((u) => u.role === "TENANT_OWNER" || u.role === "OWNER").length;
  const countAccountants = tenantStaff.filter((u) => u.role === "ACCOUNTANT").length;
  const countCashiers = tenantStaff.filter((u) => u.role === "CASHIER").length;
  const countStorekeepers = tenantStaff.filter((u) => u.role === "STOREKEEPER").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider border border-indigo-200 dark:border-indigo-800">
                  Tier 2 • Business Admin
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Tenant: {tenant.name}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Team & Staff Roles Console</span>
                <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {tenantStaff.length} Members
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Business Owner Console: Invite Cashiers, Accountants, Storekeepers, and configure granular permissions.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons & Current Active Session Badge */}
        <div className="flex flex-wrap items-center gap-3">
          {activeUser && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                {activeUser.name ? activeUser.name[0].toUpperCase() : "U"}
              </div>
              <div className="text-left text-xs leading-tight">
                <div className="font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
                  {activeUser.name}
                </div>
                <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {activeUser.role}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Log Out User"
                className="ml-1 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <Link
            href="/login"
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl transition"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login Portal</span>
          </Link>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl shadow-md transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite New Staff</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 border animate-fade-in ${
            toastMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
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

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold">Business Owners</span>
            <Crown className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {countOwners}
          </div>
          <p className="text-[10px] text-slate-500">Full ownership & admin controls</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold">Accountants</span>
            <Calculator className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {countAccountants}
          </div>
          <p className="text-[10px] text-slate-500">Ledgers, GST, Daybook & P&L</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold">POS Cashiers</span>
            <Zap className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {countCashiers}
          </div>
          <p className="text-[10px] text-slate-500">Fast barcode checkout & receipts</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold">Storekeepers</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {countStorekeepers}
          </div>
          <p className="text-[10px] text-slate-500">Stock inward, batches & barcodes</p>
        </div>
      </div>

      {/* Filter and Role Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team member name, email, phone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
          />
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {["ALL", "OWNER", "ACCOUNTANT", "CASHIER", "STOREKEEPER"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider transition cursor-pointer ${
                roleFilter === r
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {r === "ALL" ? "All Roles" : r.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              No Team Members Found
            </h3>
            <p className="text-xs text-slate-500">
              No user matched your search or role filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Staff User & Email</th>
                  <th className="p-3.5">Assigned Role</th>
                  <th className="p-3.5">Assigned Branch / Firm</th>
                  <th className="p-3.5">Granular Permissions</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredUsers.map((user) => {
                  const isCurrent = activeUser?.id === user.id;
                  const assignedFirm = firms.find((f) => f.id === user.firmId);

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                        isCurrent ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                      }`}
                    >
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            {getRoleIcon(user.role)}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[9px] font-black">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {user.email} {user.phone && `• ${user.phone}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getRoleBadge(
                            user.role
                          )}`}
                        >
                          {user.role.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]">
                            {assignedFirm ? assignedFirm.name : "All Branches (Global)"}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1 text-[9px] max-w-xs">
                          {user.permissions.canEditBackdatedInvoices && (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-semibold">
                              ✓ Backdates
                            </span>
                          )}
                          {user.permissions.canViewPurchaseRates && (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-semibold">
                              ✓ Purchase Rates
                            </span>
                          )}
                          {user.permissions.canViewProfitMargins && (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-semibold">
                              ✓ Profit Margins
                            </span>
                          )}
                          {user.permissions.canGiveBillDiscounts && (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-semibold">
                              ✓ Discounts
                            </span>
                          )}
                          {user.permissions.canDeleteInvoices && (
                            <span className="bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded font-semibold">
                              ✓ Delete Invoices
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            user.isActive
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {user.isActive ? "ACTIVE" : "SUSPENDED"}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Quick Switch Persona Button */}
                          <button
                            type="button"
                            onClick={() => handleSwitchUser(user)}
                            title="Switch active session to this user"
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black transition flex items-center gap-1 cursor-pointer"
                          >
                            <LogIn className="w-3 h-3" />
                            <span>Switch</span>
                          </button>

                          {/* Toggle Active/Suspend */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            title={user.isActive ? "Suspend Account" : "Activate Account"}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit User */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                            title="Edit User & Permissions"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          <button
                            type="button"
                            onClick={() => setUserToDelete(user)}
                            title="Delete User"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Staff Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {editingUser ? "Edit Staff User" : "Invite New Staff Member"}
                </h3>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Verma"
                    className="w-full mt-1 px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Email Address (Login ID) *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ramesh@vyaparflow.enterprise"
                    className="w-full mt-1 px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9820012345"
                    className="w-full mt-1 px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {editingUser ? "New Password / PIN (Leave blank to keep)" : "Login Password / PIN *"}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <div className="relative mt-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      required={!editingUser}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="e.g. cashier123"
                      className="w-full pl-3 pr-10 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Employee will use this password & username to log in.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Assigned Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full mt-1 px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  >
                    <option value="CASHIER">⚡ Billing Cashier (POS Terminal)</option>
                    <option value="ACCOUNTANT">📊 Senior Accountant / CA</option>
                    <option value="STOREKEEPER">📦 Storekeeper / Inventory</option>
                    <option value="OWNER">👑 Business Owner (Admin)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Assigned Business Branch / Firm
                  </label>
                  <select
                    value={assignedFirmId}
                    onChange={(e) => setAssignedFirmId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  >
                    <option value="">All Branches / Global Access</option>
                    {firms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.stateName || f.stateCode} - {f.gstin})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Granular Permissions */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Granular Permission Overrides:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canEditBackdated}
                      onChange={(e) => setCanEditBackdated(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <div>
                      <span className="font-bold">Edit Backdated Invoices</span>
                      <p className="text-[10px] text-slate-400">Modify past sales dates</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canViewPurchaseRates}
                      onChange={(e) => setCanViewPurchaseRates(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <div>
                      <span className="font-bold">View Purchase Rates</span>
                      <p className="text-[10px] text-slate-400">See vendor buy pricing</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canViewProfitMargins}
                      onChange={(e) => setCanViewProfitMargins(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <div>
                      <span className="font-bold">View Profit Margins</span>
                      <p className="text-[10px] text-slate-400">Access gross profit %</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canGiveBillDiscounts}
                      onChange={(e) => setCanGiveBillDiscounts(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <div>
                      <span className="font-bold">Apply Bill Discounts</span>
                      <p className="text-[10px] text-slate-400">Give custom % discount</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer col-span-1 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={canDeleteInvoices}
                      onChange={(e) => setCanDeleteInvoices(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600"
                    />
                    <div>
                      <span className="font-bold text-rose-600">Delete / Cancel Invoices</span>
                      <p className="text-[10px] text-slate-400">Permanent invoice voiding authority</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow transition cursor-pointer"
                >
                  {editingUser ? "Save Changes" : "Create Staff User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Delete Staff User?
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove <span className="font-bold text-slate-900 dark:text-white">"{userToDelete.name}"</span> ({userToDelete.email})? This action cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="w-full py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="w-full py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md transition cursor-pointer"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
