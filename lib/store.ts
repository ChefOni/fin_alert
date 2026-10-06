import { promises as fs } from "fs";
import path from "path";
import type { ProviderSnapshot } from "./statuspage";

export interface WebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  events: string[];
  providers: string[];
  ownerEmail?: string;
  createdAt: string;
}

export interface Delivery {
  id: string;
  endpointId: string;
  event: string;
  provider: string;
  statusCode: number | null;
  ok: boolean;
  attempts: number;
  createdAt: string;
  lastError?: string;
}

export interface CrowdReport {
  id: string;
  provider: string;
  message: string;
  createdAt: string;
}

interface StoreShape {
  snapshots: Record<string, ProviderSnapshot>;
  history: ProviderSnapshot[];
  endpoints: WebhookEndpoint[];
  deliveries: Delivery[];
  reports: CrowdReport[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

const EMPTY: StoreShape = { snapshots: {}, history: [], endpoints: [], deliveries: [], reports: [] };

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY };
  }
}

async function writeStore(s: StoreShape): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(s, null, 2), "utf8");
  } catch {
    // Serverless read-only FS — keep in-memory only. Swap to Postgres for prod.
  }
}

const mem: StoreShape = { ...EMPTY };

export async function saveSnapshot(snap: ProviderSnapshot): Promise<{ changed: boolean; prev?: string }> {
  let s: StoreShape;
  try {
    s = await readStore();
  } catch {
    s = mem;
  }
  const prev = s.snapshots[snap.slug]?.status ?? (mem.snapshots[snap.slug]?.status as string | undefined);
  const changed = prev !== undefined && prev !== snap.status;
  s.snapshots[snap.slug] = snap;
  mem.snapshots[snap.slug] = snap;
  s.history = [...s.history, snap].slice(-500);
  mem.history = [...mem.history, snap].slice(-500);
  await writeStore(s);
  return { changed, prev };
}

export async function getSnapshots(): Promise<Record<string, ProviderSnapshot>> {
  try {
    const s = await readStore();
    return Object.keys(s.snapshots).length ? s.snapshots : mem.snapshots;
  } catch {
    return mem.snapshots;
  }
}

export async function getHistory(limit = 50): Promise<ProviderSnapshot[]> {
  try {
    const s = await readStore();
    const h = s.history.length ? s.history : mem.history;
    return h.slice(-limit).reverse();
  } catch {
    return mem.history.slice(-limit).reverse();
  }
}

export async function listEndpoints(): Promise<WebhookEndpoint[]> {
  try {
    const s = await readStore();
    return s.endpoints.length ? s.endpoints : mem.endpoints;
  } catch {
    return mem.endpoints;
  }
}

export async function addEndpoint(e: WebhookEndpoint): Promise<void> {
  const s = await readStore().catch(() => mem);
  s.endpoints = [...s.endpoints, e];
  mem.endpoints = [...mem.endpoints, e];
  await writeStore(s);
}

export async function logDelivery(d: Delivery): Promise<void> {
  const s = await readStore().catch(() => mem);
  s.deliveries = [d, ...s.deliveries].slice(0, 200);
  mem.deliveries = [d, ...mem.deliveries].slice(0, 200);
  await writeStore(s);
}

export async function listDeliveries(limit = 50): Promise<Delivery[]> {
  try {
    const s = await readStore();
    return (s.deliveries.length ? s.deliveries : mem.deliveries).slice(0, limit);
  } catch {
    return mem.deliveries.slice(0, limit);
  }
}

export async function addReport(r: CrowdReport): Promise<void> {
  const s = await readStore().catch(() => mem);
  s.reports = [r, ...s.reports].slice(0, 200);
  mem.reports = [r, ...mem.reports].slice(0, 200);
  await writeStore(s);
}

export async function listReports(provider?: string, limit = 50): Promise<CrowdReport[]> {
  try {
    const s = await readStore();
    const all = s.reports.length ? s.reports : mem.reports;
    return (provider ? all.filter((r) => r.provider === provider) : all).slice(0, limit);
  } catch {
    const all = mem.reports;
    return (provider ? all.filter((r) => r.provider === provider) : all).slice(0, limit);
  }
}
