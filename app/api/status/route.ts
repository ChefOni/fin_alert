import { NextResponse } from "next/server";
import { PROVIDERS } from "@/lib/providers";
import { pollStatuspage, probeReachability, type ProviderSnapshot } from "@/lib/statuspage";
import { getSnapshots, saveSnapshot } from "@/lib/store";

export const revalidate = 60; // cache dashboard data 60s (matches poll cadence)
export const dynamic = "force-dynamic";

export async function GET() {
  // Serve cached snapshots if fresh, else poll live (statuspage sources only — fast path).
  const cached = await getSnapshots();
  const hasData = Object.keys(cached).length > 0;

  // Poll live in parallel; fall back to cache per-provider on failure.
  const results = await Promise.all(
    PROVIDERS.filter((p) => p.slug !== "dlocal" || process.env.INCLUDE_DLOCAL === "1").map(async (p) => {
      try {
        const snap: ProviderSnapshot =
          p.sourceType === "probe" ? await probeReachability(p.slug) : await pollStatuspage(p.slug);
        await saveSnapshot(snap);
        return snap;
      } catch {
        return cached[p.slug] ?? null;
      }
    })
  );

  const providers = results.filter(Boolean);
  return NextResponse.json({
    country: "NG",
    checkedAt: new Date().toISOString(),
    disclaimer: "Green = reachable + provider reports operational. It does not prove transfers are succeeding.",
    providers,
  });
}
