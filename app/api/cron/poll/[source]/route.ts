import { NextResponse } from "next/server";
import { PROVIDERS, getProvider } from "@/lib/providers";
import { pollStatuspage, probeReachability } from "@/lib/statuspage";
import { failoverCandidate, webhookEventFor } from "@/lib/failover";
import { getSnapshots, saveSnapshot, listEndpoints, logDelivery } from "@/lib/store";
import { signWebhook } from "@/lib/sign";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev open; set CRON_SECRET in prod
  const url = new URL(req.url);
  return (
    req.headers.get("authorization") === `Bearer ${secret}` ||
    url.searchParams.get("secret") === secret
  );
}

async function deliver(endpoint: any, event: string, payload: any) {
  const raw = JSON.stringify(payload);
  const ts = new Date().toISOString();
  const sig = signWebhook(endpoint.secret, raw);
  const started = Date.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Event": event,
          "X-Webhook-Signature": sig,
          "X-Webhook-Timestamp": ts,
          "Idempotency-Key": payload.delivery_id,
          "User-Agent": "NaijaPayHealth/1.0",
        },
        body: raw,
      });
      await logDelivery({
        id: payload.delivery_id, endpointId: endpoint.id, event,
        provider: payload.provider.slug, statusCode: res.status,
        ok: res.ok, attempts: 1, createdAt: ts,
        lastError: res.ok ? undefined : `HTTP ${res.status} in ${Date.now() - started}ms`,
      });
    } finally {
      clearTimeout(t);
    }
  } catch (err: any) {
    await logDelivery({
      id: payload.delivery_id, endpointId: endpoint.id, event,
      provider: payload.provider.slug, statusCode: null,
      ok: false, attempts: 1, createdAt: ts,
      lastError: err?.message ?? String(err),
    });
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ source: string }> }) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { source } = await ctx.params;

  const targets =
    source === "all"
      ? PROVIDERS.map((p) => p.slug)
      : getProvider(source)
        ? [source]
        : [];

  if (targets.length === 0) return NextResponse.json({ error: "unknown source" }, { status: 404 });

  const snapshotsBefore = await getSnapshots();
  const results = [];
  for (const slug of targets) {
    const cfg = getProvider(slug)!;
    const snap = cfg.sourceType === "probe" ? await probeReachability(slug) : await pollStatuspage(slug);
    const { changed, prev } = await saveSnapshot(snap);
    results.push({ ...snap, changed, prev });

    if (changed) {
      const event = webhookEventFor(prev, snap.status);
      const endpoints = await listEndpoints();
      const interested = endpoints.filter(
        (e) =>
          (e.events.includes(event) || e.events.includes("provider.status.changed") || e.events.includes("*")) &&
          (e.providers.includes(slug) || e.providers.includes("*"))
      );
      const snapshotsAfter = await getSnapshots();
      const candidate = failoverCandidate(slug, snapshotsAfter);
      for (const ep of interested) {
        const payload = {
          event,
          occurred_at: snap.checkedAt,
          provider: { slug: snap.slug, name: snap.name, status: snap.status, prev },
          nigeria_scope: true,
          incident: snap.activeIncidents[0]
            ? { title: snap.activeIncidents[0].title, url: snap.activeIncidents[0].url }
            : null,
          recommended_action: candidate
            ? { failover_candidate: candidate.slug, reason: candidate.reason }
            : null,
          delivery_id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        };
        // Fire-and-forget per endpoint (logged). Retries via QStash in prod; inline attempt here for MVP.
        await deliver(ep, event, payload);
      }
    }
  }

  return NextResponse.json({ ok: true, polled: results.map((r) => ({ slug: r.slug, status: r.status, changed: r.changed })) });
}
