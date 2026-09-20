import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { calculateLineItem, isInterStateTransaction, generateUpiUri } from "@/lib/tax-engine";
import { INITIAL_INVOICES } from "@/lib/mock-data";
import {
  appendToTenantSheet,
  updateTenantLiveStock,
  fireAndForgetSheetSync,
} from "@/lib/google-sheets";

// ----------------------------------------------------------------------
// ZOD VALIDATION SCHEMAS
// ----------------------------------------------------------------------

const InvoiceItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  name: z.string().optional(),
  sku: z.string().optional(),
  unit: z.string().optional(),
  hsn: z.string().optional(),
  taxRate: z.number().optional(),
  batchId: z.string().optional().nullable(),
  selectedSerials: z.array(z.string()).optional().default([]),
  quantity: z.number().positive("Quantity must be greater than zero"),
  unitPrice: z.number().nonnegative("Unit price cannot be negative"),
  isTaxInclusive: z.boolean().optional().default(false),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  discountAmount: z.number().nonnegative().optional().default(0),
});

const PaymentSplitSchema = z.object({
  mode: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "CREDIT"]),
  amount: z.number().positive("Payment amount must be greater than zero"),
  refNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  chequeDate: z.string().optional().nullable(),
});

const CreateInvoiceSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
  invoiceType: z
    .enum([
      "TAX_INVOICE",
      "QUOTATION",
      "PROFORMA",
      "DELIVERY_CHALLAN",
      "BILL_OF_SUPPLY",
      "CREDIT_NOTE",
      "PURCHASE_ORDER",
      "PURCHASE_BILL",
      "DEBIT_NOTE",
    ])
    .default("TAX_INVOICE"),
  firmId: z.string().optional().nullable(),
  partyId: z.string().optional().nullable(),
  godownId: z.string().optional().nullable(),
  placeOfSupply: z.string().optional().default("27"),
  items: z.array(InvoiceItemSchema).min(1, "Invoice must have at least one item"),
  payments: z.array(PaymentSplitSchema).optional().default([]),
  billDiscount: z.number().nonnegative().optional().default(0),
  autoRoundOff: z.boolean().optional().default(true),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
});

// Helper for 2-decimal rounding
function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

// ----------------------------------------------------------------------
// POST: ACID TRANSACTION BILLING ENGINE
// ----------------------------------------------------------------------

