import { Router, type IRouter } from "express";
import {
  db,
  classesTable,
  usersTable,
  studentCodesTable,
  institutionsTable,
  teacherCodesTable,
  studentLearningRequestsTable,
} from "@workspace/db";
import { eq, and, isNull, count, inArray, desc } from "drizzle-orm";
import { CreateClassBody, ExpandClassCapacityBody } from "@workspace/api-zod";
import {
  requireAuth,
  generateStudentCode,
  generateSmartboardCode,
  type AuthedRequest,
} from "../lib/auth";
import { teacherDashboardCache } from "../lib/cache";

const router: IRouter = Router();
const CACHE_TTL = 2 * 60 * 1000; // 2 dakika

router.use("/teacher", requireAuth(["teacher"]));

// ── Optimized bulk loader ──────────────────────────────────────────────────────
// Tüm sınıfları 4 sorguda yükler (N sınıf için N*4 yerine sabit 4 sorgu)
async function getAllClassesWithStats(teacherId: string) {
  const cached = teacherDashboardCache.get(teacherId);
  if (cached) return cached;

  // 1) Öğretmenin sınıfları
  const classes = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.teacherId, teacherId))
    .orderBy(classesTable.createdAt);

  if (classes.length === 0) {
    teacherDashboardCache.set(teacherId, [], CACHE_TTL);
    return [];
  }

  const classIds = classes.map((c) => c.id);

  // 2) Tüm sınıfların öğrenci sayısı — tek sorgu
  const studentCounts = await db
    .select({ classId: usersTable.classId, c: count() })
    .from(usersTable)
    .where(and(inArray(usersTable.classId, classIds), eq(usersTable.role, "student")))
    .groupBy(usersTable.classId);

  const countMap = new Map<string, number>(
    studentCounts.map((r) => [r.classId ?? "", Number(r.c)])
  );

  // 3) Tüm öğrenci kodları — tek sorgu
  const allCodes = await db
    .select({
      code: studentCodesTable.code,
      classId: studentCodesTable.classId,
      usedByUserId: studentCodesTable.usedByUserId,
    })
    .from(studentCodesTable)
    .where(inArray(studentCodesTable.classId, classIds))
    .orderBy(studentCodesTable.createdAt);

  // 4) Kodu kullanan kullanıcı adları — tek sorgu (sadece gerekenler)
  const usedIds = allCodes
    .map((c) => c.usedByUserId)
    .filter((v): v is string => v !== null);

  const userMap = new Map<string, string>();
  if (usedIds.length > 0) {
    const users = await db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(inArray(usersTable.id, usedIds));
    for (const u of users) userMap.set(u.id, u.name);
  }

  // Kodları sınıfa göre grupla
  const codesByClass = new Map<string, typeof allCodes>(
    classIds.map((id) => [id, []])
  );
  for (const code of allCodes) {
    codesByClass.get(code.classId)?.push(code);
  }

  const result = classes.map((cls) => {
    const codes = codesByClass.get(cls.id) ?? [];
    const usedStudentCount = codes.filter((c) => c.usedByUserId !== null).length;
    const studentCapacity = cls.studentCapacity ?? 0;

    return {
      id: cls.id,
      name: cls.name,
      levelUnlocked: cls.levelUnlocked,
      smartboardCode: cls.smartboardCode ?? null,
      studentCount: countMap.get(cls.id) ?? 0,
      studentCapacity,
      usedStudentCount,
      remainingSlots: Math.max(0, studentCapacity - usedStudentCount),
      unusedStudentCodes: codes.length - usedStudentCount,
      studentCodes: codes.map((c) => ({
        code: c.code,
        used: c.usedByUserId !== null,
        usedByName: c.usedByUserId ? (userMap.get(c.usedByUserId) ?? null) : null,
      })),
    };
  });

  teacherDashboardCache.set(teacherId, result, CACHE_TTL);
  return result;
}

// ── Tek sınıf için (yazma sonrası yenileme) ───────────────────────────────────
async function getOneClassWithStats(id: string) {
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, id)).limit(1);
  if (!cls) return null;

  const [studentRow] = await db
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

  const usedIds = codes.map((c) => c.usedByUserId).filter((v): v is string => v !== null);
  const userMap = new Map<string, string>();
  if (usedIds.length > 0) {
    const users = await db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(inArray(usersTable.id, usedIds));
    for (const u of users) userMap.set(u.id, u.name);
  }

  const usedStudentCount = codes.filter((c) => c.usedByUserId !== null).length;
  const studentCapacity = cls.studentCapacity ?? 0;

  return {
    id: cls.id,
    name: cls.name,
    levelUnlocked: cls.levelUnlocked,
    smartboardCode: cls.smartboardCode ?? null,
    studentCount: studentRow?.c ?? 0,
    studentCapacity,
    usedStudentCount,
    remainingSlots: Math.max(0, studentCapacity - usedStudentCount),
    unusedStudentCodes: codes.length - usedStudentCount,
    studentCodes: codes.map((c) => ({
      code: c.code,
      used: c.usedByUserId !== null,
      usedByName: c.usedByUserId ? (userMap.get(c.usedByUserId) ?? null) : null,
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

// ── Routes ─────────────────────────────────────────────────────────────────────

router.get("/teacher/classes", async (req, res) => {
  const { auth } = req as unknown as AuthedRequest;
  const result = await getAllClassesWithStats(auth.userId);
  res.json(result);
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

  teacherDashboardCache.invalidate(auth.userId);
  const stats = await getOneClassWithStats(newClass.id);
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

  teacherDashboardCache.invalidate(auth.userId);
  const stats = await getOneClassWithStats(id);
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
  const next = Math.min(cls.levelUnlocked + 1, 18);
  await db.update(classesTable).set({ levelUnlocked: next }).where(eq(classesTable.id, id));
  teacherDashboardCache.invalidate(auth.userId);
  const stats = await getOneClassWithStats(id);
  res.json(stats);
});

router.post("/teacher/classes/:id/smartboard-code", async (req, res) => {
  const { auth } = req as unknown as AuthedRequest;
  const id = req.params.id;
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, id)).limit(1);
  if (!cls || cls.teacherId !== auth.userId) {
    res.status(404).json({ error: "Sınıf bulunamadı" });
    return;
  }
  if (cls.smartboardCode) {
    res.json({ smartboardCode: cls.smartboardCode });
    return;
  }
  const code = await generateUniqueSmartboardCode();
  await db.update(classesTable).set({ smartboardCode: code }).where(eq(classesTable.id, id));
  teacherDashboardCache.invalidate(auth.userId);
  res.json({ smartboardCode: code });
});

router.get("/teacher/learning-requests", async (req, res) => {
  const { auth } = req as unknown as AuthedRequest;

  // Sadece bu öğretmenin sınıflarına ait pending istekler
  const requests = await db
    .select()
    .from(studentLearningRequestsTable)
    .where(
      and(
        eq(studentLearningRequestsTable.teacherId, auth.userId),
        eq(studentLearningRequestsTable.status, "pending"),
      ),
    )
    .orderBy(desc(studentLearningRequestsTable.createdAt))
    .limit(500);

  res.json(requests);
});

export default router;

void teacherCodesTable;
void isNull;
