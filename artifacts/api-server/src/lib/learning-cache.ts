import { db, studentLearningRequestsTable } from "@workspace/db";
import { logger } from "./logger";

export interface LearningCacheEntry {
  institutionId: string;
  teacherId: string;
  classId: string;
  studentId: string;
  studentCode: string;
  moduleKey: string;
  activityKey: string;
  activityTitle: string;
  status: "learned";
  createdAt: Date;
}

// key = `${studentId}:${activityKey}`
// RAM map: sadece retry amacıyla tutuluyor — başarılı write'tan sonra temizlenir
export const pendingLearningRequests = new Map<string, LearningCacheEntry>();

function toDbRow(e: LearningCacheEntry) {
  return {
    institutionId: e.institutionId,
    teacherId: e.teacherId,
    classId: e.classId,
    studentId: e.studentId,
    studentCode: e.studentCode,
    moduleKey: e.moduleKey,
    activityKey: e.activityKey,
    activityTitle: e.activityTitle,
    status: "learned" as const,
    createdAt: e.createdAt,
    flushedAt: new Date(),
  };
}

// Her "Bunu öğrendim" isteği anında DB'ye yazılır.
// Yazma başarısız olursa RAM map'te kalır ve 120s flush'ta yeniden denenir.
async function writeImmediately(entry: LearningCacheEntry, key: string): Promise<void> {
  try {
    await db
      .insert(studentLearningRequestsTable)
      .values(toDbRow(entry))
      .onConflictDoNothing();
    pendingLearningRequests.delete(key);
    logger.info(`Learning request written immediately: ${key}`);
  } catch (err) {
    logger.error({ err }, `Immediate write failed for ${key} — will retry on flush`);
    // map'te bırak, 120s flush retry eder
  }
}

export function addLearningRequest(entry: LearningCacheEntry): void {
  const key = `${entry.studentId}:${entry.activityKey}`;
  if (pendingLearningRequests.has(key)) return; // zaten bekliyor veya yazıldı
  pendingLearningRequests.set(key, entry);
  void writeImmediately(entry, key);
}

// Retry: sadece daha önce başarısız olan kayıtlar için
async function flushLearningRequests(): Promise<void> {
  if (pendingLearningRequests.size === 0) return;
  const entries = [...pendingLearningRequests.entries()];
  const values = entries.map(([, e]) => toDbRow(e));
  try {
    await db
      .insert(studentLearningRequestsTable)
      .values(values)
      .onConflictDoNothing();
    for (const [key] of entries) {
      pendingLearningRequests.delete(key);
    }
    logger.info(`Retry flush: ${values.length} learning request(s) written to DB`);
  } catch (err) {
    logger.error({ err }, "Retry flush failed — will try again");
  }
}

// 120 saniyelik retry flush (sadece başarısız yazımlar için)
setInterval(() => { void flushLearningRequests(); }, 120_000);

// Graceful shutdown — kalan varsa flush et
process.on("SIGTERM", () => { void flushLearningRequests(); });
