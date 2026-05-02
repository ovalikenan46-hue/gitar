import { Router, type IRouter } from "express";
import { db, classesTable, usersTable, studentCodesTable, institutionsTable, teacherCodesTable } from "@workspace/db";
import { eq, and, isNull, count } from "drizzle-orm";
import { CreateClassBody, ExpandClassCapacityBody } from "@workspace/api-zod";
import { requireAuth, generateStudentCode, generateSmartboardCode, type AuthedRequest } from "../lib/auth";

const router: IRouter = Router();

router.use("/teacher", requireAuth(["teacher"]));

async function getClassWithStats(id: string) {
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, id)).limit(1);
  if (!cls) return null;
  const [students] = await db
    .select({ c: count() })
    .from(usersTable)
    .where(and(eq(usersTable.classId, id), eq(usersTable.role, "student")));
  const codes = await db
    .select({
      code: studentCodesTable.code,
      usedByUserId: studentCodesTable.usedByUserId,
    })
    .from(studentCodesTable)
    .where(eq(studentCodesTable.classId, id))
    .orderBy(studentCodesTable.createdAt);

  // Look up names of users who consumed codes
  const usedIds = codes.map((c) => c.usedByUserId).filter((v): v is string => v !== null);
  const userMap = new Map<string, string>();
  if (usedIds.length > 0) {
    const users = await db.select().from(usersTable);
    for (const u of users) {
      if (usedIds.includes(u.id)) userMap.set(u.id, u.name);
    }
  }

  const studentCount = students?.c ?? 0;
  const usedStudentCount = codes.filter((c) => c.usedByUserId !== null).length;
  const unusedStudentCodes = codes.length - usedStudentCount;
  const studentCapacity = cls.studentCapacity ?? 0;
  const remainingSlots = Math.max(0, studentCapacity - usedStudentCount);

  return {
    id: cls.id,
    name: cls.name,
    levelUnlocked: cls.levelUnlocked,
    smartboardCode: cls.smartboardCode ?? null,
    studentCount,
    studentCapacity,
    usedStudentCount,
    remainingSlots,
    unusedStudentCodes,
    studentCodes: codes.map((c) => ({
      code: c.code,
      used: c.usedByUserId !== null,
      usedByName: c.usedByUserId ? userMap.get(c.usedByUserId) ?? null : null,
    })),
  };
}

async function loadTeacher(userId: string) {
  const [t] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return t;
}

async function getInstitutionRemaining(institutionId: string) {
  const [inst] = await db
    .select()
    .from(institutionsTable)
    .where(eq(institutionsTable.id, institutionId))
    .limit(1);
  if (!inst) return null;
  const allClasses = await db
    .select({ cap: classesTable.studentCapacity })
    .from(classesTable)
    .where(eq(classesTable.institutionId, institutionId));
  const usedStudentCount = allClasses.reduce((acc, r) => acc + (r.cap ?? 0), 0);
  return {
    institution: inst,
    usedStudentCount,
    remainingStudentSlots: Math.max(0, inst.studentLimit - usedStudentCount),
  };
}

async function generateUniqueStudentCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateStudentCode();
    const [existing] = await db
      .select()
      .from(studentCodesTable)
      .where(eq(studentCodesTable.code, code))
      .limit(1);
    if (!existing) return code;
  }
  return generateStudentCode();
}

async function generateUniqueSmartboardCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = generateSmartboardCode();
    const [existing] = await db
      .select()
      .from(classesTable)
      .where(eq(classesTable.smartboardCode, code))
      .limit(1);
    if (!existing) return code;
  }
  return generateSmartboardCode();
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
  if (!teacher.firstName || !teacher.lastName) {
    res.status(400).json({ error: "Önce kimlik bilgilerinizi tamamlayın" });
    return;
  }
  const remaining = await getInstitutionRemaining(teacher.institutionId);
  if (!remaining) {
    res.status(400).json({ error: "Kurum bulunamadı" });
    return;
  }
  if (parsed.data.studentCount > remaining.remainingStudentSlots) {
    res.status(400).json({
      error: `Kurum öğrenci kontenjanı yetersiz (kalan: ${remaining.remainingStudentSlots})`,
    });
    return;
  }

  const newClass = await db.transaction(async (tx) => {
    const [cls] = await tx
      .insert(classesTable)
      .values({
        name: parsed.data.name,
        teacherId: auth.userId,
        institutionId: teacher.institutionId!,
        studentCapacity: parsed.data.studentCount,
      })
      .returning();
    for (let i = 0; i < parsed.data.studentCount; i++) {
      const code = await generateUniqueStudentCode();
      await tx.insert(studentCodesTable).values({
        code,
        classId: cls.id,
        institutionId: teacher.institutionId!,
      });
    }
    return cls;
  });

  const stats = await getClassWithStats(newClass.id);
  res.status(201).json(stats);
});

router.post("/teacher/classes/:id/expand", async (req, res) => {
  const { auth } = req as unknown as AuthedRequest;
  const id = req.params.id;
  const parsed = ExpandClassCapacityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Geçersiz istek" });
    return;
  }
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, id)).limit(1);
  if (!cls || cls.teacherId !== auth.userId) {
    res.status(404).json({ error: "Sınıf bulunamadı" });
    return;
  }
  const remaining = await getInstitutionRemaining(cls.institutionId);
  if (!remaining) {
    res.status(400).json({ error: "Kurum bulunamadı" });
    return;
  }
  if (parsed.data.additional > remaining.remainingStudentSlots) {
    res.status(400).json({
      error: `Kurum öğrenci kontenjanı yetersiz (kalan: ${remaining.remainingStudentSlots})`,
    });
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(classesTable)
      .set({ studentCapacity: (cls.studentCapacity ?? 0) + parsed.data.additional })
      .where(eq(classesTable.id, id));
    for (let i = 0; i < parsed.data.additional; i++) {
      const code = await generateUniqueStudentCode();
      await tx.insert(studentCodesTable).values({
        code,
        classId: id,
        institutionId: cls.institutionId,
      });
    }
  });

  const stats = await getClassWithStats(id);
  res.json(stats);
});

router.post("/teacher/classes/:id/unlock-next", async (req, res) => {
  const { auth } = req as unknown as AuthedRequest;
  const id = req.params.id;
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, id)).limit(1);
  if (!cls || cls.teacherId !== auth.userId) {
    res.status(404).json({ error: "Sınıf bulunamadı" });
    return;
  }
  const next = Math.min(cls.levelUnlocked + 1, 6);
  await db.update(classesTable).set({ levelUnlocked: next }).where(eq(classesTable.id, id));
  const stats = await getClassWithStats(id);
  res.json(stats);
});

// ── Akıllı Tahta: Kod Üret (sadece bir kez; mevcutsa aynen döner) ────────────
router.post("/teacher/classes/:id/smartboard-code", async (req, res) => {
  const { auth } = req as unknown as AuthedRequest;
  const id = req.params.id;
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, id)).limit(1);
  if (!cls || cls.teacherId !== auth.userId) {
    res.status(404).json({ error: "Sınıf bulunamadı" });
    return;
  }
  // Kod zaten varsa yeniden üretme — aynı kodu döndür
  if (cls.smartboardCode) {
    res.json({ smartboardCode: cls.smartboardCode });
    return;
  }
  const code = await generateUniqueSmartboardCode();
  await db.update(classesTable).set({ smartboardCode: code }).where(eq(classesTable.id, id));
  res.json({ smartboardCode: code });
});

export default router;

// Silence unused import warning for teacherCodesTable (kept for future use)
void teacherCodesTable;
void isNull;
