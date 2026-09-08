/**
 * WhatsApp Cloud API & Dynamic UPI Dispatcher for VyaparFlow Enterprise
 * Generates official Meta Cloud API payloads and one-click direct client dispatch links.
 */

import { Invoice, TenantInfo, Party } from "./types";
import { formatCurrency, generateUpiUri } from "./tax-engine";

export interface WhatsAppTemplatePayload {
  messaging_product: "whatsapp";
  to: string; // Recipient phone with country code e.g. "919820012345"
  type: "template" | "interactive" | "text";
  text?: {
    preview_url: boolean;
    body: string;
  };
  interactive?: {
    type: "button";
    header?: {
      type: "text";
      text: string;
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      buttons: Array<{
        type: "reply";
        reply: {
          id: string;
          title: string;
        };
      }>;
    };
  };
}

export interface InvoiceWhatsAppNotification {
  clientDispatchUrl: string; // Direct https://api.whatsapp.com/send?phone=... URL
  cloudApiPayload: WhatsAppTemplatePayload;
  upiDeepLink: string;
  pdfDownloadUrl: string;
  formattedText: string;
}

/**
 * Clean phone number and ensure Indian 91 country code
 */
export function formatWhatsAppPhoneNumber(phoneInput?: string): string {
  const digits = (phoneInput || "").replace(/[^0-9]/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }
  return digits || "919800000000";
}

/**
 * Generate complete WhatsApp notification bundle with UPI deep link and PDF URL
 */
export function generateInvoiceWhatsAppNotification(params: {
  invoice: Invoice;
  tenant: TenantInfo;
  party?: Party | null;
  pdfBaseUrl?: string;
}): InvoiceWhatsAppNotification {
  const { invoice, tenant, party, pdfBaseUrl } = params;

  const phone = formatWhatsAppPhoneNumber(party?.phone || invoice.party?.phone);
  const customerName = party?.name || invoice.party?.name || "Valued Customer";
  const dueAmount = invoice.balanceAmount > 0 ? invoice.balanceAmount : invoice.grandTotal;

  // Generate NPCI UPI Deep Link
  const upiDeepLink = generateUpiUri({
    vpa: tenant.upiVpa || "vyaparflow@icici",
    payeeName: tenant.upiName || tenant.name,
    amount: dueAmount,
    invoiceNo: invoice.invoiceNo,
    notes: `Bill ${invoice.invoiceNo}`,
  });

  const pdfDownloadUrl = `${pdfBaseUrl || "https://app.vyaparflow.enterprise"}/invoices/${invoice.id}/pdf`;

  // Compose clean, polite, high-converting WhatsApp message body
  const textLines = [
    `🧾 *TAX INVOICE FROM ${tenant.name.toUpperCase()}*`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `Namaste *${customerName}* ji,`,
    ``,
    `Thank you for your business! Your bill has been generated successfully.`,
    ``,
    `📌 *Invoice No:* ${invoice.invoiceNo}`,
    `📅 *Date:* ${new Date(invoice.createdAt).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`,
    `🛍️ *Total Items:* ${invoice.items.length} items`,
    `💰 *Grand Total:* *${formatCurrency(invoice.grandTotal)}*`,
    invoice.balanceAmount > 0
      ? `⏳ *Balance Outstanding (Khata):* *${formatCurrency(invoice.balanceAmount)}*`
      : `✅ *Status:* FULLY PAID`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `📲 *Pay Instantly via UPI (GPay / PhonePe / Paytm):*`,
    `${upiDeepLink}`,
    ``,
    `📄 *Download Official GST PDF Receipt:*`,
    `${pdfDownloadUrl}`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `GSTIN: ${tenant.gstin} | Helpline: ${tenant.phone}`,
    `_Powered by VyaparFlow Enterprise ERP_`,
  ];

  const formattedText = textLines.join("\n");

  // Client side 1-click URL
  const clientDispatchUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(
    formattedText
  )}`;

  // Meta WhatsApp Cloud API Payload
  const cloudApiPayload: WhatsAppTemplatePayload = {
    messaging_product: "whatsapp",
    to: phone,
    type: "text",
    text: {
      preview_url: true,
      body: formattedText,
    },
  };

  return {
    clientDispatchUrl,
    cloudApiPayload,
    upiDeepLink,
    pdfDownloadUrl,
    formattedText,
  };
}
