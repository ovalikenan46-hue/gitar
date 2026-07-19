import os from "node:os";
import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { teacherDashboardCache, lessonsCache } from "../lib/cache";
import { pendingLearningRequests } from "../lib/learning-cache";

const router: IRouter = Router();

/**
 * Liveness probe — hızlı, bağımlılıksız. Deployment health check bunu kullanır.
 */
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/**
 * FAZ 5.1: Readiness probe — DB erişimini de doğrular.
 * DB'ye ulaşılamıyorsa 503 döner (yük dengeleyici trafiği kesebilir).
 */
router.get("/healthz/ready", async (_req, res) => {
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    res.json({ status: "ok", db: "ok", dbLatencyMs: Date.now() - start });
  } catch {
    res.status(503).json({ status: "degraded", db: "unreachable" });
  }
});

/**
 * FAZ 5.1: Detaylı izleme ucu — yalnızca admin.
 * Bellek, CPU, DB gecikmesi, bağlantı havuzu ve cache istatistikleri.
 */
router.get("/healthz/details", requireAuth(["admin"]), async (_req, res) => {
  let dbStatus = "ok";
  let dbLatencyMs: number | null = null;
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    dbLatencyMs = Date.now() - start;
  } catch {
    dbStatus = "unreachable";
  }

  const mem = process.memoryUsage();
  const load = os.loadavg();

  res.status(dbStatus === "ok" ? 200 : 503).json({
    status: dbStatus === "ok" ? "ok" : "degraded",
    uptimeSeconds: Math.round(process.uptime()),
    memory: {
      rssMB: Math.round(mem.rss / 1024 / 1024),
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      externalMB: Math.round(mem.external / 1024 / 1024),
      systemFreeMB: Math.round(os.freemem() / 1024 / 1024),
      systemTotalMB: Math.round(os.totalmem() / 1024 / 1024),
    },
    cpu: {
      loadAvg1m: Number(load[0]?.toFixed(2) ?? 0),
      loadAvg5m: Number(load[1]?.toFixed(2) ?? 0),
      loadAvg15m: Number(load[2]?.toFixed(2) ?? 0),
      cores: os.cpus().length,
    },
    db: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
    },
    caches: {
      teacherDashboard: teacherDashboardCache.stats(),
      lessons: lessonsCache.stats(),
      pendingLearningWrites: pendingLearningRequests.size,
    },
  });
});

export default router;
