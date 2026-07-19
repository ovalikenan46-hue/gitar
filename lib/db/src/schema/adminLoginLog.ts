import { pgTable, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createId } from "../id";

export const adminLoginLogTable = pgTable(
  "admin_login_log",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    ip: text("ip").notNull(),
    userAgent: text("user_agent").notNull().default(""),
    success: boolean("success").notNull(),
    failReason: text("fail_reason"),
    lockedOut: boolean("locked_out").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("admin_login_log_ip_idx").on(t.ip),
    index("admin_login_log_created_at_idx").on(t.createdAt),
    index("admin_login_log_success_idx").on(t.success),
  ],
);

export type AdminLoginLog = typeof adminLoginLogTable.$inferSelect;
export type InsertAdminLoginLog = typeof adminLoginLogTable.$inferInsert;
