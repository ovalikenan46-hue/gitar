# Gitar Öğreniyorum — Teknik Dokümantasyon

**Hazırlanma Tarihi:** Temmuz 2026  
**Hedef Kitle:** Kıdemli Yazılım Mimarları ve Geliştiriciler  
**Proje Deposu:** github.com/ovalikenan46-hue/gitar

---

## İÇİNDEKİLER

1. Genel Mimari
2. Teknoloji Yığını
3. Klasör Yapısı
4. Authentication ve Authorization
5. Veritabanı Şeması
6. API Dokümantasyonu
7. İş Akışları
8. Frontend Mimarisi
9. Backend Mimarisi
10. Güvenlik Analizi
11. Performans
12. Kod Kalitesi
13. Log ve Hata Yönetimi
14. Ortam Yapılandırması
15. Bağımlılık Haritası
16. Geliştirme Rehberi
17. Risk Analizi
18. Teknik Borç Analizi
19. Ölçeklenebilirlik
20. Sonuç

---

## 1. GENEL MİMARİ

### 1.1 Proje Tanımı

Türkçe ortaokul öğrencilerine (10–14 yaş) yönelik interaktif gitar öğrenme platformu. Üç kullanıcı rolü mevcuttur: **admin**, **öğretmen** ve **öğrenci**. Sistem kurumsal (B2B) modelde çalışır; admin kurumları yönetir, kurumlar öğretmenleri, öğretmenler sınıfları ve öğrencileri yönetir.

### 1.2 Mimari Desen

```
┌─────────────────────────────────────────────────────────────────┐
│                     REPLIT PROXY (Port 80)                      │
│                   Path-based Routing / mTLS                     │
└──────────────┬───────────────────────────┬──────────────────────┘
               │                           │
   /guitar-app/*                        /api/*
               │                           │
┌──────────────▼──────────────┐ ┌──────────▼──────────────────────┐
│   artifacts/guitar-app      │ │     artifacts/api-server         │
│   React + Vite (SPA)        │ │     Express 5 + Drizzle ORM      │
│   Port: $PORT (dinamik)     │ │     Port: $PORT (dinamik)        │
└─────────────────────────────┘ └──────────┬──────────────────────┘
                                           │
                                ┌──────────▼──────────────────────┐
                                │       PostgreSQL (Replit)        │
                                │       lib/db (Drizzle ORM)       │
                                └─────────────────────────────────┘
```

**Mimari Tipi:** Monolitik Backend + SPA Frontend (aynı domain, path-based routing)

**Tasarım Desenleri:**
- **Contract-First API:** OpenAPI spec önce tanımlanır, kod buradan üretilir (Orval codegen)
- **Repository Pattern:** Drizzle ORM sorguları route handler içinde yazılır (ayrı repository katmanı yok)
- **Context/Provider Pattern:** Frontend'de BgMusicContext gibi cross-cutting state için React Context kullanılır
- **Optimistic Caching:** TanStack Query ile client-side cache; server-side TTLCache ile backend cache

### 1.3 Frontend–Backend İletişimi

```
guitar-app (React)
  └── @workspace/api-client-react  ← Orval tarafından üretilmiş
        └── TanStack Query hooks (useGetMe, useListMyClasses, vs.)
              └── custom-fetch.ts  ← JWT header ekleme
                    └── /api/* (Replit Proxy üzerinden)
                          └── api-server (Express)
                                └── lib/db (Drizzle ORM)
                                      └── PostgreSQL
```

JWT token `localStorage`'da saklanır. Her API isteğinde `Authorization: Bearer <token>` header'ı eklenir. Token yoksa veya geçersizse 401 döner, frontend kullanıcıyı login sayfasına yönlendirir.

### 1.4 Veri Akışı Özeti

```
Kullanıcı Eylemi
  → React Component (UI)
  → TanStack Query Mutation/Query Hook
  → custom-fetch (JWT header ekle)
  → API Endpoint (Express Route)
  → requireAuth Middleware (JWT doğrula)
  → Route Handler (iş mantığı)
  → Drizzle ORM Query
  → PostgreSQL
  → JSON Response
  → TanStack Query Cache güncelle
  → React Component re-render
```

---

## 2. TEKNOLOJİ YIĞINI

### 2.1 Frontend

| Teknoloji | Versiyon | Amaç |
|-----------|----------|-------|
| React | 19.1.0 | UI framework |
| TypeScript | ~5.9.2 | Tip güvenliği |
| Vite | ^7.3.2 | Build tool, dev server |
| Tailwind CSS | ^4.1.14 | Utility-first CSS |
| Framer Motion | (catalog) | Animasyonlar |
| Wouter | ^3.3.5 | Client-side routing (React Router alternatifi, ~2KB) |
| TanStack Query | (catalog) | Server state yönetimi ve caching |
| Radix UI | (suite) | Headless accessible component primitives |
| Shadcn UI | (bileşenler) | Radix UI + Tailwind ile oluşturulmuş bileşenler |
| React Hook Form | (catalog) | Form yönetimi |
| Zod | ^3.25.76 | Şema doğrulama |
| Lucide React | (catalog) | İkon seti |
| Sonner | (catalog) | Toast bildirimleri |
| Recharts | (catalog) | Grafik/chart bileşenleri |
| Web Audio API | Tarayıcı native | Gitar nota sesleri |

### 2.2 Backend

| Teknoloji | Versiyon | Amaç |
|-----------|----------|-------|
| Node.js | LTS | Runtime |
| Express | ^5 | HTTP framework |
| TypeScript | ~5.9.2 | Tip güvenliği |
| Drizzle ORM | ^0.45.2 | Type-safe ORM |
| PostgreSQL | Replit managed | Veritabanı |
| jsonwebtoken | ^9.0.3 | JWT oluşturma/doğrulama |
| pino | ^9 | Yüksek performanslı structured logging |
| pino-http | (catalog) | HTTP request/response loglama |
| cors | ^2 | CORS middleware |
| cookie-parser | ^1.4.7 | Cookie okuma |
| esbuild | ^0.27.3 | Production build bundler |

### 2.3 Shared Libraries

| Paket | Amaç |
|-------|-------|
| `@workspace/db` | Drizzle ORM şema ve DB bağlantısı |
| `@workspace/api-spec` | OpenAPI YAML spec + Orval config |
| `@workspace/api-client-react` | Orval üretimi React Query hooks |
| `@workspace/api-zod` | Orval üretimi Zod şemaları |

### 2.4 Tooling

| Araç | Amaç |
|------|-------|
| pnpm | Paket yöneticisi (workspace desteği) |
| Orval | OpenAPI → TypeScript/React Query/Zod codegen |
| Drizzle Kit | DB migration ve schema push |
| tsx | TypeScript script runner (seed script için) |

---

## 3. KLASÖR YAPISI

