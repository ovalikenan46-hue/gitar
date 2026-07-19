import { Router, type IRouter } from "express";
import {
  db,
  institutionsTable,
  usersTable,
  teacherCodesTable,
  classesTable,
  studentCodesTable,
  lessonProgressTable,
  studentLearningRequestsTable,
  adminAuthorizedDevicesTable,
  adminLoginLogTable,
  adminAuditLogTable,
} from "@workspace/db";
import { eq, and, isNull, count, inArray, desc } from "drizzle-orm";
import { CreateInstitutionBody, UpdateInstitutionLimitsBody } from "@workspace/api-zod";
import { requireAuth, generateInviteCode } from "../lib/auth";
import { teacherDashboardCache } from "../lib/cache";
import { recordAudit, deviceFingerprint, detectDeviceType } from "../lib/adminSecurity";

const router: IRouter = Router();

router.use("/admin", requireAuth(["admin"]));

// FAZ 4.1: Kurum istatistikleri — N kurum için sorgu sayısı sabit (4),
// eskiden kurum başına 6 ayrı sorgu çalışıyordu (N+1 problemi).
type InstitutionRow = typeof institutionsTable.$inferSelect;

async function buildInstitutionStats(insts: InstitutionRow[]) {
  if (insts.length === 0) return [];
  const instIds = insts.map((i) => i.id);

  // 3 bağımsız toplu sorgu paralel çalışır
  const [userCounts, allCodes, allClasses] = await Promise.all([
    db
      .select({ institutionId: usersTable.institutionId, role: usersTable.role, c: count() })
      .from(usersTable)
      .where(inArray(usersTable.institutionId, instIds))
      .groupBy(usersTable.institutionId, usersTable.role),
    db
      .select({
        institutionId: teacherCodesTable.institutionId,
        code: teacherCodesTable.code,
        usedByUserId: teacherCodesTable.usedByUserId,
      })
      .from(teacherCodesTable)
      .where(inArray(teacherCodesTable.institutionId, instIds))
      .orderBy(teacherCodesTable.createdAt),
    db
      .select({ institutionId: classesTable.institutionId, cap: classesTable.studentCapacity })
      .from(classesTable)
      .where(inArray(classesTable.institutionId, instIds)),
  ]);

  const teacherCount = new Map<string, number>();
  const studentCount = new Map<string, number>();
  for (const r of userCounts) {
    if (!r.institutionId) continue;
    if (r.role === "teacher") teacherCount.set(r.institutionId, Number(r.c));
    if (r.role === "student") studentCount.set(r.institutionId, Number(r.c));
  }

  const codesByInst = new Map<string, { code: string; usedByUserId: string | null }[]>();
  for (const c of allCodes) {
    const list = codesByInst.get(c.institutionId) ?? [];
    list.push({ code: c.code, usedByUserId: c.usedByUserId });
    codesByInst.set(c.institutionId, list);
  }

  const capByInst = new Map<string, number>();
  for (const c of allClasses) {
    capByInst.set(c.institutionId, (capByInst.get(c.institutionId) ?? 0) + (c.cap ?? 0));
  }

  return insts.map((inst) => {
    const codes = codesByInst.get(inst.id) ?? [];
    const totalTeachers = teacherCount.get(inst.id) ?? 0;
    const totalStudents = studentCount.get(inst.id) ?? 0;
    const unusedTeacherCount = codes.filter((c) => c.usedByUserId === null).length;
    const usedTeacherCount = totalTeachers + unusedTeacherCount;
    const usedStudentCount = capByInst.get(inst.id) ?? 0;

    return {
      id: inst.id,
      name: inst.name,
      teacherLimit: inst.teacherLimit,
      studentLimit: inst.studentLimit,
      totalTeachers,
      totalStudents,
      usedTeacherCount,
      usedStudentCount,
      remainingTeacherSlots: Math.max(0, inst.teacherLimit - usedTeacherCount),
      remainingStudentSlots: Math.max(0, inst.studentLimit - usedStudentCount),
      unusedTeacherCodes: unusedTeacherCount,
      teacherCodes: codes.map((c) => ({ code: c.code, used: c.usedByUserId !== null })),
    };
  });
}

async function getInstitutionStats(id: string) {
  const [inst] = await db.select().from(institutionsTable).where(eq(institutionsTable.id, id)).limit(1);
  if (!inst) return null;
  const [stats] = await buildInstitutionStats([inst]);
  return stats ?? null;
}

// ---------------------------------------------------------------------------
// Institutions
// ---------------------------------------------------------------------------

router.get("/admin/institutions", async (_req, res) => {
  // FAZ 4.1: N+1 giderildi — kurum sayısından bağımsız toplam 4 sorgu
  const rows = await db.select().from(institutionsTable).orderBy(institutionsTable.createdAt);
  const result = await buildInstitutionStats(rows);
  res.json(result);
});

