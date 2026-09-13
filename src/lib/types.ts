// VyaparFlow Enterprise Core Type Definitions

export type UserRole = "SUPER_ADMIN" | "OWNER" | "TENANT_OWNER" | "ACCOUNTANT" | "CASHIER" | "STOREKEEPER";

export type TenantPlan = "BASIC" | "PRO";

export type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED" | "SUSPENDED";

export interface TenantRegistryItem {
  id: string;
  name: string; // Business Trade Name
  legalName?: string;
  gstin?: string;
  stateCode: string;
  stateName: string;
  plan: TenantPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  isActive: boolean;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  totalUsersCount: number;
  createdAt: string;
  lastActiveAt?: string;
}

export interface OnboardTenantPayload {
  businessName: string;
  legalName?: string;
  gstin?: string;
  stateCode: string;
  stateName?: string;
  plan?: TenantPlan;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  temporaryPassword?: string;
}

export interface StaffUserPermissions {
  canEditBackdatedInvoices: boolean;
  canViewPurchaseRates: boolean;
  canViewProfitMargins: boolean;
  canGiveBillDiscounts: boolean;
  canDeleteInvoices: boolean;
  canManageUsers?: boolean;
  canAccessSettings?: boolean;
}

export interface StaffUser {
  id: string;
  tenantId?: string; // Optional for Super Admin
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  password?: string;
  pin?: string;
  isActive: boolean;
  permissions: StaffUserPermissions;
  firmId?: string;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthSession {
  user: StaffUser;
  token?: string;
  expiresAt?: string;
}

export type InvoiceType =
  | "TAX_INVOICE"
  | "QUOTATION"
  | "PROFORMA"
  | "DELIVERY_CHALLAN"
  | "BILL_OF_SUPPLY"
  | "CREDIT_NOTE"
  | "PURCHASE_ORDER"
  | "PURCHASE_BILL"
  | "DEBIT_NOTE";

export type PaymentMode = "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "CREDIT";

export type PaymentStatus = "PAID" | "PARTIAL" | "UNPAID";

export type InvoiceStatus = "DRAFT" | "PENDING" | "COMPLETED" | "CANCELLED";

export type SerialStatus = "AVAILABLE" | "SOLD" | "RETURNED" | "DEFECTIVE";

export interface TenantInfo {
  id: string;
  name: string;
  legalName: string;
  gstin: string;
  stateCode: string; // e.g. "27" (Maharashtra), "29" (Karnataka), "07" (Delhi)
  stateName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  pincode: string;
  logoUrl?: string;
  upiVpa: string;
  upiName: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankBranch: string;
  thermalHeader?: string;
  thermalFooter?: string;
  termsAndConditions?: string;
  plan?: TenantPlan;
  subscriptionStatus?: SubscriptionStatus;
}

export interface Firm {
  id: string;
  tenantId: string;
  name: string; // Trade Name
  legalName?: string;
  gstin?: string;
  stateCode: string; // 2 digits e.g. "27"
  stateName: string; // e.g. "Maharashtra"
  address?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  upiId?: string;
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  invoicePrefix: string;
  isPrimary: boolean;
  logoUrl?: string;
  signatureUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductBatch {
  id: string;
  productId: string;
  godownId: string;
  godownName: string;
  batchNo: string;
  mfgDate?: string;
  expDate?: string;
  stockQty: number;
  purchasePrice: number;
  salePrice: number;
  mrp: number;
}

export interface ProductSerial {
  id: string;
  productId: string;
  serialOrImei: string;
  status: SerialStatus;
  godownId?: string;
}

export interface Product {
  id: string;
  tenantId: string;
  categoryId?: string;
  categoryName?: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  unit: string;
  secondaryUnit?: string;
  conversionRate?: number;
  hsn: string;
  taxRate: number; // 0, 5, 12, 18, 28
  isTaxInclusive: boolean;
  cessRate?: number;
  purchasePrice: number;
  salePrice: number;
  mrp: number;
  wholesalePrice?: number;
  minStock: number;
  currentStock: number;
  trackBatch: boolean;
  trackSerial: boolean;
  imageUrl?: string;
  batches?: ProductBatch[];
  serials?: ProductSerial[];
}

export interface Party {
  id: string;
  tenantId: string;
  name: string;
  type: "CUSTOMER" | "VENDOR" | "BOTH";
  phone: string;
  email?: string;
  gstin?: string;
  pan?: string;
  stateCode: string;
  billingAddress: string;
  shippingAddress?: string;
  city: string;
  pincode: string;
  creditLimit: number;
  openingBalance: number;
  currentBalance: number; // Positive = Customer owes us, Negative = We owe vendor
}

export interface Godown {
  id: string;
  tenantId: string;
  name: string;
  location?: string;
  isDefault: boolean;
}

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  codePrefix?: string;
  defaultGstRate: number;
  hsnCode?: string;
  description?: string;
  isActive?: boolean;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  id: string; // unique item line id
  productId: string;
  product: Product;
  selectedBatch?: ProductBatch;
  selectedSerials?: string[];
  quantity: number;
  unit: string;
  unitPrice: number; // sale price per unit
  mrp: number;
  isTaxInclusive: boolean;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  cessRate: number;
  hsn: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  total: number;
}

export interface PaymentSplit {
  mode: PaymentMode;
  amount: number;
  refNumber?: string;
  bankName?: string;
  chequeDate?: string;
}

export interface InvoiceCalculations {
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  roundOff: number;
  grandTotal: number;
  itemCount: number;
  totalQuantity: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  invoiceType: InvoiceType;
  invoiceNo: string;
  referenceNo?: string;
  firmId?: string;
  firm?: Firm;
  partyId?: string;
  party?: Party;
  godownId?: string;
  godown?: Godown;
  placeOfSupply: string; // State Code
  isInterState: boolean;
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  paymentSplits: PaymentSplit[];
  items: CartItem[];
  dueDate?: string;
  ewayBillNo?: string;
  irnHash?: string;
  qrCodeUrl?: string;
  notes?: string;
  terms?: string;
  createdAt: string;
}

export interface ExpenseItem {
  id: string;
  tenantId: string;
  category: string;
  title: string;
  amount: number;
  paymentMode: PaymentMode;
  refNumber?: string;
  notes?: string;
  expenseDate: string;
}

export interface StockMovementItem {
  id: string;
  tenantId: string;
  productId: string;
  productName: string;
  batchNo?: string;
  fromGodown?: string;
  toGodown?: string;
  qty: number;
  type: "SALE" | "PURCHASE" | "TRANSFER" | "ADJUSTMENT" | "RETURN";
  reference?: string;
  notes?: string;
  timestamp: string;
}

// GSTR-1 Specific Data Shapes for GST Portal JSON
export interface Gstr1B2BInvoice {
  inum: string;
  idt: string;
  val: number;
  pos: string;
  rchrg: "Y" | "N";
  inv_typ: "R" | "DE" | "SEWP" | "SEWOP";
  itms: {
    num: number;
    itm_det: {
      rt: number;
      txval: number;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    };
  }[];
}

export interface Gstr1B2BGroup {
  ctin: string; // Customer GSTIN
  inv: Gstr1B2BInvoice[];
}

export interface Gstr1B2CSItem {
  sply_ty: "INTER" | "INTRA";
  pos: string;
  typ: "OE";
  rt: number;
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

export interface Gstr1HsnItem {
  num: number;
  hsn_sc: string;
  desc: string;
  uqc: string;
  qty: number;
  val: number;
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

export interface Gstr1Payload {
  gstin: string;
  fp: string; // Financial Period e.g. "092026"
  gt: number; // Gross turnover
  cur_gt: number;
  b2b: Gstr1B2BGroup[];
  b2cs: Gstr1B2CSItem[];
  hsn: {
    data: Gstr1HsnItem[];
  };
}

// --------------------------------------------------------
// PURCHASES & VENDOR INWARD
// --------------------------------------------------------

export type PurchaseStatus = "ORDERED" | "RECEIVED" | "PARTIAL" | "CANCELLED";

export interface PurchaseInvoiceItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  hsn: string;
  unit: string;
  batchId?: string;
  batchNo?: string;
  mfgDate?: string;
  expDate?: string;
  quantity: number;
  purchasePrice: number;
  mrp: number;
  salePrice: number;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
}

export interface PurchaseInvoice {
  id: string;
  tenantId: string;
  vendorId: string;
  vendorName: string;
  vendorGstin?: string;
  vendorPhone?: string;
  billNo: string;
  billDate: string;
  dueDate?: string;
  placeOfSupply: string;
  isInterState: boolean;
  subtotal: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMode: PaymentMode;
  status: PurchaseStatus;
  items: PurchaseInvoiceItem[];
  notes?: string;
  createdAt: string;
}

// --------------------------------------------------------
// QUOTATIONS & ESTIMATES
// --------------------------------------------------------

export type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CONVERTED_TO_INVOICE";

export interface QuotationItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  hsn: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
}

export interface Quotation {
  id: string;
  tenantId: string;
  partyId?: string;
  partyName?: string;
  partyGstin?: string;
  partyPhone?: string;
  quoteNo: string;
  quoteDate: string;
  validUntil?: string;
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
  status: QuotationStatus;
  convertedInvoiceId?: string;
  items: QuotationItem[];
  notes?: string;
  terms?: string;
  createdAt: string;
}

// --------------------------------------------------------
// RETURNS: CREDIT & DEBIT NOTES
// --------------------------------------------------------

export type ReturnReason =
  | "DEFECTIVE_GOODS"
  | "EXPIRED_STOCK"
  | "DAMAGED_IN_TRANSIT"
  | "WRONG_ITEM_SHIPPED"
  | "CUSTOMER_CANCELLATION"
  | "EXCESS_BILLING"
  | "OTHER";

export interface ReturnItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  batchId?: string;
  batchNo?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  total: number;
  reason?: ReturnReason;
}

