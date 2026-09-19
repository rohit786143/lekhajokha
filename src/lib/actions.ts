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
  ownerName: string;
  temporaryPassword?: string;
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
        isActive: true,
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

    // Create the primary tenant owner user
    const owner = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: data.ownerName,
        email: data.email,
        phone: data.phone,
        passwordHash: data.temporaryPassword || "welcome123", // Ideally hashed, assuming mock hash for now
        role: "TENANT_OWNER",
        isActive: true,
      },
    });

    return { success: true, tenant, firm, owner };
  } catch (error: any) {
    console.error("Error creating tenant:", error);
    return { success: false, error: error.message };
  }
}

export async function getTenantsFromDb() {
  try {
    const dbTenants = await prisma.tenant.findMany({
      include: {
        users: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const tenants = dbTenants.map((t) => {
      const owner = t.users.find((u) => u.role === "TENANT_OWNER" || u.role === "OWNER") || t.users[0];
      return {
        id: t.id,
        name: t.name,
        legalName: t.legalName || t.name,
        gstin: t.gstin || "",
        stateCode: t.stateCode,
        stateName: t.stateCode === "27" ? "Maharashtra" : "Other State",
        plan: t.plan,
        subscriptionStatus: t.subscriptionStatus,
        subscriptionStart: t.subscriptionStart?.toISOString(),
        subscriptionEnd: t.subscriptionEnd?.toISOString(),
        isActive: t.isActive,
        ownerName: owner?.name || "Unknown Owner",
        ownerEmail: owner?.email || t.email || "",
        ownerPhone: owner?.phone || t.phone || "",
        totalUsersCount: t.users.length,
        createdAt: t.createdAt.toISOString(),
      };
    });

    return { success: true, tenants };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTenantStatusInDb(tenantId: string, isActive: boolean) {
  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive },
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTenantSubscriptionInDb(
  tenantId: string,
  plan: "BASIC" | "PRO",
  status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "SUSPENDED"
) {
  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan,
        subscriptionStatus: status,
        // If they are upgrading/downgrading, update the timestamp
        updatedAt: new Date(),
      },
    });
    
    // Log audit action
    await prisma.auditLog.create({
      data: {
        tenantId,
        action: "PLAN_CHANGED",
        entity: "Tenant",
        entityId: tenantId,
        details: { newPlan: plan, newStatus: status },
      },
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTenantOwnerCredentialsInDb(tenantId: string, newEmail: string, newPassword?: string) {
  try {
    const users = await prisma.user.findMany({
      where: {
        tenantId,
        role: { in: ["TENANT_OWNER", "OWNER"] },
      },
    });

    if (users.length === 0) {
      return { success: false, error: "No owner found for this tenant." };
    }

    const dataToUpdate: any = { email: newEmail.toLowerCase() };
    if (newPassword) {
      dataToUpdate.passwordHash = newPassword;
    }

    await prisma.user.update({
      where: { id: users[0].id },
      data: dataToUpdate,
    });
    
    // Also update tenant's contact email just in case
    await prisma.tenant.update({
        where: { id: tenantId },
        data: { email: newEmail.toLowerCase() }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUserCredentialsInDb(userId: string, newEmail: string, newPassword?: string) {
  try {
    const dataToUpdate: any = { email: newEmail.toLowerCase() };
    if (newPassword) {
      dataToUpdate.passwordHash = newPassword;
    }
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });
    
    if (updatedUser.tenantId && (updatedUser.role === "TENANT_OWNER" || updatedUser.role === "OWNER")) {
      await prisma.tenant.update({
          where: { id: updatedUser.tenantId },
          data: { email: newEmail.toLowerCase() }
      });
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteTenantInDb(tenantId: string) {
  try {
    // Soft delete per PRO rules
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus: "SUSPENDED",
        isActive: false,
      },
    });
    return { success: true };
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
      include: {
        tenant: {
          include: {
            firms: true,
            settings: true,
          },
        },
      },
    });
    return {
      success: true,
      user,
      tenant: user?.tenant,
      firms: user?.tenant?.firms || [],
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
