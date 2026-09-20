/**
 * Google Sheets Live Backup Service — Lekha Jokha ERP
 * 
 * Multi-tenant, fail-safe utility for syncing Sales, Purchases, and Inventory
 * to each tenant's private Google Sheet via a shared service account.
 * 
 * All functions are wrapped in try/catch — Google API failures NEVER block billing.
 */

import { google, sheets_v4 } from "googleapis";

// ─── Service Account Initialization ────────────────────────────────────

let _sheetsClient: sheets_v4.Sheets | null = null;

export function isGoogleServiceAccountConfigured(): boolean {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !rawKey) return false;
  if (email.includes("your-gcp-project") || email.includes("example.com")) return false;
  if (rawKey.includes("YOUR_PRIVATE_KEY_HERE")) return false;
  if (!rawKey.includes("BEGIN PRIVATE KEY") && !rawKey.includes("BEGIN RSA PRIVATE KEY")) return false;

  return true;
}

function getSheetsClient(): sheets_v4.Sheets {
  if (_sheetsClient) return _sheetsClient;

  if (!isGoogleServiceAccountConfigured()) {
    throw new Error(
      "Google Service Account credentials are not configured on the server. Please set real GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in environment variables."
    );
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY!;

  // Handle escaped newlines in env var
  const privateKey = rawKey.replace(/\\n/g, "\n");

  try {
    const auth = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    _sheetsClient = google.sheets({ version: "v4", auth });
    return _sheetsClient;
  } catch (err: any) {
    throw new Error(`Google Authentication initialization failed: ${err?.message || "Invalid private key format"}`);
  }
}

// ─── URL / ID Extraction ───────────────────────────────────────────────

/**
 * Extracts the Google Sheet ID from a full URL or validates a raw ID.
 * Supports formats:
 *   - https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0
 *   - https://docs.google.com/spreadsheets/d/SHEET_ID
 *   - Raw ID string (44 chars, alphanumeric + hyphens + underscores)
 */
export function extractSheetId(urlOrId: string): string | null {
  if (!urlOrId || !urlOrId.trim()) return null;

  const trimmed = urlOrId.trim();

  // Try extracting from full URL
  const urlMatch = trimmed.match(
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/
  );
  if (urlMatch) return urlMatch[1];

  // Validate as raw Sheet ID (typically 44 chars, but at least 20)
  const rawIdMatch = trimmed.match(/^[a-zA-Z0-9_-]{20,}$/);
  if (rawIdMatch) return trimmed;

  return null;
}

// ─── Access Verification ───────────────────────────────────────────────

/**
 * Lightweight read check to confirm the service account has editor access.
 * Returns sheet title on success for UI display.
 */
export async function verifySheetAccess(
  sheetId: string
): Promise<{ ok: boolean; title?: string; error?: string; isConfigured?: boolean }> {
  if (!isGoogleServiceAccountConfigured()) {
    return {
      ok: false,
      isConfigured: false,
      error:
        "Google Cloud Service Account credentials are not configured in Vercel environment variables yet.",
    };
  }

  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      fields: "properties.title,sheets.properties.title",
    });

    const title = response.data.properties?.title || "Untitled Sheet";
    const tabNames =
      response.data.sheets?.map((s) => s.properties?.title || "") || [];

    // Warn if required tabs are missing (but don't block)
    const requiredTabs = ["Inventory_Live", "Sales_Log", "Purchases_Log"];
    const missingTabs = requiredTabs.filter(
      (tab) => !tabNames.some((t) => t.toLowerCase() === tab.toLowerCase())
    );

    if (missingTabs.length > 0) {
      return {
        ok: true,
        isConfigured: true,
        title,
        error: `Connected! But missing tab(s): ${missingTabs.join(", ")}. Please create them in your Google Sheet.`,
      };
    }

    return { ok: true, isConfigured: true, title };
  } catch (err: any) {
    const status = err?.response?.status || err?.code;

    if (status === 403 || status === 404) {
      return {
        ok: false,
        isConfigured: true,
        error:
          "Access denied. Please share your Google Sheet with the bot email as an Editor.",
      };
    }

    const msg = err?.message || "";
    if (msg.includes("DECODER") || msg.includes("unsupported")) {
      return {
        ok: false,
        isConfigured: false,
        error:
          "Invalid Google Private Key in server environment variables. Please paste the real RSA private key into Vercel.",
      };
    }

    return {
      ok: false,
      isConfigured: true,
      error: `Connection check failed: ${err.message || "Unknown error"}`,
    };
  }
}

