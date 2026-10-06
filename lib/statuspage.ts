import { getProvider, type ProviderStatus } from "./providers";

export interface NormalizedComponent {
  id: string;
  name: string;
  status: ProviderStatus;
  ngRelevant: boolean;
  group: boolean;
}

export interface NormalizedIncident {
  externalId: string;
  title: string;
  status: string;
  impact: string;
  startedAt: string | null;
  updatedAt: string | null;
  resolvedAt: string | null;
  url: string | null;
  nigeriaScope: boolean;
  source: "official" | "secondary";
}

/** An unresolved incident not touched for this long is treated as stale (not shown as active). */
const INCIDENT_STALE_MS = 48 * 60 * 60 * 1000;

export interface ProviderMetrics {
  /** Non-group components only. */
  componentsTotal: number;
  componentsOperational: number;
  componentsDegraded: number;
  componentsDown: number;
  /** Health ratio 0–100 of non-group components that are operational. */
  healthPct: number;
  ngComponentsTotal: number;
  ngComponentsImpaired: number;
}

export interface ProviderSnapshot {
  slug: string;
  name: string;
  status: ProviderStatus;
  nigeriaScope: boolean;
  components: NormalizedComponent[];
  activeIncidents: NormalizedIncident[];
  metrics?: ProviderMetrics;
  checkedAt: string;
  source: string;
  latencyMs: number;
  note?: string;
}

