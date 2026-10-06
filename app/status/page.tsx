import Link from "next/link";
import { PROVIDERS } from "@/lib/providers";
import { pollStatuspage, probeReachability } from "@/lib/statuspage";
import { ReportButton } from "../report-button";
import { ProviderLogo } from "../provider-logo";

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

async function load() {
  const snaps = await Promise.all(
    PROVIDERS.filter((p) => p.slug !== "dlocal").map(async (p) => {
      try {
        return p.sourceType === "probe" ? await probeReachability(p.slug) : await pollStatuspage(p.slug);
      } catch (err) {
        return {
          slug: p.slug, name: p.name, status: "unknown" as const, nigeriaScope: true,
          components: [], activeIncidents: [], checkedAt: new Date().toISOString(),
          source: "", latencyMs: 0, note: err instanceof Error ? err.message : String(err),
        };
      }
    })
  );
  return snaps;
}

export default async function StatusPage() {
  const snaps = await load();
  const down = snaps.filter((s) => s.status === "down" || s.status === "degraded").length;
  const healthy = snaps.filter((s) => s.status === "operational").length;
  const total = snaps.length;
  const incidents = snaps.reduce((n, s) => n + s.activeIncidents.length, 0);
  const allClear = down === 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Live board</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">Payment status</h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
            Real-time health of the rails Nigerian fintech teams depend on — including providers with no
            status page. Refreshed every 60–120s.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border">
          <div className="bg-surface px-5 py-4">
            <div className="text-2xl font-semibold tabular-nums">{healthy}<span className="text-sm font-normal text-muted-foreground">/{total}</span></div>
            <div className="mt-0.5 text-xs text-muted-foreground">Operational</div>
          </div>
          <div className="bg-surface px-5 py-4">
            <div className={`text-2xl font-semibold tabular-nums ${allClear ? "text-emerald-600" : "text-amber-600"}`}>{down}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Degraded</div>
          </div>
          <div className="bg-surface px-5 py-4">
            <div className="text-2xl font-semibold tabular-nums">{incidents}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Incidents</div>
          </div>
        </div>
      </div>

      <p className="mt-8 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm leading-relaxed text-amber-900">
        <svg className="mt-0.5 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
        <span>
          Green means reachable and the provider reports operational — it does not prove transfers are succeeding.
          Probe-only providers (Interswitch, Moniepoint, Paga, Squad) are light HEAD checks on public URLs.
        </span>
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {snaps.map((s) => {
          const meta = STATUS[s.status] ?? STATUS.unknown;
          return (
            <article key={s.slug} className="group flex flex-col rounded-2xl border border-border bg-surface p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ProviderLogo slug={s.slug} name={s.name} size={36} />
                  <h2 className="truncate text-lg font-medium">{s.name}</h2>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${meta.bg} ${meta.text}`}>
                  <span className={`pulse-dot inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {s.latencyMs ? `${s.latencyMs}ms` : "—"} <span className="px-1 opacity-40">·</span> {s.source || "cached"} <span className="px-1 opacity-40">·</span> NG-filtered
              </p>

              {s.metrics && s.metrics.componentsTotal > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      <span className="font-medium text-foreground tabular-nums">{s.metrics.componentsOperational}</span>
                      /{s.metrics.componentsTotal} components operational
                      {s.metrics.ngComponentsTotal > 0 && (
                        <span className="opacity-70"> · {s.metrics.ngComponentsTotal} NG</span>
                      )}
                    </span>
                    <span className="tabular-nums">{s.metrics.healthPct}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className={`h-full rounded-full ${s.metrics.healthPct >= 100 ? "bg-emerald-500" : s.metrics.healthPct >= 85 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${s.metrics.healthPct}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 flex-1">
                {s.activeIncidents.length > 0 ? (
                  <ul className="space-y-2">
                    {s.activeIncidents.slice(0, 3).map((i) => (
                      <li key={i.externalId} className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs">
                        <span className="font-medium">{i.title}</span>
                        <span className="mt-0.5 block text-muted-foreground">{i.status} · {i.impact}{i.url ? ` · ${i.url}` : ""}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No active Nigeria-scoped incidents.</p>
                )}
                {s.note && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.note}</p>}
              </div>

              <div className="mt-4 flex items-center gap-4 border-t border-border pt-3.5">
                <Link href={`/providers/${s.slug}`} className="text-xs font-semibold text-accent-strong transition-opacity hover:opacity-70">
                  History →
                </Link>
                <ReportButton provider={s.slug} />
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
