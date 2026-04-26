import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "../id";

export const studentCodesTable = pgTable("student_codes", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  code: text("code").notNull().unique(),
  classId: text("class_id").notNull(),
  institutionId: text("institution_id").notNull(),
  usedByUserId: text("used_by_user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type StudentCode = typeof studentCodesTable.$inferSelect;
export type InsertStudentCode = typeof studentCodesTable.$inferInsert;
