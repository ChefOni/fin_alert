export type ProviderStatus =
  | "operational"
  | "degraded"
  | "down"
  | "maintenance"
  | "unreachable"
  | "unknown";

export type SourceType = "statuspage" | "secondary" | "probe";

export interface ProviderConfig {
  slug: string;
  name: string;
  country: string;
  sourceType: SourceType;
  /** Official statuspage summary.json, if any */
  statusUrl?: string;
  /** Ordered fallbacks if the primary statusUrl fails (e.g. v3 → v2) */
  statusUrlFallbacks?: string[];
  /** Official status page (human link) */
  statusPageUrl?: string;
  /** Light public URL for reachability probes (docs or API base) */
  probeUrl?: string;
  /** Probe fallbacks tried in order */
  probeUrlFallbacks?: string[];
  /** HTTP method for the probe. Defaults to GET (HEAD stalls on several hosts). */
  probeMethod?: "GET" | "HEAD";
  /** Optional authenticated gateway probe, used only when gatewayAuthEnv is set */
  gatewayUrl?: string;
  /** Gateway fallbacks tried in order */
  gatewayUrlFallbacks?: string[];
  /** Env var holding an API key; if set, sent as `Authorization: Bearer <key>` */
  gatewayAuthEnv?: string;
  /** If true, this feed is only a secondary signal (e.g. dLocal sightings) */
  secondaryFor?: string[];
  description: string;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    slug: "paystack",
    name: "Paystack",
    country: "NG",
    sourceType: "statuspage",
    statusUrl: "https://status.paystack.com/v3/summary.json",
    statusUrlFallbacks: ["https://status.paystack.com/api/v2/summary.json"],
    statusPageUrl: "https://status.paystack.com",
    description: "Cards, bank transfer, Pay with Bank, USSD, direct debit (NG components).",
  },
  {
    slug: "flutterwave",
    name: "Flutterwave",
    country: "NG",
    sourceType: "statuspage",
    statusUrl: "https://status.flutterwave.com/api/v2/summary.json",
    statusPageUrl: "https://status.flutterwave.com",
    description: "Collections, payouts, USSD, Checkout JS. Filter to Nigeria mentions.",
  },
  {
    slug: "mono",
    name: "Mono",
    country: "NG",
    sourceType: "statuspage",
    // Confirm official URL before relying on it — StatusGator tracks a Mono page with 100+ components.
    statusUrl: process.env.MONO_STATUS_URL || "https://status.mono.co/api/v2/summary.json",
    statusPageUrl: "https://status.mono.co",
    description: "Account linking / data. URL not fully confirmed — override via MONO_STATUS_URL.",
  },
  {
    slug: "dlocal",
    name: "dLocal (NG sightings)",
    country: "NG",
    sourceType: "secondary",
    statusUrl: "https://status.dlocal.com/api/v2/summary.json",
    statusPageUrl: "https://status.dlocal.com",
    secondaryFor: ["interswitch", "moniepoint"],
    description: "Secondary signal: dLocal logs Interswitch / Monnify-Moniepoint processing incidents.",
  },
  {
    slug: "interswitch",
    name: "Interswitch",
    country: "NG",
    sourceType: "probe",
    probeUrl: "https://www.interswitchgroup.com",
    description: "No public status page. Reachability probe + dLocal secondary signal only.",
  },
  {
    slug: "moniepoint",
    name: "Moniepoint / Monnify",
    country: "NG",
    sourceType: "probe",
    // Public site only (api.monnify.com returns 401 without auth → false "unknown").
    probeUrl: "https://monnify.com",
    probeUrlFallbacks: ["https://moniepoint.com"],
    description: "No public status page. Reachability probe + dLocal secondary signal only.",
  },
  {
    slug: "paga",
    name: "Paga",
    country: "NG",
    sourceType: "probe",
    probeUrl: "https://www.mypaga.com",
    description: "No public status page confirmed. Light reachability probe only.",
  },
  {
    slug: "squad",
    name: "Squad (GTCO)",
    country: "NG",
    sourceType: "probe",
    probeUrl: "https://squadco.com",
    description: "No public status page confirmed. Light reachability probe only.",
  },
  {
    slug: "bachs",
    name: "Bachs",
    country: "NG",
    sourceType: "probe",
    // Public reachability by default; upgrades to an authenticated gateway handshake when a key is set.
    probeUrl: "https://bachs.io",
    gatewayUrl: process.env.BACHS_API_URL || "https://api.bachs.io/v1/products",
    gatewayUrlFallbacks: ["https://sandbox-api.bachs.io/v1/products"],
    gatewayAuthEnv: "BACHS_API_KEY",
    description:
      "Global checkout, subscription billing and multi-currency African settlements (NGN, GHS, KES, ZAR). No public status page — reachability probe, plus an authenticated gateway handshake when BACHS_API_KEY is set.",
  },
];

export function getProvider(slug: string): ProviderConfig | undefined {
  return PROVIDERS.find((p) => p.slug === slug);
}
