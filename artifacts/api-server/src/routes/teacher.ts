import { Router, type IRouter } from "express";
import {
  db,
  classesTable,
  usersTable,
  studentCodesTable,
  institutionsTable,
  teacherCodesTable,
  studentLearningRequestsTable,
  lessonsTable,
} from "@workspace/db";
import { eq, and, isNull, count, inArray, asc } from "drizzle-orm";
import { CreateClassBody, ExpandClassCapacityBody } from "@workspace/api-zod";
import {
  requireAuth,
  generateStudentCode,
  generateSmartboardCode,
  type AuthedRequest,
} from "../lib/auth";
import { teacherDashboardCache } from "../lib/cache";
import { pendingLearningRequests } from "../lib/learning-cache";

const router: IRouter = Router();
const CACHE_TTL = 2 * 60 * 1000; // 2 dakika

router.use("/teacher", requireAuth(["teacher"]));

// ── Optimized bulk loader ──────────────────────────────────────────────────────
async function getAllClassesWithStats(teacherId: string) {
  const cached = teacherDashboardCache.get(teacherId);
  if (cached) return cached;

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

  const studentCounts = await db
    .select({ classId: usersTable.classId, c: count() })
    .from(usersTable)
    .where(and(inArray(usersTable.classId, classIds), eq(usersTable.role, "student")))
    .groupBy(usersTable.classId);

  const countMap = new Map<string, number>(
    studentCounts.map((r) => [r.classId ?? "", Number(r.c)])
  );

  const allCodes = await db
    .select({
      code: studentCodesTable.code,
      classId: studentCodesTable.classId,
      usedByUserId: studentCodesTable.usedByUserId,
    })
    .from(studentCodesTable)
    .where(inArray(studentCodesTable.classId, classIds))
    .orderBy(studentCodesTable.createdAt);

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
        usedByUserId: c.usedByUserId ?? null,
      })),
    };
  });

  teacherDashboardCache.set(teacherId, result, CACHE_TTL);
  return result;
}

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
      usedByUserId: c.usedByUserId ?? null,
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

router.delete("/teacher/classes/:id", async (req, res) => {
  const { auth } = req as unknown as AuthedRequest;
  const { id } = req.params;

  const [cls] = await db
    .select()
    .from(classesTable)
    .where(and(eq(classesTable.id, id), eq(classesTable.teacherId, auth.userId)))
    .limit(1);

  if (!cls) {
    res.status(404).json({ error: "Sınıf bulunamadı" });
    return;
  }

  // Cascade: student codes, learning requests, then class
  const codes = await db
    .select({ id: studentCodesTable.id })
    .from(studentCodesTable)
    .where(eq(studentCodesTable.classId, id));

  if (codes.length > 0) {
    const codeIds = codes.map((c) => c.id);
    await db
      .delete(studentLearningRequestsTable)
      .where(inArray(studentLearningRequestsTable.studentId, codeIds));
    await db
      .delete(studentCodesTable)
      .where(eq(studentCodesTable.classId, id));
  }

  await db.delete(classesTable).where(eq(classesTable.id, id));

  // Flush RAM cache for the teacher
  teacherDashboardCache.invalidate(auth.userId);

  res.status(204).end();
});

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

// ── Öğrenme Takibi Endpoint'leri ──────────────────────────────────────────────

