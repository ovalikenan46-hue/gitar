import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { createId } from "../id";

export const usersTable = pgTable(
  "users",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    role: text("role", { enum: ["admin", "teacher", "student"] }).notNull(),
    name: text("name").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    institutionId: text("institution_id"),
    classId: text("class_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("users_institution_id_idx").on(t.institutionId),
    index("users_class_id_idx").on(t.classId),
    index("users_institution_role_idx").on(t.institutionId, t.role),
  ],
);

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
