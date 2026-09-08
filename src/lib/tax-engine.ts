// VyaparFlow Enterprise GST Tax Computation & Compliance Engine
import {
  CartItem,
  Invoice,
  CreditNote,
  DebitNote,
  InvoiceCalculations,
  Gstr1Payload,
  Gstr1B2BGroup,
  Gstr1B2CSItem,
  Gstr1CdnrRecord,
  Gstr1CdnurRecord,
  Gstr1ExportRecord,
  Gstr1DocCategorySummary,
  Gstr1HsnItem,
} from "./types";

export const INDIAN_STATES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
};

export const STATE_SHORT_CODES: Record<string, string> = {
  "01": "JK",
  "02": "HP",
  "03": "PB",
  "04": "CH",
  "05": "UK",
  "06": "HR",
  "07": "DL",
  "08": "RJ",
  "09": "UP",
  "10": "BR",
  "11": "SK",
  "12": "AR",
  "13": "NL",
  "14": "MN",
  "15": "MZ",
  "16": "TR",
  "17": "ML",
  "18": "AS",
  "19": "WB",
  "20": "JH",
  "21": "OD",
  "22": "CG",
  "23": "MP",
  "24": "GJ",
  "26": "DN",
  "27": "MH",
  "29": "KA",
  "30": "GA",
  "31": "LD",
  "32": "KL",
  "33": "TN",
  "34": "PY",
  "35": "AN",
  "36": "TS",
  "37": "AP",
  "38": "LA",
  "97": "OT",
};

/**
 * Generate smart, state-aligned invoice prefix suggestions based on Trade Name and State Code
 */
export function generateInvoicePrefixSuggestions(tradeName?: string, stateCode: string = "27"): string[] {
  const shortState = STATE_SHORT_CODES[stateCode] || stateCode;
  const cleanName = (tradeName || "VF").trim().replace(/[^a-zA-Z0-9\s]/g, "");
  const words = cleanName.split(/\s+/).filter(Boolean);
  
  const suggestions = new Set<string>();

  if (words.length >= 2) {
    const first = words[0].toUpperCase();
    const second = words[1].toUpperCase();
    suggestions.add(`${first.slice(0, 3)}${second.slice(0, 1)}-${shortState}`); // e.g. ARM-HP
    suggestions.add(`${first.slice(0, 2)}-${shortState}`); // e.g. AR-HP
    suggestions.add(`${words.map(w => w[0]).join("").toUpperCase().slice(0, 4)}-${shortState}`); // e.g. AM-HP
    suggestions.add(`${first.slice(0, 3)}${second.slice(0, 1)}-${stateCode}`); // e.g. ARM-02
  } else if (words.length === 1 && words[0].length >= 2) {
    const single = words[0].toUpperCase().slice(0, 4);
    suggestions.add(`${single}-${shortState}`);
    suggestions.add(`${single}-${stateCode}`);
  }

  suggestions.add(`${shortState}-INV`);
  suggestions.add(`VF-${shortState}`);
  suggestions.add(`INV-${stateCode}`);
  suggestions.add("INV");

  return Array.from(suggestions);
}

/**
 * Extract State Code and State Name automatically from the first 2 digits of a 15-digit GSTIN
 */
export function extractStateFromGstin(gstin?: string | null): { stateCode: string; stateName: string } | null {
  if (!gstin || typeof gstin !== "string") return null;
  const clean = gstin.trim();
  if (clean.length < 2) return null;
  const stateCode = clean.substring(0, 2).padStart(2, "0");
  const stateName = INDIAN_STATES[stateCode];
  if (stateName) {
    return { stateCode, stateName };
  }
  return null;
}

/**
 * Strict Indian GSTIN format validator (15 alphanumeric characters)
 * Format: 2 digits (state) + 10 alphanumeric (PAN) + 1 entity num + 1 'Z' + 1 checksum
 */
export function isValidGstin(gstin?: string | null): boolean {
  if (!gstin) return false;
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
  return gstinRegex.test(gstin.trim());
}

/**
 * Standard rounding to 2 decimal places with NaN safety
 */
