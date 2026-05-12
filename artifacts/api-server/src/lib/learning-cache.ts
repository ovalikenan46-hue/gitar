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
export const pendingLearningRequests = new Map<string, LearningCacheEntry>();

export function addLearningRequest(entry: LearningCacheEntry): void {
  const key = `${entry.studentId}:${entry.activityKey}`;
  if (!pendingLearningRequests.has(key)) {
    pendingLearningRequests.set(key, entry);
  }
}

async function flushLearningRequests(): Promise<void> {
  if (pendingLearningRequests.size === 0) return;
  const entries = [...pendingLearningRequests.entries()];
  const values = entries.map(([, e]) => ({
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
  }));
  try {
    await db
      .insert(studentLearningRequestsTable)
      .values(values)
      .onConflictDoNothing();
    for (const [key] of entries) {
      pendingLearningRequests.delete(key);
    }
    logger.info(`Flushed ${values.length} learning requests to DB`);
  } catch (err) {
    logger.error({ err }, "Failed to flush learning requests — will retry");
  }
}

// Flush every 120 seconds
setInterval(() => { void flushLearningRequests(); }, 120_000);

// Graceful shutdown — flush before exit
process.on("SIGTERM", () => { void flushLearningRequests(); });
