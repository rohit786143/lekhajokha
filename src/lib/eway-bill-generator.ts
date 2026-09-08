/**
 * Government E-Way Bill & E-Invoice NIC Payload Generator for VyaparFlow Enterprise
 * Conforms to India National Informatics Centre (NIC) JSON Schema v1.03
 */

import { Invoice, TenantInfo } from "./types";

export interface TransportInput {
  transporterId?: string; // 15-digit Transporter GSTIN / TRANSIN
  transporterName?: string;
  transDocNo?: string; // LR / Consignment Note / RR No
  transDocDate?: string; // DD/MM/YYYY or YYYY-MM-DD
  transMode: "1" | "2" | "3" | "4"; // 1=Road, 2=Rail, 3=Air, 4=Ship
  distanceKm: number; // Approximate distance in Kilometers
  vehicleNo: string; // e.g. "MH01AB1234" (alphanumeric without special chars)
  vehicleType: "R" | "O"; // R=Regular, O=Over Dimensional Cargo
}

export interface NicEwayItem {
  itemNo: number;
  productName: string;
  productDesc: string;
  hsnCode: number;
  quantity: number;
  qtyUnit: string;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number;
  cessNonAdvol: number;
  taxableAmount: number;
}

export interface NicEwayBillPayload {
  supplyType: "O" | "I"; // O=Outward, I=Inward
  subSupplyType: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8"; // 1=Supply, 2=Import, 3=Export, 4=Job Work, etc.
  subSupplyDesc?: string;
  docType: "INV" | "BIL" | "BOE" | "CHL" | "OTH";
  docNo: string;
  docDate: string; // DD/MM/YYYY
  fromGstin: string;
  fromTrdName: string;
  fromAddr1: string;
  fromAddr2?: string;
  fromPlace: string;
  fromPincode: number;
  actFromStateCode: number;
  fromStateCode: number;
  toGstin: string;
  toTrdName: string;
  toAddr1: string;
  toAddr2?: string;
  toPlace: string;
  toPincode: number;
  actToStateCode: number;
  toStateCode: number;
  totalValue: number; // Total Taxable Amount
  cgstValue: number;
  sgstValue: number;
  igstValue: number;
  cessValue: number;
  totInvValue: number; // Grand Total
  transDistance: string;
  transporterId: string;
  transporterName: string;
  transDocNo: string;
  transDocDate: string;
  transMode: "1" | "2" | "3" | "4";
  vehicleNo: string;
  vehicleType: "R" | "O";
  itemList: NicEwayItem[];
}

/**
 * Check if invoice requires mandatory E-Way Bill generation under Rule 138 of CGST Rules
 * Mandatory if Invoice value > ₹50,000 (or inter-state movement in certain states)
 */
export function isEWayBillMandatory(invoice: Invoice): boolean {
  return (
    invoice.grandTotal >= 50000 ||
    (invoice.isInterState && invoice.grandTotal >= 50000) ||
    Boolean(invoice.ewayBillNo)
  );
}

/**
 * Format any date into standard NIC DD/MM/YYYY string
 */
function formatNicDate(dateInput?: string | Date): string {
  if (!dateInput) {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${now.getFullYear()}`;
  }

  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    const parts = String(dateInput).split(/[-/]/);
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
    }
    return "01/01/2026";
  }

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Clean and format Indian vehicle number (removes dashes, spaces, and lowercase)
 */
export function sanitizeVehicleNumber(vNo: string): string {
  return (vNo || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Generate NIC Compliant E-Way Bill Payload
 */
export function generateNICPayload(
  invoice: Invoice,
  tenant: TenantInfo,
  transportDetails?: Partial<TransportInput>
): NicEwayBillPayload {
  const isInterState = invoice.isInterState;
  const supplierStateCodeNum = parseInt(tenant.stateCode || "27", 10);
  const posStateCodeNum = parseInt(invoice.placeOfSupply || tenant.stateCode || "27", 10);

  const cleanVehicleNo = sanitizeVehicleNumber(transportDetails?.vehicleNo || "MH01AB1234");
  const distance = Math.max(1, transportDetails?.distanceKm || 15);

  const itemList: NicEwayItem[] = invoice.items.map((it, idx) => {
    const hsnNum = parseInt((it.hsn || "9999").replace(/[^0-9]/g, ""), 10) || 9999;
    const cgstRate = isInterState ? 0 : it.taxRate / 2;
    const sgstRate = isInterState ? 0 : it.taxRate / 2;
    const igstRate = isInterState ? it.taxRate : 0;

    return {
      itemNo: idx + 1,
      productName: (it.product?.name || "Goods").substring(0, 100),
      productDesc: (it.product?.description || it.product?.name || "General Goods").substring(0, 100),
      hsnCode: hsnNum,
      quantity: Number(it.quantity) || 1,
      qtyUnit: (it.unit || "NOS").toUpperCase().substring(0, 8),
      cgstRate,
      sgstRate,
      igstRate,
      cessRate: Number(it.cessRate) || 0,
      cessNonAdvol: 0,
      taxableAmount: Math.round(it.taxableAmount * 100) / 100,
    };
  });

  return {
    supplyType: "O",
    subSupplyType: "1", // 1 = Supply
    docType: invoice.invoiceType === "DELIVERY_CHALLAN" ? "CHL" : "INV",
    docNo: invoice.invoiceNo,
    docDate: formatNicDate(invoice.createdAt),
    fromGstin: tenant.gstin || "27AABCU9603R1ZM",
    fromTrdName: (tenant.legalName || tenant.name).substring(0, 100),
    fromAddr1: (tenant.address || "Main Street").substring(0, 100),
    fromPlace: (tenant.city || "Mumbai").substring(0, 50),
    fromPincode: parseInt((tenant.pincode || "400001").replace(/[^0-9]/g, ""), 10) || 400001,
    actFromStateCode: supplierStateCodeNum,
    fromStateCode: supplierStateCodeNum,
    toGstin: invoice.party?.gstin && invoice.party.gstin.length === 15 ? invoice.party.gstin : "URP",
    toTrdName: (invoice.party?.name || "Cash Customer").substring(0, 100),
    toAddr1: (invoice.party?.billingAddress || "Counter Customer").substring(0, 100),
    toPlace: (invoice.party?.city || tenant.city || "Mumbai").substring(0, 50),
    toPincode:
      parseInt((invoice.party?.pincode || tenant.pincode || "400001").replace(/[^0-9]/g, ""), 10) ||
      400001,
    actToStateCode: posStateCodeNum,
    toStateCode: posStateCodeNum,
    totalValue: Math.round(invoice.taxableAmount * 100) / 100,
    cgstValue: Math.round(invoice.cgst * 100) / 100,
    sgstValue: Math.round(invoice.sgst * 100) / 100,
    igstValue: Math.round(invoice.igst * 100) / 100,
    cessValue: Math.round(invoice.cess * 100) / 100,
    totInvValue: Math.round(invoice.grandTotal * 100) / 100,
    transDistance: String(distance),
    transporterId: (transportDetails?.transporterId || "").toUpperCase(),
    transporterName: (transportDetails?.transporterName || "Direct Express Logistics").substring(0, 100),
    transDocNo: transportDetails?.transDocNo || `LR-${invoice.invoiceNo.replace(/[^0-9]/g, "")}`,
    transDocDate: formatNicDate(transportDetails?.transDocDate || invoice.createdAt),
    transMode: transportDetails?.transMode || "1",
    vehicleNo: cleanVehicleNo,
    vehicleType: transportDetails?.vehicleType || "R",
    itemList,
  };
}
