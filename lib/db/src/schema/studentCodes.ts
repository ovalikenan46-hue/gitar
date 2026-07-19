import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { createId } from "../id";
import { institutionsTable } from "./institutions";
import { classesTable } from "./classes";

export const studentCodesTable = pgTable(
  "student_codes",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    code: text("code").notNull().unique(),
    classId: text("class_id")
      .notNull()
      .references(() => classesTable.id, { onDelete: "cascade" }),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institutionsTable.id, { onDelete: "cascade" }),
    usedByUserId: text("used_by_user_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("student_codes_class_id_idx").on(t.classId),
    index("student_codes_institution_id_idx").on(t.institutionId),
  ],
);

export type StudentCode = typeof studentCodesTable.$inferSelect;
export type InsertStudentCode = typeof studentCodesTable.$inferInsert;
