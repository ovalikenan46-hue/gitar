import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * FAZ 5.3: Production havuz ayarları.
 * - max 10: tek instance için yeterli; Neon tabanlı Replit PG bağlantı
 *   limitlerine saygılı.
 * - idleTimeoutMillis 30s: boşta kalan bağlantılar bırakılır (serverless PG
 *   ile uyumlu — Neon boştaki bağlantıları zaten ~5 dk'da kapatır).
 * - connectionTimeoutMillis 10s: havuz doluysa istek sonsuza kadar beklemez,
 *   kontrollü hata verir (varsayılan 0 = sınırsız bekleme idi).
 * - statement_timeout 15s: takılan sorgular bağlantıyı rehin alamaz.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 15_000,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
