import { pgTable, text, timestamp, index, unique } from "drizzle-orm/pg-core";
import { createId } from "../id";

export const studentLearningRequestsTable = pgTable(
  "student_learning_requests",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    teacherId: text("teacher_id").notNull(),
    classId: text("class_id").notNull(),
    studentId: text("student_id").notNull(),
    studentName: text("student_name").notNull(),
    lessonId: text("lesson_id").notNull(),
    lessonTitle: text("lesson_title").notNull(),
    lessonCode: text("lesson_code").notNull(),
    className: text("class_name").notNull(),
    status: text("status", { enum: ["pending"] }).notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("slr_student_lesson_uniq").on(t.studentId, t.lessonId),
    index("slr_teacher_idx").on(t.teacherId),
    index("slr_class_idx").on(t.classId),
    index("slr_status_idx").on(t.status),
  ],
);

export type StudentLearningRequest = typeof studentLearningRequestsTable.$inferSelect;
export type InsertStudentLearningRequest = typeof studentLearningRequestsTable.$inferInsert;
