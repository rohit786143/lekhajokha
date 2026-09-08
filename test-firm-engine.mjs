import { INITIAL_FIRMS, INITIAL_TENANT } from "./src/lib/mock-data";
import {
  extractStateFromGstin,
  isValidGstin,
  isInterStateTransaction,
  calculateLineItem,
  calculateCartSummary,
  INDIAN_STATES
} from "./src/lib/tax-engine";

console.log("==================================================");
console.log("  TESTING MULTI-FIRM & DYNAMIC GST TAX ENGINE");
console.log("==================================================\n");

// 1. Test Initial Firms Registry
console.log("1. Checking Initial Firms Setup:");
console.log(`- Total Initial Firms: ${INITIAL_FIRMS.length}`);
INITIAL_FIRMS.forEach((f, idx) => {
  console.log(`  [Firm ${idx + 1}] ${f.name}`);
  console.log(`    State: [${f.stateCode}] ${f.stateName}, GSTIN: ${f.gstin}, Prefix: ${f.invoicePrefix}, Primary: ${f.isPrimary}`);
});
if (INITIAL_FIRMS.length < 2) throw new Error("Expected at least 2 initial firms for multi-firm switcher testing!");
console.log("  ✓ Initial Firms validated.\n");

// 2. Test GSTIN State Auto-Extraction
console.log("2. Testing GSTIN State Auto-Extraction:");
const testGstins = [
  { gstin: "27AABCU9603R1ZM", expectedState: "27", expectedName: "Maharashtra" },
  { gstin: "29AAACV5432R1Z2", expectedState: "29", expectedName: "Karnataka" },
  { gstin: "07AAACD1234E1Z5", expectedState: "07", expectedName: "Delhi" },
  { gstin: "03AABCP1234F1Z8", expectedState: "03", expectedName: "Punjab" },
  { gstin: "02AABCP9999K1Z1", expectedState: "02", expectedName: "Himachal Pradesh" },
];

testGstins.forEach(({ gstin, expectedState, expectedName }) => {
  const extracted = extractStateFromGstin(gstin);
  console.log(`  GSTIN "${gstin}" => Extracted: [${extracted?.stateCode}] ${extracted?.stateName}`);
  if (!extracted || extracted.stateCode !== expectedState || extracted.stateName !== expectedName) {
    throw new Error(`State extraction failed for ${gstin}. Got ${JSON.stringify(extracted)}`);
  }
  const valid = isValidGstin(gstin);
  if (!valid) throw new Error(`GSTIN validation failed for ${gstin}`);
});
console.log("  ✓ GSTIN auto-extraction & validation passed.\n");

// 3. Test Dynamic Multi-Firm State Tax Rules (Intra-State vs Inter-State)
console.log("3. Testing Multi-Firm State Tax Switching:");
const firmMumbai = INITIAL_FIRMS.find(f => f.stateCode === "27");
const firmBangalore = INITIAL_FIRMS.find(f => f.stateCode === "29");

const customerMaharashtraPOS = "27";
const customerKarnatakaPOS = "29";

// Scenario A: Mumbai Firm (27) billing Maharashtra Customer (27) => INTRA-STATE (CGST + SGST)
const isInterStateA = isInterStateTransaction(firmMumbai.stateCode, customerMaharashtraPOS);
console.log(`  Scenario A: Firm [27 MH] -> POS [27 MH] => Inter-State: ${isInterStateA} (Expected: false -> CGST+SGST)`);
if (isInterStateA !== false) throw new Error("Scenario A failed: Expected Intra-state (false)");

// Scenario B: Mumbai Firm (27) billing Karnataka Customer (29) => INTER-STATE (IGST)
const isInterStateB = isInterStateTransaction(firmMumbai.stateCode, customerKarnatakaPOS);
console.log(`  Scenario B: Firm [27 MH] -> POS [29 KA] => Inter-State: ${isInterStateB} (Expected: true -> IGST)`);
if (isInterStateB !== true) throw new Error("Scenario B failed: Expected Inter-state (true)");

// Scenario C: Switching to Bangalore Firm (29) billing Karnataka Customer (29) => INTRA-STATE (CGST + SGST)
const isInterStateC = isInterStateTransaction(firmBangalore.stateCode, customerKarnatakaPOS);
console.log(`  Scenario C: Firm [29 KA] -> POS [29 KA] => Inter-State: ${isInterStateC} (Expected: false -> CGST+SGST)`);
if (isInterStateC !== false) throw new Error("Scenario C failed: Expected Intra-state (false)");

// Scenario D: Bangalore Firm (29) billing Maharashtra Customer (27) => INTER-STATE (IGST)
const isInterStateD = isInterStateTransaction(firmBangalore.stateCode, customerMaharashtraPOS);
console.log(`  Scenario D: Firm [29 KA] -> POS [27 MH] => Inter-State: ${isInterStateD} (Expected: true -> IGST)`);
if (isInterStateD !== true) throw new Error("Scenario D failed: Expected Inter-state (true)");

console.log("  ✓ Dynamic State Tax Rules validated across multi-firms.\n");

// 4. Test Cart Summary Tax Breakdown with Firm Origin
console.log("4. Testing Cart Tax Summary Computation with 18% GST Item:");
const sampleCart = [
  calculateLineItem(
    {
      id: "cart-item-1",
      productId: "prod-test",
      product: { id: "prod-test", name: "Sample Item", sku: "SKU-1", hsn: "8517", taxRate: 18, isTaxInclusive: false, purchasePrice: 1000, salePrice: 1000, mrp: 1200, unit: "PCS", minStock: 1, currentStock: 10, trackBatch: false, trackSerial: false, tenantId: "t1" },
      quantity: 2,
      unit: "PCS",
      unitPrice: 1000,
      mrp: 1200,
      isTaxInclusive: false,
      discountPercent: 0,
      discountAmount: 0,
      taxRate: 18,
      cessRate: 0,
      hsn: "8517",
    },
    false // intra-state
  )
];

const intraSummary = calculateCartSummary(sampleCart, false, 0, true);
console.log(`  Intra-State Summary: Taxable = ₹${intraSummary.taxableAmount}, CGST = ₹${intraSummary.cgst} (9%), SGST = ₹${intraSummary.sgst} (9%), IGST = ₹${intraSummary.igst}, Total = ₹${intraSummary.grandTotal}`);
if (intraSummary.cgst !== 180 || intraSummary.sgst !== 180 || intraSummary.igst !== 0 || intraSummary.grandTotal !== 2360) {
  throw new Error(`Intra-state tax computation mismatch: ${JSON.stringify(intraSummary)}`);
}

const interSummary = calculateCartSummary(sampleCart, true, 0, true);
console.log(`  Inter-State Summary: Taxable = ₹${interSummary.taxableAmount}, CGST = ₹${interSummary.cgst}, SGST = ₹${interSummary.sgst}, IGST = ₹${interSummary.igst} (18%), Total = ₹${interSummary.grandTotal}`);
if (interSummary.cgst !== 0 || interSummary.sgst !== 0 || interSummary.igst !== 360 || interSummary.grandTotal !== 2360) {
  throw new Error(`Inter-state tax computation mismatch: ${JSON.stringify(interSummary)}`);
}

console.log("  ✓ Tax Summary accurately splits CGST+SGST vs 100% IGST.\n");

console.log("==================================================");
console.log("  ALL MULTI-FIRM & DYNAMIC GST TESTS PASSED! 🚀");
console.log("==================================================");
