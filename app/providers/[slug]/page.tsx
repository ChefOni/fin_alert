import Link from "next/link";
import { ProviderLogo } from "../../provider-logo";
import { getProvider } from "@/lib/providers";
import { pollStatuspage, probeReachability } from "@/lib/statuspage";
import { listReports } from "@/lib/store";
import { notFound } from "next/navigation";

export const revalidate = 60;
export const dynamic = "force-dynamic";

const STATUS: Record<string, { dot: string; text: string; bg: string; label: string }> = {
  operational: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", label: "Operational" },
  degraded: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", label: "Degraded" },
  down: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", label: "Down" },
  maintenance: { dot: "bg-sky-500", text: "text-sky-700", bg: "bg-sky-50", label: "Maintenance" },
  unreachable: { dot: "bg-zinc-400", text: "text-zinc-600", bg: "bg-zinc-100", label: "Unreachable" },
  unknown: { dot: "bg-zinc-300", text: "text-zinc-500", bg: "bg-zinc-100", label: "Unknown" },
};

export default async function ProviderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cfg = getProvider(slug);
  if (!cfg) return notFound();

  const snap = cfg.sourceType === "probe" ? await probeReachability(slug) : await pollStatuspage(slug);
  const reports = await listReports(slug, 20);
  const meta = STATUS[snap.status] ?? STATUS.unknown;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
      <Link href="/status" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <span aria-hidden="true">←</span> Live status
      </Link>

      <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <ProviderLogo slug={cfg.slug} name={cfg.name} size={56} />
          <div>
            <h1 className="text-4xl sm:text-5xl">{cfg.name}</h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">{cfg.description}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${meta.bg} ${meta.text}`}>
          <span className={`pulse-dot inline-block h-2 w-2 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </header>

      <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3">
        <div>
          <dt className="text-xs text-muted-foreground">Last checked</dt>
          <dd className="mt-1 text-sm font-medium tabular-nums">{snap.checkedAt}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Latency</dt>
          <dd className="mt-1 text-sm font-medium tabular-nums">{snap.latencyMs ? `${snap.latencyMs}ms` : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Source</dt>
          <dd className="mt-1 text-sm font-medium break-all">{snap.source || "cached"}</dd>
        </div>
      </dl>
      {snap.note && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{snap.note}</p>}

      {snap.metrics && snap.metrics.componentsTotal > 0 && (
        <section className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Component health</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-border bg-surface p-4">
              <div className="text-2xl font-semibold tabular-nums text-emerald-600">{snap.metrics.componentsOperational}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Operational</div>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <div className="text-2xl font-semibold tabular-nums text-amber-600">{snap.metrics.componentsDegraded}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Degraded</div>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <div className="text-2xl font-semibold tabular-nums text-red-600">{snap.metrics.componentsDown}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Down</div>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <div className="text-2xl font-semibold tabular-nums">{snap.metrics.healthPct}%</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Healthy</div>
            </div>
          </div>

          {(() => {
            const ng = snap.components.filter((c) => !c.group && c.ngRelevant);
            if (ng.length === 0) return null;
            return (
              <div className="mt-6">
                <p className="text-xs font-medium text-muted-foreground">
                  Nigeria-relevant components <span className="tabular-nums">({ng.length})</span>
                </p>
                <ul className="mt-3 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
                  {ng.slice(0, 12).map((c) => {
                    const d = STATUS[c.status] ?? STATUS.unknown;
                    return (
                      <li key={c.id} className="flex items-center justify-between gap-3 bg-surface px-4 py-2.5 text-sm">
                        <span className="truncate">{c.name}</span>
                        <span className={`inline-flex shrink-0 items-center gap-2 text-xs font-medium ${d.text}`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${d.dot}`} />
                          {d.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {ng.length > 12 && (
                  <p className="mt-2 text-xs text-muted-foreground">+ {ng.length - 12} more NG-relevant components</p>
                )}
              </div>
            );
          })()}
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Active Nigeria-scoped incidents</h2>
        {snap.activeIncidents.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted-foreground">
            None right now.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {snap.activeIncidents.map((i) => (
              <li key={i.externalId} className="rounded-2xl border border-border bg-surface p-4">
                <span className="text-sm font-medium">{i.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {i.status} · {i.impact} · started {i.startedAt ?? "unknown"}{i.url ? ` · ${i.url}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Crowd reports <span className="tabular-nums text-muted-foreground/70">({reports.length})</span>
        </h2>
        {reports.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted-foreground">
            No reports yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-surface p-4 text-sm">
                {r.message}
                <span className="mt-1 block text-xs text-muted-foreground">{r.createdAt}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