export function round2(val: number | string | undefined | null): number {
  const num = Number(val);
  if (isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Determine whether a transaction is Inter-State or Intra-State with string/number safety
 */
export function isInterStateTransaction(
  supplierStateCode?: string | number | null,
  placeOfSupplyStateCode?: string | number | null
): boolean {
  const normSupplier = String(supplierStateCode || "27").trim().padStart(2, "0");
  const normPos = String(placeOfSupplyStateCode || "27").trim().padStart(2, "0");
  return normSupplier !== normPos;
}

/**
 * Calculate line item tax and totals with precise rounding
 */
export function calculateLineItem(
  item: Omit<CartItem, "taxableAmount" | "cgst" | "sgst" | "igst" | "cess" | "total">,
  isInterState: boolean
): CartItem {
  const qty = Number(item.quantity) || 0;
  const unitPrice = Number(item.unitPrice) || 0;
  const taxRate = Number(item.taxRate) || 0;
  const cessRate = Number(item.cessRate) || 0;
  const discPercent = Number(item.discountPercent) || 0;
  const discAmount = Number(item.discountAmount) || 0;

  let gross = qty * unitPrice;

  // Apply discount: either percentage or fixed amount
  let discountVal = 0;
  if (discPercent > 0) {
    discountVal = (gross * discPercent) / 100;
  } else if (discAmount > 0) {
    discountVal = discAmount;
  }
  discountVal = Math.min(gross, discountVal);

  const discountedGross = gross - discountVal;

  let taxableAmount = 0;
  let totalTax = 0;

  if (item.isTaxInclusive) {
    // Reverse tax calculation
    // Total = Taxable + (Taxable * TaxRate/100) + (Taxable * CessRate/100)
    // Taxable = Total / (1 + (TaxRate + CessRate)/100)
    const combinedRate = 1 + (taxRate + cessRate) / 100;
    taxableAmount = round2(discountedGross / combinedRate);
    totalTax = round2(discountedGross - taxableAmount);
  } else {
    // Exclusive tax calculation
    taxableAmount = round2(discountedGross);
    totalTax = round2((taxableAmount * taxRate) / 100);
  }

  const cess = cessRate > 0 ? round2((taxableAmount * cessRate) / 100) : 0;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterState) {
    igst = round2(totalTax);
  } else {
    cgst = round2(totalTax / 2);
    sgst = round2(totalTax - cgst); // Avoid floating point mismatch
  }

  const total = round2(taxableAmount + cgst + sgst + igst + cess);

  return {
    ...item,
    taxableAmount,
    cgst,
    sgst,
    igst,
    cess,
    total,
  };
}

/**
 * Recalculate whole cart summary & taxes
 */
export function calculateCartSummary(
  items: CartItem[],
  isInterState: boolean,
  billDiscount: number = 0,
  autoRoundOff: boolean = true
): InvoiceCalculations {
  let subtotal = 0;
  let discountTotal = 0;
  let taxableAmount = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let cess = 0;
  let totalQuantity = 0;

  for (const item of items) {
    const calculated = calculateLineItem(item, isInterState);
    subtotal += (calculated.quantity * calculated.unitPrice);
    discountTotal += (calculated.discountAmount || (calculated.quantity * calculated.unitPrice * (calculated.discountPercent || 0) / 100));
    taxableAmount += calculated.taxableAmount;
    cgst += calculated.cgst;
    sgst += calculated.sgst;
    igst += calculated.igst;
    cess += calculated.cess;
    totalQuantity += calculated.quantity;
  }

  discountTotal += billDiscount;
  taxableAmount = Math.max(0, taxableAmount - billDiscount);

  const preRoundGrand = taxableAmount + cgst + sgst + igst + cess;
  let roundOff = 0;
  let grandTotal = preRoundGrand;

  if (autoRoundOff) {
    const rounded = Math.round(preRoundGrand);
    roundOff = round2(rounded - preRoundGrand);
    grandTotal = rounded;
  } else {
    grandTotal = round2(preRoundGrand);
  }

  return {
    subtotal: round2(subtotal),
    discountTotal: round2(discountTotal),
    taxableAmount: round2(taxableAmount),
    cgst: round2(cgst),
    sgst: round2(sgst),
    igst: round2(igst),
    cess: round2(cess),
    roundOff: round2(roundOff),
    grandTotal: round2(grandTotal),
    itemCount: items.length,
    totalQuantity: round2(totalQuantity),
  };
}

/**
 * Generate standard Dynamic Bharat QR UPI string
 */
export function generateUpiUri(params: {
  vpa: string;
  payeeName: string;
  amount: number;
  invoiceNo: string;
  notes?: string;
}): string {
  const { vpa, payeeName, amount, invoiceNo, notes } = params;
  const encodedName = encodeURIComponent(payeeName || "VyaparFlow Merchant");
  const encodedNotes = encodeURIComponent(notes || `Bill #${invoiceNo}`);
  const amt = amount > 0 ? amount.toFixed(2) : "0.00";
  return `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodedName}&am=${amt}&tr=${encodeURIComponent(invoiceNo)}&tn=${encodedNotes}&cu=INR`;
}

/**
 * Format currency in Indian format (₹ 1,23,456.78)
 */
export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0.00";
  const parts = Number(amount).toFixed(2).split(".");
  let intPart = parts[0];
  const isNegative = intPart.startsWith("-");
  if (isNegative) intPart = intPart.substring(1);

  // Indian Numbering System grouping
  const lastThree = intPart.slice(-3);
  const otherNumbers = intPart.slice(0, -3);
  const formattedInt =
    otherNumbers !== ""
      ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
      : lastThree;

  return `${isNegative ? "-" : ""}₹${formattedInt}.${parts[1]}`;
}

