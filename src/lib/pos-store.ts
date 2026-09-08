// Zustand State Management Store for VyaparFlow Enterprise POS & ERP
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CartItem,
  Invoice,
  InvoiceCalculations,
  InvoiceType,
  Party,
  PaymentMode,
  PaymentSplit,
  Product,
  ProductBatch,
  TenantInfo,
  Godown,
  Category,
  ExpenseItem,
  PurchaseInvoice,
  Quotation,
  CreditNote,
  DebitNote,
  TenantBackupSnapshot,
  Firm,
  QuickInwardPayload,
  StaffUser,
  UserRole,
  TenantRegistryItem,
  OnboardTenantPayload,
} from "./types";
import {
  INITIAL_TENANT,
  INITIAL_FIRMS,
  INITIAL_GODOWNS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_PARTIES,
  INITIAL_INVOICES,
  INITIAL_EXPENSES,
  INITIAL_PURCHASES,
  INITIAL_QUOTATIONS,
  INITIAL_CREDIT_NOTES,
  INITIAL_DEBIT_NOTES,
  INITIAL_STAFF,
  INITIAL_TENANTS_REGISTRY,
  SUPER_ADMIN_USER,
} from "./mock-data";
import { calculateCartSummary, calculateLineItem, isInterStateTransaction } from "./tax-engine";
import { parseVoiceCommand } from "./voice-parser";
import { parseBarcode } from "./barcode-parser";
import { INDUSTRY_TEMPLATES } from "./industry-templates";

export interface ParkedCart {
  id: string;
  cartName: string;
  party: Party | null;
  items: CartItem[];
  billDiscount: number;
  placeOfSupply: string;
  createdAt: string;
}

// Helper to save all user-created data to permanent vault backup in localStorage
export function savePermanentVaultData(data: {
  tenants?: TenantRegistryItem[];
  parties?: Party[];
  firms?: Firm[];
  products?: Product[];
  categories?: Category[];
  staffUsers?: StaffUser[];
}) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("vyaparflow_permanent_vault");
    const existing = raw ? JSON.parse(raw) : {};

    const existingTenants: TenantRegistryItem[] = existing.tenants || [];
    const mergedTenantsMap = new Map<string, TenantRegistryItem>();
    existingTenants.forEach((t) => mergedTenantsMap.set(t.id, t));
    (data.tenants || []).forEach((t) => mergedTenantsMap.set(t.id, t));

    const existingParties: Party[] = existing.parties || [];
    const mergedPartiesMap = new Map<string, Party>();
    existingParties.forEach((p) => mergedPartiesMap.set(p.id, p));
    (data.parties || []).forEach((p) => mergedPartiesMap.set(p.id, p));

    const existingFirms: Firm[] = existing.firms || [];
    const mergedFirmsMap = new Map<string, Firm>();
    existingFirms.forEach((f) => mergedFirmsMap.set(f.id, f));
    (data.firms || []).forEach((f) => mergedFirmsMap.set(f.id, f));

    const existingCategories: Category[] = existing.categories || [];
    const mergedCategoriesMap = new Map<string, Category>();
    existingCategories.forEach((c) => mergedCategoriesMap.set(c.id, c));
    (data.categories || []).forEach((c) => mergedCategoriesMap.set(c.id, c));

    const existingStaff: StaffUser[] = existing.staffUsers || [];
    const mergedStaffMap = new Map<string, StaffUser>();
    existingStaff.forEach((s) => mergedStaffMap.set(s.id, s));
    (data.staffUsers || []).forEach((s) => mergedStaffMap.set(s.id, s));

    const updatedVault = {
      timestamp: new Date().toISOString(),
      tenants: Array.from(mergedTenantsMap.values()),
      parties: Array.from(mergedPartiesMap.values()),
      firms: Array.from(mergedFirmsMap.values()),
      categories: Array.from(mergedCategoriesMap.values()),
      staffUsers: Array.from(mergedStaffMap.values()),
    };

    localStorage.setItem("vyaparflow_permanent_vault", JSON.stringify(updatedVault));
  } catch (err) {
    console.error("Failed to save to permanent vault:", err);
  }
}


interface PosState {
  // Master data
  tenant: TenantInfo;
  firms: Firm[];
  godowns: Godown[];
  categories: Category[];
  products: Product[];
  parties: Party[];
  invoices: Invoice[];
  expenses: ExpenseItem[];
  purchaseInvoices: PurchaseInvoice[];
  quotations: Quotation[];
  creditNotes: CreditNote[];
  debitNotes: DebitNote[];

  // Active POS state
  activeFirmId: string;
  activeGodownId: string;
  selectedParty: Party | null;
  placeOfSupply: string; // State Code
  activeCartItems: CartItem[];
  billDiscount: number;
  autoRoundOff: boolean;

  // Multi-cart Parking
  parkedCarts: ParkedCart[];

  // Modals & UI triggers
  isPaymentModalOpen: boolean;
  isBarcodeModalOpen: boolean;
  isVoiceBillingOpen: boolean;
  isHoldDrawerOpen: boolean;
  lastCompletedInvoice: Invoice | null;

  // Actions - Cart
  setActiveGodownId: (godownId: string) => void;
  setSelectedParty: (party: Party | null) => void;
  setPlaceOfSupply: (stateCode: string) => void;
  setBillDiscount: (amount: number) => void;
  toggleAutoRoundOff: () => void;

  addItemToCart: (product: Product, batch?: ProductBatch, serials?: string[], qty?: number) => void;
  updateCartItemQty: (itemId: string, qty: number) => void;
  updateCartItemPrice: (itemId: string, unitPrice: number) => void;
  updateCartItemDiscount: (itemId: string, percent: number, amount: number) => void;
  removeCartItem: (itemId: string) => void;
  clearActiveCart: () => void;

  // Multi-cart Hold/Resume
  holdCurrentCart: (label?: string) => void;
  resumeParkedCart: (cartId: string) => void;
  deleteParkedCart: (cartId: string) => void;

  // Checkout & Settlement
  setIsPaymentModalOpen: (open: boolean) => void;
  setIsBarcodeModalOpen: (open: boolean) => void;
  setIsVoiceBillingOpen: (open: boolean) => void;
  setIsHoldDrawerOpen: (open: boolean) => void;
  setLastCompletedInvoice: (inv: Invoice | null) => void;

  completeTransaction: (
    splits: PaymentSplit[],
    invoiceType?: InvoiceType,
    notes?: string
  ) => Invoice;

  // ERP CRUD Actions
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  clearAllInventory: () => void;
  inwardStock: (payload: QuickInwardPayload) => Product | null;
  addCategory: (category: Partial<Category> & { name: string }) => Category;
  updateCategory: (category: Partial<Category> & { id: string }) => void;
  deleteCategory: (categoryId: string) => void;
  seedIndustryCategories: (industryId: string, overwrite?: boolean) => void;
  addParty: (party: Party) => void;
  updateParty: (party: Party) => void;
  addExpense: (expense: ExpenseItem) => void;
  updateTenantSettings: (settings: Partial<TenantInfo>) => void;
  resetAllData: () => void;

  // Multi-Firm Actions
  setActiveFirmId: (firmId: string) => void;
  addFirm: (firm: Firm) => void;
  updateFirm: (firm: Firm) => void;
  deleteFirm: (firmId: string) => void;
  getActiveFirm: () => Firm;

  // Purchase Inward Actions
  addPurchaseInvoice: (purchase: PurchaseInvoice) => void;

  // Quotation Actions
  addQuotation: (quotation: Quotation) => void;
  updateQuotation: (quotation: Quotation) => void;
  convertQuotationToInvoice: (quotationId: string, customSplits?: PaymentSplit[]) => Invoice | null;

  // Returns Actions
  addCreditNote: (creditNote: CreditNote) => void;
  addDebitNote: (debitNote: DebitNote) => void;

  // Backup & Recovery
  restoreFromBackup: (snapshot: TenantBackupSnapshot) => void;

  // Helper calculation getter
  getCartCalculations: () => InvoiceCalculations;

  // Auth & RBAC Staff Management
  currentUser: StaffUser | null;
  staffUsers: StaffUser[];
  loginUser: (email: string, passwordOrPin?: string, preferredRole?: UserRole) => { success: boolean; user?: StaffUser; error?: string };
  logoutUser: () => void;
  addStaffUser: (user: StaffUser) => void;
  updateStaffUser: (user: Partial<StaffUser> & { id: string }) => void;
  deleteStaffUser: (userId: string) => void;
  setCurrentUser: (user: StaffUser | null) => void;
  switchUserRole: (role: UserRole) => void;