```
/
├── artifacts/
│   ├── api-server/                    # Backend uygulaması
│   │   ├── src/
│   │   │   ├── index.ts               # Express app başlatma, PORT bind
│   │   │   ├── app.ts                 # Middleware stack, route kayıt
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts            # Login, /me endpoint'leri
│   │   │   │   ├── admin.ts           # Kurum yönetimi endpoint'leri
│   │   │   │   ├── teacher.ts         # Sınıf yönetimi endpoint'leri
│   │   │   │   ├── student.ts         # Ders ve dashboard endpoint'leri
│   │   │   │   └── smartboard.ts      # Akıllı tahta public endpoint'leri
│   │   │   └── lib/
│   │   │       ├── auth.ts            # JWT sign/verify, requireAuth MW, kod üreteci
│   │   │       ├── cache.ts           # TTLCache — in-memory 2 dakika TTL
│   │   │       └── learning-cache.ts  # Öğrenci aktivite buffer'ı + retry loop
│   │   ├── build.mjs                  # esbuild production bundle script
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── guitar-app/                    # Frontend SPA
│   │   ├── src/
│   │   │   ├── main.tsx               # React DOM render
│   │   │   ├── App.tsx                # Root: Splash gate + Wouter Router
│   │   │   ├── pages/
│   │   │   │   ├── landing.tsx        # Ana sayfa (giriş seçimi)
│   │   │   │   ├── admin-dashboard.tsx
│   │   │   │   ├── teacher-login.tsx  # 2 adımlı öğretmen girişi
│   │   │   │   ├── teacher-dashboard.tsx
│   │   │   │   ├── student-login.tsx  # Öğrenci girişi + akıllı tahta kodu
│   │   │   │   ├── student-home.tsx   # Öğrenci paneli
│   │   │   │   ├── student-lessons.tsx
│   │   │   │   ├── student-profile.tsx
│   │   │   │   ├── lesson-detail.tsx  # İnteraktif ders içeriği
│   │   │   │   ├── smartboard.tsx     # Sınıf akıllı tahta görünümü
│   │   │   │   └── not-found.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/                # Shadcn UI bileşenleri (40+ dosya)
│   │   │   │   ├── lessons/
│   │   │   │   │   ├── fretboard.tsx       # Tıklanabilir gitar klavyesi
│   │   │   │   │   ├── chord-diagram.tsx   # Parmak animasyonlu akor şeması
│   │   │   │   │   ├── chord-transition.tsx # Akor geçiş rehberi
│   │   │   │   │   ├── metronome.tsx       # Animasyonlu metronom
│   │   │   │   │   └── rhythm-trainer.tsx  # Ritim egzersizi
│   │   │   │   ├── layout/
│   │   │   │   │   ├── protected.tsx       # JWT rol kontrolü wrapper
│   │   │   │   │   └── student-layout.tsx  # Alt navigasyon barı
│   │   │   │   ├── teacher/
│   │   │   │   │   └── class-card.tsx      # Sınıf kartı bileşeni
│   │   │   │   ├── splash-screen.tsx       # Açılış ekranı + intro müzik
│   │   │   │   ├── music-bg.tsx            # Yüzen nota animasyonları + TrebleClef/BassClef SVG
│   │   │   │   ├── error-boundary.tsx      # React Error Boundary
│   │   │   │   └── install-prompt.tsx      # PWA kurulum önerisi
│   │   │   ├── contexts/
│   │   │   │   ├── bg-music-context.tsx    # BgMusicCtx interface + useBgMusic hook
│   │   │   │   └── bg-music-provider.tsx   # Audio element yönetimi, iOS unlock
│   │   │   ├── hooks/
│   │   │   │   ├── use-lite-mode.ts        # Mobil/masaüstü ayrımı
│   │   │   │   └── use-auth.ts             # JWT decode, rol okuma
│   │   │   └── lib/
│   │   │       ├── auth.ts                 # getToken, setToken, clearToken
│   │   │       ├── audio.ts                # Web Audio API — nota sesleri
│   │   │       └── animations.ts           # Framer Motion sayfa geçiş varyantları
│   │   ├── public/
│   │   │   └── sounds/
│   │   │       ├── intro.mp3               # Açılış müziği (~10s)
│   │   │       └── bg-music.mp3            # Arka plan müziği (loop)
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── mockup-sandbox/                # UI prototipleme ortamı (Bağımsız Vite app)
│
├── lib/
│   ├── db/
│   │   ├── src/
│   │   │   ├── index.ts               # db bağlantısı (pg + drizzle), export
│   │   │   └── schema/
│   │   │       ├── institutions.ts
│   │   │       ├── users.ts
│   │   │       ├── classes.ts
│   │   │       ├── teacherCodes.ts
│   │   │       ├── studentCodes.ts
│   │   │       ├── lessons.ts
│   │   │       ├── lessonProgress.ts
│   │   │       └── learningRequests.ts
│   │   └── drizzle.config.ts          # DATABASE_URL + migration ayarı
│   │
│   ├── api-spec/
│   │   ├── openapi.yaml               # API contract (tek kaynak)
│   │   └── orval.config.ts            # Codegen hedefleri
│   │
│   ├── api-client-react/
│   │   └── src/generated/             # Orval çıktısı — React Query hooks
│   │       └── api.schemas.ts         # TypeScript tipleri
│   │
│   └── api-zod/
│       └── src/generated/             # Orval çıktısı — Zod şemaları
│
├── scripts/
│   └── src/
│       └── seed.ts                    # Ders verisi + demo kurum seeder
│
├── attached_assets/                   # Medya dosyaları (ses, görsel)
├── pnpm-workspace.yaml                # Workspace tanımı + katalog versiyonlar
├── tsconfig.json                      # Solution file (sadece lib/* için)
├── tsconfig.base.json                 # Tüm paketlerin extend ettiği base config
├── render.yaml                        # Render.com deploy config
└── server.js                          # Legacy compat entry point
```

---

## 4. AUTHENTICATION VE AUTHORIZATION

### 4.1 Rol Sistemi

| Rol | Erişim |
|-----|--------|
| `admin` | Kurum CRUD, öğretmen kodu üretme, sistem istatistikleri |
| `teacher` | Kendi sınıfları CRUD, öğrenci kodları, seviye kilidi açma, akıllı tahta |
| `student` | Kendi derslerini görme/tamamlama, dashboard |
| (public) | Health check, kod sorgulama, akıllı tahta görüntüleme |

### 4.2 JWT Yapısı

```json
{
  "userId": "<cuid string>",
  "role": "admin | teacher | student",
  "iat": 1751234567,
  "exp": 1751238167
}
```

- **Algoritma:** HS256
- **Secret:** `SESSION_SECRET` environment variable
- **Süre:** 1 saat (3600s)
- **Taşıma:** `Authorization: Bearer <token>` header
- **Saklama:** `localStorage` (frontend)

### 4.3 Giriş Akışları

**Admin Girişi:**
```
POST /api/auth/admin-login { password }
  → Sabit şifre ile karşılaştır (ADMIN_PASSWORD env var)
  → signToken({ userId: "admin", role: "admin" })
  → { token, user }
```

**Öğretmen Girişi (2 adım):**
```
Adım 1: POST /api/auth/check-code { code }
  → teacher_codes tablosunda kodu bul
  → { kind: "teacher", institutionName, used }

Adım 2: POST /api/auth/teacher-login { code, firstName, lastName }
  → Kod kullanılmamışsa: yeni user oluştur, kodu "used" işaretle
  → Kod kullanılmışsa: mevcut kullanıcıyı döndür
  → signToken({ userId, role: "teacher" })
```

