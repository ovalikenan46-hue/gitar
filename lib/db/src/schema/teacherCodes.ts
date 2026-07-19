import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { createId } from "../id";
import { institutionsTable } from "./institutions";

export const teacherCodesTable = pgTable(
  "teacher_codes",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    code: text("code").notNull().unique(),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institutionsTable.id, { onDelete: "cascade" }),
    usedByUserId: text("used_by_user_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("teacher_codes_institution_id_idx").on(t.institutionId),
  ],
);

export type TeacherCode = typeof teacherCodesTable.$inferSelect;
export type InsertTeacherCode = typeof teacherCodesTable.$inferInsert;
