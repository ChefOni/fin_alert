import { NextResponse } from "next/server";
import { listDeliveries } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ deliveries: await listDeliveries(50) });
}
