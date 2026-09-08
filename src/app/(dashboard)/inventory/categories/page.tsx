"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePosStore } from "@/lib/pos-store";
import { useTenantData } from "@/lib/use-tenant-data";
import { Category } from "@/lib/types";
import { INDUSTRY_TEMPLATES, IndustryTemplate } from "@/lib/industry-templates";
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  X,
  Tag,
  Package,
  Check,
  Building2,
  FolderPlus,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Stethoscope,
  Smartphone,
  Shirt,
  Hammer,
  Car,
  Gem,
  UtensilsCrossed,
  BookOpen,
  Wheat,
  Armchair,
  Footprints,
  Glasses,
  Filter,
} from "lucide-react";

export default function CategorySettingsPage() {
  const { addCategory, updateCategory, deleteCategory, seedIndustryCategories, tenant } = usePosStore();
  const { categories, products } = useTenantData();

  const [searchQuery, setSearchQuery] = useState("");
  const [industrySearch, setIndustrySearch] = useState("");
  const [selectedIndustryModal, setSelectedIndustryModal] = useState<IndustryTemplate | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formPrefix, setFormPrefix] = useState("");
  const [formGstRate, setFormGstRate] = useState<number>(18);
  const [formHsn, setFormHsn] = useState("9999");
  const [formDesc, setFormDesc] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filter categories by search
  const filteredCategories = categories.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.codePrefix && c.codePrefix.toLowerCase().includes(q)) ||
      (c.hsnCode && c.hsnCode.includes(q))
    );
  });

  // Filter industry templates
  const filteredTemplates = INDUSTRY_TEMPLATES.filter((tpl) => {
    const q = industrySearch.toLowerCase();
    return (
      !q ||
      tpl.name.toLowerCase().includes(q) ||
      tpl.description.toLowerCase().includes(q) ||
      tpl.categories.some((c) => c.name.toLowerCase().includes(q) || c.hsnCode.includes(q))
    );
  });

  // Calculate live product count for each category
  const getProductCountForCategory = (catId: string) => {
    return products.filter((p) => p.categoryId === catId).length;
  };

  const handleOpenAddModal = () => {
    setCategoryToEdit(null);
    setFormName("");
    setFormPrefix("");
    setFormGstRate(18);
    setFormHsn("9999");
    setFormDesc("");
    setFormIsActive(true);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (cat: Category) => {
    setCategoryToEdit(cat);
    setFormName(cat.name);
    setFormPrefix(cat.codePrefix || "");
    setFormGstRate(cat.defaultGstRate);
    setFormHsn(cat.hsnCode || "9999");
    setFormDesc(cat.description || "");
    setFormIsActive(cat.isActive ?? true);
    setIsAddModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (categoryToEdit) {
      updateCategory({
        id: categoryToEdit.id,
        name: formName.trim(),
        codePrefix: formPrefix.trim().toUpperCase() || formName.trim().slice(0, 4).toUpperCase(),
        defaultGstRate: Number(formGstRate) || 18,
        hsnCode: formHsn.trim() || "9999",
        description: formDesc.trim(),
        isActive: formIsActive,
      });
      showToast(`Category "${formName}" updated successfully.`);
    } else {
      addCategory({
        tenantId: tenant.id,
        name: formName.trim(),
        codePrefix: formPrefix.trim().toUpperCase() || formName.trim().slice(0, 4).toUpperCase(),
        defaultGstRate: Number(formGstRate) || 18,
        hsnCode: formHsn.trim() || "9999",
        description: formDesc.trim(),
        isActive: formIsActive,
      });
      showToast(`New category "${formName}" added.`);
    }

    setIsAddModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (categoryToDelete) {
      deleteCategory(categoryToDelete.id);
      showToast(`Category "${categoryToDelete.name}" deleted.`);
      setCategoryToDelete(null);
    }
  };

  const handleApplyIndustryTemplate = (templateId: string, overwrite = false) => {
    const tpl = INDUSTRY_TEMPLATES.find((t) => t.id === templateId);
    seedIndustryCategories(templateId, overwrite);
    setSelectedIndustryModal(null);
    showToast(
      overwrite
        ? `Replaced categories with ${tpl?.name} (${tpl?.categories.length} categories).`
        : `Added ${tpl?.categories.length} categories from ${tpl?.name}.`
    );
  };

  const getIndustryIcon = (iconName: string) => {
    switch (iconName) {
      case "ShoppingCart":
        return <ShoppingCart className="w-5 h-5 text-emerald-400" />;
      case "Stethoscope":
        return <Stethoscope className="w-5 h-5 text-rose-400" />;
      case "Smartphone":
        return <Smartphone className="w-5 h-5 text-blue-400" />;
      case "Shirt":
        return <Shirt className="w-5 h-5 text-purple-400" />;
      case "Hammer":
        return <Hammer className="w-5 h-5 text-amber-400" />;
      case "Car":
        return <Car className="w-5 h-5 text-sky-400" />;
      case "Gem":
        return <Gem className="w-5 h-5 text-yellow-300" />;
      case "UtensilsCrossed":
        return <UtensilsCrossed className="w-5 h-5 text-orange-400" />;
      case "Building":
        return <Building2 className="w-5 h-5 text-stone-300" />;
      case "BookOpen":
        return <BookOpen className="w-5 h-5 text-cyan-400" />;
      case "Sparkles":
        return <Sparkles className="w-5 h-5 text-pink-400" />;
      case "Wheat":
        return <Wheat className="w-5 h-5 text-lime-400" />;
      case "Armchair":
        return <Armchair className="w-5 h-5 text-amber-300" />;
      case "Footprints":
        return <Footprints className="w-5 h-5 text-teal-400" />;
      case "Glasses":
        return <Glasses className="w-5 h-5 text-indigo-300" />;
      default:
        return <Layers className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-4">
          <Link
            href="/inventory"
            className="p-2.5 text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <span>Dynamic Category & Industry Master Hub</span>
              <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                15 Industry Verticals
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Tenant-isolated business categories with standard GST rates, authentic HSN codes, and 1-click industry seeders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Category</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Industry Templates Seeder Section */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-6 rounded-3xl border border-indigo-800/40 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h2 className="text-sm font-black text-white">
                1-Click All Industry Category Seeders
              </h2>
              <p className="text-[11px] text-indigo-300">
                Instantly populate pre-configured categories with standard GST slabs and HSN codes for 15+ Indian business sectors.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-300" />
              <input
                type="text"
                value={industrySearch}
                onChange={(e) => setIndustrySearch(e.target.value)}
                placeholder="Search industries (e.g. Pharma, Gold)..."
                className="w-full pl-8 pr-3 py-1.5 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-indigo-300/60 focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
              />
            </div>
            <span className="text-[10px] font-mono text-indigo-300 bg-white/10 px-3 py-1.5 rounded-xl whitespace-nowrap">
              {filteredTemplates.length} / {INDUSTRY_TEMPLATES.length} Verticals
            </span>
          </div>
        </div>

        {/* 15 Industry Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
          {filteredTemplates.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => setSelectedIndustryModal(tpl)}
              className="p-4 bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl border border-white/10 hover:border-indigo-400/50 cursor-pointer transition flex flex-col justify-between space-y-3 group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition">
                  {getIndustryIcon(tpl.iconName)}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-black text-white truncate group-hover:text-indigo-300 transition">
                    {tpl.name}
                  </div>
                  <p className="text-[10px] text-indigo-200/80 line-clamp-2 leading-relaxed">
                    {tpl.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] text-indigo-300">
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-indigo-200">
                  {tpl.categories.length} Categories Ready
                </span>
                <span className="font-bold text-amber-300 group-hover:underline flex items-center gap-1">
                  <span>Load Preset</span>
                  <span>→</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Live Categories Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search active category name, prefix, or HSN..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
          />
        </div>

        <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
          <span>Active Categories: <strong className="text-slate-900 dark:text-white font-mono">{categories.length}</strong></span>
          <span>•</span>
          <span>In-Use Slabs: <strong className="text-indigo-600 font-mono">{Array.from(new Set(categories.map(c => c.defaultGstRate))).length} GST Slabs</strong></span>
        </div>
      </div>

      {/* Active Categories Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredCategories.length === 0 ? (
          <div className="py-20 px-6 text-center space-y-4">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Layers className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                No Categories Found
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Click one of the 15 industry presets above to quickly load standard categories, or create a custom category below.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-md transition"
            >
              + Add First Category
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Category Name & Details</th>
                  <th className="p-3.5">SKU Code Prefix</th>
                  <th className="p-3.5">Default GST Slab</th>
                  <th className="p-3.5">Default HSN / SAC</th>
                  <th className="p-3.5 text-center">Linked Catalog Items</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredCategories.map((cat) => {
                  const pCount = getProductCountForCategory(cat.id);
                  const isActive = cat.isActive !== false;

                  return (
                    <tr
                      key={cat.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {cat.name}
                        </div>
                        {cat.description && (
                          <div className="text-[10px] text-slate-400 line-clamp-1">{cat.description}</div>
                        )}
                      </td>
                      <td className="p-3.5 font-mono">
                        <span className="px-2 py-0.5 rounded font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800">
                          {cat.codePrefix || "-"}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            cat.defaultGstRate === 0
                              ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              : cat.defaultGstRate <= 5
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : cat.defaultGstRate <= 12
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : cat.defaultGstRate <= 18
                              ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                          }`}
                        >
                          {cat.defaultGstRate}% GST
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {cat.hsnCode || "-"}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {pCount} products
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => updateCategory({ id: cat.id, isActive: !isActive })}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black transition ${
                            isActive
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                          <span>{isActive ? "ACTIVE" : "INACTIVE"}</span>
                        </button>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(cat)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                            title="Edit Category"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCategoryToDelete(cat)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="Delete Category"
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

      {/* Add / Edit Category Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {categoryToEdit ? "Edit Category" : "Add New Category"}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Pharma, Gold Ornaments, Rice & Pulses"
                  className="w-full mt-1 px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    SKU Code Prefix
                  </label>
                  <input
                    type="text"
                    value={formPrefix}
                    onChange={(e) => setFormPrefix(e.target.value.toUpperCase())}
                    placeholder="e.g. PHARM, GOLD"
                    className="w-full mt-1 px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Default HSN Code
                  </label>
                  <input
                    type="text"
                    value={formHsn}
                    onChange={(e) => setFormHsn(e.target.value)}
                    placeholder="e.g. 3004, 7113"
                    className="w-full mt-1 px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Default GST Tax Slab (%)
                  </label>
                  <select
                    value={formGstRate}
                    onChange={(e) => setFormGstRate(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  >
                    <option value={0}>0% GST (Exempt Goods / Fresh Produce)</option>
                    <option value={3}>3% GST (Gold, Silver, Jewellery)</option>
                    <option value={5}>5% GST (Essentials / Sugar / Tea / Spices)</option>
                    <option value={12}>12% GST (Medicines / Garments / Stationery)</option>
                    <option value={18}>18% GST (Standard Rate / Electronics / IT / Salon)</option>
                    <option value={28}>28% GST (Luxury / Hardware / Automobile / ACs)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Description / Notes
                  </label>
                  <textarea
                    rows={2}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Optional details or items covered under this category..."
                    className="w-full mt-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow transition"
                >
                  {categoryToEdit ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Delete Category?
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">"{categoryToDelete.name}"</span>? Existing products in this category will remain in inventory.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="w-full py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="w-full py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md transition"
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Industry Template Preview & Seed Confirmation Modal */}
      {selectedIndustryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-700 text-white flex items-center justify-center font-black shadow-md">
                  {getIndustryIcon(selectedIndustryModal.iconName)}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {selectedIndustryModal.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Preview of {selectedIndustryModal.categories.length} pre-configured business categories
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedIndustryModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="space-y-2">
                {selectedIndustryModal.categories.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{c.name}</span>
                        <span className="font-mono text-[9px] px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-bold">
                          {c.codePrefix}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {c.description}
                      </div>
                    </div>
                    <div className="text-right font-mono text-[11px] space-y-0.5">
                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold rounded border border-indigo-200 dark:border-indigo-800">
                        {c.defaultGstRate}% GST
                      </span>
                      <div className="text-[10px] text-slate-400">HSN: {c.hsnCode}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleApplyIndustryTemplate(selectedIndustryModal.id, true)}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl transition"
                >
                  Replace All Categories
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyIndustryTemplate(selectedIndustryModal.id, false)}
                  className="w-full sm:w-auto px-6 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition"
                >
                  Append {selectedIndustryModal.categories.length} Categories
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