**Öğrenci Girişi (1 adım):**
```
POST /api/auth/student-login { code, name }
  → student_codes tablosunda kodu bul
  → Kullanılmamışsa: yeni user oluştur
  → Kullanılmışsa: mevcut kullanıcıyı döndür
  → signToken({ userId, role: "student" })
```

### 4.4 requireAuth Middleware

```typescript
requireAuth(roles?: string[])
  → Authorization header'dan token al
  → verifyToken(token) — geçersizse 401
  → roles belirtilmişse payload.role kontrol et — yetkisizse 403
  → req.auth = payload (downstream handler'lar kullanır)
```

**KRİTİK NOT — Path-Prefix Zorunluluğu:**

Alt router'larda middleware **path prefix ile** tanımlanmalıdır:
```typescript
// DOĞRU:
router.use("/admin", requireAuth(["admin"]));

// YANLIŞ (tüm /api/* isteklerini etkiler):
router.use(requireAuth(["admin"]));
```

Bu kural tüm sub-router'lara uygulanmalıdır. Aksi hâlde farklı role ait route'lar da etkilenir.

### 4.5 Frontend Oturum Yönetimi

- Token `localStorage`'da `guitar_token` key ile saklanır
- `use-auth.ts` hook'u token'ı decode ederek rol ve userId döndürür
- `Protected` bileşeni rol kontrolü yapar; yanlış rol → redirect
- Token geçmişte kalmışsa `/api/auth/me` 401 döner → token silinir → landing'e yönlendirme
- "Beni hatırla" seçeneği öğretmende `guitar_teacher_saved` key ile LocalStorage'a JSON yazar
- Öğrencide `guitar_student_saved` key ile benzer yapı

---

## 5. VERİTABANI ŞEMASI

### 5.1 Tablolar ve Kolonlar

#### `institutions`
```
id            text        PK, createId() default
name          text        NOT NULL
teacher_limit integer     NOT NULL — maks öğretmen kodu sayısı
student_limit integer     NOT NULL — maks sınıf kapasitesi toplamı
created_at    timestamp   NOT NULL, default now()
```

#### `users`
```
id             text       PK, createId() default
role           text       NOT NULL — 'admin' | 'teacher' | 'student'
name           text       NOT NULL — display name
first_name     text       NULL — öğretmene özgü
last_name      text       NULL — öğretmene özgü
institution_id text       NULL — FK → institutions.id
class_id       text       NULL — öğrenciye özgü, FK → classes.id
created_at     timestamp  NOT NULL, default now()
```

#### `classes`
```
id               text      PK, createId() default
name             text      NOT NULL
teacher_id       text      NOT NULL — FK → users.id
institution_id   text      NOT NULL — FK → institutions.id
level_unlocked   integer   NOT NULL, default 1
student_capacity integer   NOT NULL, default 0
smartboard_code  text      UNIQUE — 6 haneli sayısal, nullable
created_at       timestamp NOT NULL, default now()
```

#### `teacher_codes`
```
id              text       PK, createId() default
code            text       NOT NULL, UNIQUE — 8 karakter alfanümerik
institution_id  text       NOT NULL — FK → institutions.id
used_by_user_id text       NULL — FK → users.id (kullanıldıktan sonra set edilir)
created_at      timestamp  NOT NULL, default now()
```

#### `student_codes`
```
id              text       PK, createId() default
code            text       NOT NULL, UNIQUE — 8 haneli sayısal
class_id        text       NOT NULL — FK → classes.id
institution_id  text       NOT NULL — FK → institutions.id
used_by_user_id text       NULL — FK → users.id
created_at      timestamp  NOT NULL, default now()
```

#### `lessons`
```
id            text    PK (manuel atanır, seed'de belirlenir)
code          text    NOT NULL, UNIQUE — örn: "1A", "1B", "2A"
module_number integer NOT NULL
module_title  text    NOT NULL
title         text    NOT NULL
description   text    NOT NULL
level         integer NOT NULL — 1 veya 2 (seviye kilidi için)
order_index   integer NOT NULL — sıralama
```

#### `lesson_progress`
```
user_id      text       NOT NULL — FK → users.id
lesson_id    text       NOT NULL — FK → lessons.id
completed_at timestamp  NOT NULL, default now()
PRIMARY KEY  (user_id, lesson_id)   — composite PK, duplicate olmaz
```

#### `student_learning_requests`
```
id              text       PK, createId() default
institution_id  text       NOT NULL
teacher_id      text       NOT NULL
class_id        text       NOT NULL
student_id      text       NOT NULL
student_code    text       NOT NULL
module_key      text       NOT NULL — örn: "module_1"
activity_key    text       NOT NULL — örn: "lesson_1A_fretboard"
activity_title  text       NOT NULL
status          text       NOT NULL, default 'learned'
created_at      timestamp  NOT NULL, default now()
flushed_at      timestamp  NULL — DB'ye yazıldı mı?
updated_at      timestamp  NOT NULL, default now()
UNIQUE (student_id, activity_key)    — bir öğrenci aynı aktiviteyi tek kayıt

INDEX slr_institution_idx (institution_id)
INDEX slr_teacher_idx     (teacher_id)
INDEX slr_class_idx       (class_id)
INDEX slr_student_idx     (student_id)
INDEX slr_student_code_idx(student_code)
INDEX slr_status_idx      (status)
INDEX slr_created_at_idx  (created_at)
```

### 5.2 ER Diyagramı (Metin)

```
institutions (1) ──── (N) teacher_codes
institutions (1) ──── (N) classes
institutions (1) ──── (N) users
institutions (1) ──── (N) student_codes
institutions (1) ──── (N) student_learning_requests

classes (1) ──── (N) student_codes
classes (1) ──── (N) users [class_id ile]

users [teacher] (1) ──── (N) classes [teacher_id ile]
users [teacher] (1) ──── (1) teacher_codes [used_by_user_id ile]
users [student] (1) ──── (1) student_codes [used_by_user_id ile]
users (1) ──── (N) lesson_progress
users (1) ──── (N) student_learning_requests

lessons (1) ──── (N) lesson_progress
```

**NOT:** Drizzle ORM şemaları `references()` ile foreign key constraint tanımlamamıştır. İlişkiler mantıksaldır (application-level), veritabanı constraint'i yoktur.

### 5.3 Kota Modeli

```
usedTeacherCount = COUNT(teacher_codes WHERE institution_id = X)
usedStudentCount = SUM(classes.student_capacity WHERE institution_id = X)

teacherLimit >= usedTeacherCount    (admin her zaman kontrol eder)
studentLimit >= usedStudentCount    (sınıf oluşturma/genişletmede kontrol edilir)
```

---

## 6. API DOKÜMANTASYONU

Tüm endpoint'ler `/api` prefix'i altındadır. Sistem yanıtları JSON formatındadır.

### 6.1 Health

| URL | Method | Auth | Açıklama |
|-----|--------|------|----------|
| `/api/healthz` | GET | Public | `{ status: "ok" }` — liveness probe |

### 6.2 Auth Endpoint'leri

