"use client";

import { useState } from "react";

export function SubscribeForm() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/webhooks/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          events: ["provider.down", "provider.degraded", "provider.recovered"],
          providers: ["paystack", "flutterwave", "moniepoint"],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOk(false);
        setResult(`Error: ${data.error}`);
      } else {
        setOk(true);
        setResult(`Subscribed! id=${data.endpoint.id} · secret=${data.endpoint.secret.slice(0, 12)}… (save the full secret from the response)`);
      }
    } catch (err) {
      setOk(false);
      setResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 max-w-lg">
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-app.com/hooks/naija-health"
          className="min-w-0 flex-1 rounded-lg border border-border-strong bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          required
        />
        <button
          disabled={busy}
          className="shrink-0 rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {busy ? "…" : "Subscribe"}
        </button>
      </div>
      {result && (
        <p className={`mt-2 text-xs leading-relaxed ${ok ? "text-emerald-700" : "text-red-600"}`}>{result}</p>
      )}
    </form>
  );
}
