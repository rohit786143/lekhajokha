import { parseBarcode } from "./src/lib/barcode-parser.ts";
import { parseVoiceCommand } from "./src/lib/voice-parser.ts";
import { generateNICPayload, isEWayBillMandatory, sanitizeVehicleNumber } from "./src/lib/eway-bill-generator.ts";
import { generateInvoiceWhatsAppNotification, formatWhatsAppPhoneNumber } from "./src/lib/whatsapp-notifier.ts";
import { INITIAL_TENANT, INITIAL_PRODUCTS, INITIAL_INVOICES, INITIAL_PARTIES } from "./src/lib/mock-data.ts";

console.log("=== RUNNING VYAPARFLOW ENTERPRISE UNIT VERIFICATION TESTS ===\n");

// 1. Test GS1-128 / DataMatrix Barcode Parser
console.log("--- 1. Testing GS1-128 / 2D DataMatrix Parser ---");
const sampleGs1Bracketed = "(01)08901117001015(17)280630(10)BAT2026A1(21)359871234567890";
const parsed1 = parseBarcode(sampleGs1Bracketed);
console.log("Bracketed GS1:", {
  isGs1: parsed1.isGs1,
  gtin: parsed1.gtin,
  batchNo: parsed1.batchNo,
  expDateStr: parsed1.expDateStr,
  serialNo: parsed1.serialNo,
});
if (!parsed1.isGs1 || parsed1.batchNo !== "BAT2026A1" || parsed1.expDateStr !== "2028-06-30") {
  throw new Error("Bracketed GS1 parse test failed!");
}

const plainSku = "ELEC-SAM-S24U";
const parsed2 = parseBarcode(plainSku);
console.log("Plain SKU Fallback:", {
  isGs1: parsed2.isGs1,
  plainBarcodeOrSku: parsed2.plainBarcodeOrSku,
});
if (parsed2.isGs1 || parsed2.plainBarcodeOrSku !== "ELEC-SAM-S24U") {
  throw new Error("Plain SKU fallback test failed!");
}
console.log("✔ Barcode parser tests PASSED!\n");

// 2. Test Speech-to-Text Voice POS Command Parser
console.log("--- 2. Testing Voice POS Command Parser ---");
const transcript1 = "2 packet Fortune Sunlite Sunflower Oil aur 5 Dolo 650 add karo payment cash";
const voiceResult1 = parseVoiceCommand(transcript1, INITIAL_PRODUCTS);
console.log("Voice Result 1:", {
  items: voiceResult1.items.map(i => ({ name: i.productName, qty: i.quantity, unit: i.unit })),
  paymentMode: voiceResult1.suggestedPaymentMode,
  unmatched: voiceResult1.unmatchedPhrases,
});

if (voiceResult1.items.length !== 2 || voiceResult1.suggestedPaymentMode !== "CASH") {
  throw new Error("Voice parse test 1 failed!");
}

const transcript2 = "1 Samsung Galaxy S24 Ultra online UPI";
const voiceResult2 = parseVoiceCommand(transcript2, INITIAL_PRODUCTS);
console.log("Voice Result 2:", {
  items: voiceResult2.items.map(i => ({ name: i.productName, qty: i.quantity })),
  paymentMode: voiceResult2.suggestedPaymentMode,
});
if (voiceResult2.items.length !== 1 || voiceResult2.suggestedPaymentMode !== "UPI") {
  throw new Error("Voice parse test 2 failed!");
}
console.log("✔ Voice POS parser tests PASSED!\n");

// 3. Test Government E-Way Bill NIC Payload Generator
console.log("--- 3. Testing NIC E-Way Bill Generator ---");
const sampleInvoice = {
  id: "test-inv-01",
  tenantId: "tenant-vyapar-01",
  invoiceNo: "INV-2026-TEST",
  invoiceType: "TAX_INVOICE",
  invoiceDate: "2026-09-07",
  isInterState: true,
  taxableAmount: 130000,
  totalIgst: 23400,
  totalCgst: 0,
  totalSgst: 0,
  roundOff: 0,
  grandTotal: 153400,
  paidAmount: 153400,
  paymentStatus: "PAID",
  party: INITIAL_PARTIES[1],
  items: [
    {
      productId: "prod-3",
      productName: "Samsung Galaxy S24 Ultra 5G",
      sku: "ELEC-SAM-S24U",
      hsn: "85171300",
      unit: "PCS",
      quantity: 1,
      unitPrice: 130000,
      taxRate: 18,
      taxableAmount: 130000,
      igstAmount: 23400,
      cgstAmount: 0,
      sgstAmount: 0,
      totalAmount: 153400,
    }
  ]
};
const nicPayload = generateNICPayload(sampleInvoice, INITIAL_TENANT, {
  distanceKm: 850,
  vehicleNo: "MH 01-AB-1234",
  vehicleType: "R",
  transMode: "1",
  transporterName: "V-Trans India Express",
});

console.log("NIC E-Way Bill Payload summary:", {
  supplyType: nicPayload.supplyType,
  docNo: nicPayload.docNo,
  fromGstin: nicPayload.fromGstin,
  toGstin: nicPayload.toGstin,
  totalValue: nicPayload.totalValue,
  igstValue: nicPayload.igstValue,
  totInvValue: nicPayload.totInvValue,
  vehicleNo: nicPayload.vehicleNo,
  distance: nicPayload.transDistance,
  itemsCount: nicPayload.itemList.length,
});

if (
  nicPayload.supplyType !== "O" ||
  nicPayload.vehicleNo !== "MH01AB1234" ||
  nicPayload.totInvValue <= 0 ||
  nicPayload.itemList.length === 0
) {
  throw new Error("NIC E-Way Bill test failed!");
}
console.log("✔ NIC E-Way Bill generator tests PASSED!\n");

// 4. Test WhatsApp Cloud API & Dynamic UPI Dispatcher
console.log("--- 4. Testing WhatsApp Notifier & Dynamic UPI ---");
const waNotification = generateInvoiceWhatsAppNotification({
  invoice: sampleInvoice,
  tenant: INITIAL_TENANT,
  party: INITIAL_PARTIES[1],
});

console.log("WhatsApp Notification Details:", {
  recipient: waNotification.cloudApiPayload.to,
  upiDeepLink: waNotification.upiDeepLink,
  clientUrlSnippet: waNotification.clientDispatchUrl.substring(0, 80) + "...",
});

if (
  !waNotification.upiDeepLink.startsWith("upi://pay?") ||
  !waNotification.clientDispatchUrl.includes("api.whatsapp.com") ||
  !waNotification.cloudApiPayload.to.startsWith("91")
) {
  throw new Error("WhatsApp notification test failed!");
}
console.log("✔ WhatsApp Notifier & Dynamic UPI tests PASSED!\n");

console.log("🎉 ALL OPERATIONS & VERIFICATION SUITES COMPLETED SUCCESSFULLY! 🎉");