#### `POST /api/auth/admin-login`
```
Input:  { password: string }
Output: { token: string, user: { id, role, name } }
Hata:   401 — yanlış şifre
Ekran:  landing.tsx admin modal
```

#### `POST /api/auth/check-code`
```
Input:  { code: string }
Output: {
  kind: "teacher" | "student",
  institutionName: string,
  className?: string,
  used: boolean
}
Hata:   404 — kod bulunamadı
Ekran:  teacher-login.tsx adım 1, student-login.tsx
```

#### `POST /api/auth/teacher-login`
```
Input:  { code: string, firstName: string, lastName: string }
Output: { token: string, user: { id, role, name, institutionName, institutionId } }
Hata:   404 — kod yok, 400 — öğretmen kodu değil
Ekran:  teacher-login.tsx adım 2
```

#### `POST /api/auth/student-login`
```
Input:  { code: string, name: string }
Output: { token: string, user: { id, role, name, institutionName, className, classId } }
Hata:   404 — kod yok, 400 — öğrenci kodu değil
Ekran:  student-login.tsx
```

#### `GET /api/auth/me`
```
Input:  —
Output: UserProfile (role'e göre değişken alanlar içerir)
Auth:   Gerekli (herhangi bir rol)
Ekran:  App başlatmada, student-profile.tsx
```

### 6.3 Admin Endpoint'leri (Admin rolü gerekli)

#### `GET /api/admin/institutions`
```
Output: InstitutionWithStats[]
  → id, name, teacherLimit, studentLimit,
     usedTeacherCount, usedStudentCount, createdAt
Ekran:  admin-dashboard.tsx
```

#### `POST /api/admin/institutions`
```
Input:  { name: string, teacherLimit: number, studentLimit: number }
Output: InstitutionWithStats
Ekran:  admin-dashboard.tsx → Kurum Oluştur modal
```

#### `DELETE /api/admin/institutions/:id`
```
Output: 204 No Content
Not:    İlgili tüm kodlar ve veriler cascade değil — uygulama düzeyinde kontrol yok
Ekran:  admin-dashboard.tsx
```

#### `PATCH /api/admin/institutions/:id`
```
Input:  { teacherLimit?: number, studentLimit?: number }
Output: InstitutionWithStats
Kural:  Limit mevcut kullanımın altına düşürülemez
Ekran:  admin-dashboard.tsx → limit düzenleme
```

#### `POST /api/admin/institutions/:id/teacher-codes`
```
Output: { code: string }  — 8 karakter alfanümerik
Kural:  teacherLimit aşılıyorsa 409 Conflict
Ekran:  admin-dashboard.tsx → Kod Üret butonu
```

#### `GET /api/admin/stats`
```
Output: AdminStats
  → totalInstitutions, totalTeachers, totalStudents,
     totalClasses, totalLessonsCompleted
Ekran:  admin-dashboard.tsx üst istatistik kartları
```

### 6.4 Öğretmen Endpoint'leri (Teacher rolü gerekli)

#### `GET /api/teacher/classes`
```
Output: ClassWithStats[]
  → id, name, levelUnlocked, studentCapacity,
     smartboardCode, studentCount, completionRate
Ekran:  teacher-dashboard.tsx
```

#### `POST /api/teacher/classes`
```
Input:  { name: string, studentCount: number }
Output: ClassWithStats + studentCodes[]
Kural:  studentCount kadar student_codes önceden üretilir,
        student_limit kotasından düşülür
Ekran:  teacher-dashboard.tsx → Sınıf Oluştur
```

#### `DELETE /api/teacher/classes/:id`
```
Output: 204 No Content
Ekran:  teacher-dashboard.tsx
```

#### `POST /api/teacher/classes/:id/expand`
```
Input:  { additional: number }
Output: Güncellenmiş ClassWithStats + yeni studentCodes[]
Kural:  student_limit kotasından düşülür
Ekran:  class-card.tsx → Kapasiteyi Genişlet
```

#### `POST /api/teacher/classes/:id/unlock-next`
```
Output: { levelUnlocked: number }
Kural:  max 18'e kadar, her çağrıda +1
Ekran:  class-card.tsx → Sonraki Seviyeyi Aç
```

#### `POST /api/teacher/classes/:id/smartboard-code`
```
Output: { smartboardCode: string }  — 6 haneli sayısal
Kural:  Kod yoksa üretilir, varsa mevcut kod döner
Ekran:  class-card.tsx → Akıllı Tahta Kodu Oluştur
```

#### `GET /api/teacher/classes/:id/student-codes-progress`
```
Output: StudentCodeProgress[]
  → studentCode, studentName, completedLessons, totalLessons
Ekran:  class-card.tsx → öğrenci listesi
```

#### `GET /api/teacher/student-codes/:studentId/learning-progress`
```
Output: StudentActivityProgress[]  — ders bazında aktivite listesi
Ekran:  Öğrenci detay modal (teacher-dashboard)
```

### 6.5 Öğrenci Endpoint'leri (Student rolü gerekli)

#### `GET /api/student/lessons`
```
Output: LessonWithProgress[]
  → id, code, title, moduleNumber, moduleTitle,
     level, orderIndex, locked, completed, completedAt
Kural:  level > class.levelUnlocked ise locked=true
Ekran:  student-lessons.tsx, lesson-detail.tsx
```

#### `POST /api/student/lessons/:id/complete`
```
Output: { success: true }
Kural:  lesson_progress tablosuna upsert (composite PK ile)
Not:    Aktivite günlüğü learning-cache üzerinden buffer'lanır
Ekran:  lesson-detail.tsx → Dersi Tamamla butonu
```

#### `GET /api/student/dashboard`
```
Output: StudentDashboard
  → studentName, className, completedLessons, totalLessons,
     progressPercent, nextLesson: { id, title }
Ekran:  student-home.tsx
```

### 6.6 Smartboard Endpoint'leri (Public)

#### `GET /api/smartboard/:code`
```
Output: SmartboardClassInfo
  → className, institutionName, lessons: SmartboardLesson[]
Kural:  lessons locked değil — tüm dersler açık gösterilir
Ekran:  smartboard.tsx
```

#### `GET /api/smartboard/:code/lesson/:lessonCode`
```
Output: SmartboardLesson detayı
Ekran:  smartboard.tsx → ders detayı
```

---

## 7. İŞ AKIŞLARI

### 7.1 Admin Girişi

```
1. landing.tsx → sağ üstteki Fa Anahtarı'na (𝄢) tıkla
2. Admin modal açılır
3. Şifre girilir → POST /api/auth/admin-login
4. Başarılıysa token localStorage'a kaydedilir
5. /admin rotasına yönlendirme
6. Protected bileşeni "admin" rolünü kontrol eder
7. AdminDashboard render edilir
```

### 7.2 Kurum Oluşturma

```
1. AdminDashboard'da "Kurum Ekle" butonu
2. Modal: name, teacherLimit, studentLimit
3. POST /api/admin/institutions
4. TanStack Query cache invalidate → liste güncellenir
5. Kurum artık öğretmen kodu üretmeye hazır
```

### 7.3 Öğretmen Kodu Üretme