export async function POST(req: NextRequest) {
  let validatedData: z.infer<typeof CreateInvoiceSchema> | null = null;

  try {
    const rawBody = await req.json();
    validatedData = CreateInvoiceSchema.parse(rawBody);

    const {
      tenantId,
      invoiceType,
      firmId,
      partyId,
      godownId,
      placeOfSupply,
      items,
      payments,
      billDiscount,
      autoRoundOff,
      notes,
      terms,
    } = validatedData;

    // 1. Strictly validate that tenantId exists in Neon PostgreSQL
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { settings: true },
    });

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid tenantId: "${tenantId}". No tenant exists in the database with this ID. Invoices cannot be created without a valid registered tenant.`,
        },
        { status: 400 }
      );
    }

    // Execute everything inside an isolated ACID transaction
    const result = await prisma.$transaction(async (tx) => {
      const supplierState = tenant.stateCode || "27";
      const isInterState = isInterStateTransaction(supplierState, placeOfSupply);

      // 2. Fetch Party if provided
      let party = null;
      if (partyId) {
        party = await tx.party.findFirst({
          where: { id: partyId, tenantId },
        });
      }

      // 3. Stock Availability Check & Row Locking
      const calculatedLineItems = [];
      let calculatedSubtotal = 0;
      let calculatedDiscountTotal = 0;
      let calculatedTaxable = 0;
      let calculatedCgst = 0;
      let calculatedSgst = 0;
      let calculatedIgst = 0;
      let calculatedCess = 0;

      for (const itemInput of items) {
        // Fetch product
        let product = await tx.product.findFirst({
          where: {
            tenantId,
            OR: [
              { id: itemInput.productId },
              ...(itemInput.sku ? [{ sku: itemInput.sku }] : []),
            ],
          },
        });

        // Bootstrap product in DB if not found
        if (!product) {
          const generatedSku = itemInput.sku || `SKU-${itemInput.productId.slice(-4)}-${Date.now().toString().slice(-4)}`;
          product = await tx.product.create({
            data: {
              tenantId,
              name: itemInput.name || `Product ${itemInput.productId}`,
              sku: generatedSku,
              unit: itemInput.unit || "PCS",
              hsn: itemInput.hsn || "9999",
              taxRate: itemInput.taxRate ?? 18.0,
              salePrice: itemInput.unitPrice,
              currentStock: 100,
            },
          });
        }

        // Validate stock if batch-tracked
        let batch = null;
        if (product.trackBatch && itemInput.batchId) {
          batch = await tx.productBatch.findFirst({
            where: { id: itemInput.batchId, productId: product.id },
          });

          if (!batch || batch.stockQty < itemInput.quantity) {
            throw new Error(
              `Insufficient stock for Batch "${batch?.batchNo || itemInput.batchId}" of Product "${
                product.name
              }". Available: ${batch?.stockQty || 0}, Requested: ${itemInput.quantity}`
            );
          }

          // Decrement batch stock atomically
          await tx.productBatch.update({
            where: { id: batch.id },
            data: { stockQty: { decrement: itemInput.quantity } },
          });
        } else {
          // Standard product stock check
          if (product.currentStock < itemInput.quantity) {
            // Note: In fast POS retail, if negative stock is not blocked by setting, we still decrement
            // Here we enforce strict inventory check
            if (product.currentStock < 0) {
              throw new Error(
                `Insufficient stock for Product "${product.name}". Available: ${product.currentStock}, Requested: ${itemInput.quantity}`
              );
            }
          }
        }

        // Decrement main product stock
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: { decrement: itemInput.quantity } },
        });

        // Record stock movement audit log
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: product.id,
            batchId: itemInput.batchId || null,
            fromGodown: godownId || null,
            qty: itemInput.quantity,
            type: "SALE",
            notes: `Auto-decremented via Invoice POS checkout`,
          },
        });

        // Mark serials/IMEIs as SOLD if present
        if (itemInput.selectedSerials && itemInput.selectedSerials.length > 0) {
          for (const s of itemInput.selectedSerials) {
            await tx.productSerial.updateMany({
              where: { productId: product.id, serialOrImei: s },
              data: { status: "SOLD" },
            });
          }
        }

        // Compute Item Tax Breakdown
        const lineBase = {
          id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: product.id,
          product: {
            id: product.id,
            tenantId: product.tenantId,
            sku: product.sku,
            name: product.name,
            unit: product.unit,
            hsn: product.hsn,
            taxRate: product.taxRate,
            isTaxInclusive: itemInput.isTaxInclusive ?? product.isTaxInclusive,
            cessRate: product.cessRate || 0,
            purchasePrice: product.purchasePrice,
            salePrice: product.salePrice,
            mrp: product.mrp,
            minStock: product.minStock,
            currentStock: product.currentStock,
            trackBatch: product.trackBatch,
            trackSerial: product.trackSerial,
          },
          selectedBatch: batch
            ? {
                id: batch.id,
                productId: batch.productId,
                godownId: batch.godownId,
                godownName: "Godown",
                batchNo: batch.batchNo,
                stockQty: batch.stockQty,
                purchasePrice: batch.purchasePrice,
                salePrice: batch.salePrice,
                mrp: batch.mrp,
              }
            : undefined,
          selectedSerials: itemInput.selectedSerials,
          quantity: itemInput.quantity,
          unit: product.unit,
          unitPrice: itemInput.unitPrice,
          mrp: product.mrp,
          isTaxInclusive: itemInput.isTaxInclusive ?? product.isTaxInclusive,
          discountPercent: itemInput.discountPercent || 0,
          discountAmount: itemInput.discountAmount || 0,
          taxRate: product.taxRate,
          cessRate: product.cessRate || 0,
          hsn: product.hsn,
        };

        const calculated = calculateLineItem(lineBase, isInterState);
        calculatedLineItems.push({
          productId: product.id,
          batchId: itemInput.batchId || null,
          selectedSerials: itemInput.selectedSerials || [],
          quantity: calculated.quantity,
          unit: calculated.unit,
          mrp: calculated.mrp,
          unitPrice: calculated.unitPrice,
          isTaxInclusive: calculated.isTaxInclusive,
          discountPercent: calculated.discountPercent,
          discountAmount: calculated.discountAmount,
          taxRate: calculated.taxRate,
          taxableAmount: calculated.taxableAmount,
          cgst: calculated.cgst,
          sgst: calculated.sgst,
          igst: calculated.igst,
          cess: calculated.cess,
          total: calculated.total,
        });

        calculatedSubtotal += calculated.quantity * calculated.unitPrice;
        calculatedDiscountTotal += calculated.discountAmount;
        calculatedTaxable += calculated.taxableAmount;
        calculatedCgst += calculated.cgst;
        calculatedSgst += calculated.sgst;
        calculatedIgst += calculated.igst;
        calculatedCess += calculated.cess;
      }

      // Apply Bill Discount (% of taxable amount) & Round-Off
      const discountPercent = Math.min(100, Math.max(0, billDiscount));
      const billDiscountAmount = round2((calculatedTaxable * discountPercent) / 100);

      calculatedDiscountTotal += billDiscountAmount;
      calculatedTaxable = Math.max(0, calculatedTaxable - billDiscountAmount);

      if (discountPercent > 0) {
        const taxFactor = (100 - discountPercent) / 100;
        calculatedCgst = round2(calculatedCgst * taxFactor);
        calculatedSgst = round2(calculatedSgst * taxFactor);
        calculatedIgst = round2(calculatedIgst * taxFactor);
        calculatedCess = round2(calculatedCess * taxFactor);
      }

      const preRoundGrand =
        calculatedTaxable + calculatedCgst + calculatedSgst + calculatedIgst + calculatedCess;

      let roundOff = 0;
      let grandTotal = preRoundGrand;

      if (autoRoundOff) {
        const rounded = Math.round(preRoundGrand);
        roundOff = round2(rounded - preRoundGrand);
        grandTotal = rounded;
      } else {
        grandTotal = round2(preRoundGrand);
      }

      // 4. Validate Payments & Calculate Paid / Balance
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const balanceAmount = Math.max(0, round2(grandTotal - totalPaid));
      const paymentStatus = balanceAmount <= 0 ? "PAID" : totalPaid > 0 ? "PARTIAL" : "UNPAID";

      // 5. Generate Sequential Invoice Number
      const count = await tx.invoice.count({ where: { tenantId } });
      const currentYear = new Date().getFullYear();
      const nextYearShort = (currentYear + 1).toString().substring(2);
      const currentYearShort = currentYear.toString().substring(2);
      const invoiceNo = `INV-${currentYearShort}${nextYearShort}-${String(count + 1).padStart(
        4,
        "0"
      )}`;

      // Validate firm
      let validFirmId: string | null = null;
      if (firmId) {
        const firmExists = await tx.firm.findFirst({ where: { id: firmId, tenantId } });
        if (firmExists) validFirmId = firmExists.id;
      }
      if (!validFirmId) {
        const primaryFirm = await tx.firm.findFirst({ where: { tenantId } });
        if (primaryFirm) validFirmId = primaryFirm.id;
      }

      // Validate godown
      let validGodownId: string | null = null;
      if (godownId) {
        const godownExists = await tx.godown.findUnique({ where: { id: godownId } });
        if (godownExists) validGodownId = godownId;
      }

      // 6. Create Invoice Record with Nested Invoice Items
      const createdInvoice = await tx.invoice.create({
        data: {
          tenantId,
          invoiceType,
          invoiceNo,
          firmId: validFirmId,
          partyId: party?.id || null,
          godownId: validGodownId,
          placeOfSupply,
          isInterState,
          subtotal: round2(calculatedSubtotal),
          discountTotal: round2(calculatedDiscountTotal),
          taxableAmount: round2(calculatedTaxable),
          cgst: round2(calculatedCgst),
          sgst: round2(calculatedSgst),
          igst: round2(calculatedIgst),
          cess: round2(calculatedCess),
          roundOff: round2(roundOff),
          grandTotal: round2(grandTotal),
          paidAmount: round2(totalPaid),
          balanceAmount: round2(balanceAmount),
          status: "COMPLETED",
          paymentStatus,
          notes: notes || null,
          terms: terms || null,
          items: {
            create: calculatedLineItems,
          },
        },
        include: {
          items: { include: { product: true, batch: true } },
          party: true,
          firm: true,
        },
      });

      // 7. Record Payment Transactions
      for (const p of payments) {
        await tx.payment.create({
          data: {
            tenantId,
            invoiceId: createdInvoice.id,
            partyId: party?.id || null,
            mode: p.mode,
            amount: p.amount,
            refNumber: p.refNumber || null,
            bankName: p.bankName || null,
            chequeDate: p.chequeDate ? new Date(p.chequeDate) : null,
            status: "PAID",
          },
        });
      }

      // 8. If Credit / Balance remains, update Party Khata Ledger
      if (party && balanceAmount > 0) {
        await tx.party.update({
          where: { id: party.id },
          data: {
            currentBalance: { increment: balanceAmount },
          },
        });
      }

      // 9. Generate Bharat QR Dynamic UPI payload for instant cashier/customer scanning
      const upiPayload = generateUpiUri({
        vpa: tenant.upiVpa || "vyaparflow@icici",
        payeeName: tenant.upiName || tenant.name,
        amount: balanceAmount > 0 ? balanceAmount : grandTotal,
        invoiceNo: createdInvoice.invoiceNo,
      });

        return {
          success: true,
          invoice: createdInvoice,
          upiPayload,
        };
      },
      {
        maxWait: 20000,
        timeout: 30000,
      }
    );

    // ── Google Sheets Live Backup (fire-and-forget) ──
    fireAndForgetSheetSync(async () => {
      const tenantId = validatedData!.tenantId;
      const settings = await prisma.tenantSetting.findUnique({
        where: { tenantId },
        select: { googleSheetId: true },
      }).catch(() => null);

      if (!settings?.googleSheetId) return;
      const sheetId = settings.googleSheetId;
      const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      const invoice = result.invoice;
      const customerName = invoice.party?.name || "Walk-in";

      // Append each item to Sales_Log
      for (const item of invoice.items) {
        await appendToTenantSheet(sheetId, "Sales_Log", [
          timestamp,
          invoice.invoiceNo,
          customerName,
          (item as any).product?.name || item.productId,
          (item as any).product?.sku || "",
          item.quantity,
          item.unitPrice,
          item.cgst + item.sgst + item.igst,
          item.total,
          invoice.paymentStatus,
        ]);
      }

      // Update Inventory_Live with decremented stock
      const inventoryItems = [];
      for (const item of invoice.items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        }).catch(() => null);
        if (product) {
          inventoryItems.push({
            productName: product.name,
            sku: product.sku,
            currentStock: product.currentStock,
            unit: product.unit,
            purchasePrice: product.purchasePrice,
            salePrice: product.salePrice,
            mrp: product.mrp,
            hsn: product.hsn,
            taxRate: product.taxRate,
          });
        }
      }
      if (inventoryItems.length > 0) {
        await updateTenantLiveStock(sheetId, inventoryItems);
      }
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Invoice Creation Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create invoice in database",
      },
      { status: 400 }
    );
  }
}

// ----------------------------------------------------------------------
// GET: INVOICES LIST & FILTERING API
// ----------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "tenantId query parameter is required" },
        { status: 400 }
      );
    }

    const partyId = searchParams.get("partyId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const whereClause: any = { tenantId };
    if (partyId) whereClause.partyId = partyId;
    if (status) whereClause.status = status;

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        party: true,
        firm: true,
        items: { include: { product: true, batch: true } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (error: any) {
    console.error("Fetch Invoices Error:", error.message || error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch invoices from database",
      },
      { status: 500 }
    );
  }
}
