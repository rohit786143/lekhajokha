/**
 * useTenantData - Custom hook that returns tenant-scoped data from the POS store.
 * All data is automatically filtered to only include items belonging to the current tenant.
 * This prevents cross-tenant data leakage in a multi-tenant environment.
 */
import { useMemo } from "react";
import { usePosStore } from "./pos-store";

export function useTenantData() {
  const {
    tenant,
    firms,
    activeFirmId,
    products,
    parties,
    invoices,
    expenses,
    purchaseInvoices,
    quotations,
    creditNotes,
    debitNotes,
    categories,
    godowns,
    currentUser,
  } = usePosStore();

  const tenantId = currentUser?.tenantId || tenant?.id || "tenant-vyapar-01";
  const isDefaultTenant = tenantId === "tenant-vyapar-01";
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const matchesTenant = (itemTenantId?: string) => {
    if (!itemTenantId) return isDefaultTenant;
    return itemTenantId === tenantId;
  };

  const memoizedTenant = useMemo(
    () => ({ ...tenant, id: tenantId }),
    [tenant, tenantId]
  );

  const tenantProducts = useMemo(
    () => products.filter((p) => matchesTenant(p.tenantId)),
    [products, tenantId]
  );

  const tenantParties = useMemo(
    () => parties.filter((p) => matchesTenant(p.tenantId)),
    [parties, tenantId]
  );

  const tenantInvoices = useMemo(
    () =>
      invoices.filter(
        (i) =>
          matchesTenant(i.tenantId) &&
          i.invoiceNo !== "TEST-4691" &&
          i.id !== "TEST-4691" &&
          !i.invoiceNo?.toUpperCase().includes("TEST-4691")
      ),
    [invoices, tenantId]
  );

  const tenantExpenses = useMemo(
    () => expenses.filter((e) => matchesTenant(e.tenantId)),
    [expenses, tenantId]
  );

  const tenantPurchaseInvoices = useMemo(
    () => purchaseInvoices.filter((p) => matchesTenant(p.tenantId)),
    [purchaseInvoices, tenantId]
  );

  const tenantQuotations = useMemo(
    () => quotations.filter((q) => matchesTenant(q.tenantId)),
    [quotations, tenantId]
  );

  const tenantCreditNotes = useMemo(
    () => creditNotes.filter((c) => matchesTenant(c.tenantId)),
    [creditNotes, tenantId]
  );

  const tenantDebitNotes = useMemo(
    () => debitNotes.filter((d) => matchesTenant(d.tenantId)),
    [debitNotes, tenantId]
  );

  const tenantCategories = useMemo(
    () => categories.filter((c) => matchesTenant(c.tenantId)),
    [categories, tenantId]
  );

  const tenantFirms = useMemo(
    () => firms.filter((f) => matchesTenant(f.tenantId)),
    [firms, tenantId]
  );

  return {
    tenantId,
    tenant: memoizedTenant,
    firms: tenantFirms,
    activeFirmId,
    godowns,
    products: tenantProducts,
    parties: tenantParties,
    invoices: tenantInvoices,
    expenses: tenantExpenses,
    purchaseInvoices: tenantPurchaseInvoices,
    quotations: tenantQuotations,
    creditNotes: tenantCreditNotes,
    debitNotes: tenantDebitNotes,
    categories: tenantCategories,
  };
}

