import { PROVIDERS, getProvider, type ProviderConfig, type ProviderStatus, type SourceType } from "./providers";
import { isNigeriaRelevant, incidentInNigeriaScope } from "./statuspage";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const MAX_RAW = 4000;

export type FlagLevel = "ok" | "warn" | "error";

export interface DiagnosticFlag {
  level: FlagLevel;
  message: string;
}

export interface Diagnostic {
  slug: string;
  name: string;
  sourceType: SourceType;
  kind: "statuspage" | "probe";
  url: string | null;
  urlsTried: string[];
  httpStatus: number | null;
  latencyMs: number;
  contentType: string | null;
  bytes: number;
  format: string;
  parsed: Record<string, string | number | null>;
  computedStatus: ProviderStatus | null;
  flags: DiagnosticFlag[];
  raw: string;
  rawTruncated: boolean;
}

interface RawResult {
  status: number | null;
  latencyMs: number;
  contentType: string | null;
  bytes: number;
  body: string;
  error?: string;
}

interface RawComponent {
  id?: string | number;
  name?: string;
  status?: string;
  group?: boolean;
}

interface RawIncident {
  id?: string | number;
  name?: string;
  resolved_at?: string | null;
  incident_updates?: { body?: string }[];
}

interface RawSummary {
  components?: RawComponent[];
  incidents?: RawIncident[];
  scheduled_maintenances?: RawIncident[];
  status?: { indicator?: string };
  page?: { status?: string };
}

async function fetchRaw(
  url: string,
  method: string,
  headers: Record<string, string>,
  timeoutMs = 12000
): Promise<RawResult> {
  const start = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method, signal: ctrl.signal, headers, cache: "no-store", redirect: "follow" });
    const body = await res.text();
    return {
      status: res.status,
      latencyMs: Date.now() - start,
      contentType: res.headers.get("content-type"),
      bytes: Buffer.byteLength(body, "utf8"),
      body,
    };
  } catch (err) {
    return {
      status: null,
      latencyMs: Date.now() - start,
      contentType: null,
      bytes: 0,
      body: "",
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(t);
  }
}

