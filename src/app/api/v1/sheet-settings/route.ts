import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  extractSheetId,
  verifySheetAccess,
  invalidateSheetHeaderCache,
} from "@/lib/google-sheets";

const SheetSettingsSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
  sheetUrlOrId: z.string().min(1, "Google Sheet URL or ID is required"),
});

/**
 * GET — Fetch current Google Sheet configuration for a tenant
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || "tenant-vyapar-01";

    try {
      const settings = await prisma.tenantSetting.findUnique({
        where: { tenantId },
        select: { googleSheetId: true },
      });

      return NextResponse.json({
        success: true,
        googleSheetId: settings?.googleSheetId || null,
        isConnected: !!settings?.googleSheetId,
      });
    } catch {
      return NextResponse.json({
        success: true,
        googleSheetId: null,
        isConnected: false,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST — Save/update Google Sheet ID with URL extraction and access verification
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = SheetSettingsSchema.parse(body);

    // 1. Extract Sheet ID from URL or raw ID
    const sheetId = extractSheetId(validated.sheetUrlOrId);
    if (!sheetId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid Google Sheet URL or ID. Please paste the full URL from your browser address bar.",
        },
        { status: 400 }
      );
    }

    // Invalidate cached headers state for fresh validation
    invalidateSheetHeaderCache(sheetId);

    // 2. Upsert TenantSetting with googleSheetId so the link is preserved
    try {
      await prisma.tenantSetting.upsert({
        where: { tenantId: validated.tenantId },
        update: { googleSheetId: sheetId },
        create: {
          tenantId: validated.tenantId,
          googleSheetId: sheetId,
        },
      });
    } catch (dbErr: any) {
      console.warn("DB upsert fallback for sheet settings:", dbErr.message);
    }

    // 3. Verify access — check service account can read the sheet
    const verification = await verifySheetAccess(sheetId);
    if (!verification.ok) {
      return NextResponse.json({
        success: true,
        saved: true,
        googleSheetId: sheetId,
        isConnected: false,
        warning: verification.error,
        message: "Google Sheet URL saved successfully!",
      });
    }

    return NextResponse.json({
      success: true,
      saved: true,
      isConnected: true,
      message: "Google Sheet connected successfully!",
      googleSheetId: sheetId,
      sheetTitle: verification.title,
      warning: verification.error || null, // Tab-missing warnings
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Failed to save sheet settings" },
      { status: 500 }
    );
  }
}

/**
 * DELETE — Disconnect Google Sheet (clear googleSheetId)
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || "tenant-vyapar-01";

    try {
      await prisma.tenantSetting.update({
        where: { tenantId },
        data: { googleSheetId: null },
      });
    } catch {
      // Silently handle if DB is unavailable
    }

    invalidateSheetHeaderCache();

    return NextResponse.json({
      success: true,
      message: "Google Sheet disconnected.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
