import { Router, type IRouter } from "express";
import { db, lessonsTable, lessonProgressTable, classesTable, usersTable, studentCodesTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { addLearningRequest } from "../lib/learning-cache";

const router: IRouter = Router();

router.use("/student", requireAuth(["student"]));

interface StudentContext {
  student: typeof usersTable.$inferSelect;
  class: typeof classesTable.$inferSelect;
  studentCode: string | null;
  lessons: {
    id: string;
    moduleNumber: number;
    moduleTitle: string;
    code: string;
    title: string;
    description: string;
    level: number;
    locked: boolean;
    completed: boolean;
  }[];
}

async function getLessonsForStudent(userId: string): Promise<StudentContext | null> {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!u || !u.classId) return null;
  const [cls] = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.id, u.classId))
    .limit(1);
  if (!cls) return null;
  const lessons = await db.select().from(lessonsTable).orderBy(asc(lessonsTable.orderIndex));
  const progress = await db
    .select()
    .from(lessonProgressTable)
    .where(eq(lessonProgressTable.userId, userId));
  const completed = new Set(progress.map((p) => p.lessonId));

  // Öğrencinin student_code'unu bul
  const [codeRow] = await db
    .select({ code: studentCodesTable.code })
    .from(studentCodesTable)
    .where(eq(studentCodesTable.usedByUserId, userId))
    .limit(1);

  return {
    student: u,
    class: cls,
    studentCode: codeRow?.code ?? null,
    lessons: lessons.map((l) => ({
      id: l.id,
      moduleNumber: l.moduleNumber,
      moduleTitle: l.moduleTitle,
      code: l.code,
      title: l.title,
      description: l.description,
      level: l.level,
      locked: l.level > cls.levelUnlocked,
      completed: completed.has(l.id),
    })),
  };
}

router.get("/student/lessons", async (req, res) => {
  const { auth } = req as unknown as AuthedRequest;
  const data = await getLessonsForStudent(auth.userId);
  if (!data) {
    res.status(404).json({ error: "Sınıf bulunamadı" });
    return;
  }
  res.json(data.lessons);
});

router.post("/student/lessons/:id/complete", async (req, res) => {
  const { auth } = req as unknown as AuthedRequest;
  const lessonId = req.params.id;
  const data = await getLessonsForStudent(auth.userId);
  if (!data) {
    res.status(404).json({ error: "Sınıf bulunamadı" });
    return;
  }
  const lesson = data.lessons.find((l) => l.id === lessonId);
  if (!lesson) {
    res.status(404).json({ error: "Ders bulunamadı" });
    return;
  }
  if (lesson.locked) {
    res.status(403).json({ error: "Bu ders henüz kilitli" });
    return;
  }

  // 1) Lesson progress (doğrudan DB — kilit/açma sistemi için gerekli)
  if (!lesson.completed) {
    await db
      .insert(lessonProgressTable)
      .values({ userId: auth.userId, lessonId })
      .onConflictDoNothing();
  }

  // 2) Öğrenme takibi — RAM cache üzerinden (120s'de bir DB'ye yazılır)
  if (data.class.institutionId && data.class.teacherId) {
    addLearningRequest({
      institutionId: data.class.institutionId,
      teacherId: data.class.teacherId,
      classId: data.class.id,
      studentId: auth.userId,
      studentCode: data.studentCode ?? "unknown",
      moduleKey: lesson.code,
      activityKey: lesson.id,
      activityTitle: lesson.title,
      status: "learned",
      createdAt: new Date(),
    });
  }

  const refreshed = await getLessonsForStudent(auth.userId);
  const updated = refreshed?.lessons.find((l) => l.id === lessonId);
  res.json(updated ?? lesson);
});

router.get("/student/dashboard", async (req, res) => {
  const { auth } = req as unknown as AuthedRequest;
  const data = await getLessonsForStudent(auth.userId);
  if (!data) {
    res.status(404).json({ error: "Sınıf bulunamadı" });
    return;
  }
  const completedCount = data.lessons.filter((l) => l.completed).length;
  const next = data.lessons.find((l) => !l.completed && !l.locked) ?? null;
  res.json({
    studentName: data.student.name,
    className: data.class.name,
    currentLevel: data.class.levelUnlocked,
    completedLessons: completedCount,
    totalLessons: data.lessons.length,
    nextLesson: next,
  });
});

export default router;
