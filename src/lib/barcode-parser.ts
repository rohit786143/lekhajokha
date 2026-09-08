/**
 * GS1-128 & 2D DataMatrix Barcode Parser, Modulo-10 EAN-13 Generator, SKU Generator, & Audio Engine
 * for VyaparFlow Enterprise ERP
 */

export interface ParsedBarcodeResult {
  raw: string;
  isGs1: boolean;
  gtin?: string; // AI (01) 14-digit GTIN
  batchNo?: string; // AI (10) Batch / Lot Number
  mfgDate?: Date; // AI (11) Production Date
  mfgDateStr?: string; // YYYY-MM-DD
  expDate?: Date; // AI (17) Expiry Date
  expDateStr?: string; // YYYY-MM-DD
  serialNo?: string; // AI (21) Serial / IMEI Number
  quantity?: number; // AI (30) Count
  plainBarcodeOrSku?: string; // Fallback for standard Code-128 / EAN-13
}

/**
 * Category Tax & HSN Defaults mapping for fast auto-fill
 */
export interface CategoryDefaultConfig {
  defaultGstRate: number;
  hsnCode: string;
  codePrefix: string;
}

export const CATEGORY_TAX_HSN_DEFAULTS: Record<string, CategoryDefaultConfig> = {
  pharma: { defaultGstRate: 12.0, hsnCode: "3004", codePrefix: "PHARM" },
  fmcg: { defaultGstRate: 5.0, hsnCode: "2106", codePrefix: "FMCG" },
  groceries: { defaultGstRate: 5.0, hsnCode: "1006", codePrefix: "GROC" },
  electronics: { defaultGstRate: 18.0, hsnCode: "8517", codePrefix: "ELEC" },
  paints: { defaultGstRate: 28.0, hsnCode: "3208", codePrefix: "HARD" },
  hardware: { defaultGstRate: 18.0, hsnCode: "7318", codePrefix: "HARD" },
  apparel: { defaultGstRate: 12.0, hsnCode: "6109", codePrefix: "APPRL" },
  garments: { defaultGstRate: 12.0, hsnCode: "6203", codePrefix: "GARMT" },
  dairy: { defaultGstRate: 5.0, hsnCode: "0401", codePrefix: "DAIRY" },
  beverages: { defaultGstRate: 12.0, hsnCode: "2202", codePrefix: "BEV" },
  stationery: { defaultGstRate: 12.0, hsnCode: "4820", codePrefix: "STAT" },
  footwear: { defaultGstRate: 12.0, hsnCode: "6403", codePrefix: "FOOT" },
  auto: { defaultGstRate: 28.0, hsnCode: "8708", codePrefix: "AUTO" },
  general: { defaultGstRate: 18.0, hsnCode: "9999", codePrefix: "GEN" },
};

/**
 * Calculates standard GS1 Modulo-10 Check Digit for 12-digit EAN-13 prefix
 * Formula:
 * Sum odd positions (1, 3, 5, 7, 9, 11) * 1
 * Sum even positions (2, 4, 6, 8, 10, 12) * 3
 * Check Digit = (10 - (Total % 10)) % 10
 */
export function calculateEan13CheckDigit(twelveDigits: string): number {
  const clean = twelveDigits.replace(/\D/g, "").slice(0, 12);
  if (clean.length !== 12) {
    throw new Error(`EAN-13 check digit requires exactly 12 numeric digits, got ${clean.length}`);
  }

  let oddSum = 0;
  let evenSum = 0;

  for (let i = 0; i < 12; i++) {
    const digit = parseInt(clean[i], 10);
    if ((i + 1) % 2 === 1) {
      oddSum += digit;
    } else {
      evenSum += digit;
    }
  }

  const total = oddSum + evenSum * 3;
  const mod = total % 10;
  return mod === 0 ? 0 : 10 - mod;
}

/**
 * Generates a valid 13-digit EAN-13 Barcode with GS1 India prefix 890 and valid check digit
 */