/**
 * Convert number to Indian words
 */
export function numberToWordsINR(num: number): string {
  if (num === 0) return "Zero Rupees Only";
  if (isNaN(num)) return "";

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 !== 0 ? " and " + inWords(n % 100) : "")
      );
    if (n < 100000)
      return (
        inWords(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 !== 0 ? " " + inWords(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        inWords(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 !== 0 ? " " + inWords(n % 100000) : "")
      );
    return (
      inWords(Math.floor(n / 10000000)) +
      " Crore" +
      (n % 10000000 !== 0 ? " " + inWords(n % 10000000) : "")
    );
  }

  const rounded = Math.abs(num);
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  let result = "Rupees " + inWords(rupees);
  if (paise > 0) {
    result += " and " + inWords(paise) + " Paise";
  }
  result += " Only";
  return result;
}

/**
 * Generate GSTR-1 compliant JSON payload for GST portal upload
 */
export function generateGstr1Payload(
  tenantGstin: string,
  financialPeriod: string,
  invoices: Invoice[],
  creditNotes: CreditNote[] = [],
  debitNotes: DebitNote[] = []
): Gstr1Payload {
  const b2bMap: Record<string, Gstr1B2BGroup> = {};
  const b2csMap: Record<string, Gstr1B2CSItem> = {};
  const hsnMap: Record<string, Gstr1HsnItem> = {};
  const cdnrList: Gstr1CdnrRecord[] = [];
  const cdnurList: Gstr1CdnurRecord[] = [];
  const expList: Gstr1ExportRecord[] = [];

  let grossTurnover = 0;

  // Process Invoices
  for (const inv of invoices) {
    if (inv.status === "CANCELLED" || inv.invoiceType !== "TAX_INVOICE") continue;

    grossTurnover += inv.grandTotal;

    const isExport = (inv.invoiceType as string) === "EXPORT" || inv.placeOfSupply === "96" || (inv as any).isExport;
    const isB2B = Boolean(inv.party?.gstin && inv.party.gstin.length === 15);

    if (isExport) {
      // Exports Table 6A / 6B
      const taxRate = inv.items[0]?.taxRate || 18;
      expList.push({
        exp_typ: inv.igst > 0 ? "EXPWP" : "EXPWOP",
        sbnum: (inv as any).shippingBillNo || "SB-90124",
        sbdt: (inv as any).shippingBillDate || formatDateForGst(inv.createdAt),
        port_code: (inv as any).portCode || "INBOM4",
        inum: inv.invoiceNo,
        idt: formatDateForGst(inv.createdAt),
        val: inv.grandTotal,
        pos: inv.placeOfSupply.padStart(2, "0"),
        rt: taxRate,
        txval: inv.taxableAmount,
        iamt: inv.igst,
        camt: inv.cgst,
        samt: inv.sgst,
        csamt: inv.cess || 0,
      });
    } else if (isB2B && inv.party?.gstin) {
      const ctin = inv.party.gstin.toUpperCase();
      if (!b2bMap[ctin]) {
        b2bMap[ctin] = { ctin, inv: [] };
      }

      const itms = inv.items.map((item, idx) => ({
        num: idx + 1,
        itm_det: {
          rt: item.taxRate,
          txval: item.taxableAmount,
          iamt: item.igst,
          camt: item.cgst,
          samt: item.sgst,
          csamt: item.cess || 0,
        },
      }));

      b2bMap[ctin].inv.push({
        inum: inv.invoiceNo,
        idt: formatDateForGst(inv.createdAt),
        val: inv.grandTotal,
        pos: inv.placeOfSupply.padStart(2, "0"),
        rchrg: "N",
        inv_typ: "R",
        itms,
      });
    } else {
      // B2CS (Small retail / unregistered consumer)
      for (const item of inv.items) {
        const key = `${inv.placeOfSupply}_${item.taxRate}_${inv.isInterState ? "INTER" : "INTRA"}`;
        if (!b2csMap[key]) {
          b2csMap[key] = {
            sply_ty: inv.isInterState ? "INTER" : "INTRA",
            pos: inv.placeOfSupply.padStart(2, "0"),
            typ: "OE",
            rt: item.taxRate,
            txval: 0,
            iamt: 0,
            camt: 0,
            samt: 0,
            csamt: 0,
          };
        }
        b2csMap[key].txval = round2(b2csMap[key].txval + item.taxableAmount);
        b2csMap[key].iamt = round2(b2csMap[key].iamt + item.igst);
        b2csMap[key].camt = round2(b2csMap[key].camt + item.cgst);
        b2csMap[key].samt = round2(b2csMap[key].samt + item.sgst);
        b2csMap[key].csamt = round2(b2csMap[key].csamt + (item.cess || 0));
      }
    }

    // HSN Summary aggregation
    for (const item of inv.items) {
      const hsnKey = item.hsn || "9999";
      if (!hsnMap[hsnKey]) {
        hsnMap[hsnKey] = {
          num: Object.keys(hsnMap).length + 1,
          hsn_sc: hsnKey,
          desc: item.product?.name || "General Goods",
          uqc: item.unit || "NOS",
          qty: 0,
          val: 0,
          txval: 0,
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0,
        };
      }
      hsnMap[hsnKey].qty = round2(hsnMap[hsnKey].qty + item.quantity);
      hsnMap[hsnKey].val = round2(hsnMap[hsnKey].val + item.total);
      hsnMap[hsnKey].txval = round2(hsnMap[hsnKey].txval + item.taxableAmount);
      hsnMap[hsnKey].iamt = round2(hsnMap[hsnKey].iamt + item.igst);
      hsnMap[hsnKey].camt = round2(hsnMap[hsnKey].camt + item.cgst);
      hsnMap[hsnKey].samt = round2(hsnMap[hsnKey].samt + item.sgst);
      hsnMap[hsnKey].csamt = round2(hsnMap[hsnKey].csamt + (item.cess || 0));
    }
  }

  // Process Credit Notes (Table 9B)
  for (const cn of creditNotes) {
    const isRegistered = Boolean(cn.party?.gstin && cn.party.gstin.length === 15);
    const pos = (cn.party?.stateCode || "27").padStart(2, "0");
    const rate = cn.items?.[0]?.taxRate || 18;
    const noteNo = cn.noteNo || cn.creditNoteNo;
    const grandTotal = cn.grandTotal ?? cn.totalAmount;
    const taxableAmount = cn.taxableAmount ?? (cn.totalAmount - cn.taxAmount);
    const igst = cn.igst ?? 0;
    const cgst = cn.cgst ?? (cn.taxAmount / 2);
    const sgst = cn.sgst ?? (cn.taxAmount / 2);
    const cess = cn.cess ?? 0;

    if (isRegistered) {
      cdnrList.push({
        ctin: cn.party?.gstin?.toUpperCase() || "",
        cname: cn.party?.name || cn.partyName,
        nt_num: noteNo,
        nt_dt: formatDateForGst(cn.createdAt),
        ntty: "C",
        p_gst: "N",
        inum: cn.originalInvoiceNo || "INV-ORIG",
        idt: cn.originalInvoiceDate ? formatDateForGst(cn.originalInvoiceDate) : formatDateForGst(cn.createdAt),
        val: grandTotal,
        pos,
        rt: rate,
        txval: taxableAmount,
        iamt: igst,
        camt: cgst,
        samt: sgst,
        csamt: cess,
      });
    } else {
      cdnurList.push({
        typ: "B2CS",
        nt_num: noteNo,
        nt_dt: formatDateForGst(cn.createdAt),
        ntty: "C",
        p_gst: "N",
        inum: cn.originalInvoiceNo || "INV-ORIG",
        idt: cn.originalInvoiceDate ? formatDateForGst(cn.originalInvoiceDate) : formatDateForGst(cn.createdAt),
        val: grandTotal,
        pos,
        rt: rate,
        txval: taxableAmount,
        iamt: igst,
        camt: cgst,
        samt: sgst,
        csamt: cess,
      });
    }
  }

  // Process Debit Notes (Table 9B)
  for (const dn of debitNotes) {
    const isRegistered = Boolean(dn.party?.gstin && dn.party.gstin.length === 15);
    const pos = (dn.party?.stateCode || "27").padStart(2, "0");
    const rate = dn.items?.[0]?.taxRate || 18;
    const noteNo = dn.noteNo || dn.debitNoteNo;
    const grandTotal = dn.grandTotal ?? dn.totalAmount;
    const taxableAmount = dn.taxableAmount ?? (dn.totalAmount - dn.taxAmount);
    const igst = dn.igst ?? 0;
    const cgst = dn.cgst ?? (dn.taxAmount / 2);
    const sgst = dn.sgst ?? (dn.taxAmount / 2);
    const cess = dn.cess ?? 0;

    if (isRegistered) {
      cdnrList.push({
        ctin: dn.party?.gstin?.toUpperCase() || "",
        cname: dn.party?.name || dn.partyName,
        nt_num: noteNo,
        nt_dt: formatDateForGst(dn.createdAt),
        ntty: "D",
        p_gst: "N",
        inum: dn.originalInvoiceNo || dn.originalPurchaseBillNo || "INV-ORIG",
        idt: dn.originalInvoiceDate ? formatDateForGst(dn.originalInvoiceDate) : formatDateForGst(dn.createdAt),
        val: grandTotal,
        pos,
        rt: rate,
        txval: taxableAmount,
        iamt: igst,
        camt: cgst,
        samt: sgst,
        csamt: cess,
      });
    } else {
      cdnurList.push({
        typ: "B2CS",
        nt_num: noteNo,
        nt_dt: formatDateForGst(dn.createdAt),
        ntty: "D",
        p_gst: "N",
        inum: dn.originalInvoiceNo || dn.originalPurchaseBillNo || "INV-ORIG",
        idt: dn.originalInvoiceDate ? formatDateForGst(dn.originalInvoiceDate) : formatDateForGst(dn.createdAt),
        val: grandTotal,
        pos,
        rt: rate,
        txval: taxableAmount,
        iamt: igst,
        camt: cgst,
        samt: sgst,
        csamt: cess,
      });
    }
  }

  // Document Summary (Table 13)
  const validInvoices = invoices.filter((i) => i.invoiceType === "TAX_INVOICE");
  const cancelledInvoices = validInvoices.filter((i) => i.status === "CANCELLED");

  const invNos = validInvoices.map((i) => i.invoiceNo).sort();
  const cnNos = creditNotes.map((c) => c.noteNo || c.creditNoteNo).sort();
  const dnNos = debitNotes.map((d) => d.noteNo || d.debitNoteNo).sort();

  const docSummaryList: Gstr1DocCategorySummary[] = [
    {
      doc_num: 1,
      doc_name: "Invoices for Outward Supply",
      from: invNos[0] || "INV-0001",
      to: invNos[invNos.length - 1] || "INV-0001",
      totcnt: validInvoices.length,
      cancnt: cancelledInvoices.length,
      net_issue: Math.max(0, validInvoices.length - cancelledInvoices.length),
    },
    {
      doc_num: 2,
      doc_name: "Credit Notes Issued",
      from: cnNos[0] || "CN-0001",
      to: cnNos[cnNos.length - 1] || "CN-0001",
      totcnt: creditNotes.length,
      cancnt: 0,
      net_issue: creditNotes.length,
    },
    {
      doc_num: 3,
      doc_name: "Debit Notes Issued",
      from: dnNos[0] || "DN-0001",
      to: dnNos[dnNos.length - 1] || "DN-0001",
      totcnt: debitNotes.length,
      cancnt: 0,
      net_issue: debitNotes.length,
    },
    {
      doc_num: 4,
      doc_name: "Delivery Challans / Quick Inward",
      from: "DC-0001",
      to: "DC-0010",
      totcnt: 10,
      cancnt: 0,
      net_issue: 10,
    },
  ];

  return {
    gstin: tenantGstin,
    fp: financialPeriod,
    gt: round2(grossTurnover),
    cur_gt: round2(grossTurnover),
    b2b: Object.values(b2bMap),
    b2cs: Object.values(b2csMap),
    cdnr: cdnrList,
    cdnur: cdnurList,
    exp: expList,
    hsn: {
      data: Object.values(hsnMap),
    },
    doc_issue: {
      doc_det: docSummaryList,
    },
  };
}

