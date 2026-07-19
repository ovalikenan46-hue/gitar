import { createHash } from "node:crypto";
import type { Request } from "express";
import {
  db,
  adminLoginLogTable,
  adminAuthorizedDevicesTable,
  adminAuditLogTable,
} from "@workspace/db";
import { eq, count } from "drizzle-orm";

// ---------------------------------------------------------------------------
// In-memory brute-force lockout tracker
// ---------------------------------------------------------------------------
interface LockoutEntry {
  count: number;
  lockedUntil?: Date;
}

const failedAttempts = new Map<string, LockoutEntry>();

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function isLockedOut(ip: string): boolean {
  const entry = failedAttempts.get(ip);
  if (!entry?.lockedUntil) return false;
  if (entry.lockedUntil > new Date()) return true;
  failedAttempts.delete(ip);
  return false;
}

export function getLockoutRemainingMs(ip: string): number {
  const entry = failedAttempts.get(ip);
  if (!entry?.lockedUntil) return 0;
  return Math.max(0, entry.lockedUntil.getTime() - Date.now());
}

export function recordFailedAttempt(ip: string): number {
  const entry = failedAttempts.get(ip) ?? { count: 0 };
  entry.count += 1;
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockedUntil = new Date(Date.now() + LOCKOUT_MS);
  }
  failedAttempts.set(ip, entry);
  return entry.count;
}

export function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

// ---------------------------------------------------------------------------
// Device fingerprinting
// ---------------------------------------------------------------------------
export type DeviceType = "pc" | "phone";

export function deviceFingerprint(ua: string): string {
  return createHash("sha256").update(ua || "unknown").digest("hex");
}

export function detectDeviceType(ua: string): DeviceType {
  if (/mobile|android|iphone|ipad|tablet|windows phone/i.test(ua)) {
    return "phone";
  }
  return "pc";
}

export function parseUA(ua: string): { browser: string; os: string } {
  let browser = "Bilinmeyen";
  let os = "Bilinmeyen";

  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\//i.test(ua)) browser = "Opera";
  else if (/chrome\//i.test(ua)) browser = "Chrome";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua)) browser = "Safari";

  if (/windows nt/i.test(ua)) os = "Windows";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone os|ipad/i.test(ua)) os = "iOS";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  return { browser, os };
}

// ---------------------------------------------------------------------------
// IP extraction
// ---------------------------------------------------------------------------
export function getClientIP(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]!.trim();
  return (req.socket?.remoteAddress ?? "unknown");
}

// ---------------------------------------------------------------------------
// Login log
// ---------------------------------------------------------------------------
export async function logLoginAttempt(
  req: Request,
  success: boolean,
  failReason?: string,
  lockedOut = false,
): Promise<void> {
  const ip = getClientIP(req);
  const ua = req.headers["user-agent"] ?? "";
  await db.insert(adminLoginLogTable).values({
    ip,
    userAgent: ua,
    success,
    failReason: failReason ?? null,
    lockedOut,
  });
}

// ---------------------------------------------------------------------------
// Device authorization
// ---------------------------------------------------------------------------
interface DeviceCheckResult {
  allowed: boolean;
  registered: boolean;
  deviceId?: string;
}

export async function checkAndRegisterDevice(
  req: Request,
): Promise<DeviceCheckResult> {
  const ua = req.headers["user-agent"] ?? "";
  const ip = getClientIP(req);
  const fp = deviceFingerprint(ua);
  const deviceType = detectDeviceType(ua);

  const [existing] = await db
    .select()
    .from(adminAuthorizedDevicesTable)
    .where(eq(adminAuthorizedDevicesTable.fingerprint, fp))
    .limit(1);

  if (existing) {
    await db
      .update(adminAuthorizedDevicesTable)
      .set({ lastUsedAt: new Date(), ip })
      .where(eq(adminAuthorizedDevicesTable.id, existing.id));
    return { allowed: true, registered: false, deviceId: existing.id };
  }

  const [{ slotCount }] = await db
    .select({ slotCount: count() })
    .from(adminAuthorizedDevicesTable)
    .where(eq(adminAuthorizedDevicesTable.deviceType, deviceType));

  if (Number(slotCount) >= 1) {
    return { allowed: false, registered: false };
  }

  const { browser, os } = parseUA(ua);
  const label = `${browser} — ${os}`;
  const [newDevice] = await db
    .insert(adminAuthorizedDevicesTable)
    .values({ deviceType, fingerprint: fp, label, ip })
    .returning();

  return { allowed: true, registered: true, deviceId: newDevice!.id };
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------
export async function recordAudit(
  req: Request,
  action: string,
  details?: Record<string, unknown>,
): Promise<void> {
  const ip = getClientIP(req);
  const ua = req.headers["user-agent"] ?? "";
  const { browser, os } = parseUA(ua);
  await db.insert(adminAuditLogTable).values({
    action,
    details: details ?? {},
    ip,
    userAgent: ua,
    browser,
    osName: os,
  });
}
