import {
  db,
  pool,
  lessonsTable,
  institutionsTable,
  teacherCodesTable,
} from "@workspace/db";

const lessons = [
  {
    id: "lesson-1a",
    code: "1A",
    moduleNumber: 1,
    moduleTitle: "Modül 1 — Temeller",
    title: "Gitar Tutuş",
    description: "Gitarı doğru ve rahat şekilde tutmayı öğren.",
    level: 1,
    orderIndex: 1,
  },
  {
    id: "lesson-1b",
    code: "1B",
    moduleNumber: 1,
    moduleTitle: "Modül 1 — Temeller",
    title: "Akort + Notlar",
    description: "Telleri ve notaları interaktif klavyede keşfet.",
    level: 1,
    orderIndex: 2,
  },
  {
    id: "lesson-1c",
    code: "1C",
    moduleNumber: 1,
    moduleTitle: "Modül 1 — Temeller",
    title: "Sağ El Ritim",
    description: "↓ ↓ ↑ ↑ ↓ ↑ vuruş kalıbını öğren.",
    level: 1,
    orderIndex: 3,
  },
  {
    id: "lesson-2a",
    code: "2A",
    moduleNumber: 2,
    moduleTitle: "Modül 2 — Akorlar",
    title: "Em Akoru",
    description: "İlk akorun: Em. Parmak yerleşimini izle.",
    level: 2,
    orderIndex: 4,
  },
  {
    id: "lesson-2b",
    code: "2B",
    moduleNumber: 2,
    moduleTitle: "Modül 2 — Akorlar",
    title: "Am Akoru",
    description: "İşaret → orta → yüzük parmağı sırasıyla.",
    level: 2,
    orderIndex: 5,
  },
  {
    id: "lesson-2c",
    code: "2C",
    moduleNumber: 2,
    moduleTitle: "Modül 2 — Akorlar",
    title: "C Akoru (Do Majör)",
    description: "İşaret → orta → yüzük parmağıyla Do Majör akorunu öğren.",
    level: 3,
    orderIndex: 6,
  },
  {
    id: "lesson-2d",
    code: "2D",
    moduleNumber: 2,
    moduleTitle: "Modül 2 — Akorlar",
    title: "D Akoru (Re Majör)",
    description: "İşaret → orta → yüzük parmağıyla Re Majör akorunu öğren.",
    level: 3,
    orderIndex: 7,
  },
];

async function main() {
  for (const l of lessons) {
    await db
      .insert(lessonsTable)
      .values(l)
      .onConflictDoUpdate({
        target: lessonsTable.id,
        set: {
          code: l.code,
          moduleNumber: l.moduleNumber,
          moduleTitle: l.moduleTitle,
          title: l.title,
          description: l.description,
          level: l.level,
          orderIndex: l.orderIndex,
        },
      });
  }
  console.log(`Seeded ${lessons.length} lessons`);

  const existing = await db.select().from(institutionsTable).limit(1);
  if (existing.length === 0) {
    const [inst] = await db
      .insert(institutionsTable)
      .values({
        name: "Demo Müzik Okulu",
        teacherLimit: 5,
        studentLimit: 50,
      })
      .returning();
    await db.insert(teacherCodesTable).values({
      code: "DEMO2026",
      institutionId: inst.id,
    });
    console.log(`Seeded demo institution with teacher code: DEMO2026`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
