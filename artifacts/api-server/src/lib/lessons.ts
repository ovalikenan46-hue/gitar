import { db, lessonsTable } from "@workspace/db";
import { asc } from "drizzle-orm";
import { lessonsCache, LESSONS_CACHE_KEY, LESSONS_CACHE_TTL } from "./cache";

export type LessonRow = typeof lessonsTable.$inferSelect;

/**
 * FAZ 4.2: Dersler cache üzerinden okunur (10 dk TTL).
 * Dersler yalnızca seed sırasında değişir; her istekte DB sorgusu gereksizdi.
 */
export async function getAllLessons(): Promise<LessonRow[]> {
  const cached = lessonsCache.get(LESSONS_CACHE_KEY);
  if (cached) return cached as LessonRow[];
  const lessons = await db.select().from(lessonsTable).orderBy(asc(lessonsTable.orderIndex));
  lessonsCache.set(LESSONS_CACHE_KEY, lessons, LESSONS_CACHE_TTL);
  return lessons;
}