interface StatuspageComponent {
  id?: string | number;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatuspageIncident {
  id?: string | number;
  name?: string;
  title?: string;
  status?: string;
  impact?: string;
  started_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  resolved_at?: string | null;
  shortlink?: string | null;
  incident_updates?: { body?: string }[];
}

interface StatuspageSummary {
  components?: StatuspageComponent[];
  incidents?: StatuspageIncident[];
  scheduled_maintenances?: StatuspageIncident[];
  /** Overall page indicator: none | minor | major | critical | maintenance */
  status?: { indicator?: string; description?: string };
  /** Some pages (e.g. Paystack v3) expose a simple page.status: UP | DOWN */
  page?: { status?: string };
}

const NG_HINTS = [
  "nigeria",
  " naira",
  " ng",
  "ng ",
  "[ng]",
  "(ng)",
  "bank transfer",
  "pay with bank",
  "pay-with-bank",
  "ussd",
  "direct debit",
  "directpay",
  "cards",
  "monnify",
  "moniepoint",
  "opay",
  "palmpay",
  "interswitch",
  "verve",
  "bvn",
  // Nigerian banks commonly surfaced by Mono / aggregators
  "gtbank",
  "gtb",
  "guaranty",
  "zenith",
  "access bank",
  "fcmb",
  "sterling",
  "stanbic",
  "first bank",
  "uba",
  "union bank",
  "wema",
  "providus",
  "polaris",
  "keystone",
  "heritage",
  "unity bank",
  "ecobank",
  "kuda",
];

/** Map a Statuspage page indicator (overall health) to a status. */
function indicatorToStatus(raw: string | undefined): ProviderStatus | null {
  switch (raw) {
    case "none":
      return "operational";
    case "minor":
      return "degraded";
    case "major":
    case "critical":
      return "down";
    case "maintenance":
      return "maintenance";
    default:
      return null;
  }
}

/** Map a simple page.status value (UP/DOWN/DEGRADED) to a status. */
function pageStatusToStatus(raw: string | undefined): ProviderStatus | null {
  switch ((raw ?? "").toLowerCase()) {
    case "up":
    case "operational":
      return "operational";
    case "degraded":
    case "partial":
      return "degraded";
    case "down":
    case "outage":
      return "down";
    case "maintenance":
      return "maintenance";
    default:
      return null;
  }
}

function statuspageToStatus(raw: string): ProviderStatus {
  switch (raw) {
    case "operational":
      return "operational";
    case "degraded_performance":
    case "partial_outage":
      return "degraded";
    case "major_outage":
      return "down";
    case "under_maintenance":
      return "maintenance";
    default:
      return "unknown";
  }
}

export function isNigeriaRelevant(text: string): boolean {
  const t = ` ${text.toLowerCase()} `;
  return NG_HINTS.some((h) => t.includes(h));
}

const OTHER_MARKETS =
  /(kenya|ghana|south africa|uganda|rwanda|tanzania|ivory|c.te|cote d'ivoire|zambia|egypt|cameroon|senegal|kenswitch)/i;
const NIGERIA_MENTION = /nigeria|\bng\b/i;

/**
 * Nigeria scope gate for incidents.
 * - Explicit Nigeria/NG mention → in scope.
 * - Mentions another market and not Nigeria → out of scope (prevents e.g.
 *   "Kenya: Bank Transfers Downtime" alerting NG users just because it
 *   contains the generic words "bank transfer").
 * - No country mentioned → in scope (global incident, assume relevant).
 */
export function incidentInNigeriaScope(haystack: string): boolean {
  if (NIGERIA_MENTION.test(haystack)) return true;
  if (OTHER_MARKETS.test(haystack)) return false;
  return true;
}

async function fetchJson(url: string, timeoutMs = 12000): Promise<{ json: unknown; latencyMs: number }> {
  const start = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "NaijaPayHealth/1.0 (+https://fin-alert; contact: ops@fin-alert)",
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return { json, latencyMs: Date.now() - start };
  } finally {
    clearTimeout(t);
  }
}

function computeMetrics(components: NormalizedComponent[]): ProviderMetrics {
  const real = components.filter((c) => !c.group);
  const operational = real.filter((c) => c.status === "operational").length;
  const degraded = real.filter((c) => c.status === "degraded" || c.status === "maintenance").length;
  const down = real.filter((c) => c.status === "down").length;
  const ng = real.filter((c) => c.ngRelevant);
  return {
    componentsTotal: real.length,
    componentsOperational: operational,
    componentsDegraded: degraded,
    componentsDown: down,
    healthPct: real.length ? Math.round((operational / real.length) * 100) : 0,
    ngComponentsTotal: ng.length,
    ngComponentsImpaired: ng.filter((c) => c.status === "degraded" || c.status === "down" || c.status === "maintenance").length,
  };
}

export async function pollStatuspage(slug: string): Promise<ProviderSnapshot> {
  const cfg = getProvider(slug);
  if (!cfg || !cfg.statusUrl) throw new Error(`No statusUrl for ${slug}`);
  const checkedAt = new Date().toISOString();

  const urls = [cfg.statusUrl, ...(cfg.statusUrlFallbacks ?? [])];

  let json: StatuspageSummary | undefined;
  let latencyMs = 0;
  let usedUrl = cfg.statusUrl;
  let lastErr: unknown;
  for (const url of urls) {
    try {
      const r = await fetchJson(url);
      json = r.json as StatuspageSummary;
      latencyMs = r.latencyMs;
      usedUrl = url;
      break;
    } catch (err) {
      lastErr = err;
    }
  }

  if (!json) {
    return {
      slug, name: cfg?.name ?? slug, status: "unknown",
      nigeriaScope: true, components: [], activeIncidents: [],
      checkedAt, source: cfg?.statusUrl ?? "", latencyMs: 0,
      note: `Poll failed: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
    };
  }

  try {
    const components: NormalizedComponent[] = (json.components ?? []).map((c) => {
      const name: string = c.name ?? "";
      return {
        id: String(c.id ?? name),
        name,
        status: statuspageToStatus(c.status ?? "unknown"),
        ngRelevant: isNigeriaRelevant(name),
        group: Boolean(c.group),
      };
    });

    // Only in-progress maintenance is "active"; scheduled (future) and completed ones are not.
    const inProgressMaintenance = (json.scheduled_maintenances ?? []).filter((m) => m.status === "in_progress");
    const rawIncidents: StatuspageIncident[] = [...(json.incidents ?? []), ...inProgressMaintenance];
    const activeIncidents: NormalizedIncident[] = rawIncidents.map((i) => {
      const updateBody: string = i.incident_updates?.[0]?.body ?? "";
      const title: string = i.name ?? i.title ?? "Incident";
      const hay = `${title} ${updateBody}`;
      return {
        externalId: String(i.id ?? title),
        title,
        status: String(i.status ?? "unknown"),
        impact: String(i.impact ?? "none"),
        startedAt: (i.started_at ?? i.created_at ?? null) as string | null,
        updatedAt: (i.updated_at ?? i.started_at ?? i.created_at ?? null) as string | null,
        resolvedAt: (i.resolved_at ?? null) as string | null,
        url: (i.shortlink ?? null) as string | null,
        nigeriaScope: slug === "dlocal" ? true : incidentInNigeriaScope(hay),
        source: slug === "dlocal" ? "secondary" : "official",
      };
    });

    const ngIncidents = activeIncidents.filter((i) => i.nigeriaScope && i.resolvedAt == null);
    const ngBadComponents = components.filter(
      (c) => !c.group && c.ngRelevant && (c.status === "down" || c.status === "degraded" || c.status === "maintenance")
    );

    // Overall health comes from the page indicator (what the provider itself shows).
    // Incidents alone must NOT force a downgrade: Statuspage pages often carry
    // unresolved-but-stale incidents whose components have already recovered — that
    // was falsely reporting Flutterwave/Mono as degraded while indicator = "none".
    // NG scoping is preserved by only reflecting a non-operational indicator when an
    // NG-scoped signal actually exists, and by escalating on real NG component outages.
    const indicator =
      indicatorToStatus(json.status?.indicator) ?? pageStatusToStatus(json.page?.status);

    let status: ProviderStatus;
    if (indicator === null || indicator === "operational") {
      status = ngBadComponents.some((c) => c.status === "down")
        ? "down"
        : ngBadComponents.length > 0
          ? "degraded"
          : "operational";
    } else {
      const ngSignal = ngBadComponents.length > 0 || ngIncidents.length > 0;
      status = ngSignal ? indicator : "operational";
    }

    // Surface only incidents that are plausibly live: always keep them when the page
    // itself reports a problem, otherwise require recent activity so we don't list
    // weeks-old, never-resolved incidents as "active".
    const now = Date.now();
    const displayIncidents = ngIncidents.filter((i) => {
      if (indicator && indicator !== "operational") return true;
      const t = Date.parse(i.updatedAt ?? i.startedAt ?? "");
      return Number.isFinite(t) && now - t <= INCIDENT_STALE_MS;
    });

    return {
      slug, name: cfg.name, status,
      nigeriaScope: true, components, activeIncidents: displayIncidents,
      metrics: computeMetrics(components),
      checkedAt, source: usedUrl, latencyMs,
    };
  } catch (err) {
    return {
      slug, name: cfg.name, status: "unknown",
      nigeriaScope: true, components: [], activeIncidents: [],
      checkedAt, source: usedUrl, latencyMs: 0,
      note: `Parse failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/** Browser-like UA: several hosts return 403 to datacenter/bot user agents. */
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function probeFetch(
  url: string,
  method: string,
  headers: Record<string, string>,
  timeoutMs = 12000
): Promise<{ status: number; latencyMs: number }> {
  const start = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method, signal: ctrl.signal, headers, cache: "no-store", redirect: "follow" });
    return { status: res.status, latencyMs: Date.now() - start };
  } finally {
    clearTimeout(t);
  }
}

export async function probeReachability(slug: string): Promise<ProviderSnapshot> {
  const cfg = getProvider(slug);
  const checkedAt = new Date().toISOString();
  if (!cfg) throw new Error(`Unknown provider ${slug}`);

  const method = cfg.probeMethod ?? "GET";
  const headers: Record<string, string> = {
    "User-Agent": BROWSER_UA,
    Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
  };

  const snap = (status: ProviderStatus, note: string, latencyMs: number, url: string): ProviderSnapshot => ({
    slug, name: cfg.name, status,
    nigeriaScope: true, components: [], activeIncidents: [],
    checkedAt, source: `probe:${url}`, latencyMs, note,
  });

  // 1) Authenticated gateway handshake — only when a key is actually configured.
  if (cfg.gatewayUrl && cfg.gatewayAuthEnv) {
    const key = process.env[cfg.gatewayAuthEnv];
    if (key) {
      for (const url of [cfg.gatewayUrl, ...(cfg.gatewayUrlFallbacks ?? [])]) {
        try {
          const { status, latencyMs } = await probeFetch(url, method, { ...headers, Authorization: `Bearer ${key}` });
          if (status === 401 || status === 403) {
            return snap("unknown", `Gateway ${url} → HTTP ${status} (auth rejected). Check ${cfg.gatewayAuthEnv}.`, latencyMs, url);
          }
          if (status >= 500) continue;
          return snap("operational", `Gateway handshake ${url} → HTTP ${status} in ${latencyMs}ms.`, latencyMs, url);
        } catch {
          // fall through to reachability
        }
      }
    }
  }

  // 2) Public reachability probe. Any response below 500 (incl. 401/403/3xx) means the
  //    host answered — 401/403 is NOT an outage, it just means auth was required.
  const urls = [cfg.probeUrl, ...(cfg.probeUrlFallbacks ?? [])].filter((u): u is string => Boolean(u));
  if (urls.length === 0) throw new Error(`No probeUrl for ${slug}`);

  const started = Date.now();
  let lastNote = "";
  let lastUrl = urls[0];
  for (const url of urls) {
    lastUrl = url;
    try {
      const { status, latencyMs } = await probeFetch(url, method, headers);
      if (status >= 500) {
        lastNote = `${method} ${url} → HTTP ${status}.`;
        continue;
      }
      return snap("operational", `${method} ${url} → HTTP ${status} in ${latencyMs}ms. Reachable ≠ transfers succeeding.`, latencyMs, url);
    } catch (err) {
      lastNote = `${method} ${url} failed: ${err instanceof Error ? err.message : String(err)}.`;
    }
  }

  return snap("unreachable", `${lastNote} Reachable ≠ transfers succeeding.`, Date.now() - started, lastUrl);
}
