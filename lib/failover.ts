import type { ProviderSnapshot } from "./statuspage";

/** Pick a healthy failover candidate different from the down provider. */
export function failoverCandidate(
  downSlug: string,
  snapshots: Record<string, ProviderSnapshot>
): { slug: string; reason: string } | null {
  const order = ["paystack", "flutterwave", "moniepoint", "squad", "bachs", "paga", "mono", "interswitch"];
  for (const slug of order) {
    if (slug === downSlug) continue;
    const s = snapshots[slug];
    if (s && s.status === "operational") {
      return { slug, reason: `${slug} operational in NG (last check ${s.checkedAt})` };
    }
  }
  return null;
}

export function webhookEventFor(prev: string | undefined, next: string): string {
  if (!prev || prev === next) return "provider.status.changed";
  if (next === "down") return "provider.down";
  if (next === "degraded" || next === "unreachable") return "provider.degraded";
  if (next === "operational" && prev !== "operational") return "provider.recovered";
  return "provider.status.changed";
}
