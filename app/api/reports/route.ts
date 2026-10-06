import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { addReport, listReports } from "@/lib/store";
import { getProvider } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") ?? undefined;
  return NextResponse.json({ reports: await listReports(provider ?? undefined) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const provider = String(body?.provider ?? "");
  const message = String(body?.message ?? "").slice(0, 280);
  if (!getProvider(provider)) return NextResponse.json({ error: "unknown provider" }, { status: 400 });
  if (!message.trim()) return NextResponse.json({ error: "message required" }, { status: 400 });
  const report = {
    id: `rep_${Date.now().toString(36)}${randomBytes(3).toString("hex")}`,
    provider, message: message.trim(), createdAt: new Date().toISOString(),
  };
  await addReport(report);
  return NextResponse.json({ ok: true, report }, { status: 201 });
}