export interface CreditNote {
  id: string;
  tenantId: string;
  creditNoteNo: string;
  noteNo?: string;
  originalInvoiceId?: string;
  originalInvoiceNo?: string;
  originalInvoiceDate?: string;
  partyId: string;
  partyName: string;
  party?: Party;
  totalAmount: number;
  grandTotal?: number;
  taxableAmount?: number;
  taxAmount: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  cess?: number;
  refundMode: PaymentMode;
  reason: ReturnReason;
  items: ReturnItem[];
  notes?: string;
  createdAt: string;
}

export interface DebitNote {
  id: string;
  tenantId: string;
  debitNoteNo: string;
  noteNo?: string;
  originalPurchaseId?: string;
  originalPurchaseBillNo?: string;
  originalInvoiceNo?: string;
  originalInvoiceDate?: string;
  partyId: string;
  partyName: string;
  party?: Party;
  totalAmount: number;
  grandTotal?: number;
  taxableAmount?: number;
  taxAmount: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  cess?: number;
  adjustmentMode: PaymentMode;
  reason: ReturnReason;
  items: ReturnItem[];
  notes?: string;
  createdAt: string;
}

// --------------------------------------------------------
// BARCODE LABEL STUDIO
// --------------------------------------------------------

export interface BarcodeLabelConfig {
  layout: "24_PER_PAGE" | "40_PER_PAGE" | "THERMAL_50X25";
  showBusinessName: boolean;
  showProductName: boolean;
  showSku: boolean;
  showBarcode: boolean;
  showPrice: boolean;
  showMrp: boolean;
  showBatchNo: boolean;
  showExpDate: boolean;
  customHeader?: string;
  barcodeType: "CODE128" | "EAN13";
}

