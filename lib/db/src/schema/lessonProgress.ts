import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const lessonProgressTable = pgTable(
  "lesson_progress",
  {
    userId: text("user_id").notNull(),
    lessonId: text("lesson_id").notNull(),
    completedAt: timestamp("completed_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

export type LessonProgress = typeof lessonProgressTable.$inferSelect;
export type InsertLessonProgress = typeof lessonProgressTable.$inferInsert;
