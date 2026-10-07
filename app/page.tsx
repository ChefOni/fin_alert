import Link from "next/link";
import { PROVIDERS } from "@/lib/providers";
import { ProviderLogo } from "./provider-logo";

export const metadata = {
  title: "Fin Alert — know when Nigeria's fintech rails go down",
  description:
    "Fin Alert tracks the live health of the fintech rails Nigerian teams build on — payment processors like Paystack, Flutterwave, Mono, Interswitch, Moniepoint, plus other payment instruments like KYC/identity checks, cards and remittances — and pushes signed failover webhooks to your stack.",
};

const STEPS: { n: string; title: string; body: string; soon?: boolean }[] = [
  {
    n: "01",
    title: "Poll",
    body: "Every 60–120s we read official status APIs where they exist, and run light reachability probes against providers that publish nothing.",
  },
  {
    n: "02",
    title: "Scope to Nigeria",
    body: "Global status pages are noisy. We filter components and incidents down to the ones that actually touch Nigerian rails.",
  },
  {
    n: "03",
    title: "Push a signal",
    soon: true,
    body: "The moment a rail degrades we fire a signed webhook, so your checkout can fail over to a backup provider automatically.",
  },
];

const FEATURES = [
  {
    title: "Providers with no status page",
    body: "Interswitch, Moniepoint, Paga and Squad get covered anyway with reachability probes and secondary signals.",
  },
  {
    title: "Nigeria-scoped, not global",
    body: "You see the incidents that affect NG flows — not every global maintenance window a provider publishes.",
  },
  {
    title: "HMAC-signed webhooks",
    body: "Every delivery is signed with HMAC-SHA256 so you can trust it came from us, and only from us.",
  },
  {
    title: "Pull API as a fallback",
    body: "GET /api/status returns the whole board as JSON, so your backend can poll it when webhooks are not an option.",
  },
  {
    title: "Crowd reports",
    body: "When something feels off, teams flag it. Reports are counted next to the automated signal for a fuller picture.",
  },
  {
    title: "History per provider",
    body: "Each provider has a page with its incidents and recent reports, so you can look back before you look forward.",
  },
];

