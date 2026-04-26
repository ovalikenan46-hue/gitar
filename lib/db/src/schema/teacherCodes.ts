import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "../id";

export const teacherCodesTable = pgTable("teacher_codes", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  code: text("code").notNull().unique(),
  institutionId: text("institution_id").notNull(),
  usedByUserId: text("used_by_user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TeacherCode = typeof teacherCodesTable.$inferSelect;
export type InsertTeacherCode = typeof teacherCodesTable.$inferInsert;
