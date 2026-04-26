import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "../id";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  role: text("role", { enum: ["admin", "teacher", "student"] }).notNull(),
  name: text("name").notNull(),
  institutionId: text("institution_id"),
  classId: text("class_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
