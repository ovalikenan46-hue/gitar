import { pgTable, text, integer } from "drizzle-orm/pg-core";

export const lessonsTable = pgTable("lessons", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  moduleNumber: integer("module_number").notNull(),
  moduleTitle: text("module_title").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  level: integer("level").notNull(),
  orderIndex: integer("order_index").notNull(),
});

export type Lesson = typeof lessonsTable.$inferSelect;
export type InsertLesson = typeof lessonsTable.$inferInsert;
