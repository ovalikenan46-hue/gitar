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
  {
    id: "lesson-3a",
    code: "3A",
    moduleNumber: 3,
    moduleTitle: "Modül 3 — Akord Geçişleri",
    title: "Em → Am Geçişi",
    description: "Parmakları kaydırarak Em'den Am'a geç.",
    level: 4,
    orderIndex: 8,
  },
  {
    id: "lesson-3b",
    code: "3B",
    moduleNumber: 3,
    moduleTitle: "Modül 3 — Akord Geçişleri",
    title: "Am → C Geçişi",
    description: "İşaret ve orta parmak yerinde, sadece yüzük taşınıyor.",
    level: 5,
    orderIndex: 9,
  },
  {
    id: "lesson-3c",
    code: "3C",
    moduleNumber: 3,
    moduleTitle: "Modül 3 — Akord Geçişleri",
    title: "C → D Geçişi",
    description: "3 parmağın da taşındığı en zorlu geçiş — adım adım öğren.",
    level: 6,
    orderIndex: 10,
  },
  {
    id: "lesson-4a",
    code: "4A",
    moduleNumber: 4,
    moduleTitle: "Modül 4 — Akor Pratiği",
    title: "Em → Am → C Pratiği",
    description: "Em, Am ve C akorlarını metronom eşliğinde geçiş pratiği yap.",
    level: 7,
    orderIndex: 11,
  },
  {
    id: "lesson-4b",
    code: "4B",
    moduleNumber: 4,
    moduleTitle: "Modül 4 — Akor Pratiği",
    title: "Am → C → D Pratiği",
    description: "Am, C ve D akorlarını metronom eşliğinde geçiş pratiği yap.",
    level: 8,
    orderIndex: 12,
  },
  {
    id: "lesson-4c",
    code: "4C",
    moduleNumber: 4,
    moduleTitle: "Modül 4 — Akor Pratiği",
    title: "Em → D → Am Pratiği",
    description: "Em, D ve Am akorlarını metronom eşliğinde geçiş pratiği yap.",
    level: 9,
    orderIndex: 13,
  },
  {
    id: "lesson-4d",
    code: "4D",
    moduleNumber: 4,
    moduleTitle: "Modül 4 — Akor Pratiği",
    title: "C → D → Em Pratiği",
    description: "C, D ve Em akorlarını metronom eşliğinde geçiş pratiği yap.",
    level: 10,
    orderIndex: 14,
  },
  {
    id: "lesson-5a",
    code: "5A",
    moduleNumber: 5,
    moduleTitle: "Modül 5 — Yeni Akorlar",
    title: "Mi Majör (E) ve La Majör (A)",
    description: "E ve A majör akorlarını öğren — güçlü, dolgun sesler!",
    level: 11,
    orderIndex: 15,
  },
  {
    id: "lesson-5b",
    code: "5B",
    moduleNumber: 5,
    moduleTitle: "Modül 5 — Yeni Akorlar",
    title: "Re Minör (Dm) ve Sol Majör (G)",
    description: "Dm ve G akorlarını keşfet — yeni tonlar, yeni hisler.",
    level: 12,
    orderIndex: 16,
  },
  {
    id: "lesson-5c",
    code: "5C",
    moduleNumber: 5,
    moduleTitle: "Modül 5 — Yeni Akorlar",
    title: "Fa Majör Barre (F) ve Si 7 (B7)",
    description: "F barre akorunu ve B7'yi öğren — bunlar gerçek bir gitaristin silahı!",
    level: 13,
    orderIndex: 17,
  },
  {
    id: "lesson-6a",
    code: "6A",
    moduleNumber: 6,
    moduleTitle: "Modül 6 — İleri Geçişler",
    title: "Em → E → Am → A Geçişleri",
    description: "Üç adımlı geçiş dizisi: Em'den E'ye, oradan Am ve A'ya.",
    level: 14,
    orderIndex: 18,
  },
  {
    id: "lesson-6b",
    code: "6B",
    moduleNumber: 6,
    moduleTitle: "Modül 6 — İleri Geçişler",
    title: "Dm → C → G Geçişleri",
    description: "Dm'den C'ye ve C'den G'ye — büyük pozisyon değişimleri.",
    level: 15,
    orderIndex: 19,
  },
  {
    id: "lesson-6c",
    code: "6C",
    moduleNumber: 6,
    moduleTitle: "Modül 6 — İleri Geçişler",
    title: "C → F (Barre) → Em Geçişleri",
    description: "Barre geçişi dahil C→F ve F→Em — en zorlu geçişler!",
    level: 16,
    orderIndex: 20,
  },
  {
    id: "lesson-6d",
    code: "6D",
    moduleNumber: 6,
    moduleTitle: "Modül 6 — İleri Geçişler",
    title: "Em → B7 → C → D Geçişleri",
    description: "Üç geçişlik final zinciri — tüm akorları bir araya getir!",
    level: 17,
    orderIndex: 21,
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