router.post("/admin/institutions", async (req, res) => {
  const parsed = CreateInstitutionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Geçersiz istek" });
    return;
  }
  const [inst] = await db
    .insert(institutionsTable)
    .values({
      name: parsed.data.name,
      teacherLimit: parsed.data.teacherLimit,
      studentLimit: parsed.data.studentLimit,
    })
    .returning();
  void recordAudit(req, "institution.create", {
    institutionId: inst.id,
    name: parsed.data.name,
    teacherLimit: parsed.data.teacherLimit,
    studentLimit: parsed.data.studentLimit,
  });
  const stats = await getInstitutionStats(inst.id);
  res.status(201).json(stats);
});

router.delete("/admin/institutions/:id", async (req, res) => {
  const id = req.params.id;
  const [inst] = await db.select().from(institutionsTable).where(eq(institutionsTable.id, id)).limit(1);
  if (!inst) {
    res.status(404).json({ error: "Kurum bulunamadı" });
    return;
  }

  // FAZ 4.1 düzeltmesi: silinen kurumun öğretmen cache'leri de temizlenecek
  let teacherIds: string[] = [];

  await db.transaction(async (tx) => {
    const instClasses = await tx
      .select({ id: classesTable.id })
      .from(classesTable)
      .where(eq(classesTable.institutionId, id));
    const classIds = instClasses.map((c) => c.id);

    const instUsers = await tx
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.institutionId, id));
    const userIds = instUsers.map((u) => u.id);
    teacherIds = instUsers.filter((u) => u.role === "teacher").map((u) => u.id);

    if (userIds.length > 0) {
      await tx.delete(lessonProgressTable).where(inArray(lessonProgressTable.userId, userIds));
    }

    await tx
      .delete(studentLearningRequestsTable)
      .where(eq(studentLearningRequestsTable.institutionId, id));

    if (classIds.length > 0) {
      await tx.delete(studentCodesTable).where(inArray(studentCodesTable.classId, classIds));
    }

    await tx.delete(classesTable).where(eq(classesTable.institutionId, id));
    await tx.delete(usersTable).where(eq(usersTable.institutionId, id));
    await tx.delete(teacherCodesTable).where(eq(teacherCodesTable.institutionId, id));
    await tx.delete(institutionsTable).where(eq(institutionsTable.id, id));
  });

  // FAZ 4.1 düzeltmesi: kuruma ait tüm öğretmen dashboard cache'leri anında
  // temizlenir — silinen sınıflar/kodlar cache'de kalmaz.
  for (const tid of teacherIds) {
    teacherDashboardCache.invalidate(tid);
  }

  void recordAudit(req, "institution.delete", { institutionId: id, name: inst.name });
  res.status(204).send();
});

router.patch("/admin/institutions/:id", async (req, res) => {
  const parsed = UpdateInstitutionLimitsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Geçersiz istek" });
    return;
  }
  const id = req.params.id;
  const current = await getInstitutionStats(id);
  if (!current) {
    res.status(404).json({ error: "Kurum bulunamadı" });
    return;
  }
  if (parsed.data.teacherLimit < current.usedTeacherCount) {
    res.status(400).json({
      error: `Öğretmen limiti mevcut kullanımdan (${current.usedTeacherCount}) küçük olamaz`,
    });
    return;
  }
  if (parsed.data.studentLimit < current.usedStudentCount) {
    res.status(400).json({
      error: `Öğrenci limiti mevcut kullanımdan (${current.usedStudentCount}) küçük olamaz`,
    });
    return;
  }
  await db
    .update(institutionsTable)
    .set({
      teacherLimit: parsed.data.teacherLimit,
      studentLimit: parsed.data.studentLimit,
    })
    .where(eq(institutionsTable.id, id));
  void recordAudit(req, "institution.update_limits", {
    institutionId: id,
    name: current.name,
    oldTeacherLimit: current.teacherLimit,
    newTeacherLimit: parsed.data.teacherLimit,
    oldStudentLimit: current.studentLimit,
    newStudentLimit: parsed.data.studentLimit,
  });
  const updated = await getInstitutionStats(id);
  res.json(updated);
});

router.post("/admin/institutions/:id/teacher-codes", async (req, res) => {
  const id = req.params.id;
  const stats = await getInstitutionStats(id);
  if (!stats) {
    res.status(404).json({ error: "Kurum bulunamadı" });
    return;
  }
  if (stats.remainingTeacherSlots <= 0) {
    res.status(400).json({ error: "Öğretmen limiti doldu" });
    return;
  }
  let code = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const [existing] = await db
      .select()
      .from(teacherCodesTable)
      .where(eq(teacherCodesTable.code, code))
      .limit(1);
    if (!existing) break;
    code = generateInviteCode();
  }
  await db.insert(teacherCodesTable).values({ code, institutionId: id });
  void recordAudit(req, "teacher_code.generate", { institutionId: id, name: stats.name, code });
  res.status(201).json({ code });
});

