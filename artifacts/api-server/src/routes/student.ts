import { Router, type IRouter } from "express";
import { db, lessonsTable, lessonProgressTable, classesTable, usersTable, studentLearningRequestsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../lib/auth";

const router: IRouter = Router();

router.use("/student", requireAuth(["student"]));

async function loadStudent(userId: string) {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return u;
}

async function getLessonsForStudent(userId: string) {
  const student = await loadStudent(userId);
  if (!student || !student.classId) return null;
  const [cls] = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.id, student.classId))
    .limit(1);
  if (!cls) return null;
  const lessons = await db.select().from(lessonsTable).orderBy(asc(lessonsTable.orderIndex));
  const progress = await db
    .select()
    .from(lessonProgressTable)
    .where(eq(lessonProgressTable.userId, userId));
  const completed = new Set(progress.map((p) => p.lessonId));
  return {
    student,
    class: cls,
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
  if (!lesson.completed) {
    await db
      .insert(lessonProgressTable)
      .values({ userId: auth.userId, lessonId })
      .onConflictDoNothing();
  }

  // Öğretmen paneli için öğrenme isteği kaydet (duplicate'i engelle)
  await db
    .insert(studentLearningRequestsTable)
    .values({
      teacherId: data.class.teacherId,
      classId: data.class.id,
      studentId: auth.userId,
      studentName: data.student.name,
      lessonId,
      lessonTitle: lesson.title,
      lessonCode: lesson.code,
      className: data.class.name,
      status: "pending",
    })
    .onConflictDoNothing();
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
  const completed = data.lessons.filter((l) => l.completed).length;
  const next = data.lessons.find((l) => !l.completed && !l.locked) ?? null;
  res.json({
    studentName: data.student.name,
    className: data.class.name,
    currentLevel: data.class.levelUnlocked,
    completedLessons: completed,
    totalLessons: data.lessons.length,
    nextLesson: next,
  });
});

export default router;
