import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createId } from "../id";
import { institutionsTable } from "./institutions";

export const classesTable = pgTable(
  "classes",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    name: text("name").notNull(),
    teacherId: text("teacher_id").notNull(),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institutionsTable.id, { onDelete: "cascade" }),
    levelUnlocked: integer("level_unlocked").notNull().default(1),
    studentCapacity: integer("student_capacity").notNull().default(0),
    smartboardCode: text("smartboard_code").unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("classes_teacher_id_idx").on(t.teacherId),
    index("classes_institution_id_idx").on(t.institutionId),
  ],
);

export type Class = typeof classesTable.$inferSelect;
export type InsertClass = typeof classesTable.$inferInsert;
