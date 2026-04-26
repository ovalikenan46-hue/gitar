import { Router, type IRouter } from "express";
import { db, institutionsTable, usersTable, teacherCodesTable, classesTable } from "@workspace/db";
import { eq, and, isNull, count } from "drizzle-orm";
import { CreateInstitutionBody, UpdateInstitutionLimitsBody } from "@workspace/api-zod";
import { requireAuth, generateInviteCode } from "../lib/auth";

const router: IRouter = Router();

router.use("/admin", requireAuth(["admin"]));

async function getInstitutionStats(id: string) {
  const [inst] = await db.select().from(institutionsTable).where(eq(institutionsTable.id, id)).limit(1);
  if (!inst) return null;
  const [teachers] = await db
    .select({ c: count() })
    .from(usersTable)
    .where(and(eq(usersTable.institutionId, id), eq(usersTable.role, "teacher")));
  const [students] = await db
    .select({ c: count() })
    .from(usersTable)
    .where(and(eq(usersTable.institutionId, id), eq(usersTable.role, "student")));
  const [unusedTeachers] = await db
    .select({ c: count() })
    .from(teacherCodesTable)
    .where(and(eq(teacherCodesTable.institutionId, id), isNull(teacherCodesTable.usedByUserId)));
  const codes = await db
    .select({ code: teacherCodesTable.code, usedByUserId: teacherCodesTable.usedByUserId })
    .from(teacherCodesTable)
    .where(eq(teacherCodesTable.institutionId, id))
    .orderBy(teacherCodesTable.createdAt);

  const totalTeachers = teachers?.c ?? 0;
  const totalStudents = students?.c ?? 0;
  const unusedTeacherCount = unusedTeachers?.c ?? 0;
  const usedTeacherCount = totalTeachers + unusedTeacherCount;

  // For students, the institution-level "used" capacity is the sum of class capacities,
  // not just enrolled students. That way creating a class actually consumes the quota.
  const classesOfInst = await db
    .select({ cap: classesTable.studentCapacity })
    .from(classesTable)
    .where(eq(classesTable.institutionId, id));
  const usedStudentCount = classesOfInst.reduce((acc, r) => acc + (r.cap ?? 0), 0);

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
}

router.get("/admin/institutions", async (_req, res) => {
  const rows = await db.select().from(institutionsTable).orderBy(institutionsTable.createdAt);
  const result = await Promise.all(rows.map((r) => getInstitutionStats(r.id)));
  res.json(result.filter(Boolean));
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
  const stats = await getInstitutionStats(inst.id);
  res.status(201).json(stats);
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

export default router;
