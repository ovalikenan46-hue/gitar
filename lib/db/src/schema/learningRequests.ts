import { pgTable, text, timestamp, index, unique } from "drizzle-orm/pg-core";
import { createId } from "../id";

export const studentLearningRequestsTable = pgTable(
  "student_learning_requests",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    institutionId: text("institution_id").notNull(),
    teacherId: text("teacher_id").notNull(),
    classId: text("class_id").notNull(),
    studentId: text("student_id").notNull(),
    studentCode: text("student_code").notNull(),
    moduleKey: text("module_key").notNull(),
    activityKey: text("activity_key").notNull(),
    activityTitle: text("activity_title").notNull(),
    status: text("status").notNull().default("learned"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    flushedAt: timestamp("flushed_at"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique("slr_student_activity_uniq").on(t.studentId, t.activityKey),
    index("slr_institution_idx").on(t.institutionId),
    index("slr_teacher_idx").on(t.teacherId),
    index("slr_class_idx").on(t.classId),
    index("slr_student_idx").on(t.studentId),
    index("slr_student_code_idx").on(t.studentCode),
    index("slr_status_idx").on(t.status),
    index("slr_created_at_idx").on(t.createdAt),
  ],
);

export type StudentLearningRequest = typeof studentLearningRequestsTable.$inferSelect;
export type InsertStudentLearningRequest = typeof studentLearningRequestsTable.$inferInsert;