/**
 * Generate Multi-Sheet CA Offline Utility CSV Bundle
 */
export function generateCaOfflineCsv(payload: Gstr1Payload): string {
  let csv = "";

  // B2B Section
  csv += `=== TABLE 4A: B2B INVOICES ===\n`;
  csv += `GSTIN/UIN of Recipient,Receiver Name,Invoice Number,Invoice Date,Invoice Value,Place Of Supply,Reverse Charge,Invoice Type,Rate (%),Taxable Value (INR),Integrated Tax (INR),Central Tax (INR),State Tax (INR),Cess (INR)\n`;
  for (const group of payload.b2b) {
    for (const inv of group.inv) {
      for (const itm of inv.itms) {
        const d = itm.itm_det;
        csv += `"${group.ctin}","Customer","${inv.inum}","${inv.idt}",${inv.val},"${inv.pos}","${inv.rchrg}","${inv.inv_typ}",${d.rt},${d.txval},${d.iamt},${d.camt},${d.samt},${d.csamt}\n`;
      }
    }
  }

  // B2CS Section
  csv += `\n=== TABLE 7: B2C SMALL SUPPLIES ===\n`;
  csv += `Type,Place Of Supply,Rate (%),Taxable Value (INR),Integrated Tax (INR),Central Tax (INR),State Tax (INR),Cess (INR)\n`;
  for (const item of payload.b2cs) {
    csv += `"${item.sply_ty}","${item.pos}",${item.rt},${item.txval},${item.iamt},${item.camt},${item.samt},${item.csamt}\n`;
  }

  // CDNR Section
  csv += `\n=== TABLE 9B: CREDIT / DEBIT NOTES REGISTERED (CDNR) ===\n`;
  csv += `GSTIN/UIN of Recipient,Receiver Name,Note Number,Note Date,Document Type,Original Invoice Number,Original Invoice Date,Place Of Supply,Note Value (INR),Rate (%),Taxable Value (INR),Integrated Tax (INR),Central Tax (INR),State Tax (INR)\n`;
  for (const item of payload.cdnr) {
    csv += `"${item.ctin || ""}","${item.cname || ""}","${item.nt_num}","${item.nt_dt}","${item.ntty}","${item.inum}","${item.idt}","${item.pos}",${item.val},${item.rt},${item.txval},${item.iamt},${item.camt},${item.samt}\n`;
  }

  // CDNUR Section
  csv += `\n=== TABLE 9B: CREDIT / DEBIT NOTES UNREGISTERED (CDNUR) ===\n`;
  csv += `Type,Note Number,Note Date,Document Type,Original Invoice Number,Original Invoice Date,Place Of Supply,Note Value (INR),Rate (%),Taxable Value (INR),Integrated Tax (INR),Central Tax (INR),State Tax (INR)\n`;
  for (const item of payload.cdnur) {
    csv += `"${item.typ}","${item.nt_num}","${item.nt_dt}","${item.ntty}","${item.inum}","${item.idt}","${item.pos}",${item.val},${item.rt},${item.txval},${item.iamt},${item.camt},${item.samt}\n`;
  }

  // Exports Section
  csv += `\n=== TABLE 6A/6B: EXPORTS & SEZ SUPPLIES ===\n`;
  csv += `Export Type,Invoice Number,Invoice Date,Invoice Value (INR),Port Code,Shipping Bill No,Shipping Bill Date,Rate (%),Taxable Value (INR),Integrated Tax (INR)\n`;
  for (const item of payload.exp) {
    csv += `"${item.exp_typ}","${item.inum}","${item.idt}",${item.val},"${item.port_code || ""}","${item.sbnum || ""}","${item.sbdt || ""}",${item.rt},${item.txval},${item.iamt}\n`;
  }

  // HSN Section
  csv += `\n=== TABLE 12: HSN SUMMARY ===\n`;
  csv += `HSN Code,Description,UQC,Total Quantity,Total Value (INR),Taxable Value (INR),Integrated Tax (INR),Central Tax (INR),State Tax (INR),Cess (INR)\n`;
  for (const hsn of payload.hsn.data) {
    csv += `"${hsn.hsn_sc}","${hsn.desc}","${hsn.uqc}",${hsn.qty},${hsn.val},${hsn.txval},${hsn.iamt},${hsn.camt},${hsn.samt},${hsn.csamt}\n`;
  }

  // Document Summary
  csv += `\n=== TABLE 13: DOCUMENT ISSUED SUMMARY ===\n`;
  csv += `Nature of Document,Sr. No. From,Sr. No. To,Total Number,Cancelled,Net Issued\n`;
  for (const doc of payload.doc_issue.doc_det) {
    csv += `"${doc.doc_name}","${doc.from}","${doc.to}",${doc.totcnt},${doc.cancnt},${doc.net_issue}\n`;
  }

  return csv;
}

