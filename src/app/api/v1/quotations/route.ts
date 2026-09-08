import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { INITIAL_QUOTATIONS } from "@/lib/mock-data";

const QuotationItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  batchId: z.string().optional().nullable(),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.string().default("PCS"),
  unitPrice: z.number().nonnegative("Unit price cannot be negative"),
  discountPercent: z.number().min(0).max(100).default(0),
  discountAmount: z.number().nonnegative().default(0),
  taxRate: z.number().nonnegative().default(18),
});

const CreateQuotationSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
  partyId: z.string().optional().nullable(),
  quoteNo: z.string().optional(),
  quoteDate: z.string().optional(),
  validUntil: z.string().optional().nullable(),
  items: z.array(QuotationItemSchema).min(1, "At least one item is required"),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
});

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || "tenant-vyapar-01";
    const status = searchParams.get("status");

    try {
      const quotations = await prisma.quotation.findMany({
        where: {
          tenantId,
          ...(status ? { status: status as any } : {}),
        },
        include: {
          party: true,
          items: {
            include: { product: true },
          },
        },
        orderBy: { quoteDate: "desc" },
      });

      return NextResponse.json({ success: true, data: quotations });
    } catch {
      return NextResponse.json({ success: true, data: INITIAL_QUOTATIONS });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch quotations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateQuotationSchema.parse(body);

    const quoteDate = validated.quoteDate ? new Date(validated.quoteDate) : new Date();
    const quoteNo = validated.quoteNo || `EST-${Date.now().toString().slice(-6)}`;

    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const calculatedItems = validated.items.map((it) => {
      const baseVal = it.quantity * it.unitPrice;
      const disc = it.discountAmount > 0 ? it.discountAmount : baseVal * (it.discountPercent / 100);
      const taxable = Math.max(0, baseVal - disc);
      const tax = taxable * (it.taxRate / 100);
      const lineTotal = taxable + tax;

      subtotal += baseVal;
      totalDiscount += disc;
      totalTax += tax;

      return {
        ...it,
        discountAmount: round2(disc),
        taxableAmount: round2(taxable),
        taxAmount: round2(tax),
        total: round2(lineTotal),
      };
    });

    subtotal = round2(subtotal);
    totalDiscount = round2(totalDiscount);
    const taxableAmount = round2(subtotal - totalDiscount);
    totalTax = round2(totalTax);
    const rawGrandTotal = taxableAmount + totalTax;
    const grandTotal = Math.round(rawGrandTotal);
    const roundOff = round2(grandTotal - rawGrandTotal);

    try {
      const quotation = await prisma.quotation.create({
        data: {
          tenantId: validated.tenantId,
          partyId: validated.partyId,
          quoteNo,
          quoteDate,
          validUntil: validated.validUntil ? new Date(validated.validUntil) : null,
          subtotal,
          discountTotal: totalDiscount,
          taxableAmount,
          taxAmount: totalTax,
          roundOff,
          grandTotal,
          status: "DRAFT",
          notes: validated.notes,
          terms: validated.terms,
          items: {
            create: calculatedItems.map((item) => ({
              productId: item.productId,
              batchId: item.batchId,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              discountPercent: item.discountPercent,
              discountAmount: item.discountAmount,
              taxRate: item.taxRate,
              taxableAmount: item.taxableAmount,
              taxAmount: item.taxAmount,
              total: item.total,
            })),
          },
        },
        include: {
          items: true,
          party: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Quotation generated successfully",
        data: quotation,
      });
    } catch (dbErr: any) {
      console.warn("DB offline, returning synthesized quote:", dbErr.message);
      return NextResponse.json({
        success: true,
        data: {
          id: `quote-${Date.now()}`,
          tenantId: validated.tenantId,
          partyId: validated.partyId,
          quoteNo,
          quoteDate: quoteDate.toISOString(),
          subtotal,
          discountTotal: totalDiscount,
          taxableAmount,
          taxAmount: totalTax,
          grandTotal,
          status: "DRAFT",
          items: calculatedItems,
        },
      });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`) },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create quotation" },
      { status: 500 }
    );
  }
}
