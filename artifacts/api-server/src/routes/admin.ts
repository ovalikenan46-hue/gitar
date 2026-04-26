import { Router, type IRouter } from "express";
import { db, institutionsTable, usersTable, teacherCodesTable, classesTable } from "@workspace/db";
import { eq, sql, and, isNotNull, isNull, count } from "drizzle-orm";
import { CreateInstitutionBody } from "@workspace/api-zod";
import { requireAuth, generateInviteCode } from "../lib/auth";

const router: IRouter = Router();

router.use(requireAuth(["admin"]));

async function getInstitutionStats(id: string) {
  const [inst] = await db.select().from(institutionsTable).where(eq(institutionsTable.id, id)).limit(1);
  if (!inst) return null;
  const teachers = await db
    .select({ c: count() })
    .from(usersTable)
    .where(and(eq(usersTable.institutionId, id), eq(usersTable.role, "teacher")));
  const students = await db
    .select({ c: count() })
    .from(usersTable)
    .where(and(eq(usersTable.institutionId, id), eq(usersTable.role, "student")));
  const unused = await db
    .select({ c: count() })
    .from(teacherCodesTable)
    .where(and(eq(teacherCodesTable.institutionId, id), isNull(teacherCodesTable.usedByUserId)));
  return {
    id: inst.id,
    name: inst.name,
    teacherLimit: inst.teacherLimit,
    studentLimit: inst.studentLimit,
    totalTeachers: teachers[0]?.c ?? 0,
    totalStudents: students[0]?.c ?? 0,
    unusedTeacherCodes: unused[0]?.c ?? 0,
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

router.post("/admin/institutions/:id/teacher-codes", async (req, res) => {
  const id = req.params.id;
  const [inst] = await db.select().from(institutionsTable).where(eq(institutionsTable.id, id)).limit(1);
  if (!inst) {
    res.status(404).json({ error: "Kurum bulunamadı" });
    return;
  }
  const teachersUsed = await db
    .select({ c: count() })
    .from(usersTable)
    .where(and(eq(usersTable.institutionId, id), eq(usersTable.role, "teacher")));
  const unusedCodes = await db
    .select({ c: count() })
    .from(teacherCodesTable)
    .where(and(eq(teacherCodesTable.institutionId, id), isNull(teacherCodesTable.usedByUserId)));
  const allocated = (teachersUsed[0]?.c ?? 0) + (unusedCodes[0]?.c ?? 0);
  if (allocated >= inst.teacherLimit) {
    res.status(400).json({ error: "Öğretmen limiti aşıldı" });
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