router.get("/teacher/classes/:classId/student-codes-progress", async (req, res) => {
  const { auth } = req as unknown as AuthedRequest;
  const classId = req.params.classId;

  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, classId)).limit(1);
  if (!cls || cls.teacherId !== auth.userId) {
    res.status(404).json({ error: "Sınıf bulunamadı" });
    return;
  }

  // Tüm öğrenci kodları
  const codes = await db
    .select({
      code: studentCodesTable.code,
      usedByUserId: studentCodesTable.usedByUserId,
    })
    .from(studentCodesTable)
    .where(eq(studentCodesTable.classId, classId))
    .orderBy(studentCodesTable.createdAt);

  // Toplam ders sayısı (dinamik)
  const [totalRow] = await db.select({ c: count() }).from(lessonsTable);
  const totalActivityCount = Number(totalRow?.c ?? 0);

  // DB'deki öğrenme kayıtları (bu sınıfa ait)
  const dbRequests = await db
    .select({
      studentId: studentLearningRequestsTable.studentId,
      activityKey: studentLearningRequestsTable.activityKey,
      createdAt: studentLearningRequestsTable.createdAt,
    })
    .from(studentLearningRequestsTable)
    .where(eq(studentLearningRequestsTable.classId, classId));

  // RAM cache'deki kayıtlar (bu sınıfa ait)
  const cacheRequests = [...pendingLearningRequests.values()].filter(
    (e) => e.classId === classId
  );

  // studentId → { count, lastAt }
  const byStudent = new Map<string, { learnedKeys: Set<string>; lastAt: Date }>();

  for (const r of dbRequests) {
    const existing = byStudent.get(r.studentId);
    if (!existing) {
      byStudent.set(r.studentId, { learnedKeys: new Set([r.activityKey]), lastAt: r.createdAt });
    } else {
      existing.learnedKeys.add(r.activityKey);
      if (r.createdAt > existing.lastAt) existing.lastAt = r.createdAt;
    }
  }

  // RAM cache ekle (duplicate önle)
  for (const r of cacheRequests) {
    const existing = byStudent.get(r.studentId);
    if (!existing) {
      byStudent.set(r.studentId, { learnedKeys: new Set([r.activityKey]), lastAt: r.createdAt });
    } else {
      existing.learnedKeys.add(r.activityKey);
      if (r.createdAt > existing.lastAt) existing.lastAt = r.createdAt;
    }
  }

  const result = codes.map((c) => {
    const studentData = c.usedByUserId ? byStudent.get(c.usedByUserId) : null;
    return {
      code: c.code,
      isActive: c.usedByUserId !== null,
      studentId: c.usedByUserId ?? null,
      learnedCount: studentData?.learnedKeys.size ?? 0,
      totalActivityCount,
      lastActivityAt: studentData?.lastAt?.toISOString() ?? null,
    };
  });

  res.json(result);
});

router.get("/teacher/student-codes/:studentId/learning-progress", async (req, res) => {
  const { auth } = req as unknown as AuthedRequest;
  const studentId = req.params.studentId;

  // Öğrenci bu öğretmenin sınıfında mı?
  const [student] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, studentId))
    .limit(1);
  if (!student || !student.classId) {
    res.status(404).json({ error: "Öğrenci bulunamadı" });
    return;
  }
  const [cls] = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.id, student.classId))
    .limit(1);
  if (!cls || cls.teacherId !== auth.userId) {
    res.status(403).json({ error: "Yetki yok" });
    return;
  }

  // Tüm dersler (sıralı)
  const allLessons = await db
    .select()
    .from(lessonsTable)
    .orderBy(asc(lessonsTable.orderIndex));

  // DB kayıtları
  const dbRequests = await db
    .select({
      activityKey: studentLearningRequestsTable.activityKey,
      createdAt: studentLearningRequestsTable.createdAt,
    })
    .from(studentLearningRequestsTable)
    .where(eq(studentLearningRequestsTable.studentId, studentId));

  // RAM cache
  const cacheRequests = [...pendingLearningRequests.values()].filter(
    (e) => e.studentId === studentId
  );

  // activityKey → learnedAt
  const learnedMap = new Map<string, Date>();
  for (const r of dbRequests) learnedMap.set(r.activityKey, r.createdAt);
  for (const r of cacheRequests) {
    if (!learnedMap.has(r.activityKey)) learnedMap.set(r.activityKey, r.createdAt);
  }

  const result = allLessons.map((l) => ({
    activityKey: l.id,
    moduleKey: l.code,
    activityTitle: l.title,
    learned: learnedMap.has(l.id),
    learnedAt: learnedMap.get(l.id)?.toISOString() ?? null,
  }));

  res.json(result);
});

export default router;

void teacherCodesTable;
void isNull;