function indicatorToStatus(indicator: string | null): ProviderStatus | null {
  switch (indicator) {
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

function pageStatusToStatus(raw: string | null): ProviderStatus | null {
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

function truncate(body: string): { raw: string; rawTruncated: boolean } {
  if (body.length <= MAX_RAW) return { raw: body, rawTruncated: false };
  return { raw: body.slice(0, MAX_RAW), rawTruncated: true };
}

function diagnoseStatuspage(cfg: ProviderConfig, r: RawResult, urlsTried: string[], url: string): Diagnostic {
  const flags: DiagnosticFlag[] = [];
  const contentType = r.contentType ?? "";
  const looksHtml = /^\s*</.test(r.body);

  let json: RawSummary | null = null;
  let parseError: string | null = null;
  try {
    json = JSON.parse(r.body) as RawSummary;
  } catch (e) {
    parseError = e instanceof Error ? e.message : String(e);
  }

  const components = Array.isArray(json?.components) ? json.components : [];
  const incidents = Array.isArray(json?.incidents) ? json.incidents : [];
  const scheduled = Array.isArray(json?.scheduled_maintenances) ? json.scheduled_maintenances : [];
  const indicator: string | null = json?.status?.indicator ?? null;
  const pageStatus: string | null = json?.page?.status ?? null;

  const parsed: Record<string, string | number | null> = {
    components: components.length,
    groups: components.filter((c) => c.group === true).length,
    incidents: incidents.length,
    scheduled_maintenances: scheduled.length,
    indicator,
    page_status: pageStatus,
  };

  let format = "unknown";
  if (json) {
    if (contentType.includes("json") || !looksHtml) {
      if (indicator && components.length > 0) format = "statuspage v2 summary";
      else if (components.length > 0) format = "statuspage-like JSON";
      else if (pageStatus) format = "page.status JSON (no components)";
      else format = "JSON (unrecognized shape)";
    }
  } else if (looksHtml) {
    format = "HTML (not JSON)";
  }

  // Compose a status the same way the poller does.
  let computedStatus: ProviderStatus | null = indicatorToStatus(indicator) ?? pageStatusToStatus(pageStatus);
  if (json && components.length > 0) {
    const ngBad = components.filter(
      (c) =>
        c.group !== true &&
        isNigeriaRelevant(String(c.name ?? "")) &&
        (c.status === "down" || c.status === "degraded" || c.status === "under_maintenance")
    );
    if (computedStatus === null || computedStatus === "operational") {
      computedStatus = ngBad.some((c) => c.status === "down")
        ? "down"
        : ngBad.length > 0
          ? "degraded"
          : "operational";
    }
  }

  const unresolved = incidents.filter((i) => i.resolved_at == null);
  const ngUnresolved = unresolved.filter((i) =>
    incidentInNigeriaScope(`${i.name ?? ""} ${i.incident_updates?.[0]?.body ?? ""}`)
  );

  if (r.status != null && r.status >= 400) {
    flags.push({ level: r.status >= 500 ? "error" : "warn", message: `HTTP ${r.status} — the status feed did not return a usable 2xx.` });
  }
  if (!json) {
    flags.push({
      level: "error",
      message: looksHtml
        ? "Response is HTML, not JSON — wrong URL or bot protection. We can't parse this."
        : `Response is not valid JSON (${parseError ?? "unknown"}).`,
    });
  } else if (components.length === 0 && !indicator && !pageStatus) {
    flags.push({ level: "warn", message: "No components / status / page.status fields — we may be reading the wrong shape." });
  } else if (pageStatus && components.length === 0) {
    flags.push({ level: "warn", message: "Only page.status is present — no per-component detail, so outages can't be scoped." });
  } else {
    flags.push({ level: "ok", message: `Parsed ${components.length} components, ${incidents.length} incidents, ${scheduled.length} maintenance.` });
  }
  if (computedStatus != null) {
    flags.push({ level: "ok", message: `Computed NG status: ${computedStatus}.` });
  }
  if (indicator === "none" && ngUnresolved.length > 0) {
    flags.push({
      level: "warn",
      message: `Indicator is "none" but ${ngUnresolved.length} unresolved NG incident(s) exist — treated as stale, not an outage.`,
    });
  }

  const { raw, rawTruncated } = truncate(r.body);
  return {
    slug: cfg.slug, name: cfg.name, sourceType: cfg.sourceType, kind: "statuspage",
    url, urlsTried, httpStatus: r.status, latencyMs: r.latencyMs, contentType: r.contentType,
    bytes: r.bytes, format, parsed, computedStatus, flags, raw, rawTruncated,
  };
}

function diagnoseProbe(cfg: ProviderConfig, r: RawResult, urlsTried: string[], url: string): Diagnostic {
  const flags: DiagnosticFlag[] = [];
  const parsed: Record<string, string | number | null> = {};

  if (r.error || r.status == null) {
    flags.push({ level: "error", message: `Request failed: ${r.error ?? "no response"}.` });
  } else if (r.status >= 500) {
    flags.push({ level: "error", message: `HTTP ${r.status} — server error.` });
  } else if (r.status === 401 || r.status === 403) {
    flags.push({ level: "warn", message: `HTTP ${r.status} — reachable, but auth required / bot-blocked. Counted as reachable.` });
  } else {
    flags.push({ level: "ok", message: `HTTP ${r.status} — host reachable. Reachable ≠ transfers succeeding.` });
  }

  if (cfg.gatewayUrl && cfg.gatewayAuthEnv) {
    parsed.gateway_auth_env = cfg.gatewayAuthEnv;
    const hasKey = Boolean(process.env[cfg.gatewayAuthEnv]);
    parsed.gateway_key_set = hasKey ? "yes" : "no";
    if (!hasKey) {
      flags.push({ level: "warn", message: `Set ${cfg.gatewayAuthEnv} to enable the authenticated gateway handshake (currently probing the public site only).` });
    }
  }

  const { raw, rawTruncated } = truncate(r.body);
  return {
    slug: cfg.slug, name: cfg.name, sourceType: cfg.sourceType, kind: "probe",
    url, urlsTried, httpStatus: r.status, latencyMs: r.latencyMs, contentType: r.contentType,
    bytes: r.bytes, format: "HTTP reachability", parsed,
    computedStatus: r.error || r.status == null || r.status >= 500 ? "unreachable" : "operational",
    flags, raw, rawTruncated,
  };
}

export async function diagnoseProvider(slug: string): Promise<Diagnostic> {
  const cfg = getProvider(slug);
  if (!cfg) throw new Error(`Unknown provider ${slug}`);
  const method = cfg.probeMethod ?? "GET";
  const headers: Record<string, string> = {
    "User-Agent": BROWSER_UA,
    Accept: "application/json,text/html;q=0.9,*/*;q=0.8",
  };

  // Probes: optional authenticated gateway first, then public reachability.
  if (cfg.sourceType === "probe") {
    const candidates: string[] = [];
    const key = cfg.gatewayAuthEnv ? process.env[cfg.gatewayAuthEnv] : undefined;
    if (cfg.gatewayUrl && key) {
      for (const u of [cfg.gatewayUrl, ...(cfg.gatewayUrlFallbacks ?? [])]) {
        const r = await fetchRaw(u, method, { ...headers, Authorization: `Bearer ${key}` });
        if (r.status != null && r.status < 500 && r.status !== 401 && r.status !== 403) {
          return diagnoseProbe(cfg, r, [u], u);
        }
        candidates.push(u);
      }
    }
    const urls = [cfg.probeUrl, ...(cfg.probeUrlFallbacks ?? [])].filter((u): u is string => Boolean(u));
    if (urls.length === 0) throw new Error(`No probeUrl for ${slug}`);
    let last: RawResult | null = null;
    let lastUrl = urls[0];
    for (const u of urls) {
      const r = await fetchRaw(u, method, headers);
      last = r;
      lastUrl = u;
      if (r.status != null && r.status < 500) break;
    }
    return diagnoseProbe(cfg, last as RawResult, [...candidates, ...urls], lastUrl);
  }

  // Status pages: try primary then fallbacks, stop on a 2xx.
  const urls = [cfg.statusUrl, ...(cfg.statusUrlFallbacks ?? [])].filter((u): u is string => Boolean(u));
  if (urls.length === 0) throw new Error(`No statusUrl for ${slug}`);
  let last: RawResult | null = null;
  let lastUrl = urls[0];
  for (const u of urls) {
    const r = await fetchRaw(u, "GET", headers);
    last = r;
    lastUrl = u;
    if (r.status != null && r.status < 300) break;
  }
  return diagnoseStatuspage(cfg, last as RawResult, urls, lastUrl);
}

export async function diagnoseAll(): Promise<Diagnostic[]> {
  return Promise.all(
    PROVIDERS.map(async (p) => {
      try {
        return await diagnoseProvider(p.slug);
      } catch (err) {
        return {
          slug: p.slug, name: p.name, sourceType: p.sourceType,
          kind: (p.sourceType === "probe" ? "probe" : "statuspage") as "probe" | "statuspage",
          url: null, urlsTried: [], httpStatus: null, latencyMs: 0, contentType: null, bytes: 0,
          format: "error", parsed: {}, computedStatus: null,
          flags: [{ level: "error" as const, message: err instanceof Error ? err.message : String(err) }],
          raw: "", rawTruncated: false,
        } satisfies Diagnostic;
      }
    })
  );
}