export default function Landing() {
  const providers = PROVIDERS.filter((p) => p.slug !== "dlocal");

  return (
    <main className="mx-auto w-full max-w-6xl px-6">
      <section className="grid min-h-[100svh] items-center gap-12 py-20 sm:py-28 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Nigeria-only uptime signal</p>
          <h1 className="mt-5 text-balance font-medium text-3xl leading-[1.05] sm:text-5xl">
            Know when Nigeria&apos;s fintech rails go down before your customers do.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Fin Alert watches the rails Nigerian fintech teams build on — payment processors like Paystack and
            Flutterwave, plus other payment instruments like KYC checks, cards and remittances — so one outage
            doesn&apos;t stall your flow.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/status" className="rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-85">
              View live status
            </Link>
            <Link href="#webhooks" className="rounded-full border border-border-strong px-6 py-3 text-sm font-semibold transition-colors hover:bg-surface-muted">
              Get failover webhooks
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground"> No account needed to read the board.</p>
        </div>
        <div className="rounded-3xl border border-border bg-surface-muted/60 p-6">
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>Watching</span>
            <span className="inline-flex items-center gap-2">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 text-emerald-500" />
              live
            </span>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {providers.map((p) => (
              <li key={p.slug} className="flex items-center justify-between gap-4 py-3">
                <span className="flex min-w-0 items-center gap-3">
                  <ProviderLogo slug={p.slug} name={p.name} size={28} />
                  <span className="truncate text-sm font-medium">{p.name}</span>
                </span>
                <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                  {p.sourceType === "probe" ? "Probe" : "Status API"}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/status" className="mt-4 inline-block text-xs font-semibold text-accent-strong hover:opacity-70">
            See current state →
          </Link>
        </div>
      </section>

      <section className="flex min-h-[100svh] flex-col justify-center border-t border-border py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Why this exists</p>
          <h2 className="mt-4 text-3xl sm:text-4xl">One failed rail can stall every transaction you run.</h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Payment rails go down independently of each other, and it&apos;s not just processors: KYC checks, card
            schemes, remittances and wallets degrade too — and the tools that would warn you are scattered across
            a dozen status pages, some of which don&apos;t even exist. By the time support tickets arrive,
            you&apos;ve already lost conversions. Fin Alert gives your team a single, Nigeria-scoped signal and a
            way to act on it automatically.
          </p>
        </div>

        <ol className="mt-12 grid gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n}>
              <div className="font-serif text-4xl text-accent">{s.n}</div>
              <h3 className="mt-3 flex flex-wrap items-center gap-2 text-xl font-medium">
                {s.title}
                {s.soon && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                    Coming soon
                  </span>
                )}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex min-h-[100svh] flex-col justify-center border-t border-border py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">What you get</p>
          <h2 className="mt-4 text-3xl sm:text-4xl">Built for teams that can&apos;t wait on a status page.</h2>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-surface p-6">
              <h3 className="text-lg font-medium">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="coverage" className="flex min-h-[100svh] scroll-mt-24 flex-col justify-center border-t border-border py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Coverage</p>
          <h2 className="mt-4 text-3xl sm:text-4xl">The rails we watch.</h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Where a provider publishes a status page we read it directly. Where they don&apos;t, we fall back to
            reachability probes and secondary signals — clearly labelled so you know how strong the signal is.
            That&apos;s payment processors today; KYC, card and remittance rails are next on the board.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <Link
              key={p.slug}
              href={`/providers/${p.slug}`}
              className="flex flex-col rounded-2xl border border-border bg-surface p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-3">
                  <ProviderLogo slug={p.slug} name={p.name} size={40} />
                  <h3 className="truncate text-lg font-medium">{p.name}</h3>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${p.sourceType === "probe" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                  {p.sourceType === "probe" ? "Probe" : "Status API"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="webhooks" className="flex min-h-[100svh] scroll-mt-24 flex-col justify-center border-t border-border py-20 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Failover webhooks</p>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                Coming soon
              </span>
            </div>
            <h2 className="mt-4 text-3xl sm:text-4xl">Switch providers in seconds, not in a war room.</h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              We&apos;re building signed webhooks that POST an event whenever a rail degrades or recovers, so your
              checkout can route around the outage automatically. Not live yet — the payload below is a preview.
            </p>
            <div className="mt-6 rounded-2xl border border-dashed border-border-strong bg-surface-muted/60 px-5 py-6">
              <p className="text-sm font-medium">Failover webhooks are coming soon.</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Want early access when they ship? Send us a note from the feedback button, or keep using the pull API below today.
              </p>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Available now — pull: <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs">GET /api/status</code>{" "}
              returns the whole board as JSON.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2">provider.down</span>
            </div>
            <pre className="mt-4 overflow-x-auto font-mono text-sm leading-relaxed text-emerald-200">{`POST {your_url}
X-Webhook-Event: provider.down
X-Webhook-Signature: hmac_sha256(secret, body)

{
  "event": "provider.down",
  "provider": { "slug": "paystack", "status": "down" },
  "nigeria_scope": true,
  "recommended_action": {
    "failover_candidate": "flutterwave"
  }
}`}</pre>
          </div>
        </div>
      </section>

      <section className="flex  flex-col justify-center border-t border-border py-20 sm:py-28">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-border bg-surface-muted/60 px-8 py-10 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl">See the board for yourself.</h2>
            <p className="mt-2 text-base text-muted-foreground">No sign-up, refreshed every 60–120s.</p>
          </div>
          <Link href="/status" className="rounded-full bg-foreground px-7 py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-85">
            Open live status
          </Link>
        </div>
      </section>
    </main>
  );
}