/**
 * Generate CA Audit Summary Flat Detailed Transaction Register CSV
 */
export function generateCaAuditSummaryCsv(
  invoices: Invoice[],
  creditNotes: CreditNote[] = [],
  debitNotes: DebitNote[] = []
): string {
  let csv = `Date,Document No,Document Type,Party Name,Party GSTIN,Registration Status,POS State,Taxable Value (INR),CGST (INR),SGST (INR),IGST (INR),Cess (INR),Total Invoice Amount (INR)\n`;

  for (const inv of invoices) {
    const isB2B = Boolean(inv.party?.gstin && inv.party.gstin.length === 15);
    const regStatus = isB2B ? "REGULAR_TAX_PAYER" : "UNREGISTERED_CONSUMER";
    csv += `"${formatDateForGst(inv.createdAt)}","${inv.invoiceNo}","TAX_INVOICE","${inv.party?.name || "Cash Customer"}","${inv.party?.gstin || "URP"}","${regStatus}","${inv.placeOfSupply}",${inv.taxableAmount},${inv.cgst},${inv.sgst},${inv.igst},${inv.cess || 0},${inv.grandTotal}\n`;
  }

  for (const cn of creditNotes) {
    const isB2B = Boolean(cn.party?.gstin && cn.party.gstin.length === 15);
    const regStatus = isB2B ? "REGULAR_TAX_PAYER" : "UNREGISTERED_CONSUMER";
    const noteNo = cn.noteNo || cn.creditNoteNo;
    const taxableAmt = cn.taxableAmount ?? (cn.totalAmount - cn.taxAmount);
    const cgstAmt = cn.cgst ?? (cn.taxAmount / 2);
    const sgstAmt = cn.sgst ?? (cn.taxAmount / 2);
    const igstAmt = cn.igst ?? 0;
    const cessAmt = cn.cess ?? 0;
    const grandTotal = cn.grandTotal ?? cn.totalAmount;
    csv += `"${formatDateForGst(cn.createdAt)}","${noteNo}","CREDIT_NOTE","${cn.party?.name || cn.partyName || "Customer"}","${cn.party?.gstin || "URP"}","${regStatus}","${cn.party?.stateCode || "27"}",-${taxableAmt},-${cgstAmt},-${sgstAmt},-${igstAmt},-${cessAmt},-${grandTotal}\n`;
  }

  for (const dn of debitNotes) {
    const isB2B = Boolean(dn.party?.gstin && dn.party.gstin.length === 15);
    const regStatus = isB2B ? "REGULAR_TAX_PAYER" : "UNREGISTERED_CONSUMER";
    const noteNo = dn.noteNo || dn.debitNoteNo;
    const taxableAmt = dn.taxableAmount ?? (dn.totalAmount - dn.taxAmount);
    const cgstAmt = dn.cgst ?? (dn.taxAmount / 2);
    const sgstAmt = dn.sgst ?? (dn.taxAmount / 2);
    const igstAmt = dn.igst ?? 0;
    const cessAmt = dn.cess ?? 0;
    const grandTotal = dn.grandTotal ?? dn.totalAmount;
    csv += `"${formatDateForGst(dn.createdAt)}","${noteNo}","DEBIT_NOTE","${dn.party?.name || dn.partyName || "Customer"}","${dn.party?.gstin || "URP"}","${regStatus}","${dn.party?.stateCode || "27"}",${taxableAmt},${cgstAmt},${sgstAmt},${igstAmt},${cessAmt},${grandTotal}\n`;
  }

  return csv;
}