  // Multi-Tenant Platform & Super Admin
  tenants: TenantRegistryItem[];
  onboardTenant: (payload: OnboardTenantPayload) => { tenant: TenantRegistryItem; ownerUser: StaffUser };
  updateTenantStatus: (tenantId: string, isActive: boolean) => void;
  resetTenantOwnerPassword: (tenantId: string, newPassword: string) => void;
  masqueradeTenant: (tenantId: string) => void;
  switchTenant: (tenantId: string) => void;

  // Voice AI Parser
  processVoiceBilling: (transcript: string) => { matched: number; errors: string[] };
}

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      tenant: INITIAL_TENANT,
      firms: INITIAL_FIRMS,
      activeFirmId: INITIAL_FIRMS[0]?.id || "firm-mum-01",
      godowns: INITIAL_GODOWNS,
      categories: INITIAL_CATEGORIES,
      products: INITIAL_PRODUCTS,
      parties: INITIAL_PARTIES,
      invoices: INITIAL_INVOICES,
      expenses: INITIAL_EXPENSES,
      purchaseInvoices: INITIAL_PURCHASES,
      quotations: INITIAL_QUOTATIONS,
      creditNotes: INITIAL_CREDIT_NOTES,
      debitNotes: INITIAL_DEBIT_NOTES,
      currentUser: INITIAL_STAFF[0] as StaffUser,
      staffUsers: INITIAL_STAFF as StaffUser[],
      tenants: INITIAL_TENANTS_REGISTRY,

      activeGodownId: "godown-1",
      selectedParty: { ...INITIAL_PARTIES[3], stateCode: INITIAL_FIRMS[0]?.stateCode || "27" }, // Default Walk-in cash
      placeOfSupply: INITIAL_FIRMS[0]?.stateCode || "27",
      activeCartItems: [],
      billDiscount: 0,
      autoRoundOff: true,

      parkedCarts: [],

      isPaymentModalOpen: false,
      isBarcodeModalOpen: false,
      isVoiceBillingOpen: false,
      isHoldDrawerOpen: false,
      lastCompletedInvoice: null,

      setActiveGodownId: (activeGodownId) => set({ activeGodownId }),

      setSelectedParty: (party) => {
        const { firms, activeFirmId, tenant } = get();
        const activeFirm = firms.find((f) => f.id === activeFirmId) || firms.find((f) => f.isPrimary) || firms[0];
        const firmState = activeFirm?.stateCode || tenant?.stateCode || "27";
        
        // If party is Walk-in cash customer (or has no dedicated GSTIN), default to active firm's state
        const isWalkIn = !party || party.id === "party-walkin-cash" || !party.gstin;
        const targetPos = (isWalkIn ? firmState : (party?.stateCode || firmState));
        
        set({
          selectedParty: party ? (isWalkIn ? { ...party, stateCode: firmState } : party) : null,
          placeOfSupply: targetPos,
        });
      },

      setPlaceOfSupply: (placeOfSupply) => set({ placeOfSupply }),
      setBillDiscount: (billDiscount) => set({ billDiscount: Math.max(0, billDiscount) }),
      toggleAutoRoundOff: () => set((state) => ({ autoRoundOff: !state.autoRoundOff })),

      addItemToCart: (product, batch, serials, qty = 1) => {
        try {
          if (!product) return;
          const { activeCartItems = [], tenant, placeOfSupply } = get();
          const isInterState = isInterStateTransaction(
            tenant?.stateCode || "27",
            placeOfSupply || "27"
          );

          // Auto-select first batch if product tracks batch and no batch provided
          const selectedBatch =
            batch ||
            (product.trackBatch && product.batches && product.batches.length > 0
              ? product.batches[0]
              : undefined);

          // Determine strict maximum available inventory stock
          const maxStock = selectedBatch
            ? Number(selectedBatch.stockQty) || 0
            : product.trackSerial && product.serials
            ? product.serials.filter((s) => s.status === "AVAILABLE").length
            : Number(product.currentStock) || 0;

          if (maxStock <= 0) {
            return;
          }

          // Auto-select available serial if product tracks serial and no serials provided
          let selectedSerials = serials;
          if (
            (!selectedSerials || selectedSerials.length === 0) &&
            product.trackSerial &&
            product.serials
          ) {
            const usedSerials = (activeCartItems || [])
              .filter((it) => it.productId === product.id)
              .flatMap((it) => it.selectedSerials || []);
            const available = product.serials.filter(
              (s) => s.status === "AVAILABLE" && !usedSerials.includes(s.serialOrImei)
            );
            if (available.length > 0) {
              selectedSerials = [available[0].serialOrImei];
            }
          }

          // Check if existing line item exists with same batch and no unique serials
          const existingIdx = (activeCartItems || []).findIndex(
            (it) =>
              it.productId === product.id &&
              (selectedBatch ? it.selectedBatch?.id === selectedBatch.id : !it.selectedBatch) &&
              (!selectedSerials || selectedSerials.length === 0)
          );

          if (existingIdx >= 0) {
            const updated = [...activeCartItems];
            const existing = updated[existingIdx];
            const currentQty = existing.quantity || 1;

            if (currentQty >= maxStock) {
              return; // Already at max stock
            }

            const newQty = Math.min(maxStock, currentQty + qty);
            updated[existingIdx] = calculateLineItem(
              { ...existing, quantity: newQty },
              isInterState
            );
            set({ activeCartItems: updated });
          } else {
            const initialQty = Math.min(maxStock, Math.max(1, qty));
            const unitPrice = selectedBatch ? selectedBatch.salePrice : (product.salePrice ?? 0);
            const mrp = selectedBatch ? selectedBatch.mrp : (product.mrp ?? unitPrice);
            const newItemBase = {
              id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              productId: product.id,
              product,
              selectedBatch,
              selectedSerials: selectedSerials || [],
              quantity: initialQty,
              unit: product.unit || "PCS",
              unitPrice: Number(unitPrice) || 0,
              mrp: Number(mrp) || 0,
              isTaxInclusive: Boolean(product.isTaxInclusive),
              discountPercent: 0,
              discountAmount: 0,
              taxRate: Number(product.taxRate) || 0,
              cessRate: Number(product.cessRate) || 0,
              hsn: product.hsn || "9999",
            };
            const calculatedItem = calculateLineItem(newItemBase, isInterState);
            set({ activeCartItems: [calculatedItem, ...(activeCartItems || [])] });
          }
        } catch (err) {
          console.error("Error in addItemToCart:", err);
        }
      },

      updateCartItemQty: (itemId, qty) => {
        try {
          if (qty <= 0) {
            get().removeCartItem(itemId);
            return;
          }
          const { activeCartItems = [], tenant, placeOfSupply } = get();
          const target = (activeCartItems || []).find((it) => it.id === itemId);
          if (!target) return;

          // Determine strict maximum available inventory stock
          const maxStock = target.selectedBatch
            ? Number(target.selectedBatch.stockQty) || 0
            : target.product.trackSerial && target.product.serials
            ? target.product.serials.filter((s) => s.status === "AVAILABLE").length
            : Number(target.product.currentStock) || 0;

          const clampedQty = Math.min(maxStock, Math.max(1, qty));

          const isInterState = isInterStateTransaction(
            tenant?.stateCode || "27",
            placeOfSupply || "27"
          );
          const updated = (activeCartItems || []).map((it) => {
            if (it.id === itemId) {
              return calculateLineItem({ ...it, quantity: clampedQty }, isInterState);
            }
            return it;
          });
          set({ activeCartItems: updated });
        } catch (err) {
          console.error("Error in updateCartItemQty:", err);
        }
      },

      updateCartItemPrice: (itemId, unitPrice) => {
        try {
          const { activeCartItems = [], tenant, placeOfSupply } = get();
          const isInterState = isInterStateTransaction(
            tenant?.stateCode || "27",
            placeOfSupply || "27"
          );
          const updated = (activeCartItems || []).map((it) => {
            if (it.id === itemId) {
              return calculateLineItem({ ...it, unitPrice: Math.max(0, unitPrice) }, isInterState);
            }
            return it;
          });
          set({ activeCartItems: updated });
        } catch (err) {
          console.error("Error in updateCartItemPrice:", err);
        }
      },

      updateCartItemDiscount: (itemId, percent, amount) => {
        try {
          const { activeCartItems = [], tenant, placeOfSupply } = get();
          const isInterState = isInterStateTransaction(
            tenant?.stateCode || "27",
            placeOfSupply || "27"
          );
          const updated = (activeCartItems || []).map((it) => {
            if (it.id === itemId) {
              return calculateLineItem(
                { ...it, discountPercent: percent, discountAmount: amount },
                isInterState
              );
            }
            return it;
          });
          set({ activeCartItems: updated });
        } catch (err) {
          console.error("Error in updateCartItemDiscount:", err);
        }
      },

      removeCartItem: (itemId) => {
        set((state) => ({
          activeCartItems: state.activeCartItems.filter((it) => it.id !== itemId),
        }));
      },

      clearActiveCart: () => {
        const { firms, activeFirmId, tenant } = get();
        const activeFirm = firms.find((f) => f.id === activeFirmId) || firms.find((f) => f.isPrimary) || firms[0];
        const firmState = activeFirm?.stateCode || tenant?.stateCode || "27";
        set({
          activeCartItems: [],
          billDiscount: 0,
          selectedParty: { ...INITIAL_PARTIES[3], stateCode: firmState },
          placeOfSupply: firmState,
        });
      },

      holdCurrentCart: (label) => {
        const { activeCartItems, selectedParty, billDiscount, placeOfSupply, parkedCarts, firms, activeFirmId, tenant } = get();
        if (activeCartItems.length === 0) return;
        const activeFirm = firms.find((f) => f.id === activeFirmId) || firms.find((f) => f.isPrimary) || firms[0];
        const firmState = activeFirm?.stateCode || tenant?.stateCode || "27";

        const newParked: ParkedCart = {
          id: `parked-${Date.now()}`,
          cartName:
            label ||
            `Parked #${parkedCarts.length + 1} (${selectedParty?.name || "Cash Customer"})`,
          party: selectedParty,
          items: [...activeCartItems],
          billDiscount,
          placeOfSupply,
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        set({
          parkedCarts: [newParked, ...parkedCarts],
          activeCartItems: [],
          billDiscount: 0,
          selectedParty: { ...INITIAL_PARTIES[3], stateCode: firmState },
          placeOfSupply: firmState,
        });
      },

      resumeParkedCart: (cartId) => {
        const { parkedCarts } = get();
        const target = parkedCarts.find((c) => c.id === cartId);
        if (!target) return;

        set({
          activeCartItems: target.items,
          selectedParty: target.party,
          billDiscount: target.billDiscount,
          placeOfSupply: target.placeOfSupply,
          parkedCarts: parkedCarts.filter((c) => c.id !== cartId),
        });
      },

      deleteParkedCart: (cartId) => {
        set((state) => ({
          parkedCarts: state.parkedCarts.filter((c) => c.id !== cartId),
        }));
      },

      setIsPaymentModalOpen: (isPaymentModalOpen) => set({ isPaymentModalOpen }),
      setIsBarcodeModalOpen: (isBarcodeModalOpen) => set({ isBarcodeModalOpen }),
      setIsVoiceBillingOpen: (isVoiceBillingOpen) => set({ isVoiceBillingOpen }),
      setIsHoldDrawerOpen: (isHoldDrawerOpen) => set({ isHoldDrawerOpen }),
      setLastCompletedInvoice: (lastCompletedInvoice) => set({ lastCompletedInvoice }),

      getCartCalculations: () => {
        try {
          const { activeCartItems = [], tenant, placeOfSupply, billDiscount, autoRoundOff, firms = [], activeFirmId } = get();
          const activeFirm = firms.find((f) => f.id === activeFirmId) || firms.find((f) => f.isPrimary) || firms[0];
          const supplierState = activeFirm?.stateCode || tenant?.stateCode || "27";
          const posState = placeOfSupply || supplierState;
          const isInterState = isInterStateTransaction(supplierState, posState);
          return calculateCartSummary(activeCartItems || [], isInterState, billDiscount || 0, autoRoundOff ?? true);
        } catch (err) {
          console.error("Error in getCartCalculations:", err);
          return calculateCartSummary([], false, 0, true);
        }
      },

      completeTransaction: (splits, invoiceType = "TAX_INVOICE", notes) => {
        const {
          tenant,
          firms = [],
          activeFirmId,
          selectedParty,
          placeOfSupply,
          activeCartItems = [],
          billDiscount = 0,
          autoRoundOff = true,
          invoices = [],
          products = [],
          parties = [],
        } = get();

        const activeFirm = firms.find((f) => f.id === activeFirmId) || firms.find((f) => f.isPrimary) || firms[0];
        const supplierState = activeFirm?.stateCode || tenant?.stateCode || "27";
        const posState = placeOfSupply || supplierState;
        const isInterState = isInterStateTransaction(supplierState, posState);
        const calc = calculateCartSummary(activeCartItems, isInterState, billDiscount, autoRoundOff);

        const paidAmount = splits.reduce((sum, s) => sum + s.amount, 0);
        const balanceAmount = Math.max(0, calc.grandTotal - paidAmount);

        const prefix = activeFirm?.invoicePrefix || "INV";
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1; // 1-indexed
        const fyStart = currentMonth >= 4 ? currentYear : currentYear - 1;
        const fyEnd = fyStart + 1;
        const fyCode = `${String(fyStart).slice(-2)}${String(fyEnd).slice(-2)}`;
        const tenantInvoicesCount = invoices.filter((i) => (i.tenantId ? i.tenantId === tenant.id : true)).length;
        const newInvoiceNumber = `${prefix}-${fyCode}-${String(tenantInvoicesCount + 1).padStart(4, "0")}`;

        const completedInvoice: Invoice = {
          id: `inv-${Date.now()}`,
          tenantId: tenant.id,
          firmId: activeFirm?.id,
          firm: activeFirm,
          invoiceType,
          invoiceNo: newInvoiceNumber,
          partyId: selectedParty?.id,
          party: selectedParty || undefined,
          godownId: get().activeGodownId,
          placeOfSupply: posState,
          isInterState,
          subtotal: calc.subtotal,
          discountTotal: calc.discountTotal,
          taxableAmount: calc.taxableAmount,
          cgst: calc.cgst,
          sgst: calc.sgst,
          igst: calc.igst,
          cess: calc.cess,
          roundOff: calc.roundOff,
          grandTotal: calc.grandTotal,
          paidAmount,
          balanceAmount,
          status: "COMPLETED",
          paymentStatus: balanceAmount <= 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID",
          paymentSplits: splits,
          items: [...activeCartItems],
          notes,
          createdAt: new Date().toISOString(),
        };

        // Update product stock quantities
        const updatedProducts = products.map((p) => {
          const matchedItem = activeCartItems.find((it) => it.productId === p.id);
          if (matchedItem) {
            return {
              ...p,
              currentStock: Math.max(0, p.currentStock - matchedItem.quantity),
            };
          }
          return p;
        });

        // Update party balance if credit remainder exists
        const updatedParties = parties.map((pt) => {
          if (selectedParty && pt.id === selectedParty.id && balanceAmount > 0) {
            return {
              ...pt,
              currentBalance: pt.currentBalance + balanceAmount,
            };
          }
          return pt;
        });

        set({
          invoices: [completedInvoice, ...invoices],
          products: updatedProducts,
          parties: updatedParties,
          lastCompletedInvoice: completedInvoice,
          activeCartItems: [],
          billDiscount: 0,
          isPaymentModalOpen: false,
          selectedParty: { ...INITIAL_PARTIES[3], stateCode: supplierState },
          placeOfSupply: supplierState,
        });

        return completedInvoice;
      },

      addProduct: (product) => {
        const tenantId = product.tenantId || get().tenant.id;
        set((state) => ({ products: [{ ...product, tenantId }, ...state.products] }));
      },

      updateProduct: (product) => {
        set((state) => ({
          products: state.products.map((p) => (p.id === product.id ? product : p)),
        }));
      },

      deleteProduct: (productId) => {
        set((state) => ({
          products: state.products.filter((p) => p.id !== productId),
          activeCartItems: state.activeCartItems.filter((it) => it.productId !== productId),
        }));
      },

      clearAllInventory: () => {
        set({
          products: [],
          activeCartItems: [],
        });
      },

      inwardStock: (payload) => {
        const { products } = get();
        const target = products.find((p) => p.id === payload.productId);
        if (!target) return null;

        let totalAddedQty = Number(payload.quantity) || 0;
        if (totalAddedQty <= 0) return target;

        let newBatches = target.batches ? [...target.batches] : [];
        const godownId = payload.godownId || "godown-1";
        const godownName = payload.godownName || "Store Front Counter";

        if (payload.batchNo || target.trackBatch) {
          const batchNo = payload.batchNo || `BAT-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`;
          const existingBatchIdx = newBatches.findIndex((b) => b.batchNo === batchNo && b.godownId === godownId);

          if (existingBatchIdx >= 0) {
            newBatches[existingBatchIdx] = {
              ...newBatches[existingBatchIdx],
              stockQty: newBatches[existingBatchIdx].stockQty + totalAddedQty,
              purchasePrice: payload.purchasePrice || newBatches[existingBatchIdx].purchasePrice,
              salePrice: payload.salePrice || newBatches[existingBatchIdx].salePrice,
              mrp: payload.mrp || newBatches[existingBatchIdx].mrp,
              expDate: payload.expDate || newBatches[existingBatchIdx].expDate,
              mfgDate: payload.mfgDate || newBatches[existingBatchIdx].mfgDate,
            };
          } else {
            newBatches.push({
              id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              productId: target.id,
              godownId,
              godownName,
              batchNo,
              mfgDate: payload.mfgDate,
              expDate: payload.expDate,
              stockQty: totalAddedQty,
              purchasePrice: payload.purchasePrice,
              salePrice: payload.salePrice || target.salePrice,
              mrp: payload.mrp || target.mrp,
            });
          }
        }

        // Serials tracking
        let newSerials = target.serials ? [...target.serials] : [];
        if (payload.serials && payload.serials.length > 0) {
          for (const s of payload.serials) {
            if (s && !newSerials.some((existing) => existing.serialOrImei === s)) {
              newSerials.push({
                id: `sn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                productId: target.id,
                serialOrImei: s.trim(),
                status: "AVAILABLE",
                godownId,
              });
            }
          }
        }

        // Weighted average cost calculation
        const prevStock = Number(target.currentStock) || 0;
        const prevCostValue = prevStock * (Number(target.purchasePrice) || 0);
        const addedCostValue = totalAddedQty * (Number(payload.purchasePrice) || 0);
        const newTotalStock = prevStock + totalAddedQty;
        const newAvgPurchasePrice = newTotalStock > 0 ? (prevCostValue + addedCostValue) / newTotalStock : payload.purchasePrice;

        const updatedProduct: Product = {
          ...target,
          currentStock: newTotalStock,
          purchasePrice: Math.round((newAvgPurchasePrice + Number.EPSILON) * 100) / 100,
          salePrice: payload.salePrice && payload.salePrice > 0 ? payload.salePrice : target.salePrice,
          mrp: payload.mrp && payload.mrp > 0 ? payload.mrp : target.mrp,
          batches: newBatches.length > 0 ? newBatches : undefined,
          serials: newSerials.length > 0 ? newSerials : undefined,
        };

        set({
          products: products.map((p) => (p.id === target.id ? updatedProduct : p)),
        });

        return updatedProduct;
      },

      addCategory: (catData) => {
        const tenantId = catData.tenantId || get().tenant.id;
        const newCat: Category = {
          id: catData.id || `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          tenantId,
          name: catData.name.trim(),
          codePrefix: catData.codePrefix?.trim().toUpperCase() || catData.name.trim().slice(0, 4).toUpperCase(),
          defaultGstRate: Number(catData.defaultGstRate) || 18,
          hsnCode: catData.hsnCode?.trim() || "9999",
          description: catData.description?.trim() || "",
          isActive: catData.isActive ?? true,
          productCount: 0,
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          const updated = [newCat, ...state.categories];
          savePermanentVaultData({ categories: updated });
          return { categories: updated };
        });

        return newCat;
      },

      updateCategory: (catData) => {
        set((state) => {
          const updated = state.categories.map((c) => {
            if (c.id === catData.id) {
              return {
                ...c,
                ...catData,
                updatedAt: new Date().toISOString(),
              };
            }
            return c;
          });
          savePermanentVaultData({ categories: updated });
          return { categories: updated };
        });
      },

      deleteCategory: (categoryId) => {
        set((state) => {
          const updated = state.categories.filter((c) => c.id !== categoryId);
          savePermanentVaultData({ categories: updated });
          return { categories: updated };
        });
      },

      seedIndustryCategories: (industryId, overwrite = false) => {
        const template = INDUSTRY_TEMPLATES.find((t) => t.id === industryId);
        if (!template) return;

        const tenantId = get().tenant.id;
        const mapped: Category[] = template.categories.map((tc, idx) => ({
          id: `cat-${template.id}-${idx + 1}-${Date.now()}`,
          tenantId,
          name: tc.name,
          codePrefix: tc.codePrefix,
          defaultGstRate: tc.defaultGstRate,
          hsnCode: tc.hsnCode,
          description: tc.description,
          isActive: true,
          productCount: 0,
          createdAt: new Date().toISOString(),
        }));

        set((state) => {
          let updated: Category[];
          if (overwrite) {
            updated = mapped;
          } else {
            const existingNames = new Set(state.categories.map((c) => c.name.toLowerCase()));
            const newUnique = mapped.filter((m) => !existingNames.has(m.name.toLowerCase()));
            updated = [...state.categories, ...newUnique];
          }
          savePermanentVaultData({ categories: updated });
          return { categories: updated };
        });
      },

      setActiveFirmId: (firmId) => {
        const { firms, selectedParty, tenant } = get();
        const firm = firms.find((f) => f.id === firmId);
        const targetState = firm?.stateCode || tenant.stateCode || "27";
        const isWalkIn = !selectedParty || selectedParty.id === "party-walkin-cash" || !selectedParty.gstin;

        set((state) => ({
          activeFirmId: firmId,
          placeOfSupply: isWalkIn ? targetState : (selectedParty?.stateCode || targetState),
          selectedParty: isWalkIn && selectedParty ? { ...selectedParty, stateCode: targetState } : selectedParty,
          tenant: firm
            ? {
                ...state.tenant,
                name: firm.name,
                legalName: firm.legalName || state.tenant.legalName,
                gstin: firm.gstin || state.tenant.gstin,
                stateCode: firm.stateCode,
                stateName: firm.stateName,
                address: firm.address || state.tenant.address || "",
                pincode: firm.pincode || state.tenant.pincode || "",
                phone: firm.phone || state.tenant.phone || "",
                email: firm.email || state.tenant.email || "",
                upiVpa: firm.upiId || state.tenant.upiVpa,
                bankName: firm.bankName || state.tenant.bankName,
                bankAccountNumber: firm.accountNo || state.tenant.bankAccountNumber,
                bankIfsc: firm.ifsc || state.tenant.bankIfsc,
              }
            : state.tenant,
        }));
      },

      addFirm: (firm) => {
        set((state) => {
          const updatedFirms = firm.isPrimary
            ? state.firms.map((f) => ({ ...f, isPrimary: false }))
            : [...state.firms];
          const newFirms = [firm, ...updatedFirms];
          const shouldActivate = firm.isPrimary || state.firms.length === 0;
          const nextActiveId = shouldActivate ? firm.id : state.activeFirmId;
          const isWalkIn = !state.selectedParty || state.selectedParty.id === "party-walkin-cash" || !state.selectedParty.gstin;

          return {
            firms: newFirms,
            activeFirmId: nextActiveId,
            placeOfSupply: shouldActivate && isWalkIn ? firm.stateCode : state.placeOfSupply,
            selectedParty:
              shouldActivate && isWalkIn && state.selectedParty
                ? { ...state.selectedParty, stateCode: firm.stateCode }
                : state.selectedParty,
            tenant: shouldActivate
              ? {
                  ...state.tenant,
                  name: firm.name,
                  legalName: firm.legalName || state.tenant.legalName,
                  gstin: firm.gstin || state.tenant.gstin,
                  stateCode: firm.stateCode,
                  stateName: firm.stateName,
                  address: firm.address || state.tenant.address || "",
                  pincode: firm.pincode || state.tenant.pincode || "",
                  phone: firm.phone || state.tenant.phone || "",
                  email: firm.email || state.tenant.email || "",
                  upiVpa: firm.upiId || state.tenant.upiVpa,
                  bankName: firm.bankName || state.tenant.bankName,
                  bankAccountNumber: firm.accountNo || state.tenant.bankAccountNumber,
                  bankIfsc: firm.ifsc || state.tenant.bankIfsc,
                }
              : state.tenant,
          };
        });
      },

      updateFirm: (firm) => {
        set((state) => {
          const updated = state.firms.map((f) => {
            if (f.id === firm.id) return firm;
            if (firm.isPrimary) return { ...f, isPrimary: false };
            return f;
          });

          const isActiveOrPrimary = state.activeFirmId === firm.id || firm.isPrimary;
          const nextActiveFirmId = isActiveOrPrimary ? firm.id : state.activeFirmId;
          const currentActiveFirm = updated.find((f) => f.id === nextActiveFirmId) || firm;

          const isWalkIn = !state.selectedParty || state.selectedParty.id === "party-walkin-cash" || !state.selectedParty.gstin;
          const newPos = isWalkIn ? currentActiveFirm.stateCode : (state.selectedParty?.stateCode || currentActiveFirm.stateCode);

          return {
            firms: updated,
            activeFirmId: nextActiveFirmId,
            placeOfSupply: isActiveOrPrimary ? newPos : state.placeOfSupply,
            selectedParty:
              isActiveOrPrimary && isWalkIn && state.selectedParty
                ? { ...state.selectedParty, stateCode: currentActiveFirm.stateCode }
                : state.selectedParty,
            tenant: isActiveOrPrimary
              ? {
                  ...state.tenant,
                  name: currentActiveFirm.name,
                  legalName: currentActiveFirm.legalName || state.tenant.legalName,
                  gstin: currentActiveFirm.gstin || state.tenant.gstin,
                  stateCode: currentActiveFirm.stateCode,
                  stateName: currentActiveFirm.stateName,
                  address: currentActiveFirm.address || state.tenant.address || "",
                  pincode: currentActiveFirm.pincode || state.tenant.pincode || "",
                  phone: currentActiveFirm.phone || state.tenant.phone || "",
                  email: currentActiveFirm.email || state.tenant.email || "",
                  upiVpa: currentActiveFirm.upiId || state.tenant.upiVpa,
                  bankName: currentActiveFirm.bankName || state.tenant.bankName,
                  bankAccountNumber: currentActiveFirm.accountNo || state.tenant.bankAccountNumber,
                  bankIfsc: currentActiveFirm.ifsc || state.tenant.bankIfsc,
                }
              : state.tenant,
          };
        });
      },

      deleteFirm: (firmId) => {
        set((state) => {
          const remaining = state.firms.filter((f) => f.id !== firmId);
          if (remaining.length > 0 && !remaining.some((f) => f.isPrimary)) {
            remaining[0].isPrimary = true;
          }
          const nextActiveId =
            state.activeFirmId === firmId ? remaining[0]?.id || "" : state.activeFirmId;
          const nextFirm = remaining.find((f) => f.id === nextActiveId) || remaining[0];
          const isWalkIn = !state.selectedParty || state.selectedParty.id === "party-walkin-cash" || !state.selectedParty.gstin;

          return {
            firms: remaining,
            activeFirmId: nextActiveId,
            placeOfSupply: nextFirm && isWalkIn ? nextFirm.stateCode : state.placeOfSupply,
            selectedParty:
              nextFirm && isWalkIn && state.selectedParty
                ? { ...state.selectedParty, stateCode: nextFirm.stateCode }
                : state.selectedParty,
            tenant: nextFirm
              ? {
                  ...state.tenant,
                  name: nextFirm.name,
                  legalName: nextFirm.legalName || state.tenant.legalName,
                  gstin: nextFirm.gstin || state.tenant.gstin,
                  stateCode: nextFirm.stateCode,
                  stateName: nextFirm.stateName,
                  address: nextFirm.address || state.tenant.address || "",
                  pincode: nextFirm.pincode || state.tenant.pincode || "",
                  phone: nextFirm.phone || state.tenant.phone || "",
                  email: nextFirm.email || state.tenant.email || "",
                  upiVpa: nextFirm.upiId || state.tenant.upiVpa,
                  bankName: nextFirm.bankName || state.tenant.bankName,
                  bankAccountNumber: nextFirm.accountNo || state.tenant.bankAccountNumber,
                  bankIfsc: nextFirm.ifsc || state.tenant.bankIfsc,
                }
              : state.tenant,
          };
        });
      },

      getActiveFirm: () => {
        const state = get();
        return (
          state.firms.find((f) => f.id === state.activeFirmId) ||
          state.firms.find((f) => f.isPrimary) ||
          state.firms[0]
        );
      },

      addParty: (party) => {
        const tenantId = party.tenantId || get().tenant.id;
        const newParty = { ...party, tenantId };
        set((state) => {
          const updatedParties = [newParty, ...state.parties];
          savePermanentVaultData({ parties: updatedParties });
          return { parties: updatedParties };
        });
      },

      updateParty: (party) => {
        set((state) => {
          const updatedParties = state.parties.map((p) => (p.id === party.id ? party : p));
          savePermanentVaultData({ parties: updatedParties });
          return { parties: updatedParties };
        });
      },

      addExpense: (expense) => {
        const tenantId = expense.tenantId || get().tenant.id;
        set((state) => ({ expenses: [{ ...expense, tenantId }, ...state.expenses] }));
      },

      updateTenantSettings: (settings) => {
        set((state) => {
          const updatedTenant = { ...state.tenant, ...settings };
          const updatedTenants = state.tenants.map((t) =>
            t.id === state.tenant.id
              ? {
                  ...t,
                  name: settings.name || t.name,
                  legalName: settings.legalName || t.legalName,
                  gstin: settings.gstin || t.gstin,
                  stateCode: settings.stateCode || t.stateCode,
                  stateName: settings.stateName || t.stateName,
                }
              : t
          );
          const updatedFirms = state.firms.map((f) =>
            f.id === state.activeFirmId || f.tenantId === state.tenant.id
              ? {
                  ...f,
                  name: settings.name || f.name,
                  legalName: settings.legalName || f.legalName,
                  gstin: settings.gstin || f.gstin,
                  stateCode: settings.stateCode || f.stateCode,
                  stateName: settings.stateName || f.stateName,
                }
              : f
          );
          return {
            tenant: updatedTenant,
            tenants: updatedTenants,
            firms: updatedFirms,
          };
        });
      },

      addPurchaseInvoice: (purchase) => {
        const { products, parties, purchaseInvoices, tenant } = get();
        const tenantId = purchase.tenantId || tenant.id;

        // Increment product stocks and batches
        const updatedProducts = products.map((p) => {
          const purchasedItems = purchase.items.filter((item) => item.productId === p.id);
          if (purchasedItems.length === 0) return p;

          let totalAddedQty = 0;
          let newBatches = p.batches ? [...p.batches] : [];

          for (const item of purchasedItems) {
            totalAddedQty += item.quantity;

            if (item.batchNo) {
              const existingBatchIndex = newBatches.findIndex((b) => b.batchNo === item.batchNo);
              if (existingBatchIndex >= 0) {
                newBatches[existingBatchIndex] = {
                  ...newBatches[existingBatchIndex],
                  stockQty: newBatches[existingBatchIndex].stockQty + item.quantity,
                  purchasePrice: item.purchasePrice || newBatches[existingBatchIndex].purchasePrice,
                  salePrice: item.salePrice || newBatches[existingBatchIndex].salePrice,
                  mrp: item.mrp || newBatches[existingBatchIndex].mrp,
                  expDate: item.expDate || newBatches[existingBatchIndex].expDate,
                };
              } else {
                newBatches.push({
                  id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  productId: p.id,
                  godownId: "godown-1",
                  godownName: "Store Front Counter",
                  batchNo: item.batchNo,
                  mfgDate: item.mfgDate,
                  expDate: item.expDate,
                  stockQty: item.quantity,
                  purchasePrice: item.purchasePrice,
                  salePrice: item.salePrice || item.purchasePrice * 1.2,
                  mrp: item.mrp || item.purchasePrice * 1.25,
                });
              }
            }
          }

          // Weighted average purchase price calculation
          const prevCostValue = p.currentStock * p.purchasePrice;
          const addedCostValue = purchasedItems.reduce((acc, it) => acc + it.quantity * it.purchasePrice, 0);
          const newTotalStock = p.currentStock + totalAddedQty;
          const newAvgPurchasePrice = newTotalStock > 0 ? (prevCostValue + addedCostValue) / newTotalStock : p.purchasePrice;

          return {
            ...p,
            currentStock: newTotalStock,
            purchasePrice: Math.round((newAvgPurchasePrice + Number.EPSILON) * 100) / 100,
            salePrice: purchasedItems[0]?.salePrice || p.salePrice,
            mrp: purchasedItems[0]?.mrp || p.mrp,
            batches: newBatches.length > 0 ? newBatches : undefined,
          };
        });

        // Update vendor payable balance (negative balance represents payable in Vyapar convention)
        const updatedParties = parties.map((pt) => {
          if (pt.id === purchase.vendorId && purchase.balanceAmount > 0) {
            return {
              ...pt,
              currentBalance: pt.currentBalance - purchase.balanceAmount,
            };
          }
          return pt;
        });

        set({
          purchaseInvoices: [{ ...purchase, tenantId }, ...purchaseInvoices],
          products: updatedProducts,
          parties: updatedParties,
        });
      },

      addQuotation: (quotation) => {
        const tenantId = quotation.tenantId || get().tenant.id;
        set((state) => ({ quotations: [{ ...quotation, tenantId }, ...state.quotations] }));
      },

      updateQuotation: (quotation) => {
        set((state) => ({
          quotations: state.quotations.map((q) => (q.id === quotation.id ? quotation : q)),
        }));
      },

      convertQuotationToInvoice: (quotationId, customSplits) => {
        const { quotations, products, parties, invoices, tenant } = get();
        const quote = quotations.find((q) => q.id === quotationId);
        if (!quote) return null;

        const party = parties.find((p) => p.id === quote.partyId) || INITIAL_PARTIES[3];
        const splits = customSplits && customSplits.length > 0
          ? customSplits
          : [{ mode: "CASH" as const, amount: quote.grandTotal }];

        const paidAmount = splits.reduce((sum, sp) => sum + sp.amount, 0);
        const balanceAmount = Math.max(0, quote.grandTotal - paidAmount);

        const newInvoiceNo = `INV-2627-${String(invoices.length + 1).padStart(4, "0")}`;

        const isInter = (party.stateCode || "27") !== (tenant.stateCode || "27");

        const convertedItems = quote.items.map((item, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          hsn: item.hsn,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          mrp: item.unitPrice,
          isTaxInclusive: false,
          discountPercent: item.discountPercent || 0,
          discountAmount: item.discountAmount || 0,
          taxRate: item.taxRate,
          taxableAmount: item.taxableAmount,
          cgstAmount: isInter ? 0 : item.taxAmount / 2,
          sgstAmount: isInter ? 0 : item.taxAmount / 2,
          igstAmount: isInter ? item.taxAmount : 0,
          cessAmount: 0,
          totalAmount: item.total,
        }));

        const newInvoice: Invoice = {
          id: `inv-${Date.now()}`,
          tenantId: tenant.id,
          invoiceNo: newInvoiceNo,
          invoiceType: "TAX_INVOICE",
          party,
          godownId: "godown-1",
          placeOfSupply: party.stateCode || "27",
          isInterState: isInter,
          subtotal: quote.subtotal,
          discountTotal: quote.discountTotal,
          taxableAmount: quote.taxableAmount,
          cgst: isInter ? 0 : quote.taxAmount / 2,
          sgst: isInter ? 0 : quote.taxAmount / 2,
          igst: isInter ? quote.taxAmount : 0,
          cess: 0,
          roundOff: quote.roundOff,
          grandTotal: quote.grandTotal,
          paidAmount,
          balanceAmount,
          status: "COMPLETED",
          paymentStatus: balanceAmount <= 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID",
          paymentSplits: splits,
          items: convertedItems as any,
          notes: `Converted from Quotation ${quote.quoteNo}`,
          createdAt: new Date().toISOString(),
        };

        // Decrement stock upon quotation conversion
        const updatedProducts = products.map((p) => {
          const matchedItem = quote.items.find((it) => it.productId === p.id);
          if (matchedItem) {
            return {
              ...p,
              currentStock: Math.max(0, p.currentStock - matchedItem.quantity),
            };
          }
          return p;
        });

        // Update customer balance if credit remainder exists
        const updatedParties = parties.map((pt) => {
          if (pt.id === party.id && balanceAmount > 0) {
            return {
              ...pt,
              currentBalance: pt.currentBalance + balanceAmount,
            };
          }
          return pt;
        });

        // Mark quotation as converted
        const updatedQuotations = quotations.map((q) =>
          q.id === quotationId
            ? { ...q, status: "CONVERTED_TO_INVOICE" as const, convertedInvoiceId: newInvoice.id }
            : q
        );

        set({
          invoices: [newInvoice, ...invoices],
          products: updatedProducts,
          parties: updatedParties,
          quotations: updatedQuotations,
          lastCompletedInvoice: newInvoice,
        });

        return newInvoice;
      },

      addCreditNote: (creditNote) => {
        const { products, parties, creditNotes, tenant } = get();
        const tenantId = creditNote.tenantId || tenant.id;

        // Increment stock for sales returns
        const updatedProducts = products.map((p) => {
          const returnItem = creditNote.items.find((it) => it.productId === p.id);
          if (returnItem) {
            return {
              ...p,
              currentStock: p.currentStock + returnItem.quantity,
            };
          }
          return p;
        });

        // Credit customer ledger if refund mode is CREDIT
        const updatedParties = parties.map((pt) => {
          if (pt.id === creditNote.partyId && creditNote.refundMode === "CREDIT") {
            return {
              ...pt,
              currentBalance: pt.currentBalance - creditNote.totalAmount,
            };
          }
          return pt;
        });

        set({
          creditNotes: [{ ...creditNote, tenantId }, ...creditNotes],
          products: updatedProducts,
          parties: updatedParties,
        });
      },

      addDebitNote: (debitNote) => {
        const { products, parties, debitNotes, tenant } = get();
        const tenantId = debitNote.tenantId || tenant.id;

        // Deduct stock for purchase returns to vendor
        const updatedProducts = products.map((p) => {
          const returnItem = debitNote.items.find((it) => it.productId === p.id);
          if (returnItem) {
            return {
              ...p,
              currentStock: Math.max(0, p.currentStock - returnItem.quantity),
            };
          }
          return p;
        });

        // Reduce vendor payable balance (vendor balance is negative, adding reduces payable)
        const updatedParties = parties.map((pt) => {
          if (pt.id === debitNote.partyId) {
            return {
              ...pt,
              currentBalance: pt.currentBalance + debitNote.totalAmount,
            };
          }
          return pt;
        });

        set({
          debitNotes: [{ ...debitNote, tenantId }, ...debitNotes],
          products: updatedProducts,
          parties: updatedParties,
        });
      },

      restoreFromBackup: (snapshot) => {
        set({
          tenant: snapshot.tenant || get().tenant,
          products: snapshot.products || get().products,
          categories: snapshot.categories || get().categories,
          godowns: snapshot.godowns || get().godowns,
          parties: snapshot.parties || get().parties,
          invoices: snapshot.invoices || get().invoices,
          expenses: snapshot.expenses || get().expenses,
          purchaseInvoices: snapshot.purchaseInvoices || get().purchaseInvoices,
          quotations: snapshot.quotations || get().quotations,
          creditNotes: snapshot.creditNotes || get().creditNotes,
          debitNotes: snapshot.debitNotes || get().debitNotes,
        });
      },

      resetAllData: () => {
        try {
          if (typeof window !== "undefined") {
            localStorage.removeItem("vyaparflow-pos-storage-v1");
            localStorage.removeItem("vyaparflow-pos-storage-v2");
            localStorage.removeItem("vyaparflow-pos-storage-v3");
          }
          set({
            tenant: INITIAL_TENANT,
            firms: INITIAL_FIRMS,
            activeFirmId: INITIAL_FIRMS[0]?.id || "firm-mum-01",
            godowns: INITIAL_GODOWNS,
            categories: INITIAL_CATEGORIES,
            products: [],
            parties: INITIAL_PARTIES.map((p) => ({ ...p, openingBalance: 0, currentBalance: 0 })),
            invoices: [],
            expenses: [],
            purchaseInvoices: [],
            quotations: [],
            creditNotes: [],
            debitNotes: [],
            activeCartItems: [],
            parkedCarts: [],
            billDiscount: 0,
            lastCompletedInvoice: null,
            selectedParty: INITIAL_PARTIES[3],
            activeGodownId: "godown-1",
            placeOfSupply: "27",
            autoRoundOff: true,
            isPaymentModalOpen: false,
            isBarcodeModalOpen: false,
            isVoiceBillingOpen: false,
            isHoldDrawerOpen: false,
          });
        } catch (err) {
          console.error("Error resetting ERP data:", err);
        }
      },

      processVoiceBilling: (transcript) => {
        const products = get().products;
        const parsed = parseVoiceCommand(transcript, products);
        let matched = 0;
        const errors: string[] = [...parsed.unmatchedPhrases.map((u) => `Could not find product for: "${u}"`)];

        for (const item of parsed.items) {
          const product = products.find((p) => p.id === item.productId);
          if (product) {
            get().addItemToCart(product, product.batches?.[0], undefined, item.quantity);
            matched++;
          }
        }

        return { matched, errors };
      },

      loginUser: (email, passwordOrPin, preferredRole) => {
        const { staffUsers, tenant } = get();
        const cleanEmail = email.trim().toLowerCase();

        // Check if Super Admin login
        if (cleanEmail === "superadmin@vyaparflow.enterprise" || preferredRole === "SUPER_ADMIN") {
          const superAdminUser: StaffUser = {
            ...SUPER_ADMIN_USER,
            lastLoginAt: new Date().toISOString(),
          };
          set({ currentUser: superAdminUser });
          if (typeof window !== "undefined") {
            localStorage.setItem("vyaparflow_auth_session", JSON.stringify(superAdminUser));
          }
          return { success: true, user: superAdminUser };
        }

        let matched = staffUsers.find(
          (u) => u.email.toLowerCase() === cleanEmail
        );

        // Fallback matching by role if specified
        if (!matched && preferredRole) {
          matched = staffUsers.find((u) => u.role === preferredRole);
        }

        if (!matched) {
          // Auto-register as active user for seamless testing
          matched = {
            id: `usr-${Date.now()}`,
            tenantId: tenant.id,
            name: cleanEmail.split("@")[0].toUpperCase() + " (User)",
            email: cleanEmail,
            phone: "9820099999",
            role: preferredRole || "TENANT_OWNER",
            isActive: true,
            permissions: {
              canEditBackdatedInvoices: true,
              canViewPurchaseRates: true,
              canViewProfitMargins: true,
              canGiveBillDiscounts: true,
              canDeleteInvoices: true,
              canManageUsers: true,
              canAccessSettings: true,
            },
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          set((state) => ({
            staffUsers: [matched!, ...state.staffUsers],
            currentUser: matched!,
          }));
          return { success: true, user: matched };
        }

        if (!matched.isActive) {
          return { success: false, error: "This staff account is currently suspended. Please contact Admin." };
        }

        const updatedUser = { ...matched, lastLoginAt: new Date().toISOString() };
        const { tenants, firms } = get();
        const userTenantId = matched.tenantId || tenant.id;
        const tenantItem = tenants.find((t) => t.id === userTenantId || t.ownerEmail.toLowerCase() === cleanEmail);
        const matchingFirm = firms.find((f) => f.tenantId === userTenantId) || (tenantItem ? firms.find((f) => f.name === tenantItem.name) : undefined);

        const updatedTenant = tenantItem
          ? {
              ...tenant,
              id: tenantItem.id,
              name: tenantItem.name,
              legalName: tenantItem.legalName || tenantItem.name,
              gstin: tenantItem.gstin || "UNREGISTERED",
              stateCode: tenantItem.stateCode,
              stateName: tenantItem.stateName,
              phone: tenantItem.ownerPhone || tenant.phone,
              email: tenantItem.ownerEmail || tenant.email,
              address: `Main Commercial Hub, ${tenantItem.stateName}`,
              city: tenantItem.stateName,
              thermalHeader: `★ ${tenantItem.name.toUpperCase()} ★\nGSTIN: ${tenantItem.gstin || "UNREGISTERED"}\nTax Invoice / Cash Receipt`,
            }
          : matchingFirm
          ? {
              ...tenant,
              id: userTenantId,
              name: matchingFirm.name,
              legalName: matchingFirm.legalName || matchingFirm.name,
              gstin: matchingFirm.gstin || "UNREGISTERED",
              stateCode: matchingFirm.stateCode,
              stateName: matchingFirm.stateName,
              phone: matchingFirm.phone || tenant.phone,
              email: matchingFirm.email || tenant.email,
              address: matchingFirm.address || tenant.address,
            }
          : tenant;

        const nextActiveFirmId = matchingFirm?.id || (tenantItem ? `firm-${tenantItem.id}` : get().activeFirmId);

        set((state) => ({
          currentUser: updatedUser,
          tenant: updatedTenant,
          activeFirmId: nextActiveFirmId,
          placeOfSupply: updatedTenant.stateCode || state.placeOfSupply,
          staffUsers: state.staffUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u)),
        }));

        if (typeof window !== "undefined") {
          localStorage.setItem("vyaparflow_auth_session", JSON.stringify(updatedUser));
        }

        return { success: true, user: updatedUser };
      },

      logoutUser: () => {
        set({ currentUser: null });
        if (typeof window !== "undefined") {
          localStorage.removeItem("vyaparflow_auth_session");
        }
      },

      addStaffUser: (user) => {
        set((state) => ({ staffUsers: [user, ...state.staffUsers] }));
      },

      updateStaffUser: (user) => {
        set((state) => {
          const updatedStaff = state.staffUsers.map((u) =>
            u.id === user.id ? ({ ...u, ...user } as StaffUser) : u
          );
          return {
            staffUsers: updatedStaff,
            currentUser: state.currentUser?.id === user.id ? ({ ...state.currentUser, ...user } as StaffUser) : state.currentUser,
          };
        });
      },

      deleteStaffUser: (userId) => {
        set((state) => {
          const remaining = state.staffUsers.filter((u) => u.id !== userId);
          return {
            staffUsers: remaining,
            currentUser: state.currentUser?.id === userId ? (remaining[0] || null) : state.currentUser,
          };
        });
      },

      setCurrentUser: (currentUser) => set({ currentUser }),

      switchUserRole: (role) => {
        const { staffUsers, currentUser } = get();
        if (role === "SUPER_ADMIN") {
          set({ currentUser: SUPER_ADMIN_USER });
          return;
        }
        const matched = staffUsers.find((u) => u.role === role);
        if (matched) {
          set({ currentUser: matched });
        } else if (currentUser) {
          const updated = { ...currentUser, role };
          set((state) => ({
            currentUser: updated,
            staffUsers: state.staffUsers.map((u) => (u.id === updated.id ? updated : u)),
          }));
        }
      },

      // Super Admin & Multi-Tenant Registry Methods
      onboardTenant: (payload) => {
        const newTenantId = `tenant-${Date.now()}`;
        const newTenant: TenantRegistryItem = {
          id: newTenantId,
          name: payload.businessName,
          legalName: payload.legalName || payload.businessName,
          gstin: payload.gstin ? payload.gstin.toUpperCase() : undefined,
          stateCode: payload.stateCode,
          stateName: payload.stateName || "Maharashtra",
          plan: payload.plan || "PRO",
          isActive: true,
          ownerName: payload.ownerName,
          ownerEmail: payload.ownerEmail.toLowerCase(),
          ownerPhone: payload.ownerPhone || "+91 98200 00000",
          totalUsersCount: 1,
          createdAt: new Date().toISOString().split("T")[0],
          lastActiveAt: new Date().toISOString(),
        };

        const ownerUser: StaffUser = {
          id: `usr-owner-${Date.now()}`,
          tenantId: newTenantId,
          name: `${payload.ownerName} (Owner)`,
          email: payload.ownerEmail.toLowerCase(),
          phone: payload.ownerPhone || "9820000000",
          role: "OWNER",
          password: payload.temporaryPassword || "welcome123",
          pin: "1234",
          isActive: true,
          permissions: {
            canEditBackdatedInvoices: true,
            canViewPurchaseRates: true,
            canViewProfitMargins: true,
            canGiveBillDiscounts: true,
            canDeleteInvoices: true,
            canManageUsers: true,
            canAccessSettings: true,
          },
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };

        const initialFirm: Firm = {
          id: `firm-${Date.now()}`,
          tenantId: newTenantId,
          name: payload.businessName,
          legalName: payload.legalName || payload.businessName,
          gstin: payload.gstin ? payload.gstin.toUpperCase() : undefined,
          stateCode: payload.stateCode,
          stateName: payload.stateName || "Maharashtra",
          phone: payload.ownerPhone || "+91 98200 00000",
          email: payload.ownerEmail.toLowerCase(),
          invoicePrefix: "INV",
          isPrimary: true,
        };

        set((state) => {
          const updatedTenants = [newTenant, ...state.tenants];
          const updatedStaff = [ownerUser, ...state.staffUsers];
          const updatedFirms = [initialFirm, ...state.firms];
          savePermanentVaultData({
            tenants: updatedTenants,
            staffUsers: updatedStaff,
            firms: updatedFirms,
          });
          return {
            tenants: updatedTenants,
            staffUsers: updatedStaff,
            firms: updatedFirms,
          };
        });

        return { tenant: newTenant, ownerUser };
      },

      updateTenantStatus: (tenantId, isActive) => {
        set((state) => {
          const updatedTenants = state.tenants.map((t) => (t.id === tenantId ? { ...t, isActive } : t));
          const updatedStaff = state.staffUsers.map((u) =>
            u.tenantId === tenantId ? { ...u, isActive } : u
          );
          savePermanentVaultData({ tenants: updatedTenants, staffUsers: updatedStaff });
          return {
            tenants: updatedTenants,
            staffUsers: updatedStaff,
          };
        });
      },

      resetTenantOwnerPassword: (tenantId, newPassword) => {
        set((state) => ({
          staffUsers: state.staffUsers.map((u) =>
            u.tenantId === tenantId && (u.role === "TENANT_OWNER" || u.role === "OWNER")
              ? { ...u, password: newPassword }
              : u
          ),
        }));
      },

      masqueradeTenant: (tenantId) => {
        const { tenants, staffUsers, firms } = get();
        const tenantItem = tenants.find((t) => t.id === tenantId);
        if (!tenantItem) return;

        const ownerUser: StaffUser = {
          id: `usr-owner-${tenantId}`,
          tenantId,
          name: `${tenantItem.ownerName} (Owner)`,
          email: tenantItem.ownerEmail,
          phone: tenantItem.ownerPhone || "+91 98200 00000",
          role: "OWNER",
          isActive: true,
          permissions: {
            canEditBackdatedInvoices: true,
            canViewPurchaseRates: true,
            canViewProfitMargins: true,
            canGiveBillDiscounts: true,
            canDeleteInvoices: true,
            canManageUsers: true,
            canAccessSettings: true,
          },
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };

        const matchingFirm: Firm = firms.find((f) => f.tenantId === tenantId) || {
          id: `firm-${tenantId}`,
          tenantId,
          name: tenantItem.name,
          legalName: tenantItem.legalName || tenantItem.name,
          gstin: tenantItem.gstin || "UNREGISTERED",
          stateCode: tenantItem.stateCode,
          stateName: tenantItem.stateName,
          address: `Main Commercial Hub, ${tenantItem.stateName}`,
          pincode: "400001",
          phone: tenantItem.ownerPhone || "+91 98200 00000",
          email: tenantItem.ownerEmail,
          invoicePrefix: "INV",
          isPrimary: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // PRESERVE ALL OTHER FIRMS INSTEAD OF OVERWRITING
        const updatedFirms = firms.some((f) => f.id === matchingFirm.id)
          ? firms
          : [matchingFirm, ...firms];
        const updatedStaff = [ownerUser, ...staffUsers.filter((u) => u.email !== ownerUser.email)];

        set({
          currentUser: ownerUser,
          staffUsers: updatedStaff,
          firms: updatedFirms,
          activeFirmId: matchingFirm.id,
          placeOfSupply: tenantItem.stateCode,
          tenant: {
            id: tenantItem.id,
            name: tenantItem.name,
            legalName: tenantItem.legalName || tenantItem.name,
            gstin: tenantItem.gstin || "UNREGISTERED",
            stateCode: tenantItem.stateCode,
            stateName: tenantItem.stateName,
            phone: tenantItem.ownerPhone || "+91 98200 00000",
            email: tenantItem.ownerEmail,
            address: `Main Commercial Hub, ${tenantItem.stateName}`,
            city: tenantItem.stateName,
            pincode: "400001",
            upiVpa: `${tenantItem.ownerEmail.split("@")[0]}@icici`,
            upiName: tenantItem.name,
            bankName: "HDFC Bank Ltd",
            bankAccountNumber: "50200012345678",
            bankIfsc: "HDFC0000123",
            bankBranch: "Main Branch",
            thermalHeader: `★ ${tenantItem.name.toUpperCase()} ★\nGSTIN: ${tenantItem.gstin || "UNREGISTERED"} | State: ${tenantItem.stateName}\nTax Invoice / Cash Receipt`,
            thermalFooter: "Thank you for shopping with us!\nGoods once sold will not be taken back without bill.\nVisit again! Have a great day.",
            termsAndConditions: "1. All disputes are subject to local jurisdiction.\n2. Goods once sold will be exchanged within 7 days in original condition.",
          },
        });

        if (typeof window !== "undefined") {
          localStorage.setItem("vyaparflow_auth_session", JSON.stringify(ownerUser));
        }
      },

      switchTenant: (tenantId) => {
        const { tenants, firms } = get();
        const tenantItem = tenants.find((t) => t.id === tenantId);
        if (!tenantItem) return;

        const matchingFirm = firms.find((f) => f.tenantId === tenantId);
        set((state) => ({
          activeFirmId: matchingFirm?.id || state.activeFirmId,
          tenant: {
            ...state.tenant,
            id: tenantItem.id,
            name: tenantItem.name,
            legalName: tenantItem.legalName || tenantItem.name,
            gstin: tenantItem.gstin || state.tenant.gstin,
            stateCode: tenantItem.stateCode,
            stateName: tenantItem.stateName,
          },
        }));
      },
    }),
    {
      name: "vyaparflow-pos-storage-v4",
      partialize: (state) => ({
        tenant: state.tenant,
        firms: state.firms,
        activeFirmId: state.activeFirmId,
        categories: state.categories,
        products: state.products,
        parties: state.parties,
        invoices: state.invoices,
        expenses: state.expenses,
        purchaseInvoices: state.purchaseInvoices,
        quotations: state.quotations,
        creditNotes: state.creditNotes,
        debitNotes: state.debitNotes,
        parkedCarts: state.parkedCarts,
        currentUser: state.currentUser,
        staffUsers: state.staffUsers,
        tenants: state.tenants,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Auto-recover and merge missing tenants, parties, firms & staff from permanent backup vault
        if (typeof window !== "undefined") {
          try {
            const rawVault = localStorage.getItem("vyaparflow_permanent_vault");
            if (rawVault) {
              const vault = JSON.parse(rawVault);

              if (vault.tenants && Array.isArray(vault.tenants) && vault.tenants.length > 0) {
                const tenantsMap = new Map<string, TenantRegistryItem>();
                (state.tenants || []).forEach((t) => tenantsMap.set(t.id, t));
                vault.tenants.forEach((vt: TenantRegistryItem) => {
                  if (!tenantsMap.has(vt.id)) tenantsMap.set(vt.id, vt);
                });
                state.tenants = Array.from(tenantsMap.values());
              }

              if (vault.parties && Array.isArray(vault.parties) && vault.parties.length > 0) {
                const partiesMap = new Map<string, Party>();
                (state.parties || []).forEach((p) => partiesMap.set(p.id, p));
                vault.parties.forEach((vp: Party) => {
                  if (!partiesMap.has(vp.id)) partiesMap.set(vp.id, vp);
                });
                state.parties = Array.from(partiesMap.values());
              }

              if (vault.firms && Array.isArray(vault.firms) && vault.firms.length > 0) {
                const firmsMap = new Map<string, Firm>();
                (state.firms || []).forEach((f) => firmsMap.set(f.id, f));
                vault.firms.forEach((vf: Firm) => {
                  if (!firmsMap.has(vf.id)) firmsMap.set(vf.id, vf);
                });
                state.firms = Array.from(firmsMap.values());
              }

              if (vault.staffUsers && Array.isArray(vault.staffUsers) && vault.staffUsers.length > 0) {
                const staffMap = new Map<string, StaffUser>();
                (state.staffUsers || []).forEach((s) => staffMap.set(s.id, s));
                vault.staffUsers.forEach((vs: StaffUser) => {
                  if (!staffMap.has(vs.id)) staffMap.set(vs.id, vs);
                });
                state.staffUsers = Array.from(staffMap.values());
              }
            }
          } catch (e) {
            console.error("Error restoring from permanent data vault:", e);
          }
        }

        // If user is logged in, ensure state.tenant and state.activeFirmId match current user's tenant
        if (state.currentUser) {
          const userEmail = state.currentUser.email ? state.currentUser.email.toLowerCase() : "";
          const tenantItem = state.tenants?.find(
            (t) => t.id === state.currentUser?.tenantId || (t.ownerEmail && t.ownerEmail.toLowerCase() === userEmail)
          );
          const matchingFirm = state.firms?.find(
            (f) => f.tenantId === state.currentUser?.tenantId || (tenantItem && f.name === tenantItem.name)
          );

          if (tenantItem) {
            state.tenant = {
              ...state.tenant,
              id: tenantItem.id,
              name: tenantItem.name,
              legalName: tenantItem.legalName || tenantItem.name,
              gstin: tenantItem.gstin || "UNREGISTERED",
              stateCode: tenantItem.stateCode,
              stateName: tenantItem.stateName,
              phone: tenantItem.ownerPhone || state.tenant.phone,
              email: tenantItem.ownerEmail || state.tenant.email,
              address: `Main Commercial Hub, ${tenantItem.stateName}`,
            };
            if (matchingFirm) {
              state.activeFirmId = matchingFirm.id;
            }
          }
        }

        // Ensure strictly 1 primary firm
        if (state.firms && state.firms.length > 0) {
          const primaryCount = state.firms.filter((f) => f.isPrimary).length;
          if (primaryCount > 1) {
            let foundFirst = false;
            state.firms = state.firms.map((f) => {
              if (f.isPrimary) {
                if (!foundFirst) {
                  foundFirst = true;
                  return f;
                }
                return { ...f, isPrimary: false };
              }
              return f;
            });
          } else if (primaryCount === 0) {
            state.firms[0].isPrimary = true;
          }
        }
      },
    }
  )
);
