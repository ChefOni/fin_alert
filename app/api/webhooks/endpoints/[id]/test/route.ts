import { NextResponse } from "next/server";
import { listEndpoints } from "@/lib/store";
import { signWebhook } from "@/lib/sign";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const endpoints = await listEndpoints();
  const ep = endpoints.find((e) => e.id === id);
  if (!ep) return NextResponse.json({ error: "not found" }, { status: 404 });

  const sample = {
    event: "provider.degraded",
    occurred_at: new Date().toISOString(),
    provider: { slug: "paystack", name: "Paystack", status: "degraded", prev: "operational" },
    nigeria_scope: true,
    incident: { title: "Sample: delays with bank transfers (test)", url: null },
    recommended_action: { failover_candidate: "flutterwave", reason: "test delivery" },
    delivery_id: `del_test_${Date.now()}`,
  };
  const raw = JSON.stringify(sample);
  try {
    const res = await fetch(ep.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": sample.event,
        "X-Webhook-Signature": signWebhook(ep.secret, raw),
        "X-Webhook-Timestamp": sample.occurred_at,
        "Idempotency-Key": sample.delivery_id,
        "User-Agent": "NaijaPayHealth/1.0",
      },
      body: raw,
    });
    return NextResponse.json({ ok: res.ok, statusCode: res.status });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 502 });
  }
}
