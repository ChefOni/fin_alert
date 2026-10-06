import { diagnoseAll, type Diagnostic, type FlagLevel } from "@/lib/diagnose";
import { ProviderLogo } from "../provider-logo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STATUS_BADGE: Record<string, string> = {
  operational: "bg-emerald-50 text-emerald-700",
  degraded: "bg-amber-50 text-amber-700",
  down: "bg-red-50 text-red-700",
  maintenance: "bg-sky-50 text-sky-700",
  unreachable: "bg-zinc-100 text-zinc-600",
  unknown: "bg-zinc-100 text-zinc-500",
};

const FLAG_STYLE: Record<FlagLevel, { wrap: string; dot: string }> = {
  ok: { wrap: "text-emerald-700", dot: "bg-emerald-500" },
  warn: { wrap: "text-amber-700", dot: "bg-amber-500" },
  error: { wrap: "text-red-700", dot: "bg-red-500" },
};

function DiagnosticCard({ d }: { d: Diagnostic }) {
  const worst: FlagLevel = d.flags.some((f) => f.level === "error")
    ? "error"
    : d.flags.some((f) => f.level === "warn")
      ? "warn"
      : "ok";
  const status = d.computedStatus ?? "unknown";

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ProviderLogo slug={d.slug} name={d.name} size={36} />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-medium">{d.name}</h2>
            <p className="truncate text-xs text-muted-foreground">
              {d.kind === "probe" ? "Probe" : "Status feed"} · {d.format}
            </p>
          </div>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_BADGE[status] ?? STATUS_BADGE.unknown}`}>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${worst === "ok" ? "bg-emerald-500" : worst === "warn" ? "bg-amber-500" : "bg-red-500"}`} />
          {status}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-y border-border py-3 text-xs">
        <div className="col-span-2">
          <dt className="text-muted-foreground">Effective URL</dt>
          <dd className="mt-0.5 break-all font-mono text-[11px]">{d.url ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">HTTP</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{d.httpStatus ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Latency</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{d.latencyMs}ms</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Bytes</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{d.bytes.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Content-type</dt>
          <dd className="mt-0.5 truncate font-mono text-[11px]">{d.contentType ?? "—"}</dd>
        </div>
      </dl>

      <ul className="mt-3 space-y-1.5">
        {d.flags.map((f, i) => (
          <li key={i} className={`flex items-start gap-2 text-xs leading-relaxed ${FLAG_STYLE[f.level].wrap}`}>
            <span className={`mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${FLAG_STYLE[f.level].dot}`} />
            <span>{f.message}</span>
          </li>
        ))}
      </ul>

      {Object.keys(d.parsed).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.entries(d.parsed).map(([k, v]) => (
            <span key={k} className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              {k}: <span className="text-foreground">{String(v)}</span>
            </span>
          ))}
        </div>
      )}

      <details className="mt-3 text-xs">
        <summary className="cursor-pointer font-semibold text-muted-foreground transition-colors hover:text-foreground">
          Raw response {d.rawTruncated ? `(first ${d.raw.length} chars)` : `(${d.bytes} bytes)`}
        </summary>
        <pre className="mt-2 max-h-72 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-emerald-200">
          {d.raw || "(empty)"}
        </pre>
      </details>
    </article>
  );
}

export default async function SandboxPage() {
  const results = await diagnoseAll();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Sandbox</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">Upstream response inspector</h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
        We fetch each provider&apos;s live source exactly as the poller does and show the raw response plus a
        flag telling you whether we&apos;re reading it correctly. Use it to spot bad URLs, auth walls,
        bot-blocking, or format changes.
      </p>

      <div className="mt-6 flex flex-wrap gap-4 text-xs">
        <span className="inline-flex items-center gap-2 text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> reading correctly</span>
        <span className="inline-flex items-center gap-2 text-amber-700"><span className="h-2 w-2 rounded-full bg-amber-500" /> worth a look</span>
        <span className="inline-flex items-center gap-2 text-red-700"><span className="h-2 w-2 rounded-full bg-red-500" /> broken / unreadable</span>
        <span className="text-muted-foreground">JSON API: <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[11px]">/api/sandbox?slug=all</code></span>
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        {results.map((d) => (
          <DiagnosticCard key={d.slug} d={d} />
        ))}
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        Snapshots are fetched fresh on every load — reload to re-run.
      </p>
    </main>
  );
}