```
1. Kurum kartında "Kod Üret" butonu
2. POST /api/admin/institutions/:id/teacher-codes
3. 8 karakter alfanümerik kod (I, 0, O, 1 hariç) üretilir
4. teacher_codes tablosuna kaydedilir
5. Kod admin ekranında gösterilir, öğretmene iletilir
```

### 7.4 Öğretmen Girişi

```
Adım 1:
1. teacher-login.tsx → kod gir
2. POST /api/auth/check-code { code }
3. "teacher" kind döner → kurum adı gösterilir

Adım 2:
4. Ad + Soyad gir, "Beni Hatırla" toggle
5. POST /api/auth/teacher-login { code, firstName, lastName }
6. Backend: kod kullanılmamışsa yeni users kaydı oluştur, used_by_user_id set et
7. Token localStorage'a kaydedilir
8. "Beni Hatırla" açıksa guitar_teacher_saved'a JSON yaz
9. /teacher'a yönlendirme
```

### 7.5 Sınıf Oluşturma

```
1. TeacherDashboard → "Yeni Sınıf" butonu
2. Modal: sınıf adı, studentCount
3. POST /api/teacher/classes { name, studentCount }
4. Backend:
   a. studentCount kadar student_codes üret
   b. classes.student_capacity = studentCount
   c. Institution kotasından studentCount düş
5. Sınıf kartı ve öğrenci kodları gösterilir
```

### 7.6 Öğrenci Girişi

```
1. student-login.tsx → 8 haneli kod + ad gir
2. Kaydedilmiş hesap varsa "Hızlı Giriş" seçeneği
3. POST /api/auth/student-login { code, name }
4. Backend: kod kullanılmamışsa users kaydı oluştur
5. Token kaydedilir → /student'a yönlendirme
```

### 7.7 Ders Akışı

```
1. StudentHome → "Sonraki Ders" kartına tıkla
2. LessonDetail render olur
3. GET /api/student/lessons ile ders listesi
4. Ders içeriği (statik JSON/bileşen) gösterilir:
   - Fretboard (interaktif klavye)
   - ChordDiagram (animasyonlu akor şeması)
   - Metronome (ritim)
   - Video/Görsel içerik
5. "Dersi Tamamla" butonu → POST /api/student/lessons/:id/complete
6. lesson_progress tablosuna upsert
7. learning-cache aktivite log buffer'lar
8. Dashboard güncellenir
```

### 7.8 Akıllı Tahta Akışı

```
1. Öğretmen: class-card → "Akıllı Tahta Kodu Oluştur"
2. POST /api/teacher/classes/:id/smartboard-code → 6 haneli kod
3. Öğrenci giriş sayfasında "Akıllı Tahtayı Aç" bölümü
4. 6 haneli kod girilir → /smartboard/:code rotasına yönlendirme
5. GET /api/smartboard/:code — auth gerekmez
6. Tüm dersler kilitli değil, sınıfın tüm içeriği gösterilir
7. Öğretmen dersleri projeksiyon üzerinde gösterebilir
```

---

## 8. FRONTEND MİMARİSİ

### 8.1 Uygulama Başlatma Akışı

```
main.tsx
  └── App.tsx
        ├── ErrorBoundary
        └── QueryClientProvider
              └── TooltipProvider
                    └── BgMusicProvider
                          └── AppInner
                                ├── SplashScreen (splashDone=false ise)
                                │     ├── intro.mp3 autoplay
                                │     └── onComplete → setSplashDone(true) + unlock()
                                └── Router (splashDone=true ise)
                                      └── WouterRouter (base: BASE_URL)
```

**Kritik:** `<Router />` splash tamamlanmadan render edilmez. Bu sayede mobilde ana sayfa intro öncesi görünmez.

### 8.2 Routing Yapısı

| Rota | Bileşen | Koruma |
|------|---------|--------|
| `/` | Landing | Public |
| `/teacher-login` | TeacherLogin | Public |
| `/student-login` | StudentLogin | Public |
| `/admin` | AdminDashboard | `admin` rolü |
| `/teacher` | TeacherDashboard | `teacher` rolü |
| `/student` | StudentHome | `student` rolü |
| `/student/lessons` | StudentLessons | `student` rolü |
| `/student/lessons/:id` | LessonDetail | `student` rolü |
| `/student/profile` | StudentProfile | `student` rolü |
| `/smartboard/:code` | Smartboard | Public |
| `*` | NotFound | Public |

**Protected Bileşeni:** JWT token'dan rol okur. Eşleşmezse `/` veya `/student-login`'e yönlendirir. Tüm lazy yüklenen bileşenler `<Suspense fallback={<PageLoader />}>` içinde sarılıdır.

### 8.3 State Yönetimi

| Katman | Araç | Kullanım Alanı |
|--------|------|----------------|
| Server State | TanStack Query | API verileri, loading/error durumları |
| Global Client State | React Context (BgMusicContext) | Arka plan müziği |
| Local Component State | useState | Form değerleri, modal açık/kapalı |
| Persistent State | localStorage | JWT token, "beni hatırla" verileri |

TanStack Query konfigürasyonu:
- `staleTime`: 2 dakika
- `gcTime`: 5 dakika
- `retry`: 1
- `refetchOnWindowFocus`: false

### 8.4 Form Yönetimi

React Hook Form + Zod resolver kullanılır:
```
useForm({ resolver: zodResolver(schema) })
  → FormField → FormControl → Input
  → onSubmit → API mutation
```

### 8.5 Performans Optimizasyonları

- **Lazy loading:** Landing dışında tüm sayfalar `React.lazy()` ile yüklenir
- **Code splitting:** Vite route bazında otomatik chunk üretir
- **Asset aliasing:** `@assets` → `../../attached_assets` (Vite config)
- **useLiteMode:** Mobil cihazlarda animasyonlar ve MusicBg sayısı azaltılır

### 8.6 Ses Yönetimi (BgMusicProvider)

iOS/Android autoplay kısıtlamaları için özel çözüm:
- Splash'ta `intro.mp3` autoplay denenir; bloklanırsa 5 saniyelik fallback timer devreye girer
- `bg-music.mp3` splash tamamlandıktan sonra başlar
- iOS'ta ilk kullanıcı etkileşiminde (document touchstart/click) bg-music başlatılır (first-interaction fallback)
- `unlock()` zaten unlock edilmiş element için direkt `play()` çağırır

---

## 9. BACKEND MİMARİSİ

### 9.1 Express Uygulama Yapısı

```
app.ts
  ├── cors middleware          — izin verilen origin'ler
  ├── express.json()           — body parser
  ├── cookie-parser            — cookie okuma
  ├── pino-http logger         — tüm request/response loglanır
  └── Routes
        ├── /api/healthz       → routes/health.ts
        ├── /api/auth          → routes/auth.ts
        ├── /api/admin         → routes/admin.ts (+ requireAuth path prefix)
        ├── /api/teacher       → routes/teacher.ts (+ requireAuth path prefix)
        ├── /api/student       → routes/student.ts (+ requireAuth path prefix)
        └── /api/smartboard    → routes/smartboard.ts (public)
```

### 9.2 Route Handler Yapısı