/**
 * Generate NIC E-Way Bill JSON Payload
 */
export function generateEWayBillJson(invoice: Invoice, supplierGstin: string, supplierStateCode: string) {
  return {
    supplyType: "O",
    subSupplyType: "1",
    docType: "INV",
    docNo: invoice.invoiceNo,
    docDate: formatDateForGst(invoice.createdAt),
    fromGstin: supplierGstin,
    fromTrdName: "VyaparFlow Enterprise Supplier",
    fromAddr1: "101, Business Hub",
    fromPlace: "Mumbai",
    fromPincode: 400001,
    actFromStateCode: Number(supplierStateCode),
    fromStateCode: Number(supplierStateCode),
    toGstin: invoice.party?.gstin || "URP",
    toTrdName: invoice.party?.name || "Cash Customer",
    toAddr1: invoice.party?.billingAddress || "Local",
    toPlace: invoice.party?.city || "City",
    toPincode: Number(invoice.party?.pincode) || 400001,
    actToStateCode: Number(invoice.placeOfSupply),
    toStateCode: Number(invoice.placeOfSupply),
    totalValue: invoice.taxableAmount,
    cgstValue: invoice.cgst,
    sgstValue: invoice.sgst,
    igstValue: invoice.igst,
    cessValue: invoice.cess,
    totInvValue: invoice.grandTotal,
    transDistance: "15",
    transporterName: "Direct Road Express",
    transporterId: "",
    transDocNo: "",
    transMode: "1",
    vehicleNo: "MH01AB1234",
    vehicleType: "R",
    itemList: invoice.items.map((it) => ({
      itemNo: 1,
      productName: it.product?.name || "Product",
      productDesc: it.product?.description || "Goods",
      hsnCode: Number(it.hsn) || 9999,
      quantity: it.quantity,
      qtyUnit: it.unit || "NOS",
      cgstRate: invoice.isInterState ? 0 : it.taxRate / 2,
      sgstRate: invoice.isInterState ? 0 : it.taxRate / 2,
      igstRate: invoice.isInterState ? it.taxRate : 0,
      cessRate: it.cessRate || 0,
      taxableAmount: it.taxableAmount,
    })),
  };
}

function formatDateForGst(dateStr: string | Date): string {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