router.get("/admin/stats", async (_req, res) => {
  const [insts] = await db.select({ c: count() }).from(institutionsTable);
  const [teachers] = await db
    .select({ c: count() })
    .from(usersTable)
    .where(eq(usersTable.role, "teacher"));
  const [students] = await db
    .select({ c: count() })
    .from(usersTable)
    .where(eq(usersTable.role, "student"));
  const [classes] = await db.select({ c: count() }).from(classesTable);
  res.json({
    totalInstitutions: insts?.c ?? 0,
    totalTeachers: teachers?.c ?? 0,
    totalStudents: students?.c ?? 0,
    totalClasses: classes?.c ?? 0,
  });
});

// ---------------------------------------------------------------------------
// Device Management
// ---------------------------------------------------------------------------

router.get("/admin/devices", async (_req, res) => {
  const devices = await db
    .select()
    .from(adminAuthorizedDevicesTable)
    .orderBy(adminAuthorizedDevicesTable.createdAt);
  res.json(devices);
});

router.delete("/admin/devices/:id", async (req, res) => {
  const id = req.params.id;
  const [device] = await db
    .select()
    .from(adminAuthorizedDevicesTable)
    .where(eq(adminAuthorizedDevicesTable.id, id))
    .limit(1);
  if (!device) {
    res.status(404).json({ error: "Cihaz bulunamadı" });
    return;
  }
  await db.delete(adminAuthorizedDevicesTable).where(eq(adminAuthorizedDevicesTable.id, id));
  void recordAudit(req, "device.revoke", {
    deviceId: id,
    deviceType: device.deviceType,
    label: device.label,
  });
  res.status(204).send();
});

router.patch("/admin/devices/:id", async (req, res) => {
  const id = req.params.id;
  const { label } = req.body as { label?: string };
  if (!label || typeof label !== "string") {
    res.status(400).json({ error: "Geçersiz etiket" });
    return;
  }
  const [device] = await db
    .select()
    .from(adminAuthorizedDevicesTable)
    .where(eq(adminAuthorizedDevicesTable.id, id))
    .limit(1);
  if (!device) {
    res.status(404).json({ error: "Cihaz bulunamadı" });
    return;
  }
  const [updated] = await db
    .update(adminAuthorizedDevicesTable)
    .set({ label: label.trim() })
    .where(eq(adminAuthorizedDevicesTable.id, id))
    .returning();
  void recordAudit(req, "device.rename", { deviceId: id, label: label.trim() });
  res.json(updated);
});

router.post("/admin/devices/register-current", async (req, res) => {
  const ua = req.headers["user-agent"] ?? "";
  const fp = deviceFingerprint(ua);
  const deviceType = detectDeviceType(ua);

  const [existing] = await db
    .select()
    .from(adminAuthorizedDevicesTable)
    .where(eq(adminAuthorizedDevicesTable.fingerprint, fp))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "Bu cihaz zaten kayıtlı", device: existing });
    return;
  }

  const [{ slotCount }] = await db
    .select({ slotCount: count() })
    .from(adminAuthorizedDevicesTable)
    .where(eq(adminAuthorizedDevicesTable.deviceType, deviceType));

  if (Number(slotCount) >= 1) {
    res.status(400).json({
      error: `${deviceType === "pc" ? "Bilgisayar" : "Telefon"} slotu dolu. Mevcut cihazı silin.`,
    });
    return;
  }

  const { browser, os } = await import("../lib/adminSecurity").then((m) => m.parseUA(ua));
  const label = `${browser} — ${os}`;
  const ip = (await import("../lib/adminSecurity")).getClientIP(req);
  const [newDevice] = await db
    .insert(adminAuthorizedDevicesTable)
    .values({ deviceType, fingerprint: fp, label, ip })
    .returning();

  void recordAudit(req, "device.authorize", { deviceId: newDevice!.id, deviceType, label });
  res.status(201).json(newDevice);
});

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

router.get("/admin/audit-log", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const rows = await db
    .select()
    .from(adminAuditLogTable)
    .orderBy(desc(adminAuditLogTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(rows);
});

// ---------------------------------------------------------------------------
// Login Log
// ---------------------------------------------------------------------------

router.get("/admin/login-log", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const offset = Number(req.query.offset) || 0;

  const rows = await db
    .select()
    .from(adminLoginLogTable)
    .orderBy(desc(adminLoginLogTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(rows);
});

export default router;
