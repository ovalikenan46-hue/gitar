import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const SESSION_SECRET = process.env["SESSION_SECRET"];

if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}

const _ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"];
if (!_ADMIN_PASSWORD) {
  throw new Error("ADMIN_PASSWORD environment variable is required");
}
export const ADMIN_PASSWORD: string = _ADMIN_PASSWORD;
export const ADMIN_USER_ID = "admin-root";

export type UserRole = "admin" | "teacher" | "student";

export interface JwtPayload {
  userId: string;
  role: UserRole;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SESSION_SECRET as string, { expiresIn: "1h" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, SESSION_SECRET as string) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

export type AuthedRequest = Request & { auth: JwtPayload };

export function requireAuth(roles?: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.header("authorization");
    if (!header || !header.startsWith("Bearer ")) {
      res.status(401).json({ error: "Yetkisiz erişim" });
      return;
    }
    const token = header.slice("Bearer ".length).trim();
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: "Geçersiz veya süresi dolmuş oturum" });
      return;
    }
    if (roles && !roles.includes(payload.role)) {
      res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
      return;
    }
    (req as AuthedRequest).auth = payload;
    next();
  };
}

export async function loadCurrentUser(payload: JwtPayload) {
  if (payload.role === "admin") {
    return {
      id: ADMIN_USER_ID,
      role: "admin" as const,
      name: "Yönetici",
      firstName: null as string | null,
      lastName: null as string | null,
      institutionId: null as string | null,
      classId: null as string | null,
    };
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, payload.userId))
    .limit(1);
  return user ?? null;
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/** 8 haneli sayısal öğrenci kodu (10000000–99999999) */
export function generateStudentCode(): string {
  const n = Math.floor(Math.random() * 90_000_000) + 10_000_000;
  return String(n);
}

/** 6 haneli sayısal akıllı tahta kodu (100000–999999) */
export function generateSmartboardCode(): string {
  const n = Math.floor(Math.random() * 900_000) + 100_000;
  return String(n);
}
