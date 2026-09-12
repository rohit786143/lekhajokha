"use server";

import { PrismaClient } from "@prisma/client";
import { UserRole } from "./types";

const prisma = new PrismaClient();

// --- TENANTS (BUSINESS OWNERS) ---

export async function createTenantInDb(data: {
  name: string;
  email: string;
  phone: string;
  plan: string;
  stateCode: string;
}) {
  try {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
    const tenant = await prisma.tenant.create({
      data: {
        name: data.name,
        slug,
        email: data.email,
        phone: data.phone,
        stateCode: data.stateCode,
        plan: data.plan as any,
      },
    });

    // Automatically create the primary firm
    const firm = await prisma.firm.create({
      data: {
        tenantId: tenant.id,
        name: data.name,
        stateCode: data.stateCode,
        stateName: "State",
        isPrimary: true,
      },
    });

    // Set up default settings
    await prisma.tenantSetting.create({
      data: {
        tenantId: tenant.id,
      },
    });

    return { success: true, tenant, firm };
  } catch (error: any) {
    console.error("Error creating tenant:", error);
    return { success: false, error: error.message };
  }
}

export async function getTenantsFromDb() {
  try {
    const tenants = await prisma.tenant.findMany();
    return { success: true, tenants };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- USERS (STAFF) ---

export async function createUserInDb(data: {
  tenantId?: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  permissions?: any;
}) {
  try {
    const user = await prisma.user.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash: data.passwordHash,
        role: data.role as any,
        permissions: data.permissions ? data.permissions : undefined,
      },
    });
    return { success: true, user };
  } catch (error: any) {
    console.error("Error creating user:", error);
    return { success: false, error: error.message };
  }
}

export async function loginUserFromDb(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