// --------------------------------------------------------
// TENANT BACKUP & RECOVERY
// --------------------------------------------------------

export interface TenantBackupSnapshot {
  version: string;
  tenantId: string;
  timestamp: string;
  tenant: TenantInfo;
  products: Product[];
  categories: Category[];
  godowns: Godown[];
  parties: Party[];
  invoices: Invoice[];
  expenses: ExpenseItem[];
  purchaseInvoices: PurchaseInvoice[];
  quotations: Quotation[];
  creditNotes: CreditNote[];
  debitNotes: DebitNote[];
  firms?: Firm[];
  checksum: string;
}

// --------------------------------------------------------
// PROFIT & LOSS REPORT
// --------------------------------------------------------

export interface ProfitLossReport {
  period: "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "FISCAL_YEAR" | "CUSTOM";
  startDate: string;
  endDate: string;
  grossSalesRevenue: number;
  salesReturnsAmount: number;
  netSalesRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossProfitMargin: number; // %
  operatingExpenses: number;
  expenseBreakdown: { category: string; amount: number; percentage: number }[];
  netProfit: number;
  netProfitMargin: number; // %
  topProfitableProducts: {
    productId: string;
    productName: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  }[];
}

// --------------------------------------------------------
// QUICK STOCK INWARD
// --------------------------------------------------------

