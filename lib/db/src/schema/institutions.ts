import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createId } from "../id";

export const institutionsTable = pgTable("institutions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  teacherLimit: integer("teacher_limit").notNull(),
  studentLimit: integer("student_limit").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Institution = typeof institutionsTable.$inferSelect;
export type InsertInstitution = typeof institutionsTable.$inferInsert;
