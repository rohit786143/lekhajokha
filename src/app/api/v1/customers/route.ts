import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INITIAL_PARTIES, INITIAL_INVOICES } from "@/lib/mock-data";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawPhone = searchParams.get("phone") || "";
    const tenantId = searchParams.get("tenantId") || "tenant-vyapar-01";

    // Clean phone number (keep only 10 digits)
    const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);

    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json({
        success: false,
        error: "Please provide a valid 10-digit mobile number",
      }, { status: 400 });
    }

    // Try database query
    try {
      if (prisma && prisma.party) {
        const dbCustomer = await prisma.party.findFirst({
          where: {
            tenantId,
            phone: { contains: cleanPhone },
          },
        });

        if (dbCustomer) {
          const invoiceCount = await prisma.invoice.count({
            where: {
              tenantId,
              partyId: dbCustomer.id,
            },
          });

          return NextResponse.json({
            success: true,
            found: true,
            customer: {
              ...dbCustomer,
              totalVisits: invoiceCount || 1,
              outstandingBalance: dbCustomer.currentBalance || 0,
            },
          });
        }
      }
    } catch (dbErr) {
      console.warn("DB Customer lookup fallback to in-memory store:", dbErr);
    }

    // In-memory fallback lookup
    const foundParty = INITIAL_PARTIES.find((p) => {
      if (p.tenantId && p.tenantId !== tenantId) return false;
      const pPhone = (p.phone || "").replace(/\D/g, "").slice(-10);
      return pPhone === cleanPhone;
    });

    if (foundParty) {
      const visits = INITIAL_INVOICES.filter(
        (i) => i.partyId === foundParty.id || i.party?.phone?.replace(/\D/g, "").slice(-10) === cleanPhone
      ).length;

      return NextResponse.json({
        success: true,
        found: true,
        customer: {
          ...foundParty,
          totalVisits: Math.max(1, visits),
          outstandingBalance: foundParty.currentBalance || 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      found: false,
      phone: cleanPhone,
    });
  } catch (error: any) {
    console.error("GET /api/v1/customers error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to lookup customer" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, tenantId = "tenant-vyapar-01", gstin, stateCode = "27", billingAddress } = body;

    const cleanPhone = (phone || "").replace(/\D/g, "").slice(-10);

    if (!name || !cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: "Name and valid 10-digit phone number are required" },
        { status: 400 }
      );
    }

    const newCustomer = {
      id: `party-cust-${Date.now()}`,
      tenantId,
      name: name.trim(),
      type: "CUSTOMER" as const,
      phone: `+91 ${cleanPhone}`,
      gstin: gstin ? gstin.trim().toUpperCase() : undefined,
      stateCode: stateCode,
      billingAddress: billingAddress || "Walk-in Retail Customer",
      city: "Local Market",
      pincode: "400001",
      creditLimit: 0,
      openingBalance: 0,
      currentBalance: 0,
      totalVisits: 1,
      outstandingBalance: 0,
    };

    try {
      if (prisma && prisma.party) {
        const dbCreated = await prisma.party.create({
          data: {
            id: newCustomer.id,
            tenantId,
            name: newCustomer.name,
            type: "CUSTOMER",
            phone: newCustomer.phone,
            gstin: newCustomer.gstin,
            stateCode: newCustomer.stateCode,
            billingAddress: newCustomer.billingAddress,
            city: newCustomer.city,
            pincode: newCustomer.pincode,
            creditLimit: 0,
            openingBalance: 0,
            currentBalance: 0,
          },
        });
        return NextResponse.json({ success: true, customer: dbCreated });
      }
    } catch (dbErr) {
      console.warn("DB Customer creation fallback:", dbErr);
    }

    return NextResponse.json({ success: true, customer: newCustomer });
  } catch (error: any) {
    console.error("POST /api/v1/customers error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create customer" },
      { status: 500 }
    );
  }
}