// ─── Append Row to Sales_Log / Purchases_Log ───────────────────────────

/**
 * Appends a single row of data to a named tab in the tenant's sheet.
 * @param sheetId - The tenant's Google Sheet ID
 * @param tabName - "Sales_Log" or "Purchases_Log"
 * @param rowData - Array of cell values in column order
 */
export async function appendToTenantSheet(
  sheetId: string,
  tabName: string,
  rowData: (string | number | boolean | null | undefined)[]
): Promise<boolean> {
  try {
    const sheets = getSheetsClient();

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${tabName}!A:Z`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [rowData.map((v) => (v === null || v === undefined ? "" : v))],
      },
    });

    return true;
  } catch (err: any) {
    console.warn(
      `[GoogleSheets] Failed to append to ${tabName} for sheet ${sheetId}:`,
      err.message
    );
    return false;
  }
}

// ─── Update Inventory_Live Tab ─────────────────────────────────────────

interface InventoryUpdateItem {
  productName: string;
  sku: string;
  currentStock: number;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  mrp: number;
  hsn: string;
  taxRate: number;
}

/**
 * Updates the Inventory_Live tab for each product:
 *   - If SKU found → overwrite that row with fresh stock/rate data
 *   - If SKU not found → append a new row
 * 
 * Column layout: Timestamp | Product Name | SKU | Current Stock | Unit | Purchase Rate | Sale Price | MRP | HSN | GST%
 */
export async function updateTenantLiveStock(
  sheetId: string,
  items: InventoryUpdateItem[]
): Promise<boolean> {
  try {
    const sheets = getSheetsClient();
    const tabName = "Inventory_Live";

    // Read existing data to find SKU matches
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tabName}!A:J`,
    });

    const rows = existing.data.values || [];
    const timestamp = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });

    // Build a SKU → row index map (column C = index 2 for SKU)
    const skuRowMap: Record<string, number> = {};
    for (let i = 0; i < rows.length; i++) {
      const sku = rows[i]?.[2]?.toString().trim().toUpperCase();
      if (sku) skuRowMap[sku] = i;
    }

    const updateRequests: sheets_v4.Schema$ValueRange[] = [];
    const appendRows: (string | number)[][] = [];

    for (const item of items) {
      const rowValues = [
        timestamp,
        item.productName,
        item.sku,
        item.currentStock,
        item.unit,
        item.purchasePrice,
        item.salePrice,
        item.mrp,
        item.hsn,
        item.taxRate,
      ];

      const existingRowIdx = skuRowMap[item.sku.toUpperCase()];

      if (existingRowIdx !== undefined) {
        // Update existing row (1-indexed for Sheets API)
        updateRequests.push({
          range: `${tabName}!A${existingRowIdx + 1}:J${existingRowIdx + 1}`,
          values: [rowValues],
        });
      } else {
        appendRows.push(rowValues);
      }
    }

    // Batch update existing rows
    if (updateRequests.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: updateRequests,
        },
      });
    }

    // Append new rows
    if (appendRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${tabName}!A:J`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: appendRows,
        },
      });
    }

    return true;
  } catch (err: any) {
    console.warn(
      `[GoogleSheets] Failed to update Inventory_Live for sheet ${sheetId}:`,
      err.message
    );
    return false;
  }
}

// ─── Convenience: Fire-and-Forget Sheet Sync ───────────────────────────

/**
 * Fire-and-forget wrapper that runs sheet sync in background.
 * Catches all errors silently — billing must never be blocked.
 */
export function fireAndForgetSheetSync(fn: () => Promise<any>): void {
  fn().catch((err) => {
    console.warn("[GoogleSheets] Background sync error (non-blocking):", err.message);
  });
}