export function generateEan13(prefix = "890"): string {
  const cleanPrefix = prefix.replace(/\D/g, "");
  const remainingDigitsNeeded = 12 - cleanPrefix.length;

  let randomPart = "";
  for (let i = 0; i < remainingDigitsNeeded; i++) {
    randomPart += Math.floor(Math.random() * 10).toString();
  }

  const twelveDigits = cleanPrefix + randomPart;
  const checkDigit = calculateEan13CheckDigit(twelveDigits);
  return `${twelveDigits}${checkDigit}`;
}

/**
 * Validates whether a 13-digit string is a mathematically valid EAN-13 barcode
 */
export function validateEan13(barcode: string): boolean {
  const clean = (barcode || "").trim().replace(/\D/g, "");
  if (clean.length !== 13) return false;

  const twelveDigits = clean.slice(0, 12);
  const expectedCheckDigit = calculateEan13CheckDigit(twelveDigits);
  const actualCheckDigit = parseInt(clean[12], 10);

  return expectedCheckDigit === actualCheckDigit;
}

/**
 * Generates standard SKU using formula:
 * `${categoryPrefix.toUpperCase()}-${slug(productName).slice(0,3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`
 */
export function generateSku(categoryPrefix?: string, productName?: string): string {
  const cat = (categoryPrefix || "GEN").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) || "GEN";

  // Clean product name into 3-char slug
  const cleanName = (productName || "ITEM")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  const nameSlug = (cleanName.slice(0, 3) || "ITM").padEnd(3, "X");
  const randomNum = Math.floor(1000 + Math.random() * 9000);

  return `${cat}-${nameSlug}-${randomNum}`;
}

/**
 * Audio feedback synthesizer using Web Audio API
 * Generates crisp, lag-free audio beeps without external MP3 files
 */
export function playAudioFeedback(type: "success" | "error" | "warning" = "success"): void {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "success") {
      // Crisp 2-tone high chime (880Hz -> 1760Hz)
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === "error") {
      // Low tone error buzz (220Hz -> 180Hz)
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(180, now + 0.18);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

      osc.start(now);
      osc.stop(now + 0.18);
    } else {
      // Warning double chirp
      osc.type = "triangle";
      osc.frequency.setValueAtTime(587.33, now); // D5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      osc.start(now);
      osc.stop(now + 0.1);
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 300);
  } catch (e) {
    // Audio context may be restricted by autoplay policy before user gesture
  }
}

/**
 * Parses YYMMDD GS1 date format into Date object and ISO string
 * Note: If DD is '00', GS1 standard implies the last day of the given month.
 */
