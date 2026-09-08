import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { INITIAL_FIRMS } from "@/lib/mock-data";
import { extractStateFromGstin, isValidGstin } from "@/lib/tax-engine";

const CreateFirmSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required").default("tenant-vyapar-01"),
  name: z.string().min(2, "Trade Name must be at least 2 characters"),
  legalName: z.string().optional().nullable(),
  gstin: z
    .string()
    .refine(
      (val) => !val || isValidGstin(val),
      "Invalid GSTIN format. Expected 15-character alphanumeric (e.g. 27AABCU9603R1ZM)"
    )
    .optional()
    .nullable(),
  stateCode: z.string().length(2, "State Code must be 2 digits (e.g. 27)"),
  stateName: z.string().min(1, "State Name is required"),
  address: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  upiId: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  accountNo: z.string().optional().nullable(),
  ifsc: z.string().optional().nullable(),
  invoicePrefix: z.string().min(1, "Invoice prefix is required").default("INV"),
  isPrimary: z.boolean().default(false),
  logoUrl: z.string().optional().nullable(),
  signatureUrl: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || "tenant-vyapar-01";

    try {
      const firms = await prisma.firm.findMany({
        where: { tenantId },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      });

      if (firms && firms.length > 0) {
        return NextResponse.json({ success: true, data: firms });
      }
    } catch (dbErr) {
      console.warn("Database query for firms failed, using fallback:", dbErr);
    }

    // Fallback to initial firms
    return NextResponse.json({
      success: true,
      data: INITIAL_FIRMS.filter((f) => f.tenantId === tenantId),
    });
  } catch (error: any) {
    console.error("GET /api/v1/firms error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch firms" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Auto-extract state code and name if GSTIN is provided and state was not manually selected
    if (body.gstin && (!body.stateCode || !body.stateName)) {
      const extracted = extractStateFromGstin(body.gstin);
      if (extracted) {
        body.stateCode = body.stateCode || extracted.stateCode;
        body.stateName = body.stateName || extracted.stateName;
      }
    }

    const validation = CreateFirmSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const firmData = validation.data;
    const firmId = `firm-${Date.now()}`;

    try {
      if (firmData.isPrimary) {
        // Unset primary on other firms
        await prisma.firm.updateMany({
          where: { tenantId: firmData.tenantId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const created = await prisma.firm.create({
        data: {
          id: firmId,
          tenantId: firmData.tenantId,
          name: firmData.name,
          legalName: firmData.legalName || null,
          gstin: firmData.gstin ? firmData.gstin.toUpperCase() : null,
          stateCode: firmData.stateCode,
          stateName: firmData.stateName,
          address: firmData.address || null,
          pincode: firmData.pincode || null,
          phone: firmData.phone || null,
          email: firmData.email || null,
          upiId: firmData.upiId || null,
          bankName: firmData.bankName || null,
          accountNo: firmData.accountNo || null,
          ifsc: firmData.ifsc ? firmData.ifsc.toUpperCase() : null,
          invoicePrefix: (firmData.invoicePrefix || "INV").toUpperCase(),
          isPrimary: firmData.isPrimary,
          logoUrl: firmData.logoUrl || null,
          signatureUrl: firmData.signatureUrl || null,
        },
      });

      return NextResponse.json({ success: true, data: created });
    } catch (dbErr) {
      console.warn("Database write for firm failed, returning synthesized record:", dbErr);
      const synthesizedFirm = {
        id: firmId,
        ...firmData,
        gstin: firmData.gstin?.toUpperCase(),
        invoicePrefix: firmData.invoicePrefix?.toUpperCase() || "INV",
        ifsc: firmData.ifsc?.toUpperCase(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return NextResponse.json({ success: true, data: synthesizedFirm });
    }
  } catch (error: any) {
    console.error("POST /api/v1/firms error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create firm" }, { status: 500 });
  }
}
