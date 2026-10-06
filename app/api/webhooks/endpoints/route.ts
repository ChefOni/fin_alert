import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { addEndpoint, listEndpoints } from "@/lib/store";
import { getProvider } from "@/lib/providers";

export const dynamic = "force-dynamic";

const ALLOWED_EVENTS = [
  "provider.status.changed",
  "provider.degraded",
  "provider.down",
  "provider.recovered",
  "incident.created",
  "incident.resolved",
  "maintenance.scheduled",
];

export async function GET() {
  const endpoints = await listEndpoints();
  return NextResponse.json({ endpoints: endpoints.map((e) => ({ ...e, secret: undefined })) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { url, events, providers, ownerEmail, secret } = body ?? {};

  try {
    const u = new URL(url);
    if (!["https:", "http:"].includes(u.protocol)) throw new Error("bad protocol");
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      // allow in dev only
      if (process.env.NODE_ENV === "production") throw new Error("localhost not allowed in prod");
    }
  } catch {
    return NextResponse.json({ error: "Invalid url. Must be absolute https URL." }, { status: 400 });
  }

  const evts: string[] = Array.isArray(events) && events.length ? events : ["provider.down", "provider.degraded"];
  for (const e of evts) {
    if (!ALLOWED_EVENTS.includes(e) && e !== "*")
      return NextResponse.json({ error: `Unknown event ${e}` }, { status: 400 });
  }
  const provs: string[] = Array.isArray(providers) && providers.length ? providers : ["*"];
  for (const p of provs) {
    if (p !== "*" && !getProvider(p)) return NextResponse.json({ error: `Unknown provider ${p}` }, { status: 400 });
  }

  const endpoint = {
    id: `ep_${Date.now().toString(36)}${randomBytes(3).toString("hex")}`,
    url,
    secret: typeof secret === "string" && secret.length >= 16 ? secret : `whsec_${randomBytes(24).toString("hex")}`,
    events: evts,
    providers: provs,
    ownerEmail: typeof ownerEmail === "string" ? ownerEmail : undefined,
    createdAt: new Date().toISOString(),
  };
  await addEndpoint(endpoint);
  return NextResponse.json({ ok: true, endpoint }, { status: 201 });
}
