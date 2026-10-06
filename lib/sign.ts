import { createHmac, timingSafeEqual } from "crypto";

export function signWebhook(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyWebhook(secret: string, rawBody: string, signature: string): boolean {
  try {
    const expected = signWebhook(secret, rawBody);
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
