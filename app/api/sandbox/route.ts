import { NextResponse } from "next/server";
import { diagnoseAll, diagnoseProvider } from "@/lib/diagnose";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug");
  const generatedAt = new Date().toISOString();

  if (slug && slug !== "all") {
    try {
      return NextResponse.json({ generatedAt, results: [await diagnoseProvider(slug)] });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "failed" },
        { status: 404 }
      );
    }
  }

  return NextResponse.json({ generatedAt, results: await diagnoseAll() });
}
