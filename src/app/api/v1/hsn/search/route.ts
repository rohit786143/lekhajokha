import { NextResponse } from "next/server";
import { HSN_MASTER } from "@/lib/hsn-master";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json({ success: true, data: [] });
    }

    const lowerQuery = query.toLowerCase();

    const filtered = HSN_MASTER.filter(
      (entry) =>
        entry.hsnCode.toLowerCase().includes(lowerQuery) ||
        entry.description.toLowerCase().includes(lowerQuery)
    );

    return NextResponse.json({ success: true, data: filtered });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
