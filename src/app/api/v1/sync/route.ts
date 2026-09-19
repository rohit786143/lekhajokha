import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Format helper to map database invoice to client Invoice type
function mapDbInvoiceToClient(inv: any) {
  return {
    id: inv.id,
    tenantId: inv.tenantId,
    invoiceType: inv.invoiceType,
    invoiceNo: inv.invoiceNo,
    referenceNo: inv.referenceNo || undefined,
    firmId: inv.firmId || undefined,
    firm: inv.firm
      ? {
          id: inv.firm.id,
          tenantId: inv.firm.tenantId,
          name: inv.firm.name,
          legalName: inv.firm.legalName || undefined,
          gstin: inv.firm.gstin || undefined,
          stateCode: inv.firm.stateCode,
          stateName: inv.firm.stateName,
          address: inv.firm.address || undefined,
          pincode: inv.firm.pincode || undefined,
          phone: inv.firm.phone || undefined,
          email: inv.firm.email || undefined,
          invoicePrefix: inv.firm.invoicePrefix,
          isPrimary: inv.firm.isPrimary,
        }
      : undefined,
    partyId: inv.partyId || undefined,
    party: inv.party
      ? {
          id: inv.party.id,
          tenantId: inv.party.tenantId,
          name: inv.party.name,
          type: inv.party.type,
          phone: inv.party.phone || undefined,
          email: inv.party.email || undefined,
          gstin: inv.party.gstin || undefined,
          stateCode: inv.party.stateCode,
          billingAddress: inv.party.billingAddress || undefined,
          shippingAddress: inv.party.shippingAddress || undefined,
          creditLimit: inv.party.creditLimit,
          openingBalance: inv.party.openingBalance,
          currentBalance: inv.party.currentBalance,
          createdAt: inv.party.createdAt ? inv.party.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: inv.party.updatedAt ? inv.party.updatedAt.toISOString() : new Date().toISOString(),
        }
      : undefined,
    godownId: inv.godownId || undefined,
    placeOfSupply: inv.placeOfSupply,
    isInterState: inv.isInterState,
    subtotal: inv.subtotal,
    discountTotal: inv.discountTotal,
    taxableAmount: inv.taxableAmount,
    cgst: inv.cgst,
    sgst: inv.sgst,
    igst: inv.igst,
    cess: inv.cess,
    roundOff: inv.roundOff,
    grandTotal: inv.grandTotal,
    paidAmount: inv.paidAmount,
    balanceAmount: inv.balanceAmount,
    status: inv.status,
    paymentStatus: inv.paymentStatus,
    paymentSplits: (inv.payments || []).map((p: any) => ({
      mode: p.mode,
      amount: p.amount,
      refNumber: p.refNumber || undefined,
      bankName: p.bankName || undefined,
      chequeDate: p.chequeDate ? p.chequeDate.toISOString() : undefined,
    })),
    items: (inv.items || []).map((it: any) => ({
      id: it.id,
      productId: it.productId,
      product: it.product
        ? {
            id: it.product.id,
            tenantId: it.product.tenantId,
            sku: it.product.sku,
            name: it.product.name,
            unit: it.product.unit,
            hsn: it.product.hsn,
            taxRate: it.product.taxRate,
            salePrice: it.product.salePrice,
            mrp: it.product.mrp,
            currentStock: it.product.currentStock,
            isTaxInclusive: it.product.isTaxInclusive,
          }
        : {
            id: it.productId,
            name: it.itemDescription || "Product",
            sku: "",
            unit: it.unit,
            hsn: "",
            taxRate: it.taxRate,
            salePrice: it.unitPrice,
            mrp: it.mrp,
            currentStock: 100,
            isTaxInclusive: it.isTaxInclusive,
          },
      selectedBatch: it.batch
        ? {
            id: it.batch.id,
            productId: it.batch.productId,
            godownId: it.batch.godownId || "",
            godownName: "Godown",
            batchNo: it.batch.batchNo,
            stockQty: it.batch.stockQty,
            purchasePrice: it.batch.purchasePrice,
            salePrice: it.batch.salePrice,
            mrp: it.batch.mrp,
          }
        : undefined,
      selectedSerials: it.selectedSerials || [],
      quantity: it.quantity,
      unit: it.unit,
      unitPrice: it.unitPrice,
      mrp: it.mrp,
      isTaxInclusive: it.isTaxInclusive,
      discountPercent: it.discountPercent,
      discountAmount: it.discountAmount,
      taxRate: it.taxRate,
      taxableAmount: it.taxableAmount,
      cgst: it.cgst,
      sgst: it.sgst,
      igst: it.igst,
      cess: it.cess,
      total: it.total,
      hsn: it.product?.hsn || "",
    })),
    notes: inv.notes || undefined,
    terms: inv.terms || undefined,
    createdAt: inv.createdAt ? inv.createdAt.toISOString() : new Date().toISOString(),
  };
}

