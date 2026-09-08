import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBarcode } from "@/lib/barcode-parser";

const InwardSchema = z.object({
  productId: z.string().optional(),
  barcodeOrSku: z.string().optional(),
  godownId: z.string().default("godown-1"),
  godownName: z.string().default("Store Front Counter"),
  quantity: z.number().positive("Inward quantity must be greater than 0"),
  purchasePrice: z.number().min(0, "Purchase price cannot be negative"),
  salePrice: z.number().optional(),
  mrp: z.number().optional(),
  batchNo: z.string().optional(),
  mfgDate: z.string().optional(),
  expDate: z.string().optional(),
  serials: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = InwardSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          issues: validated.error.errors,
        },
        { status: 400 }
      );
    }

    const data = validated.data;
    const parsedBarcode = data.barcodeOrSku ? parseBarcode(data.barcodeOrSku) : null;

    // Return structured payload ready for client/store synchronization
    return NextResponse.json({
      success: true,
      message: `Successfully processed inward of ${data.quantity} units`,
      data: {
        ...data,
        parsedBarcode,
        inwardedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Internal server error during quick stock inward",
      },
      { status: 500 }
    );
  }
}
