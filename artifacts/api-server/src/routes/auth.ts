import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { teacherCodesTable, studentCodesTable, classesTable, institutionsTable } from "@workspace/db";
import {
  AdminLoginBody,
  TeacherLoginBody,
  StudentLoginBody,
  CheckInviteCodeBody,
  AdminLoginResponse,
  GetMeResponse,
} from "@workspace/api-zod";
import {
  ADMIN_PASSWORD,
  ADMIN_USER_ID,
  signToken,
  requireAuth,
  loadCurrentUser,
  type AuthedRequest,
} from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/admin-login", async (req, res) => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Geçersiz istek" });
    return;
  }
  if (parsed.data.password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Hatalı şifre" });
    return;
  }
  const token = signToken({ userId: ADMIN_USER_ID, role: "admin" });
  const body = AdminLoginResponse.parse({
    token,
    user: { id: ADMIN_USER_ID, role: "admin", name: "Yönetici" },
  });
  res.json(body);
});

router.post("/auth/check-code", async (req, res) => {
  const parsed = CheckInviteCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Geçersiz istek" });
    return;
  }
  const cleanCode = parsed.data.code.trim().toUpperCase();
  const [tCode] = await db
    .select()
    .from(teacherCodesTable)
    .where(eq(teacherCodesTable.code, cleanCode))
    .limit(1);
  if (tCode) {
    const [inst] = await db
      .select()
      .from(institutionsTable)
      .where(eq(institutionsTable.id, tCode.institutionId))
      .limit(1);
    res.json({
      kind: "teacher",
      institutionName: inst?.name ?? "",
      className: null,
      used: tCode.usedByUserId !== null,
    });
    return;
  }
  const [sCode] = await db
    .select()
    .from(studentCodesTable)
    .where(eq(studentCodesTable.code, cleanCode))
    .limit(1);
  if (sCode) {
    const [inst] = await db
      .select()
      .from(institutionsTable)
      .where(eq(institutionsTable.id, sCode.institutionId))
      .limit(1);
    const [cls] = await db
      .select()
      .from(classesTable)
      .where(eq(classesTable.id, sCode.classId))
      .limit(1);
    res.json({
      kind: "student",
      institutionName: inst?.name ?? "",
      className: cls?.name ?? null,
      used: sCode.usedByUserId !== null,
    });
    return;
  }
  res.status(404).json({ error: "Kod bulunamadı" });
});

router.post("/auth/teacher-login", async (req, res) => {
  const parsed = TeacherLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Geçersiz istek" });
    return;
  }
  const { code, firstName, lastName } = parsed.data;
  const cleanCode = code.trim().toUpperCase();
  const fName = firstName.trim();
  const lName = lastName.trim();
  const fullName = `${fName} ${lName}`.trim();

  const [tCode] = await db
    .select()
    .from(teacherCodesTable)
    .where(eq(teacherCodesTable.code, cleanCode))
    .limit(1);
  if (!tCode) {
    res.status(401).json({ error: "Geçersiz öğretmen kodu" });
    return;
  }
  let user;
  if (tCode.usedByUserId) {
    [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, tCode.usedByUserId))
      .limit(1);
    if (user) {
      [user] = await db
        .update(usersTable)
        .set({ firstName: fName, lastName: lName, name: fullName })
        .where(eq(usersTable.id, user.id))
        .returning();
    }
  }
  if (!user) {
    [user] = await db
      .insert(usersTable)
      .values({
        role: "teacher",
        name: fullName,
        firstName: fName,
        lastName: lName,
        institutionId: tCode.institutionId,
      })
      .returning();
    await db
      .update(teacherCodesTable)
      .set({ usedByUserId: user.id })
      .where(eq(teacherCodesTable.id, tCode.id));
  }
  const token = signToken({ userId: user.id, role: "teacher" });
  const [inst] = await db
    .select()
    .from(institutionsTable)
    .where(eq(institutionsTable.id, tCode.institutionId))
    .limit(1);
  const teacherUser = user as typeof usersTable.$inferSelect;
  res.json({
    token,
    user: {
      id: teacherUser.id,
      role: "teacher",
      name: teacherUser.name,
      firstName: teacherUser.firstName ?? null,
      lastName: teacherUser.lastName ?? null,
      institutionId: teacherUser.institutionId,
      institutionName: inst?.name ?? null,
    },
  });
});

router.post("/auth/student-login", async (req, res) => {
  const parsed = StudentLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Geçersiz istek" });
    return;
  }
  const { code, name } = parsed.data;
  const cleanCode = code.trim().toUpperCase();
  const [sCode] = await db
    .select()
    .from(studentCodesTable)
    .where(eq(studentCodesTable.code, cleanCode))
    .limit(1);
  if (!sCode) {
    res.status(401).json({ error: "Geçersiz öğrenci kodu" });
    return;
  }
  let user;
  if (sCode.usedByUserId) {
    [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, sCode.usedByUserId))
      .limit(1);
  }
  if (!user) {
    [user] = await db
      .insert(usersTable)
      .values({
        role: "student",
        name: name.trim() || "Öğrenci",
        institutionId: sCode.institutionId,
        classId: sCode.classId,
      })
      .returning();
    await db
      .update(studentCodesTable)
      .set({ usedByUserId: user.id })
      .where(eq(studentCodesTable.id, sCode.id));
  }
  const token = signToken({ userId: user.id, role: "student" });
  const [cls] = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.id, sCode.classId))
    .limit(1);
  const [inst] = await db
    .select()
    .from(institutionsTable)
    .where(eq(institutionsTable.id, sCode.institutionId))
    .limit(1);
  res.json({
    token,
    user: {
      id: user.id,
      role: "student",
      name: user.name,
      institutionId: user.institutionId,
      institutionName: inst?.name ?? null,
      classId: user.classId,
      className: cls?.name ?? null,
    },
  });
});

router.get("/auth/me", requireAuth(), async (req, res) => {
  const { auth } = req as unknown as AuthedRequest;
  const user = await loadCurrentUser(auth);
  if (!user) {
    res.status(401).json({ error: "Kullanıcı bulunamadı" });
    return;
  }
  let className: string | null = null;
  let institutionName: string | null = null;
  if (user.classId) {
    const [c] = await db
      .select()
      .from(classesTable)
      .where(eq(classesTable.id, user.classId))
      .limit(1);
    className = c?.name ?? null;
  }
  if (user.institutionId) {
    const [i] = await db
      .select()
      .from(institutionsTable)
      .where(eq(institutionsTable.id, user.institutionId))
      .limit(1);
    institutionName = i?.name ?? null;
  }
  const body = GetMeResponse.parse({
    id: user.id,
    role: user.role,
    name: user.name,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    institutionId: user.institutionId ?? null,
    institutionName,
    classId: user.classId ?? null,
    className,
  });
  res.json(body);
});

export default router;