Route'larda ayrı controller katmanı yoktur. İş mantığı doğrudan handler içinde yazılır:
```
router.post("/classes", requireAuth(["teacher"]), async (req, res) => {
  const { name, studentCount } = validated_body;
  // Drizzle ORM sorgusu direkt burada
  const result = await db.insert(classes)...
  res.json(result);
});
```

### 9.3 Caching Katmanları

**TTLCache** (`src/lib/cache.ts`):
- In-memory Map tabanlı basit cache
- `get(key)`, `set(key, value, ttl_ms)`, `delete(key)` API
- Teacher dashboard sorguları 2 dakika cache'lenir
- Uygulama restart'ta kaybolur

**LearningCache** (`src/lib/learning-cache.ts`):
- Öğrenci aktivite kayıtlarını buffer'lar
- Önce anlık DB yazımı dener; başarısızsa 120 saniye sonra retry
- `student_learning_requests` tablosuna upsert yapar
- Veri kaybı riski: restart durumunda buffer içeriği kaybolabilir

### 9.4 Kod Üretimi

```typescript
generateInviteCode(): string
  // Karışıklık yaratacak karakterler hariç (I, 0, O, 1)
  // 8 karakter alfanümerik — öğretmen kodları için

generateStudentCode(): string
  // 8 haneli sayısal string (padStart ile) — öğrenci kodları için

generateSmartboardCode(): string
  // 6 haneli sayısal string — akıllı tahta için
```

### 9.5 Production Build

`build.mjs` (esbuild tabanlı):
- Giriş: `src/index.ts`
- Çıkış: `dist/index.mjs` (ESM bundle)
- `esbuild-plugin-pino` ile pino transport'ları doğru paketlenir
- Native modüller external olarak işaretlenir

---

## 10. GÜVENLİK ANALİZİ

### 10.1 Authentication

✅ JWT HS256 — endüstri standardı  
✅ 1 saatlik token ömrü — makul  
✅ `requireAuth` middleware merkezi  
⚠️ Token localStorage'da — XSS saldırısında çalınabilir (httpOnly cookie tercih edilirdi)  
⚠️ Token revoke mekanizması yok — logout sonrası token 1 saat geçerli kalır  
⚠️ Refresh token yok — 1 saat sonra tekrar login gerekir  

### 10.2 Authorization

✅ Rol bazlı erişim kontrolü (RBAC) — her endpoint kontrol eder  
✅ Path-prefix middleware kuralı dokümante edilmiş  
⚠️ Öğretmen yalnızca kendi sınıflarına erişebilmeli — route handler'larda teacher_id vs. req.auth.userId cross-check yapılmalı (kod incelemesi gerekir)  
⚠️ Foreign key constraint yoktur — uygulama düzeyinde veri tutarlılığı sağlanmalı  

### 10.3 Şifreleme

✅ JWT payload şifrelenmez ama imzalanır  
⚠️ Admin şifresi düz metin karşılaştırma (ADMIN_PASSWORD env var). bcrypt kullanılsaydı daha güvenli olurdu.  
✅ SESSION_SECRET environment variable — kaynak kodda değil  

### 10.4 SQL Injection

✅ Drizzle ORM parametrize sorgular kullanır — direct SQL injection riski düşük  
✅ Zod şema validasyonu ile input temizlenir  

### 10.5 CORS

⚠️ CORS konfigürasyonu incelenmeli — production'da izin verilen origin'ler kısıtlı olmalı  

### 10.6 Rate Limiting

❌ Rate limiting mevcut değil — brute force, özellikle invite code deneme saldırısına açık  
❌ Admin login endpoint'inde sınırsız deneme yapılabilir  

### 10.7 XSS

⚠️ React default olarak JSX interpolation'da escape yapar — büyük risk yok  
⚠️ Token localStorage'da — XSS ile çalınabilir; httpOnly cookie daha güvenli  
✅ Lucide/Shadcn bileşenleri güvenilir kaynaklardan  

### 10.8 CSRF

⚠️ Cookie tabanlı auth olmadığından (localStorage JWT) CSRF riski düşük  
⚠️ SameSite cookie yok — cookie-parser kullanılıyor ama token cookie'de değil  

### 10.9 Veri Erişim Güvenliği

⚠️ Veritabanında foreign key constraint yok — uygulama hataları veri tutarsızlığına yol açabilir  
⚠️ `student_learning_requests` tablosunda `flushed_at NULL` kayıtları için temizlik mekanizması belirsiz  

---

## 11. PERFORMANS

### 11.1 Cache Yapısı

```
Frontend:  TanStack Query (2dk stale, 5dk gc) — ağ isteği azaltır
Backend:   TTLCache (2dk) — teacher dashboard sorguları
DB:        lesson_progress composite PK — upsert hızlıdır
DB:        student_learning_requests — 7 index ile hızlı sorgu
```

### 11.2 Frontend Performans

- Lazy loading ile initial bundle küçük tutulur
- `useLiteMode` hook'u ile mobilde animasyon sayısı azaltılır (MusicBg count: 6 vs 18)
- Framer Motion animasyonlar GPU-accelerated (transform/opacity)
- Web Audio API noter için tarayıcı native API (harici kütüphane yok)

### 11.3 Backend Performans

- pino: JSON structured logging, son derece düşük overhead
- TTLCache: in-memory, sıfır gecikme — DB sorgusu önlenir
- LearningCache: write buffer — DB'ye toplu yazım amacıyla tasarlanmış
- Drizzle ORM: thin abstraction, ham SQL'e yakın performans

### 11.4 Potansiyel Darboğazlar

⚠️ LearningCache restart'ta kaybolur — yeniden başlatmada aktivite verisi kaybı  
⚠️ TTLCache tek instance — yatay scaling'de her sunucu ayrı cache tutar  
⚠️ `usedStudentCount = SUM(student_capacity)` hesaplaması — büyük kurumda yavaşlayabilir  
⚠️ `/admin/stats` sorgusu birden fazla tabloya COUNT yapar — index olmadan yavaşlar  
⚠️ Gerçek zamanlı güncelleme yok — öğretmen dashboard'u manuel refresh gerektirir  

### 11.5 Büyük Yük Davranışı

İn-memory cache tek sunucuya bağlıdır. Birden fazla sunucu instance'ı çalışırsa:
- Her instance ayrı TTLCache tutar → tutarsız cache
- LearningCache buffer'ı paylaşılmaz → veri çakışması riski

Redis tabanlı dağıtık cache gerektirir.

---

## 12. KOD KALİTESİ

### 12.1 Güçlü Yönler

- **Contract-First API:** OpenAPI → Orval codegen. Frontend ve backend aynı tip tanımlarını kullanır. Type mismatch imkânsız.
- **Strict TypeScript:** `tsconfig.base.json`'da `strict: true` — tüm paketlerde geçerli
- **pnpm catalog:** Versiyonlar tek noktada yönetilir — bağımlılık çakışması önlenir
- **Composite build:** `lib/*` paketleri `tsc --build` ile incremental derlenir — tekrar derleme hızlı
- **Shadcn UI + Radix:** Accessibility standartlarına uygun bileşenler
- **useLiteMode:** Mobil cihaz deneyimi özel olarak optimize edilmiş
- **Zod validasyonu:** Hem frontend form doğrulama hem backend input doğrulama

