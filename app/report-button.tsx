"use client";

import { useState } from "react";

export function ReportButton({ provider }: { provider: string }) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try {
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, message: "Seeing failures too" }),
      });
      setSent(true);
    } finally {
      setBusy(false);
    }
  }
  if (sent)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        Counted
      </span>
    );
  return (
    <button
      onClick={send}
      disabled={busy}
      className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
    >
      {busy ? "Sending…" : "Are you seeing this too?"}
    </button>
  );
}