// GET: Fetch complete multi-device synchronized data for the tenant
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "tenantId query parameter is required" }, { status: 400 });
    }

    // Query tenant records in parallel
    const [
      tenant,
      firms,
      products,
      parties,
      categories,
      invoices,
      expenses,
      purchases,
      quotations,
    ] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { settings: true },
      }).catch(() => null),

      prisma.firm.findMany({
        where: { tenantId },
        orderBy: { isPrimary: "desc" },
      }).catch(() => []),

      prisma.product.findMany({
        where: { tenantId },
        include: { batches: true, serials: true },
        orderBy: { name: "asc" },
      }).catch(() => []),

      prisma.party.findMany({
        where: { tenantId },
        orderBy: { name: "asc" },
      }).catch(() => []),

      prisma.category.findMany({
        where: { tenantId },
        orderBy: { name: "asc" },
      }).catch(() => []),

      prisma.invoice.findMany({
        where: { tenantId },
        include: {
          party: true,
          firm: true,
          items: { include: { product: true, batch: true } },
          payments: true,
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }).catch(() => []),

      prisma.expense.findMany({
        where: { tenantId },
        orderBy: { expenseDate: "desc" },
        take: 200,
      }).catch(() => []),

      prisma.purchaseInvoice.findMany({
        where: { tenantId },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }).catch(() => []),

      prisma.quotation.findMany({
        where: { tenantId },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }).catch(() => []),
    ]);

    const formattedInvoices = invoices.map(mapDbInvoiceToClient);

    const formattedProducts = products.map((p) => ({
      id: p.id,
      tenantId: p.tenantId,
      categoryId: p.categoryId || "",
      sku: p.sku,
      barcode: p.barcode || "",
      name: p.name,
      description: p.description || "",
      unit: p.unit,
      secondaryUnit: p.secondaryUnit || undefined,
      conversionRate: p.conversionRate || undefined,
      hsn: p.hsn,
      taxRate: p.taxRate,
      isTaxInclusive: p.isTaxInclusive,
      cessRate: p.cessRate,
      purchasePrice: p.purchasePrice,
      salePrice: p.salePrice,
      mrp: p.mrp,
      wholesalePrice: p.wholesalePrice || undefined,
      minStock: p.minStock,
      currentStock: p.currentStock,
      trackBatch: p.trackBatch,
      trackSerial: p.trackSerial,
      imageUrl: p.imageUrl || undefined,
      batches: (p.batches || []).map((b) => ({
        id: b.id,
        productId: b.productId,
        godownId: b.godownId || "",
        godownName: "Central Godown",
        batchNo: b.batchNo,
        mfgDate: b.mfgDate ? b.mfgDate.toISOString() : undefined,
        expDate: b.expDate ? b.expDate.toISOString() : undefined,
        stockQty: b.stockQty,
        purchasePrice: b.purchasePrice,
        salePrice: b.salePrice,
        wholesalePrice: b.wholesalePrice || undefined,
        mrp: b.mrp,
      })),
      serials: (p.serials || []).map((s) => ({
        id: s.id,
        productId: s.productId,
        serialOrImei: s.serialOrImei,
        status: s.status as any,
      })),
    }));

    const formattedParties = parties.map((pt) => ({
      id: pt.id,
      tenantId: pt.tenantId,
      name: pt.name,
      type: pt.type as any,
      phone: pt.phone || "",
      email: pt.email || "",
      gstin: pt.gstin || "",
      pan: pt.pan || "",
      stateCode: pt.stateCode,
      billingAddress: pt.billingAddress || "",
      shippingAddress: pt.shippingAddress || "",
      city: pt.city || "",
      pincode: pt.pincode || "",
      creditLimit: pt.creditLimit,
      openingBalance: pt.openingBalance,
      currentBalance: pt.currentBalance,
    }));

    const formattedFirms = firms.map((f) => ({
      id: f.id,
      tenantId: f.tenantId,
      name: f.name,
      legalName: f.legalName || undefined,
      gstin: f.gstin || undefined,
      stateCode: f.stateCode,
      stateName: f.stateName,
      address: f.address || undefined,
      pincode: f.pincode || undefined,
      phone: f.phone || undefined,
      email: f.email || undefined,
      upiId: f.upiId || undefined,
      bankName: f.bankName || undefined,
      accountNo: f.accountNo || undefined,
      ifsc: f.ifsc || undefined,
      invoicePrefix: f.invoicePrefix,
      isPrimary: f.isPrimary,
      logoUrl: f.logoUrl || undefined,
      signatureUrl: f.signatureUrl || undefined,
    }));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        tenant,
        firms: formattedFirms,
        products: formattedProducts,
        parties: formattedParties,
        categories,
        invoices: formattedInvoices,
        expenses,
        purchases,
        quotations,
      },
    });
  } catch (error: any) {
    console.error("Sync GET Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Push local changes or missing client invoices/products to the cloud database
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, invoices, products, parties, categories, firms } = body;

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "tenantId is required" }, { status: 400 });
    }

    // 1. Ensure Tenant exists in DB
    let tenantRecord = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenantRecord) {
      tenantRecord = await prisma.tenant.create({
        data: {
          id: tenantId,
          name: body.tenantName || "VyaparFlow Enterprise",
          slug: `tenant-${tenantId.slice(0, 8)}`,
          gstin: body.gstin || "UNREGISTERED",
          stateCode: body.stateCode || "27",
        },
      });
    }

    let syncedInvoicesCount = 0;
    let syncedProductsCount = 0;
    let syncedPartiesCount = 0;

    // 2. Sync Firms
    if (Array.isArray(firms) && firms.length > 0) {
      for (const f of firms) {
        if (!f.name) continue;
        const existingFirm = await prisma.firm.findFirst({
          where: { tenantId, name: f.name },
        });
        if (!existingFirm) {
          await prisma.firm.create({
            data: {
              id: f.id?.startsWith("firm-") ? undefined : f.id,
              tenantId,
              name: f.name,
              legalName: f.legalName || f.name,
              gstin: f.gstin || null,
              stateCode: f.stateCode || "27",
              stateName: f.stateName || "State",
              address: f.address || null,
              pincode: f.pincode || null,
              phone: f.phone || null,
              email: f.email || null,
              invoicePrefix: f.invoicePrefix || "INV",
              isPrimary: !!f.isPrimary,
            },
          }).catch(() => null);
        }
      }
    }

    // 3. Sync Categories
    if (Array.isArray(categories) && categories.length > 0) {
      for (const cat of categories) {
        if (!cat.name) continue;
        const exists = await prisma.category.findFirst({
          where: { tenantId, name: cat.name },
        });
        if (!exists) {
          await prisma.category.create({
            data: {
              tenantId,
              name: cat.name,
              codePrefix: cat.codePrefix || cat.name.slice(0, 4).toUpperCase(),
              defaultGstRate: Number(cat.defaultGstRate) || 18.0,
              hsnCode: cat.hsnCode || "9999",
            },
          }).catch(() => null);
        }
      }
    }

    // 4. Sync Products
    if (Array.isArray(products) && products.length > 0) {
      for (const p of products) {
        if (!p.name) continue;
        const existing = await prisma.product.findFirst({
          where: { tenantId, OR: [{ id: p.id }, { sku: p.sku }] },
        });
        if (!existing) {
          await prisma.product.create({
            data: {
              id: p.id?.startsWith("prod-") ? p.id : undefined,
              tenantId,
              name: p.name,
              sku: p.sku || `SKU-${Date.now().toString().slice(-4)}`,
              unit: p.unit || "PCS",
              hsn: p.hsn || "9999",
              taxRate: Number(p.taxRate) || 18.0,
              isTaxInclusive: !!p.isTaxInclusive,
              salePrice: Number(p.salePrice) || 0,
              mrp: Number(p.mrp) || Number(p.salePrice) || 0,
              purchasePrice: Number(p.purchasePrice) || 0,
              currentStock: Number(p.currentStock) || 0,
              minStock: Number(p.minStock) || 10,
            },
          }).catch(() => null);
          syncedProductsCount++;
        }
      }
    }

    // 5. Sync Parties (Customers & Vendors)
    if (Array.isArray(parties) && parties.length > 0) {
      for (const pt of parties) {
        if (!pt.name || pt.id === "party-walkin-cash") continue;
        const existing = await prisma.party.findFirst({
          where: { tenantId, OR: [{ id: pt.id }, { name: pt.name }] },
        });
        if (!existing) {
          await prisma.party.create({
            data: {
              id: pt.id?.startsWith("party-") ? pt.id : undefined,
              tenantId,
              name: pt.name,
              type: pt.type === "VENDOR" ? "VENDOR" : "CUSTOMER",
              phone: pt.phone || null,
              email: pt.email || null,
              gstin: pt.gstin || null,
              stateCode: pt.stateCode || "27",
              currentBalance: Number(pt.currentBalance) || 0,
            },
          }).catch(() => null);
          syncedPartiesCount++;
        }
      }
    }

    // 6. Sync Invoices from local client if missing in DB
    if (Array.isArray(invoices) && invoices.length > 0) {
      for (const inv of invoices) {
        if (!inv.invoiceNo) continue;
        const existingInv = await prisma.invoice.findFirst({
          where: { tenantId, invoiceNo: inv.invoiceNo },
        });

        if (!existingInv) {
          // Check party
          let validPartyId: string | null = null;
          if (inv.partyId && inv.partyId !== "party-walkin-cash") {
            const pExists = await prisma.party.findUnique({ where: { id: inv.partyId } });
            if (pExists) validPartyId = pExists.id;
          }

          // Check firm
          let validFirmId: string | null = null;
          if (inv.firmId) {
            const fExists = await prisma.firm.findFirst({ where: { id: inv.firmId, tenantId } });
            if (fExists) validFirmId = fExists.id;
          }
          if (!validFirmId) {
            const primaryFirm = await prisma.firm.findFirst({ where: { tenantId } });
            if (primaryFirm) validFirmId = primaryFirm.id;
          }

          // Ensure products exist in DB before adding line items
          const dbItems = [];
          for (const it of inv.items || []) {
            let prodId = it.productId;
            let dbProduct = await prisma.product.findFirst({ where: { id: prodId, tenantId } });
            if (!dbProduct) {
              dbProduct = await prisma.product.create({
                data: {
                  id: prodId,
                  tenantId,
                  name: it.product?.name || `Product ${prodId}`,
                  sku: it.product?.sku || `SKU-${Date.now().toString().slice(-4)}`,
                  unit: it.unit || "PCS",
                  hsn: it.hsn || "9999",
                  taxRate: Number(it.taxRate) || 18.0,
                  salePrice: Number(it.unitPrice) || 0,
                  mrp: Number(it.mrp) || Number(it.unitPrice) || 0,
                  currentStock: 100,
                },
              }).catch(() => null);
            }

            if (dbProduct) {
              dbItems.push({
                productId: dbProduct.id,
                quantity: Number(it.quantity) || 1,
                unit: it.unit || "PCS",
                mrp: Number(it.mrp) || 0,
                unitPrice: Number(it.unitPrice) || 0,
                isTaxInclusive: !!it.isTaxInclusive,
                discountPercent: Number(it.discountPercent) || 0,
                discountAmount: Number(it.discountAmount) || 0,
                taxRate: Number(it.taxRate) || 0,
                taxableAmount: Number(it.taxableAmount) || 0,
                cgst: Number(it.cgst) || 0,
                sgst: Number(it.sgst) || 0,
                igst: Number(it.igst) || 0,
                cess: Number(it.cess) || 0,
                total: Number(it.total) || 0,
              });
            }
          }

          const created = await prisma.invoice.create({
            data: {
              tenantId,
              invoiceType: inv.invoiceType || "TAX_INVOICE",
              invoiceNo: inv.invoiceNo,
              firmId: validFirmId,
              partyId: validPartyId,
              placeOfSupply: inv.placeOfSupply || "27",
              isInterState: !!inv.isInterState,
              subtotal: Number(inv.subtotal) || 0,
              discountTotal: Number(inv.discountTotal) || 0,
              taxableAmount: Number(inv.taxableAmount) || 0,
              cgst: Number(inv.cgst) || 0,
              sgst: Number(inv.sgst) || 0,
              igst: Number(inv.igst) || 0,
              cess: Number(inv.cess) || 0,
              roundOff: Number(inv.roundOff) || 0,
              grandTotal: Number(inv.grandTotal) || 0,
              paidAmount: Number(inv.paidAmount) || 0,
              balanceAmount: Number(inv.balanceAmount) || 0,
              status: inv.status || "COMPLETED",
              paymentStatus: inv.paymentStatus || "PAID",
              notes: inv.notes || null,
              terms: inv.terms || null,
              createdAt: inv.createdAt ? new Date(inv.createdAt) : new Date(),
              items: {
                create: dbItems,
              },
              payments: {
                create: (inv.paymentSplits || []).map((p: any) => ({
                  tenantId,
                  mode: p.mode || "CASH",
                  amount: Number(p.amount) || Number(inv.grandTotal) || 0,
                  refNumber: p.refNumber || null,
                  bankName: p.bankName || null,
                  status: "PAID",
                })),
              },
            },
          }).catch((err) => {
            console.error("Failed to sync invoice to DB:", inv.invoiceNo, err.message);
            return null;
          });

          if (created) syncedInvoicesCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      syncedInvoicesCount,
      syncedProductsCount,
      syncedPartiesCount,
      message: "Sync completed successfully",
    });
  } catch (error: any) {
    console.error("Sync POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