### 12.2 Zayıf Yönler

- **Repository katmanı yok:** DB sorguları route handler içinde — test edilebilirlik düşük
- **Foreign key constraint eksik:** DB şemasında referans bütünlüğü uygulama sorumluluğunda
- **Rate limiting yok:** Auth endpoint'leri brute force'a açık
- **Token revoke yok:** Logout sonrası token geçerliliği devam eder
- **LearningCache güvenilirliği:** Memory buffer + restart riski
- **Admin şifresi hash değil:** Düz metin karşılaştırma

### 12.3 Teknik Borçlar

- `student_learning_requests` tablosunun `flushed_at` kolonunun anlamı ve temizlik stratejisi belirsiz
- `users.role` text kolonu olarak tanımlanmış — veritabanı enum tipine geçiş önerilir
- Smartboard lesson detail endpoint'i OpenAPI spec'de mevcut ama test kapsamı belirsiz
- Mock sandbox artık üretim koduna dahil değil fakat workspace'de bırakılmış

---

## 13. LOG VE HATA YÖNETİMİ

### 13.1 Logging

```
pino + pino-http:
  - Her HTTP isteği/cevabı otomatik loglanır
  - Hassas header'lar (Authorization) redacted
  - Structured JSON — prod'da makine okunabilir
  - Geliştirmede pino-pretty ile insan okunabilir renk çıktısı
  - req.log handler'larda kullanılabilir
  - Non-request kod için singleton logger
```

**Kural:** Server kodunda `console.log` kullanılmaz — her zaman `req.log` veya `logger` kullanılır.

### 13.2 Hata Yakalama

- **Frontend:** `ErrorBoundary` bileşeni React render hatalarını yakalar
- **API Hataları:** TanStack Query `onError` callback'leri ile yakalanır, `toast.error()` ile gösterilir
- **Backend:** Express async handler'larda try/catch (Express 5'te `async` otomatik error propagation)
- **Ses Hataları:** Audio `play()` Promise catch ile sessizce geçilir — kullanıcıya hata gösterilmez

### 13.3 Kullanıcıya Gösterilen Hatalar

Sonner `toast` bileşeni ile:
- Giriş hataları: "Giriş başarısız. Kodunu veya adını kontrol et."
- API hataları: İnsan okunabilir Türkçe mesajlar
- Form validasyon: Zod mesajları inline gösterilir (FormMessage bileşeni)

---

## 14. ORTAM YAPILANDIRMASI

### 14.1 Environment Değişkenleri

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `DATABASE_URL` | ✅ | PostgreSQL bağlantı URL (Replit managed) |
| `SESSION_SECRET` | ✅ | JWT imzalama secret |
| `ADMIN_PASSWORD` | ✅ | Admin giriş şifresi |
| `PORT` | ✅ | Her artifact için dinamik atanır (Replit) |
| `BASE_PATH` | ✅ | Proxy routing için base path |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | Opsiyonel | Manuel GitHub push için |

### 14.2 Development vs. Production

| Özellik | Development | Production |
|---------|-------------|------------|
| Build | Vite HMR | `vite build` → statik dosyalar |
| Backend | `tsx watch` / ts-node | esbuild bundle → `node dist/index.mjs` |
| Logging | pino-pretty (renkli) | JSON (makine okunabilir) |
| DB | Aynı Replit PostgreSQL | Aynı DB (ayrı production DB önerilir) |
| Error Detail | Stack trace | Minimal kullanıcı mesajı |

### 14.3 Build Süreci

**Frontend:**
```bash
pnpm --filter @workspace/guitar-app run build
# Vite → dist/public/ (statik HTML/JS/CSS)
```

**Backend:**
```bash
pnpm --filter @workspace/api-server run build
# esbuild → dist/index.mjs (ESM bundle)
```

**DB Schema:**
```bash
pnpm --filter @workspace/db run push
# Drizzle Kit → mevcut DB'ye schema uygula
```

**Seed:**
```bash
pnpm --filter @workspace/scripts run seed
# Ders verileri + demo kurum oluştur
```

**API Codegen:**
```bash
pnpm --filter @workspace/api-spec run codegen
# Orval → lib/api-client-react + lib/api-zod güncelle
```

---

## 15. BAĞIMLILIK HARİTASI

```
artifacts/guitar-app
  ├── @workspace/api-client-react
  │     └── (generated from @workspace/api-spec)
  ├── @workspace/api-zod
  │     └── (generated from @workspace/api-spec)
  └── [React, Tailwind, Framer Motion, Wouter, ...]

artifacts/api-server
  ├── @workspace/db
  │     └── PostgreSQL (DATABASE_URL)
  ├── @workspace/api-zod
  └── [Express, pino, jsonwebtoken, ...]

scripts/seed.ts
  └── @workspace/db

lib/api-spec
  └── (Orval codegen → api-client-react + api-zod)

lib/db
  └── PostgreSQL (runtime bağlantı)
```

**Veri Akışı Sırası:**
```
1. lib/api-spec/openapi.yaml  (API contract tanımı)
2. Orval codegen              (lib/api-client-react + lib/api-zod üretimi)
3. lib/db/schema/*            (DB şema tanımı)
4. drizzle push               (DB'ye şema uygulanır)
5. scripts/seed               (başlangıç verileri)
6. api-server (runtime)       (DB + api-zod kullanır)
7. guitar-app (runtime)       (api-client-react kullanır)
```

---

## 16. GELİŞTİRME REHBERİ

### 16.1 Yeni API Endpoint Ekleme

```
1. lib/api-spec/openapi.yaml — endpoint tanımını ekle
2. pnpm --filter @workspace/api-spec run codegen — hooks ve şemalar üretilir
3. artifacts/api-server/src/routes/[ilgili].ts — handler yaz
   - requireAuth path prefix kuralına uy
   - Zod şema ile input doğrula
   - req.log ile log yaz, console.log kullanma
4. Frontend'de üretilen hook'u kullan (useXxx)
```

### 16.2 Yeni DB Tablosu Ekleme

```
1. lib/db/src/schema/yeniTablo.ts — Drizzle tablo tanımı
2. lib/db/src/index.ts — export'a ekle
3. pnpm run typecheck:libs — lib'leri derle
4. pnpm --filter @workspace/db run push — DB'ye uygula
5. scripts/seed.ts — gerekirse seed verisi ekle
```

### 16.3 Yeni Frontend Sayfası Ekleme

```
1. artifacts/guitar-app/src/pages/yeniSayfa.tsx — bileşeni yaz
2. App.tsx — lazy import ekle
3. App.tsx → Router içindeki Switch'e rota ekle
4. Korumalıysa Protected bileşeni ile sar
```

### 16.4 Kod Standartları

- **TypeScript:** `strict: true` — tip hataları kabul edilmez
- **Server loglama:** `req.log.info/warn/error` — asla `console.log`
- **API iletişimi:** Orval üretimi hook'lar — doğrudan fetch yazma
- **Form yönetimi:** React Hook Form + Zod resolver
- **Bileşen ismi:** PascalCase (`StudentLogin`, `ClassCard`)
- **Hook ismi:** camelCase, `use` prefix (`useBgMusic`, `useLiteMode`)
- **Dosya ismi:** kebab-case (`student-login.tsx`, `class-card.tsx`)
- **Enum değerleri:** string literal (`"admin"`, `"teacher"`, `"student"`)
- **ID üretimi:** `createId()` (cuid2) — UUID değil

