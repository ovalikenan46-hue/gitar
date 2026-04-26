import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createId } from "../id";

export const classesTable = pgTable("classes", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  teacherId: text("teacher_id").notNull(),
  institutionId: text("institution_id").notNull(),
  levelUnlocked: integer("level_unlocked").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Class = typeof classesTable.$inferSelect;
export type InsertClass = typeof classesTable.$inferInsert;
