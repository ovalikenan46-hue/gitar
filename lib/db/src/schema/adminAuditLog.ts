import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createId } from "../id";

export const adminAuditLogTable = pgTable(
  "admin_audit_log",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    action: text("action").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().default({}),
    ip: text("ip").notNull().default(""),
    userAgent: text("user_agent").notNull().default(""),
    browser: text("browser").notNull().default(""),
    osName: text("os_name").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("admin_audit_log_action_idx").on(t.action),
    index("admin_audit_log_created_at_idx").on(t.createdAt),
  ],
);

export type AdminAuditLog = typeof adminAuditLogTable.$inferSelect;
export type InsertAdminAuditLog = typeof adminAuditLogTable.$inferInsert;