### 16.5 Naming Standartları

| Tür | Kural | Örnek |
|-----|-------|-------|
| React Component | PascalCase | `TeacherDashboard` |
| Hook | camelCase, use prefix | `useBgMusic` |
| API Hook | useVerb+Noun (Orval) | `useListMyClasses` |
| Dosya | kebab-case | `teacher-login.tsx` |
| DB Tablo | snake_case | `student_codes` |
| DB Kolon | snake_case | `teacher_id` |
| TypeScript Type | PascalCase | `ClassWithStats` |
| Env Değişkeni | SCREAMING_SNAKE | `SESSION_SECRET` |

### 16.6 Test Akışı (Manuel)

```
1. pnpm run typecheck — tüm workspace'de tip kontrolü
2. pnpm --filter @workspace/guitar-app run dev — frontend
3. pnpm --filter @workspace/api-server run dev — backend
4. curl localhost:80/api/healthz — API sağlık kontrolü
5. Tarayıcı preview — UI akış testi
```

---

## 17. RİSK ANALİZİ

### 17.1 Veri Kaybı Riskleri

| Risk | Seviye | Açıklama |
|------|--------|----------|
| LearningCache restart kaybı | YÜKSEK | Memory buffer'daki flush edilmemiş aktiviteler kaybolur |
| FK constraint eksikliği | ORTA | Orphan kayıtlar oluşabilir (silinmiş sınıfın kodları geçerli kalır) |
| Admin DELETE cascade yok | ORTA | Kurum silinirse bağlı kodlar geçersiz ama silinmez |

### 17.2 Güvenlik Riskleri

| Risk | Seviye | Açıklama |
|------|--------|----------|
| Rate limiting yok | YÜKSEK | 8 haneli kod brute-force (10^8 kombinasyon, yavaş ama mümkün) |
| localStorage JWT | ORTA | XSS ile token çalınabilir |
| Token revoke yok | ORTA | Logout sonrası 1 saat geçerli kalır |
| Admin şifresi hash değil | ORTA | Timing attack potansiyeli |
| Teacher ownership kontrolü | ORTA | Bir öğretmen başka öğretmenin sınıfına erişebilir mi? Kontrol edilmeli |

### 17.3 Performans Riskleri

| Risk | Seviye | Açıklama |
|------|--------|----------|
| Yatay scaling cache tutarsızlığı | YÜKSEK | TTLCache in-memory, dağıtık değil |
| SUM sorgusu büyük kurumlarda | ORTA | usedStudentCount hesabı index gerektirmez |

---

## 18. TEKNİK BORÇ ANALİZİ

| Borç | Etki | Önerilen Çözüm |
|------|------|----------------|
| Repository katmanı yok | Test edilebilirlik düşük | Service/Repository katmanı ayır |
| FK constraint yok | Veri tutarsızlığı | `references()` + `onDelete` ekle |
| Rate limiting yok | Güvenlik açığı | express-rate-limit entegre et |
| Token revoke mekanizması yok | Güvenlik | Redis blacklist veya short-lived refresh token |
| Admin şifresi düz metin | Güvenlik | bcrypt hash + timing-safe compare |
| LearningCache persistence | Veri kaybı riski | Redis veya DB-backed queue (BullMQ) |
| `users.role` text | Tip güvenliği | PostgreSQL enum veya DB check constraint |
| Test yokluğu | Regresyon riski | Vitest unit tests + Playwright e2e |
| Tek üretim DB | İzolasyon yok | Dev/staging/prod ayrı DB ortamları |

---

## 19. ÖLÇEKLENEBİLİRLİK

### 19.1 Mevcut Durum

Tek sunucu, tek DB mimarisi. Küçük/orta ölçek (100-1000 öğrenci) için yeterli.

### 19.2 Büyüme Senaryoları

**1000-10.000 Öğrenci:**
- TTLCache → Redis (paylaşımlı cache)
- LearningCache → BullMQ veya Redis Streams
- PostgreSQL bağlantı havuzu (PgBouncer)
- CDN için statik asset'ler

**10.000+ Öğrenci:**
- API sunucu yatay scaling (Kubernetes)
- Read replica DB
- lesson_progress tablosunda partition (zaman bazlı)
- WebSocket ile gerçek zamanlı öğretmen dashboard

**Modül/Ders Büyümesi:**
- Ders içerikleri şu an statik bileşenler — CMS entegrasyonu gerekebilir
- `lessons.level` skalası (1-18 hardcoded) — dinamik yapıya geçiş

**Çoklu Kurum Büyümesi:**
- Multi-tenancy izolasyonu güçlendirilmeli (Row Level Security)
- Institution-bazlı DB partition düşünülebilir

---

## 20. SONUÇ

### 20.1 Genel Teknik Değerlendirme

**Gitar Öğreniyorum,** eğitim odaklı, küçük-orta ölçekli B2B kurumlar için tasarlanmış, iyi yapılandırılmış bir fullstack uygulamadır.

**Öne Çıkan Güçlü Yönler:**

1. **Contract-First API Mimarisi** en büyük teknik artıdır. OpenAPI spec tek kaynak, Orval codegen ile hem frontend hem backend tip güvenliğini garanti altına alır. Bu yaklaşım büyük ölçekli ekiplerde bile çalışır.

2. **pnpm Monorepo** lib paylaşımını sağlıklı yönetir. `lib/db`, `lib/api-spec`, `lib/api-client-react` ve `lib/api-zod` arasındaki bağımlılık zinciri net ve sürdürülebilir.

3. **iOS/Android Ses Yönetimi** oldukça özenli ele alınmıştır. Autoplay politikaları, pre-unlock mekanizması, fallback timer'lar — mobil tarayıcı kısıtlamaları bilinçli şekilde çözülmüştür.

4. **Öğrenci Deneyimi** pedagojik açıdan düşünülmüş: kilitli seviyeler, sınıf bazlı ilerleme, akıllı tahta modu, interaktif fretboard ve akor animasyonları öğrenmeyi destekler.

**İyileştirilmesi Gereken Kritik Alanlar:**

1. **Rate limiting** — en öncelikli güvenlik açığı
2. **FK constraint** — veri bütünlüğü garanti altına alınmalı
3. **LearningCache persistence** — aktivite verisi kaybolmamalı
4. **Admin şifresi hashing** — bcrypt ile güçlendirilmeli
5. **Öğretmen ownership kontrolü** — cross-teacher veri erişimi doğrulanmalı

Proje, bir startup ya da eğitim kurumu için production-ready MVP seviyesindedir. Yukarıdaki güvenlik ve güvenilirlik iyileştirmeleriyle kurumsal kullanıma hazır hâle getirilebilir.

---

*Bu doküman, projenin Temmuz 2026 itibarıyla mevcut durumunu yansıtmaktadır. Kod değişikliklerinde güncellenmesi önerilir.*
