import { Router, type IRouter } from "express";
import { db, classesTable, usersTable, lessonsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// Public: 6 haneli akıllı tahta kodu ile sınıf bilgisi
router.get("/smartboard/:code", async (req, res) => {
  const code = req.params.code;
  if (!code || code.length !== 6) {
    res.status(400).json({ error: "Geçersiz akıllı tahta kodu" });
    return;
  }

  const [cls] = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.smartboardCode, code))
    .limit(1);

  if (!cls) {
    res.status(404).json({ error: "Kod bulunamadı" });
    return;
  }

  const [teacher] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, cls.teacherId))
    .limit(1);

  const lessons = await db
    .select()
    .from(lessonsTable)
    .orderBy(lessonsTable.orderIndex);

  res.json({
    classId: cls.id,
    className: cls.name,
    teacherName: teacher?.name ?? null,
    lessons: lessons.map((l) => ({
      id: l.id,
      code: l.code,
      title: l.title,
      moduleNumber: l.moduleNumber,
      moduleTitle: l.moduleTitle,
      orderIndex: l.orderIndex,
    })),
  });
});

// Public: Akıllı tahta modunda ders ilerlemesi (oturumsuz, sadece sınıf bazlı)
router.get("/smartboard/:code/lesson/:lessonCode", async (req, res) => {
  const { code, lessonCode } = req.params;

  const [cls] = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.smartboardCode, code))
    .limit(1);

  if (!cls) {
    res.status(404).json({ error: "Kod bulunamadı" });
    return;
  }

  const [lesson] = await db
    .select()
    .from(lessonsTable)
    .where(eq(lessonsTable.code, lessonCode))
    .limit(1);

  if (!lesson) {
    res.status(404).json({ error: "Ders bulunamadı" });
    return;
  }

  res.json({
    lesson: {
      id: lesson.id,
      code: lesson.code,
      title: lesson.title,
      moduleNumber: lesson.moduleNumber,
      moduleTitle: lesson.moduleTitle,
      orderIndex: lesson.orderIndex,
    },
  });
});

export default router;