export interface QuickInwardPayload {
  productId: string;
  godownId?: string;
  godownName?: string;
  quantity: number;
  purchasePrice: number;
  salePrice?: number;
  mrp?: number;
  batchNo?: string;
  mfgDate?: string;
  expDate?: string;
  serials?: string[];
  notes?: string;
}

export interface InwardSessionRecord {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  quantity: number;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  mrp: number;
  totalValue: number;
  godownName: string;
  batchNo?: string;
  mfgDate?: string;
  expDate?: string;
  timestamp: string;
}

// --------------------------------------------------------
// GSTR-1 STATUTORY FILING INTERFACES
// --------------------------------------------------------

export interface Gstr1CdnrRecord {
  ctin?: string;
  cname?: string;
  nt_num: string;
  nt_dt: string;
  ntty: "C" | "D"; // C = Credit Note, D = Debit Note
  p_gst: "Y" | "N";
  inum: string;
  idt: string;
  val: number;
  pos: string;
  rt: number;
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt?: number;
}

export interface Gstr1CdnurRecord {
  typ: "B2CL" | "B2CS" | "EXPWOP" | "EXPWP";
  nt_num: string;
  nt_dt: string;
  ntty: "C" | "D";
  p_gst: "Y" | "N";
  inum: string;
  idt: string;
  val: number;
  pos: string;
  rt: number;
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt?: number;
}

export interface Gstr1ExportRecord {
  exp_typ: "EXPWP" | "EXPWOP" | "SEZWP" | "SEZWOP";
  sbnum?: string;
  sbdt?: string;
  port_code?: string;
  inum: string;
  idt: string;
  val: number;
  pos: string;
  rt: number;
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt?: number;
}

export interface Gstr1DocCategorySummary {
  doc_num: number;
  doc_name: string;
  from: string;
  to: string;
  totcnt: number;
  cancnt: number;
  net_issue: number;
}

export interface Gstr1HsnItem {
  num: number;
  hsn_sc: string;
  desc: string;
  uqc: string;
  qty: number;
  val: number;
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

export interface Gstr1Payload {
  gstin: string;
  fp: string;
  gt: number;
  cur_gt: number;
  b2b: Gstr1B2BGroup[];
  b2cs: Gstr1B2CSItem[];
  cdnr: Gstr1CdnrRecord[];
  cdnur: Gstr1CdnurRecord[];
  exp: Gstr1ExportRecord[];
  hsn: {
    data: Gstr1HsnItem[];
  };
  doc_issue: {
    doc_det: Gstr1DocCategorySummary[];
  };
}


