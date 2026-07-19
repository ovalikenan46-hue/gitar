import { pgTable, text, timestamp, unique, index } from "drizzle-orm/pg-core";
import { createId } from "../id";

export const adminAuthorizedDevicesTable = pgTable(
  "admin_authorized_devices",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    deviceType: text("device_type", { enum: ["pc", "phone"] }).notNull(),
    fingerprint: text("fingerprint").notNull(),
    label: text("label").notNull().default(""),
    ip: text("ip").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at").notNull().defaultNow(),
  },
  (t) => [
    unique("admin_devices_fingerprint_unique").on(t.fingerprint),
    index("admin_devices_type_idx").on(t.deviceType),
  ],
);

export type AdminAuthorizedDevice = typeof adminAuthorizedDevicesTable.$inferSelect;
export type InsertAdminAuthorizedDevice = typeof adminAuthorizedDevicesTable.$inferInsert;
