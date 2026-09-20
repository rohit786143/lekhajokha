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

    // If required tabs exist, ensure column headers are initialized on Row 1
    for (const tab of requiredTabs) {
      if (tabNames.some((t) => t.toLowerCase() === tab.toLowerCase())) {
        await ensureTabHeaders(sheets, sheetId, tab);
      }
    }

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

// ─── Column Headers Configuration & Automatic Initialization ───────────

// In-memory cache of verified headers per sheet tab to avoid redundant API reads
const _verifiedTabs = new Set<string>();

export const SHEET_TAB_HEADERS: Record<string, string[]> = {
  Sales_Log: [
    "Date & Time",
    "Invoice No",
    "Customer Name",
    "Item Name",
    "SKU / Code",
    "Quantity",
    "Unit Price (₹)",
    "Tax (₹)",
    "Total (₹)",
    "Payment Status",
  ],
  Purchases_Log: [
    "Date & Time",
    "Bill No",
    "Vendor Name",
    "Item Name",
    "SKU / Code",
    "Quantity",
    "Purchase Price (₹)",
    "Tax (₹)",
    "Total (₹)",
    "Payment Mode",
  ],
  Inventory_Live: [
    "Last Updated",
    "Item Name",
    "SKU / Code",
    "Current Stock",
    "Unit",
    "Purchase Price (₹)",
    "Sale Price (₹)",
    "MRP (₹)",
    "HSN Code",
    "GST Rate (%)",
  ],
};

export function invalidateSheetHeaderCache(sheetId?: string): void {
  if (!sheetId) {
    _verifiedTabs.clear();
  } else {
    for (const key of Array.from(_verifiedTabs)) {
      if (key.startsWith(`${sheetId}:`)) {
        _verifiedTabs.delete(key);
      }
    }
  }
}

/**
 * Checks whether a row looks like a header row rather than transactional data.
 */
export function isLikelyHeaderRow(row: any[]): boolean {
  if (!row || row.length === 0) return false;
  const firstCell = String(row[0] || "").trim().toLowerCase();
  if (!firstCell) return false;

  // If first cell contains formatted date/time (e.g. "20/09/2026, 3:15:20 pm"), it's data
  const isDateValue =
    /\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(firstCell) ||
    /^\d{1,2}:\d{2}/.test(firstCell);
  if (isDateValue) return false;

  // Check for common header keywords
  const sample = row
    .slice(0, 4)
    .map((c) => String(c || "").trim().toLowerCase())
    .join(" ");

  return (
    sample.includes("date") ||
    sample.includes("time") ||
    sample.includes("timestamp") ||
    sample.includes("updated") ||
    sample.includes("invoice") ||
    sample.includes("bill") ||
    sample.includes("item") ||
    sample.includes("product") ||
    sample.includes("sku") ||
    sample.includes("stock") ||
    sample.includes("vendor") ||
    sample.includes("customer")
  );
}

/**
 * Ensures that Row 1 of the given tab contains proper column headers.
 * If Row 1 is empty or missing headers, column headers are automatically written.
 * If Row 1 contains actual data without headers, a new row is inserted at the top and headers are written.
 */
export async function ensureTabHeaders(
  sheets: sheets_v4.Sheets,
  sheetId: string,
  tabName: string
): Promise<boolean> {
  const headers = SHEET_TAB_HEADERS[tabName];
  if (!headers || headers.length === 0) return false;

  const cacheKey = `${sheetId}:${tabName}`;
  if (_verifiedTabs.has(cacheKey)) return true;

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tabName}!A1:J1`,
    });

    const firstRow = res.data.values?.[0];
    const hasExistingContent =
      firstRow &&
      firstRow.some(
        (cell) =>
          cell !== undefined &&
          cell !== null &&
          String(cell).trim().length > 0
      );

    if (hasExistingContent) {
      if (isLikelyHeaderRow(firstRow)) {
        // Headers already present on Row 1
        _verifiedTabs.add(cacheKey);
        return true;
      }

      // Row 1 contains actual transaction data without headers.
      // Fetch sheet metadata to find tab gid so we can insert a row at index 0
      try {
        const sheetMeta = await sheets.spreadsheets.get({
          spreadsheetId: sheetId,
          fields: "sheets.properties(sheetId,title)",
        });
        const targetSheet = sheetMeta.data.sheets?.find(
          (s) => s.properties?.title?.toLowerCase() === tabName.toLowerCase()
        );
        const tabGid = targetSheet?.properties?.sheetId;

        if (tabGid !== undefined && tabGid !== null) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: {
              requests: [
                {
                  insertDimension: {
                    range: {
                      sheetId: tabGid,
                      dimension: "ROWS",
                      startIndex: 0,
                      endIndex: 1,
                    },
                    inheritFromBefore: false,
                  },
                },
              ],
            },
          });
        }
      } catch (insertErr: any) {
        console.warn(
          `[GoogleSheets] Could not insert header row dimension for ${tabName}:`,
          insertErr?.message
        );
      }
    }

    // Write header row values to Row 1 (A1:J1)
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${tabName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [headers],
      },
    });

    _verifiedTabs.add(cacheKey);
    return true;
  } catch (err: any) {
    console.warn(
      `[GoogleSheets] Could not ensure headers for tab ${tabName} in sheet ${sheetId}:`,
      err?.message
    );
    return false;
  }
}

// ─── Append Row to Sales_Log / Purchases_Log ───────────────────────────

/**
 * Appends a single row of data to a named tab in the tenant's sheet.
 * Automatically ensures Row 1 contains column headers before appending.
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

    // Ensure proper column headers exist in Row 1 before appending data
    await ensureTabHeaders(sheets, sheetId, tabName);

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
 *   - Ensures Row 1 headers exist
 *   - If SKU found → overwrite that row with fresh stock/rate data
 *   - If SKU not found → append a new row
 * 
 * Column layout: Last Updated | Item Name | SKU / Code | Current Stock | Unit | Purchase Price | Sale Price | MRP | HSN Code | GST Rate (%)
 */
export async function updateTenantLiveStock(
  sheetId: string,
  items: InventoryUpdateItem[]
): Promise<boolean> {
  try {
    const sheets = getSheetsClient();
    const tabName = "Inventory_Live";

    // Ensure headers exist on Row 1 before updating stock
    await ensureTabHeaders(sheets, sheetId, tabName);

    // Read existing data to find SKU matches
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tabName}!A:J`,
    });

    const rows = existing.data.values || [];
    const timestamp = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });

    // If first row is a header row, start indexing products from row 1 (0-based)
    const isFirstRowHeader = rows.length > 0 && isLikelyHeaderRow(rows[0]);
    const startIndex = isFirstRowHeader ? 1 : 0;

    // Build a SKU → row index map (column C = index 2 for SKU)
    const skuRowMap: Record<string, number> = {};
    for (let i = startIndex; i < rows.length; i++) {
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