function parseGs1Date(yymmdd: string): { date: Date; dateStr: string } | null {
  if (!/^\d{6}$/.test(yymmdd)) return null;

  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = parseInt(yymmdd.substring(2, 4), 10);
  let dd = parseInt(yymmdd.substring(4, 6), 10);

  // Determine 4-digit year: standard cutoff 50-99 -> 1950-1999, 00-49 -> 2000-2049
  const fullYear = yy >= 50 ? 1900 + yy : 2000 + yy;

  if (mm < 1 || mm > 12) return null;

  // Handle DD = 00 -> last day of month
  if (dd === 0) {
    dd = new Date(fullYear, mm, 0).getDate();
  }

  const date = new Date(Date.UTC(fullYear, mm - 1, dd));
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${fullYear}-${pad(mm)}-${pad(dd)}`;

  return { date, dateStr };
}

/**
 * Parse human-readable bracketed format e.g. "(01)08901117001015(17)280630(10)DL2026X1(21)359871234567890"
 */
function parseBracketedGs1(input: string): ParsedBarcodeResult | null {
  const aiRegex = /\((\d{2,4})\)([^(]+)/g;
  let match: RegExpExecArray | null;
  let foundAny = false;

  const result: ParsedBarcodeResult = {
    raw: input,
    isGs1: false,
  };

  while ((match = aiRegex.exec(input)) !== null) {
    foundAny = true;
    const ai = match[1];
    const value = match[2].trim();

    switch (ai) {
      case "01": // GTIN (14 digits)
        result.gtin = value.padStart(14, "0");
        break;
      case "10": // Batch / Lot Number
        result.batchNo = value;
        break;
      case "11": { // Production Date (YYMMDD)
        const parsed = parseGs1Date(value);
        if (parsed) {
          result.mfgDate = parsed.date;
          result.mfgDateStr = parsed.dateStr;
        }
        break;
      }
      case "17": { // Expiry Date (YYMMDD)
        const parsed = parseGs1Date(value);
        if (parsed) {
          result.expDate = parsed.date;
          result.expDateStr = parsed.dateStr;
        }
        break;
      }
      case "21": // Serial / IMEI Number
        result.serialNo = value;
        break;
      case "30": // Count / Qty
        result.quantity = parseInt(value, 10) || 1;
        break;
    }
  }

  if (foundAny) {
    result.isGs1 = true;
    return result;
  }

  return null;
}

/**
 * Parse raw concatenated GS1 string (with FNC1 characters / ASCII 29 / or standard fixed-length AIs)
 */
function parseRawConcatenatedGs1(input: string): ParsedBarcodeResult | null {
  const FNC1 = "\u001d";
  let pos = 0;
  const len = input.length;
  let isGs1Candidate = false;

  const result: ParsedBarcodeResult = {
    raw: input,
    isGs1: false,
  };

  while (pos < len) {
    if (input[pos] === FNC1) {
      pos++;
      continue;
    }

    const ai2 = input.substring(pos, pos + 2);

    if (ai2 === "01") {
      pos += 2;
      result.gtin = input.substring(pos, pos + 14);
      pos += 14;
      isGs1Candidate = true;
    } else if (ai2 === "11") {
      pos += 2;
      const yymmdd = input.substring(pos, pos + 6);
      const parsed = parseGs1Date(yymmdd);
      if (parsed) {
        result.mfgDate = parsed.date;
        result.mfgDateStr = parsed.dateStr;
        isGs1Candidate = true;
      }
      pos += 6;
    } else if (ai2 === "17") {
      pos += 2;
      const yymmdd = input.substring(pos, pos + 6);
      const parsed = parseGs1Date(yymmdd);
      if (parsed) {
        result.expDate = parsed.date;
        result.expDateStr = parsed.dateStr;
        isGs1Candidate = true;
      }
      pos += 6;
    } else if (ai2 === "10") {
      pos += 2;
      let end = input.indexOf(FNC1, pos);
      if (end === -1) end = len;
      const val = input.substring(pos, end);
      result.batchNo = val;
      pos = end;
      isGs1Candidate = true;
    } else if (ai2 === "21") {
      pos += 2;
      let end = input.indexOf(FNC1, pos);
      if (end === -1) end = len;
      result.serialNo = input.substring(pos, end);
      pos = end;
      isGs1Candidate = true;
    } else {
      break;
    }
  }

  if (isGs1Candidate && (result.gtin || result.batchNo || result.expDate)) {
    result.isGs1 = true;
    return result;
  }

  return null;
}

/**
 * Main Barcode Parsing Engine
 * Intelligently parses GS1-128, 2D DataMatrix, EAN-13, Code-128, or plain SKU.
 */
export function parseBarcode(rawInput: string): ParsedBarcodeResult {
  const trimmed = (rawInput || "").trim();

  if (!trimmed) {
    return { raw: "", isGs1: false, plainBarcodeOrSku: "" };
  }

  // 1. Try Bracketed format first: (01)...(17)...(10)...
  if (trimmed.includes("(") && trimmed.includes(")")) {
    const bracketed = parseBracketedGs1(trimmed);
    if (bracketed && bracketed.isGs1) {
      return bracketed;
    }
  }

  // 2. Try raw concatenated GS1 DataMatrix
  if (trimmed.startsWith("01") && trimmed.length >= 16) {
    const rawGs1 = parseRawConcatenatedGs1(trimmed);
    if (rawGs1 && rawGs1.isGs1) {
      return rawGs1;
    }
  }

  // 3. Standard Code-128 / EAN-13 / Plain SKU Fallback
  return {
    raw: trimmed,
    isGs1: false,
    plainBarcodeOrSku: trimmed,
  };
}
