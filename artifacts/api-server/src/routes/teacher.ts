import { Router, type IRouter } from "express";
import { db, classesTable, usersTable, studentCodesTable, institutionsTable } from "@workspace/db";
import { eq, and, isNull, count } from "drizzle-orm";
import { CreateClassBody } from "@workspace/api-zod";
import { requireAuth, generateInviteCode, type AuthedRequest } from "../lib/auth";

const router: IRouter = Router();

router.use(requireAuth(["teacher"]));

async function getClassWithStats(id: string) {
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, id)).limit(1);
  if (!cls) return null;
  const [students] = await db
    .select({ c: count() })
    .from(usersTable)
    .where(and(eq(usersTable.classId, id), eq(usersTable.role, "student")));
  const [unused] = await db
    .select({ c: count() })
    .from(studentCodesTable)
    .where(and(eq(studentCodesTable.classId, id), isNull(studentCodesTable.usedByUserId)));
  return {
    id: cls.id,
    name: cls.name,
    levelUnlocked: cls.levelUnlocked,
    studentCount: students?.c ?? 0,
    unusedStudentCodes: unused?.c ?? 0,
  };
}

async function loadTeacher(userId: string) {
  const [t] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return t;
}

router.get("/teacher/classes", async (req, res) => {
  const { auth } = req as unknown as AuthedRequest;
  const rows = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.teacherId, auth.userId))
    .orderBy(classesTable.createdAt);
  const result = await Promise.all(rows.map((r) => getClassWithStats(r.id)));
  res.json(result.filter(Boolean));
});

router.post("/teacher/classes", async (req, res) => {
  const { auth } = req as unknown as AuthedRequest;
  const parsed = CreateClassBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Geçersiz istek" });
    return;
  }
  const teacher = await loadTeacher(auth.userId);
  if (!teacher || !teacher.institutionId) {
    res.status(400).json({ error: "Kurum bulunamadı" });
    return;
  }
  const [cls] = await db
    .insert(classesTable)
    .values({
      name: parsed.data.name,
      teacherId: auth.userId,
      institutionId: teacher.institutionId,
    })
    .returning();
  const stats = await getClassWithStats(cls.id);
  res.status(201).json(stats);
});

router.post("/teacher/classes/:id/student-codes", async (req, res) => {
  const { auth } = req as unknown as AuthedRequest;
  const id = req.params.id;
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, id)).limit(1);
  if (!cls || cls.teacherId !== auth.userId) {
    res.status(404).json({ error: "Sınıf bulunamadı" });
    return;
  }
  const [inst] = await db
    .select()
    .from(institutionsTable)
    .where(eq(institutionsTable.id, cls.institutionId))
    .limit(1);
  if (inst) {
    const [studentsUsed] = await db
      .select({ c: count() })
      .from(usersTable)
      .where(and(eq(usersTable.institutionId, cls.institutionId), eq(usersTable.role, "student")));
    const [unusedCodes] = await db
      .select({ c: count() })
      .from(studentCodesTable)
      .where(and(eq(studentCodesTable.institutionId, cls.institutionId), isNull(studentCodesTable.usedByUserId)));
    const allocated = (studentsUsed?.c ?? 0) + (unusedCodes?.c ?? 0);
    if (allocated >= inst.studentLimit) {
      res.status(400).json({ error: "Öğrenci limiti aşıldı" });
      return;
    }
  }
  let code = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const [existing] = await db
      .select()
      .from(studentCodesTable)
      .where(eq(studentCodesTable.code, code))
      .limit(1);
    if (!existing) break;
    code = generateInviteCode();
  }
  await db.insert(studentCodesTable).values({
    code,
    classId: id,
    institutionId: cls.institutionId,
  });
  res.status(201).json({ code });
});

router.post("/teacher/classes/:id/unlock-next", async (req, res) => {
  const { auth } = req as unknown as AuthedRequest;
  const id = req.params.id;
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, id)).limit(1);
  if (!cls || cls.teacherId !== auth.userId) {
    res.status(404).json({ error: "Sınıf bulunamadı" });
    return;
  }
  const next = Math.min(cls.levelUnlocked + 1, 2);
  await db.update(classesTable).set({ levelUnlocked: next }).where(eq(classesTable.id, id));
  const stats = await getClassWithStats(id);
  res.json(stats);
});

export default router;
