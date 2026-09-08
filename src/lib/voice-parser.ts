/**
 * Speech-to-Text Voice POS Command Parser for VyaparFlow Enterprise
 * Advanced Hinglish & English natural language retail dictation engine.
 */

export interface VoiceParsedItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  confidence: number; // 0.0 - 1.0
  rawMatchedSnippet: string;
}

export interface VoiceCommandResult {
  rawTranscript: string;
  items: VoiceParsedItem[];
  suggestedPaymentMode?: "CASH" | "UPI" | "CREDIT" | "BANK_TRANSFER";
  unmatchedPhrases: string[];
  totalQuantity: number;
}

export interface MinimalProduct {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  unit?: string;
  salePrice?: number;
}

// Word-to-number dictionary for Hinglish & English voice recognition
const WORD_NUMBER_MAP: Record<string, number> = {
  // English
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  twenty: 20,
  fifty: 50,
  hundred: 100,

  // Hindi / Hinglish
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  chaar: 4,
  panch: 5,
  paanch: 5,
  che: 6,
  chhah: 6,
  saat: 7,
  aath: 8,
  nau: 9,
  das: 10,
  gyarah: 11,
  barah: 12,
  pandrah: 15,
  bees: 20,
  pachees: 25,
  pachas: 50,
  sau: 100,
  aadha: 0.5,
  half: 0.5,
};

// Unit aliases
const UNIT_MAP: Record<string, string> = {
  strip: "STRIP",
  strips: "STRIP",
  patta: "STRIP",
  goli: "STRIP",
  packet: "PACK",
  packets: "PACK",
  pack: "PACK",
  pkt: "PACK",
  kg: "KG",
  kilo: "KG",
  kgs: "KG",
  kilogram: "KG",
  litre: "LTR",
  liter: "LTR",
  ltr: "LTR",
  litres: "LTR",
  box: "BOX",
  boxes: "BOX",
  dabba: "BOX",
  dabbae: "BOX",
  bag: "BAG",
  bags: "BAG",
  bori: "BAG",
  drum: "DRUM",
  piece: "PCS",
  pieces: "PCS",
  pc: "PCS",
  pcs: "PCS",
  nag: "PCS",
};

/**
 * Tokenize and normalize transcript
 */
function normalizeText(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detect Payment Mode intention in voice transcript
 */
function extractPaymentMode(text: string): "CASH" | "UPI" | "CREDIT" | "BANK_TRANSFER" | undefined {
  if (/\b(cash|rokda|nagad|paise)\b/i.test(text)) return "CASH";
  if (/\b(upi|gpay|google pay|phonepe|phone pe|paytm|online|qr|bharat qr|scan)\b/i.test(text))
    return "UPI";
  if (/\b(khata|credit|udhar|udhari|baad mein|account)\b/i.test(text)) return "CREDIT";
  if (/\b(bank|neft|rtgs|cheque|check|transfer)\b/i.test(text)) return "BANK_TRANSFER";
  return undefined;
}

/**
 * Extract number from segment (digits or spelled out words)
 */
function extractQuantityAndUnit(segment: string): { quantity: number; unit?: string; cleanSegment: string } {
  let quantity = 1;
  let detectedUnit: string | undefined;

  const words = segment.split(" ");
  const remainingWords: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // 1. Check numeric digits
    if (/^\d+(\.\d+)?$/.test(word)) {
      quantity = parseFloat(word);
      continue;
    }

    // 2. Check spelled out numbers
    if (WORD_NUMBER_MAP[word] !== undefined) {
      quantity = WORD_NUMBER_MAP[word];
      continue;
    }

    // 3. Check unit
    if (UNIT_MAP[word]) {
      detectedUnit = UNIT_MAP[word];
      continue;
    }

    // 4. Check action / noise words to filter out
    if (
      [
        "add",
        "daal",
        "daalo",
        "karo",
        "chahiye",
        "dena",
        "bhai",
        "please",
        "bill",
        "item",
        "bhi",
        "aur",
        "and",
        "with",
      ].includes(word)
    ) {
      continue;
    }

    remainingWords.push(word);
  }

  return {
    quantity: Math.max(0.1, quantity),
    unit: detectedUnit,
    cleanSegment: remainingWords.join(" ").trim(),
  };
}

/**
 * Fuzzy matching between search query and product catalog
 */
function findBestProductMatch(
  query: string,
  catalog: MinimalProduct[]
): { product: MinimalProduct; score: number } | null {
  if (!query || catalog.length === 0) return null;

  const q = query.toLowerCase();
  let bestMatch: MinimalProduct | null = null;
  let highestScore = 0;

  for (const prod of catalog) {
    const pName = prod.name.toLowerCase();
    const pSku = (prod.sku || "").toLowerCase();
    let score = 0;

    // Exact match
    if (pName === q || pSku === q) {
      score = 1.0;
    } else if (pName.includes(q)) {
      score = 0.85 + (q.length / pName.length) * 0.15;
    } else {
      // Substring word match
      const qWords = q.split(" ").filter((w) => w.length > 1);
      let matchedWordCount = 0;
      for (const qw of qWords) {
        if (pName.includes(qw) || pSku.includes(qw)) {
          matchedWordCount++;
        }
      }
      if (matchedWordCount > 0) {
        score = (matchedWordCount / qWords.length) * 0.75;
      }
    }

    if (score > highestScore && score >= 0.35) {
      highestScore = score;
      bestMatch = prod;
    }
  }

  if (bestMatch && highestScore >= 0.35) {
    return { product: bestMatch, score: Math.min(1.0, highestScore) };
  }

  return null;
}

/**
 * Main Voice Parser Entry Point
 */
export function parseVoiceCommand(
  rawTranscript: string,
  productCatalog: MinimalProduct[]
): VoiceCommandResult {
  const normalized = normalizeText(rawTranscript);
  const paymentMode = extractPaymentMode(rawTranscript);

  // Remove payment mode phrases before parsing item chunks
  const cleanedText = normalized
    .replace(/\b(cash|rokda|nagad|upi|gpay|google pay|phonepe|paytm|online|khata|credit|udhari|bank|neft|cheque)\b/gi, "")
    .trim();

  // Split items on conjunctions: comma, "aur", "and", "plus", "sath me"
  const chunks = cleanedText
    .split(/,|\baur\b|\band\b|\bplus\b|\bsaath\b|\bsath\b/gi)
    .map((c) => c.trim())
    .filter(Boolean);

  const matchedItems: VoiceParsedItem[] = [];
  const unmatchedPhrases: string[] = [];

  for (const chunk of chunks) {
    const { quantity, unit, cleanSegment } = extractQuantityAndUnit(chunk);
    if (!cleanSegment) continue;

    const match = findBestProductMatch(cleanSegment, productCatalog);

    if (match) {
      matchedItems.push({
        productId: match.product.id,
        productName: match.product.name,
        quantity,
        unit: unit || match.product.unit || "PCS",
        confidence: match.score,
        rawMatchedSnippet: chunk,
      });
    } else {
      unmatchedPhrases.push(chunk);
    }
  }

  const totalQuantity = matchedItems.reduce((sum, it) => sum + it.quantity, 0);

  return {
    rawTranscript,
    items: matchedItems,
    suggestedPaymentMode: paymentMode,
    unmatchedPhrases,
    totalQuantity,
  };
}
