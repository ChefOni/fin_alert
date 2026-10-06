import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_MESSAGE = 2000;
const MAX_EMAIL = 200;

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  // Prefer a server-only secret key; fall back to the public publishable key.
  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Feedback is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or SUPABASE_SECRET_KEY)." },
      { status: 503 }
    );
  }

  // New publishable/secret keys are sent on the `apikey` header only.
  // Legacy JWT keys (anon/service_role) also require `Authorization: Bearer`.
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: supabaseKey,
    Prefer: "return=minimal",
  };
  if (supabaseKey.startsWith("eyJ")) headers.Authorization = `Bearer ${supabaseKey}`;

  const body = await req.json().catch(() => ({}));
  const message = String(body?.message ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const path = String(body?.path ?? "").trim().slice(0, 300);
  const honeypot = String(body?.company ?? "").trim();

  // Bot trap: hidden field must stay empty. Pretend success.
  if (honeypot) return NextResponse.json({ ok: true }, { status: 201 });

  if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });
  if (message.length > MAX_MESSAGE) return NextResponse.json({ error: "Message is too long." }, { status: 400 });
  if (email && (email.length > MAX_EMAIL || !email.includes("@"))) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  try {
    const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/feedback`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message,
        email: email || null,
        path: path || null,
        user_agent: req.headers.get("user-agent") ?? null,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      if (res.status === 404 || /PGRST205|42P01|does not exist/i.test(detail)) {
        return NextResponse.json(
          { error: "Feedback table is missing. Run supabase/feedback.sql (or `pnpm db:create-feedback`)." },
          { status: 503 }
        );
      }
      if (/42501|row-level security/i.test(detail)) {
        return NextResponse.json(
          { error: "Feedback insert blocked by RLS. Add the INSERT policy from supabase/feedback.sql." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: "Could not save feedback." }, { status: 502 });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not reach feedback service." }, { status: 502 });
  }
}
