import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CategoryCreateSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  codePrefix: z.string().optional(),
  defaultGstRate: z.number().min(0).max(100).default(18),
  hsnCode: z.string().optional().default("9999"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    // In production multi-tenant environments, fetch from Prisma:
    // const categories = await prisma.category.findMany({ where: { tenantId: session.tenantId }, include: { _count: { select: { products: true } } } });
    return NextResponse.json({
      success: true,
      message: "Categories fetched successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CategoryCreateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", issues: validated.error.errors },
        { status: 400 }
      );
    }

    const data = validated.data;
    const newCategory = {
      id: `cat-${Date.now()}`,
      tenantId: "tenant-vyapar-01",
      name: data.name.trim(),
      codePrefix: data.codePrefix?.toUpperCase() || data.name.trim().slice(0, 4).toUpperCase(),
      defaultGstRate: data.defaultGstRate,
      hsnCode: data.hsnCode || "9999",
      description: data.description || "",
      isActive: data.isActive,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: "Category created successfully",
      data: newCategory,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create category" },
      { status: 500 }
    );
  }
}
