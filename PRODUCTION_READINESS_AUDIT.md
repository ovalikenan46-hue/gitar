# Gitar Öğreniyorum — Production Readiness Audit

**Tarih:** Temmuz 2026  
**Hedef Kapasite:** 10.000 Kayıtlı Öğrenci  
**Altyapı:** Render Standard + Neon PostgreSQL  
**Yöntem:** Yalnızca analiz — hiçbir kod veya veritabanı değişikliği yapılmamıştır.

---

## 1. VERİ GÜVENLİĞİ

### 1.1 Bellekte Tutulan Kritik Veriler

**`LearningCache` — `pendingLearningRequests` Map**

| Özellik | Durum |
|---------|-------|
| Yapı | In-memory `Map<string, LearningCacheEntry>` |
| Amaç | `student_learning_requests` tablosuna yazma buffer'ı |
| Retry | Her 120 saniyede bir `setInterval` |
| SIGTERM | Graceful shutdown: çıkmadan önce flush dener |
| SIGKILL / Crash | **Veri kaybı.** Flush yapılmaz, map boşalır. |
| Normal İşleyiş | Anlık DB yazma dener; başarısızsa map'e alır |

**Risk Seviyesi:** ORTA  
**Sebep:** Normal işleyişte anlık yazma başarılı olur ve risk düşüktür. Ancak DB geçici olarak ulaşılamaz durumdayken sunucu crash yaşarsa, o penceredeki tüm "Bu konuyu öğrendim" kayıtları kalıcı olarak kaybolur.  
**Çözüm:** Flush edilmemiş kayıtlar için Redis tabanlı kalıcı kuyruk (BullMQ) veya en azından DB'nin tekrar ayağa kalkmasını bekleyen exponential backoff retry mekanizması.

---

### 1.2 Transaction Eksik İşlemler

#### Kurum Silme — `DELETE /api/admin/institutions/:id`

**Risk Seviyesi: KRİTİK**

Silme sırası (transaction olmadan):
```
1. student_codes sil
2. classes sil
3. student users sil
4. teacher users sil
5. teacher_codes sil
6. institution sil
```

Adım 3'te bir hata oluşursa: student_codes ve classes silinmiş, kullanıcılar ve teacher_codes hâlâ veritabanında. **Yarım silinmiş, tutarsız veri.**

**Ayrıca eksik silinen tablolar:**
- `lesson_progress` → silinen kullanıcılara ait kayıtlar veritabanında kalır (yetim kayıt)
- `student_learning_requests` → class silmede temizleniyor, ama institution silmede doğrudan temizlenmiyor; yalnızca class silme sırasında dolaylı olarak temizlendiği varsayılıyor

---

#### Ders Tamamlama — `POST /api/student/lessons/:id/complete`

**Risk Seviyesi:** DÜŞÜK (hafifletilmiş)

İki ayrı kayıt yapılır:
1. `lessonProgressTable` → `onConflictDoNothing` ile upsert
2. `addLearningRequest` → `learning-cache` üzerinden async yazma

İkisi aynı transaction içinde değil. 1. başarılı, 2. başarısız olursa öğrenci UI'ında dersi tamamlamış görünür ama öğretmen takip panelinde kayıt görünmez.  
**Çözüm:** Composite PK ve `onConflictDoNothing` sayesinde duplicate riski minimize edilmiş. Öğretmen takibindeki gecikme tolere edilebilir seviyede.

---

### 1.3 Race Condition Analizi

#### Kota Aşımı — Teacher Code Üretimi

**Risk Seviyesi:** ORTA

```
Thread A: getStats() → 1 slot kaldı → OK
Thread B: getStats() → 1 slot kaldı → OK
Thread A: INSERT teacher_code → commit
Thread B: INSERT teacher_code → commit  ← teacherLimit aşıldı!
```

Quota kontrolü ve INSERT aynı transaction/lock içinde değil. Aynı anda iki admin aynı kuruma kod üretmeye çalışırsa limit aşılabilir.

#### Kota Aşımı — Sınıf Oluşturma

**Risk Seviyesi:** ORTA

```
Öğretmen A: getInstitutionRemaining() → 20 slot kaldı → OK
Öğretmen B: getInstitutionRemaining() → 20 slot kaldı → OK
Öğretmen A: db.transaction → 15 öğrenci kodu ekle → commit
Öğretmen B: db.transaction → 15 öğrenci kodu ekle → commit  ← 10 kota fazla kullanıldı!
```

Quota kontrolü transaction DIŞINDA yapılıyor. Transaction içinde institution kaydı `SELECT FOR UPDATE` ile kilitlenmiyor.

#### Duplicate Öğrenci Kodu

**Risk Seviyesi:** DÜŞÜK

`generateUniqueStudentCode` fonksiyonu, kodu üretmeden önce DB'de kontrol yapar. Ancak kontrol `db` (transaction dışı) ile yapılıyor, `tx` (transaction içi) ile değil. Eş zamanlı iki sınıf oluşturma işleminde aynı kodu üretme ihtimali teorik olarak var. **DB UNIQUE constraint** bu durumda transaction'ı rollback ettirir; yani gerçekte duplicate kayıt oluşmaz ama sınıf oluşturma başarısız olabilir.

---

## 2. VERİTABANI ANALİZİ

### 2.1 İndeks Yeterliliği

| Tablo | Mevcut İndeks | Eksik İndeks | Durum |
|-------|--------------|--------------|-------|
| `lesson_progress` | Composite PK (user_id, lesson_id) | `user_id` single index, `lesson_id` single | ⚠️ Öğrenci başına sorgularda PK yeterli |
| `student_learning_requests` | 7 ayrı index | — | ✅ İyi kapsanmış |
| `classes` | PK | `teacher_id`, `institution_id` | ⚠️ Öğretmen dashboard sorguları yavaşlayabilir |
| `users` | PK | `institution_id`, `class_id`, `role` | ⚠️ Büyük veri setinde kritik |
| `student_codes` | PK, UNIQUE(code) | `class_id`, `institution_id` | ⚠️ Sınıf kodları listelemede tam tablo taraması |
| `teacher_codes` | PK, UNIQUE(code) | `institution_id` | ⚠️ Kurum bazlı sorgu yavaşlar |
| `institutions` | PK | — | ✅ Küçük tablo, sorun yok |
| `lessons` | PK, UNIQUE(code) | — | ✅ Statik veri, sorun yok |

**Kritik Eksik İndeksler:**
- `users(institution_id)` — Kurum silmede kullanıcı sorgusunda tüm tabloyu tarar
- `users(class_id)` — Öğrenci sorgularında yavaşlar
- `classes(teacher_id)` — `listMyClasses` sorgusu öğretmen başına tüm tablo tarar
- `student_codes(class_id)` — Sınıf öğrenci kodları sorgusunda yavaş

### 2.2 Foreign Key Eksikliği

Hiçbir tabloda `references()` veya `onDelete` tanımlanmamış. Tüm referans bütünlüğü uygulama katmanında sağlanıyor.

**Sonuç:**
- Silinmiş bir kullanıcıya ait `lesson_progress` kaydı veritabanında kalır
- Silinmiş bir sınıfa ait `student_codes` referansı uygulama hatası durumunda orphan kalabilir
- DB düzeyinde cascade silme yok — tüm silme sırası manuel ve transaction'sız

### 2.3 Kurum Silme Sonrası Veri Durumu

```
Silinir:
  ✅ student_codes (sınıf ID'si üzerinden)
  ✅ classes
  ✅ users (student + teacher)
  ✅ teacher_codes

Silinmez (Orphan Kalır):
  ❌ lesson_progress (user_id'ye göre silinmiyor)
  ❌ student_learning_requests (institution silmede temizlenmiyor; class silmede temizleniyor ama ayrı endpoint)
```

---

## 3. AUTHENTICATION ANALİZİ

### 3.1 Admin Girişi

| Kontrol | Durum |
|---------|-------|
| Şifre karşılaştırma | Düz metin `===` karşılaştırma |
| Hashing | ❌ bcrypt yok |
| Timing attack koruması | ❌ `crypto.timingSafeEqual` yok |
| Rate limiting | ❌ Sınırsız deneme |
| Brute-force koruma | ❌ Yok |

Admin şifresi tek nokta başarısızlığı. Birisi şifreyi deneme yanılma ile bulabilir; hiçbir engel yok.

### 3.2 Öğretmen Girişi

| Kontrol | Durum |
|---------|-------|
| Kod sorgulama | Public endpoint — herkese açık |
| Kod formatı | 8 karakter (I,0,O,1 hariç) — yaklaşık 25^8 = ~1.5 milyar kombinasyon |
| Rate limiting | ❌ Yok |
| Ownership sonrası | ✅ JWT ile kuruma bağlı |
| Başka öğretmen verisi | ✅ teacherId kontrol ediliyor |

### 3.3 Öğrenci Girişi

| Kontrol | Durum |
|---------|-------|
| Kod formatı | 8 haneli sayısal — 10^8 = 100 milyon kombinasyon |
| Rate limiting | ❌ Yok |
| Kod tahmin saldırısı | Teorik olarak mümkün; pratikte yavaş ama engellenmiyor |
| Başka sınıf verisi | ✅ class_id JWT'ye yazılıyor |

### 3.4 Yanlış Kullanıcının Başka Kuruma Erişimi

| Senaryo | Durum |
|---------|-------|
| Öğretmen → Başka öğretmenin sınıfı | ✅ `eq(classesTable.teacherId, auth.userId)` kontrolü var |
| Öğretmen → Başka kurumun verisi | ✅ `teacher.institutionId` JWT'den geliyor |
| Öğrenci → Başka sınıfın dersleri | ✅ `class.levelUnlocked` sınıfa özgü |
| Admin → Tüm kurumlar | ✅ Admin rolü tüm erişime sahip (by design) |
| Öğrenci → Başka öğrencinin ilerlemesi | ✅ `user_id = req.auth.userId` ile filtreleniyor |

**Authorization genel olarak doğru uygulanmış.** Cross-tenant erişim riski düşük.

---

## 4. PERFORMANS ANALİZİ

### 4.1 Bağlantı Havuzu

```typescript
const { Pool } = pg;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

`pg.Pool` varsayılan ayarları:
- `max`: 10 eş zamanlı bağlantı
- `idleTimeoutMillis`: 10.000ms
- `connectionTimeoutMillis`: 0 (sonsuz bekleme)

Neon PostgreSQL ücretli planda bağlantı limitleri plana göre değişir. 10 bağlantı küçük-orta yük için yeterli.

### 4.2 Senaryo Bazlı Değerlendirme

#### 200 Aktif Kullanıcı

| Bileşen | Durum |
|---------|-------|
| CPU | Normal — Express async handler, düşük CPU kullanımı |
| RAM | Normal — TTLCache + LearningCache Map küçük |
| DB Bağlantısı | 10 pool yeterli — 200 kullanıcı aynı anda istek atmaz |
| API | Tüm endpoint'ler hızlı çalışır |
| **Sonuç** | ✅ Sorunsuz |

#### 500 Aktif Kullanıcı

| Bileşen | Durum |
|---------|-------|
| CPU | Orta yük — render sunucuya göre değişir |
| RAM | Orta — LearningCache Map büyümeye başlar |
| DB | `users(institution_id)` eksik index sorgularında yavaşlama başlar |
| API | `/teacher/classes/:id/student-codes-progress` N+1 riski taşıyor |
| **Sonuç** | ⚠️ Dikkat gerektirir, index eklenmeli |

#### 1000 Aktif Kullanıcı

| Bileşen | Durum |
|---------|-------|
| CPU | Yüksek yük — Render Standard tek core |
| RAM | TTLCache + LearningCache belirgin büyüme |
| DB Pool | 10 bağlantı sıkışma noktası olabilir |
| DB Sorgu | İndekssiz sorgular tam tablo taraması (users: 10.000+ satır) |
| API | `/admin/stats` — çoklu COUNT sorgusu yavaşlar |
| **Sonuç** | ❌ Performans düşer; index ve pool artışı şart |

### 4.3 N+1 Sorgu Analizi

#### `/teacher/classes/:id/student-codes-progress`

```
SELECT student_codes WHERE class_id = X
  → Her kod için: SELECT learning_progress WHERE student_id = ?   ← N+1!
```

**Risk:** 30 öğrencili sınırda 31 sorgu. 100 öğrencili sınırda 101 sorgu.

#### `/student/lessons` — `getLessonsForStudent`

5 ayrı sorgu zinciri:
```
SELECT users WHERE id = ?
SELECT classes WHERE id = ?
SELECT lessons ORDER BY orderIndex
SELECT lesson_progress WHERE userId = ?
SELECT student_codes WHERE usedByUserId = ?
```

Her ders listeleme sayfası açıldığında 5 sorgu. Optimize edilebilir (JOIN ile 1-2 sorguya indirgenebilir) ama tolere edilebilir seviye.

### 4.4 Ağır Endpoint'ler

| Endpoint | Sorun | Risk |
|----------|-------|------|
| `GET /admin/stats` | Çoklu COUNT sorgusu, indekssiz | ORTA |
| `GET /teacher/classes/:id/student-codes-progress` | N+1 pattern | YÜKSEK (büyük sınıflarda) |
| `DELETE /admin/institutions/:id` | Ardışık 6 DELETE, transaction yok | YÜKSEK (tutarsızlık) |

---

## 5. CACHE ANALİZİ

### 5.1 TTLCache (Teacher Dashboard)

```
Kullanım: Teacher sınıf listesi cache (2 dakika TTL)
Sorun: In-memory — restart'ta temizlenir
Invalidation: Sınıf oluşturma/silme'de manuel invalidate mi ediliyor? Belirsiz
Restart sonrası: Cache boşalır, ilk istekte DB sorgusu yapılır — sorun yok
Yatay scaling: Her instance ayrı cache → tutarsız görüntü
```

**Risk Seviyesi:** DÜŞÜK (2 dakika stale data tolere edilebilir)

### 5.2 LearningCache (Student Activity Buffer)

```
Kullanım: student_learning_requests tablosuna yazma queue
Normal: Anlık DB yazma dener → başarısızsa Map'e alır
120s retry: Her 120 saniyede flush
SIGTERM: Flush dener
SIGKILL/Crash: Map içeriği KAYBOLUR
```

**Risk Seviyesi:** ORTA  
**10.000 öğrenci senaryosu:** Eğer DB kısa süreli ulaşılamaz olursa yüzlerce "Bu konuyu öğrendim" kaydı Map'te bekler. Sunucu crash yaşarsa hepsi kaybolur.

### 5.3 Cache Invalidation

`TTLCache` için cache invalidation kontrolü yapılmamıştır. Sınıf silindiğinde veya genişletildiğinde cache manuel olarak silinmiyorsa, öğretmen 2 dakika eski veriyi görür. Bu kabul edilebilir bir trade-off ancak dokümante edilmeli.

---

## 6. API ANALİZİ

### 6.1 Transaction Gerektiren Ama Transaction İçermeyenler

| İşlem | Transaction | Risk |
|-------|-------------|------|
| Kurum silme | ❌ | KRİTİK — yarım silme |
| Ders tamamlama (2 kayıt) | ❌ | DÜŞÜK (onConflict ile hafifletilmiş) |
| Öğretmen kodu üretme | ❌ | ORTA (quota race) |
| Sınıf oluşturma | ✅ | İyi |
| Sınıf genişletme | ✅ | İyi |

### 6.2 CORS Yapılandırması

```typescript
app.use(cors());  // Hiçbir konfigürasyon yok
```

`cors()` default: **tüm origin'lere izin verilir (`*`).**  
Production'da bu ciddi bir güvenlik açığıdır. Herhangi bir domain API'ye istek atabilir.  
**Çözüm:** `cors({ origin: ["https://uygulama-domain.com"] })` ile kısıtlanmalı.

### 6.3 Global Error Handler Eksikliği

Express'te custom global error handler middleware tanımlı değil. Unhandled async hatalar Express 5'te otomatik yakalanır ancak yanıt formatı tutarsız olabilir. Bir route handler unhandled exception fırlatırsa kullanıcı tutarsız bir hata yanıtı alır.

**Çözüm:**
```typescript
app.use((err, req, res, next) => {
  req.log.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Sunucu hatası" });
});
```

---

## 7. ADMİN İŞLEMLERİ

### Kurum Oluşturma

**Risk:** DÜŞÜK  
Tek INSERT işlemi, atomik. Hata durumunda başarısız olur, yarım kayıt kalmaz.

### Kurum Silme

**Risk: KRİTİK**

Transaction yoktur. 6 ardışık DELETE işlemi sırasında herhangi birinde hata olursa:
- Kısmen silinmiş veri kalır
- Silinen tablolardaki kayıtlar geri alınamaz
- `lesson_progress` ve `student_learning_requests` hiç silinmez

**Ayrıca:** Eğer admin aynı anda iki browser sekmesinde aynı kurumu silmeye çalışırsa ikinci silme işlemi çoklu hata verebilir.

### Öğretmen Kodu Üretme

**Risk:** ORTA  
Quota kontrol + INSERT arasında race condition. İki eş zamanlı istek limiti 1 fazla aşabilir. Küçük sistemlerde pratik etkisi sınırlı.

### Kota Hesaplamaları

`usedStudentCount = SUM(classes.student_capacity WHERE institution_id = X)`  
`usedTeacherCount = COUNT(teacher_codes WHERE institution_id = X)`

Her ikisi de ayrı SELECT sorguları. Index olmadan büyük kurumda yavaşlayabilir. Denormalizasyon (institutions tablosunda counter kolonları) değerlendirilebilir.

---

## 8. ÖĞRETMEN İŞLEMLERİ

### Sınıf Oluşturma ve Öğrenci Kodu Üretimi

```
✅ Transaction kullanılıyor (class + codes birlikte)
⚠️ Quota kontrolü transaction dışında (race condition)
✅ Öğretmen ownership doğrulanıyor
⚠️ generateUniqueStudentCode → db kullanıyor, tx değil (düşük risk)
```

### Modül Açma

`level_unlocked` kolonunda +1 güncelleme. Transaction gerektirmiyor, tek satır UPDATE. Güvenli.

### Öğrenci İlerleme Takibi

```
GET /teacher/classes/:id/student-codes-progress
  → N+1 sorgu: her öğrenci için ayrı learning_progress sorgusu
  → 30 öğrencili sınırda: 31 DB sorgusu
  → 100 öğrencili sınırda: 101 DB sorgusu
```

Öğretmen sınıf kartını açtığında bu endpoint tetiklenir. Büyük sınıflarda yavaşlar.

### Eş Zamanlı İşlem Riski

İki öğretmen aynı anda aynı kurumda sınıf oluşturmaya çalışırsa:
- Quota aşımı mümkün (transaction dışı kontrol)
- Kod çakışması → DB unique constraint rollback (sınıf oluşturma başarısız, hata mesajı)

---

## 9. ÖĞRENCİ İŞLEMLERİ

### Ders Tamamlama

```
✅ lesson_progress → onConflictDoNothing (duplicate yok)
✅ Kilitli ders kontrolü (level > class.levelUnlocked → 403)
✅ learning_requests → unique constraint (slr_student_activity_uniq)
⚠️ İki kayıt aynı transaction değil
⚠️ LearningCache: DB down ise → memory buffer → crash riski
```

### "Bu Konuyu Öğrendim" Kaydı

Normal koşullarda kayıt güvenli:
1. `lesson_progress` → anlık DB yazma, `onConflictDoNothing`
2. `student_learning_requests` → LearningCache ile, anlık DB yazma dener

**Kayıp senaryosu:** Öğrenci butona basar → `lesson_progress` kaydedilir → `addLearningRequest` çağrılır → DB anlık yazma başarısız → memory'e alınır → 30 saniye sonra sunucu crash yaşar → öğretmen panelinde kayıt görünmez, öğrencinin UI'ında dersi tamamlamış görünür.

Bu senaryo **nadir** ama **mümkün.**

---

## 10. PRODUCTION ALTYAPISI DEĞERLENDİRMESİ

### Render Standard Plan

| Özellik | Render Standard | Yeterlilik |
|---------|-----------------|------------|
| CPU | 2 vCPU (shared) | ⚠️ 500+ aktif kullanıcıda yetersiz olabilir |
| RAM | 2 GB | ✅ Yeterli (in-memory cache dahil) |
| Auto-restart | ✅ SIGTERM ile graceful | ✅ |
| Zero-downtime deploy | ❌ Standart plana bağlı | ⚠️ |
| Horizontal scaling | Manuel | ⚠️ Cache tutarsızlığı riski |

### Neon PostgreSQL (Ücretli Plan)

| Özellik | Durum |
|---------|-------|
| Bağlantı limiti | Plana göre (örn: 100-300) |
| pg.Pool max | 10 (default) — yeterli başlangıçta |
| Serverless cold start | ⚠️ Neon branching kapalı değilse ilk sorgu gecikmeli |
| Connection pooling (PgBouncer) | Neon'da built-in, URL formatına dikkat |
| Yedekleme | ✅ Neon PITR desteği var |

### Eksik Production Bileşenleri

| Bileşen | Önem | Açıklama |
|---------|------|----------|
| Rate Limiting | 🔴 KRİTİK | express-rate-limit — auth endpoint'lerinde en az |
| CORS Kısıtlaması | 🔴 KRİTİK | `cors({ origin: [...] })` |
| Global Error Handler | 🟠 YÜKSEK | Unhandled exception yanıtı standartlaştırılmalı |
| DB Index Eksikleri | 🟠 YÜKSEK | users, classes, student_codes için index |
| Transaction (Kurum Silme) | 🟠 YÜKSEK | Atomic delete zorunlu |
| Request Logging Alarmı | 🟡 ORTA | Pino log, ama alerting sistemi yok (Sentry/Datadog) |
| Health Check Monitoring | 🟡 ORTA | `/api/healthz` var, ama dış izleme aracı bağlı değil |
| DB Migration Stratejisi | 🟡 ORTA | `drizzle push` production'da riskli; migration dosyaları kullanılmalı |
| Admin Şifre Hashing | 🟡 ORTA | bcrypt + timing-safe compare |
| Backup/Restore Test | 🟡 ORTA | Neon PITR test edilmeli |
| Token Revoke/Blacklist | 🟡 ORTA | Logout sonrası token geçerli kalıyor |

---

## 11. PRODUCTION READINESS SKORU

| Başlık | Puan | Açıklama |
|--------|------|----------|
| **Mimari** | 7/10 | Contract-first API, monorepo yapısı iyi. Global error handler ve CORS eksik. |
| **Güvenlik** | 4/10 | Rate limiting yok, CORS açık, admin şifresi hash değil, token revoke yok. |
| **Performans** | 5/10 | Küçük ölçekte iyi. 500+ kullanıcıda N+1 ve indeks eksikleri darboğaz. |
| **Veri Güvenliği** | 5/10 | onConflict korumaları var. Kurum silme transaction'sız. LearningCache crash riski. |
| **Ölçeklenebilirlik** | 4/10 | In-memory cache yatay scaling'i engelliyor. Index eksikleri büyük veriyle kötüleşir. |
| **Kod Kalitesi** | 7/10 | TypeScript strict, Zod validasyonu, Orval codegen. Repository katmanı eksik. |
| **Veritabanı Tasarımı** | 5/10 | Schema mantıklı. FK constraint yok. Kritik index eksik. Cascade güvensiz. |
| **Authentication** | 5/10 | JWT yapısı doğru. Rate limiting, hash, revoke eksik. |
| **Authorization** | 8/10 | Rol bazlı kontrol tutarlı. Cross-tenant erişim engellenmiş. |
| **Genel Production Hazırlığı** | 5/10 | MVP seviyesinde. Kritik güvenlik ve veri bütünlüğü düzeltmeleri gerekiyor. |

**Genel Ortalama: 5.5 / 10**

---

## 12. EN KRİTİK PROBLEMLER

### Problem 1 — Rate Limiting Yok

**Neden Kritik?**  
`POST /api/auth/admin-login` endpoint'ine sınırsız istek atılabilir. 8 karakterlik öğrenci kodları (10^8 kombinasyon) da sistematik denemeye açık.

**Oluşma İhtimali:** YÜKSEK — otomatik araçlarla kolayca yapılabilir  
**Etkisi:** Admin şifresi kırılabilir. Tüm öğrenci kodları denenebilir. Sistematik saldırıyla tüm öğrencilerin hesaplarına erişilebilir.  
**Çözüm:** `express-rate-limit` + Redis store. Auth endpoint'lerine IP bazlı 10 istek/dakika limit.

---

### Problem 2 — CORS Tüm Origin'lere Açık

**Neden Kritik?**  
`app.use(cors())` varsayılan davranışı Access-Control-Allow-Origin: * döndürür. Herhangi bir web sitesi API'ye kullanıcı adına istek atabilir.

**Oluşma İhtimali:** YÜKSEK — herhangi bir kötü niyetli site bu açığı kullanabilir  
**Etkisi:** CSRF-benzeri saldırılar, veri sızdırma  
**Çözüm:** `cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") })`

---

### Problem 3 — Kurum Silme Transaction'sız

**Neden Kritik?**  
6 ardışık DELETE işlemi herhangi birinde başarısız olabilir. Transaction olmadan yarım silinmiş veri kalır. Örneğin sınıflar silinir ama kullanıcılar silme adımında hata olursa, silinmiş sınıflar için kullanıcılar/kodlar veritabanında kalır.

**Oluşma İhtimali:** ORTA — DB bağlantı kesilmesi, timeout, Neon cold start  
**Etkisi:** Veri tutarsızlığı. Orphan kayıtlar. Bir dahaki admin girişinde broken state.  
**Çözüm:** Tüm silme işlemi tek `db.transaction(async (tx) => { ... })` içine alınmalı.

---

### Problem 4 — LearningCache Veri Kaybı Riski

**Neden Kritik?**  
"Bu konuyu öğrendim" işleminin öğretmen takip kaydı in-memory buffer'da bekliyor. DB geçici olarak ulaşılamaz + sunucu restart = öğrenci aktiviteleri kaybolur.

**Oluşma İhtimali:** DÜŞÜK-ORTA — Neon PostgreSQL genellikle erişilebilir; Render restart deploy sırasında oluyor  
**Etkisi:** Öğrenci aktiviteleri öğretmen panelinde görünmez. Eğitim dönemi sonu raporlaması eksik olur.  
**Çözüm:** SIGTERM flush mevcut ve deploy'da graceful restart var. Riski azaltır ama sıfırlamaz. Gerçek çözüm: Redis-backed queue.

---

### Problem 5 — Kota Race Condition

**Neden Kritik?**  
Aynı kurumdan iki öğretmen eş zamanlı sınıf oluşturmaya çalışırsa her ikisi de yeterli slot görür ve limit aşılır.

**Oluşma İhtimali:** DÜŞÜK — pratik kullanımda iki öğretmenin aynı anda sınıf oluşturması nadir  
**Etkisi:** Kurumun student_limit'i aşılır. Müşteri sözleşme ihlali.  
**Çözüm:** `SELECT ... FOR UPDATE` ile institution kaydını kilitle; ya da quota kontrolünü transaction içine al.

---

### Problem 6 — Eksik DB İndeksleri

**Neden Kritik?**  
`users`, `classes`, `student_codes`, `teacher_codes` tablolarında sık kullanılan join kolonları indekssiz. 10.000 öğrenciyle bu tablolar büyüdüğünde her sorgu tam tablo taramasına döner.

**Oluşma İhtimali:** KESİN — 10.000 öğrenci hedefine ulaşıldığında mutlaka hissedilecek  
**Etkisi:** Öğretmen dashboard yavaşlar. Kurum silme uzar (timeout riski). Öğrenci ders listesi gecikmeli yüklenir.  
**Çözüm:**
```sql
CREATE INDEX users_institution_id_idx ON users(institution_id);
CREATE INDEX users_class_id_idx ON users(class_id);
CREATE INDEX classes_teacher_id_idx ON classes(teacher_id);
CREATE INDEX classes_institution_id_idx ON classes(institution_id);
CREATE INDEX student_codes_class_id_idx ON student_codes(class_id);
CREATE INDEX teacher_codes_institution_id_idx ON teacher_codes(institution_id);
```

---

## 13. SONUÇ

### Bu sistem bugün canlıya alınabilir mi?

**Kısıtlı koşullarda: Evet, ama kritik risklerle.**

Sistemi bugün canlıya almak için en az şunlar tamamlanmalı:
1. Rate limiting (auth endpoint'leri)
2. CORS kısıtlaması (izin verilen domain'ler)
3. Kurum silme transaction'a alınma
4. Eksik DB index'leri eklenmeli

Bunlar olmadan sistemi canlıya almak kabul edilemez güvenlik ve veri bütünlüğü riski içerir.

---

### 10.000 kayıtlı öğrenci için uygun mu?

**Hayır, şu anki haliyle değil.**

10.000 kayıt = büyük tablolar = indekssiz sorguların tam tablo taraması. Özellikle:
- `GET /teacher/classes/:id/student-codes-progress` N+1 sorgu
- `DELETE /admin/institutions/:id` ardışık DELETE (performance + safety)
- `GET /admin/stats` çoklu COUNT

500 aktif eş zamanlı kullanıcıda Render Standard + varsayılan pool ayarları darboğaz yaratır.

---

### Veri kaybı yaşanma ihtimali var mı?

**Evet, iki senaryoda:**

1. **LearningCache + Crash:** DB geçici down + sunucu crash = öğrenci aktivite kaydı kayıp (öğrenci UI'da tamamlamış görünür, öğretmen panelinde görünmez)
2. **Kurum Silme + Hata:** Transaction olmadığından yarım silme sonucu tutarsız veri (lesson_progress zaten hiç silinmiyor)

Normal işleyişte veri kaybı yaşanmaz. Ancak edge case'lerde garanti yoktur.

---

### Mevcut mimari korunmalı mı?

**Evet, temel mimari sağlam.**

Contract-First API, pnpm monorepo, Drizzle ORM, React + Vite kombinasyonu doğru seçimler. Yeniden tasarım gerekmez.

---

### Yeniden tasarlanması gereken bölümler?

Mimari yeniden tasarım gerekmez. Ancak şu bölümler **refactor** edilmeli:

| Bölüm | Eylem |
|-------|-------|
| Kurum silme handler | Transaction + `lesson_progress` temizleme ekle |
| Quota kontrol mekanizması | `SELECT FOR UPDATE` veya transaction-içi kontrol |
| CORS middleware | Domain kısıtlaması ekle |
| Auth middleware | Rate limit ekle |
| DB şema migration | `drizzle push` yerine migration dosyaları kullan |
| Index'ler | 6 kritik index ekle |
| Admin şifre kontrolü | `crypto.timingSafeEqual` + bcrypt |
| Global error handler | Express middleware ekle |

---

### Özet Öncelik Listesi

| # | İyileştirme | Süre | Etki |
|---|-------------|------|------|
| 1 | Rate limiting (express-rate-limit) | 1 saat | Güvenlik: Kritik |
| 2 | CORS origin kısıtlaması | 15 dk | Güvenlik: Kritik |
| 3 | Kurum silme → transaction | 2 saat | Veri: Kritik |
| 4 | 6 DB index ekle | 1 saat | Performans: Yüksek |
| 5 | Global error handler | 30 dk | Güvenilirlik: Yüksek |
| 6 | Admin şifre → bcrypt | 1 saat | Güvenlik: Orta |
| 7 | Quota kontrolü → transaction içi | 3 saat | Veri: Orta |
| 8 | lesson_progress silme (kurum delete) | 1 saat | Veri: Orta |
| 9 | LearningCache → Redis queue | 1 gün | Güvenilirlik: Orta |
| 10 | DB migration dosyaları | 2 saat | Ops: Orta |

**Toplam tahmini süre (1-8 arası):** ~12-15 saat çalışma  
**Bu süre tamamlandığında sistem:** 10.000 kayıtlı öğrenci için production-ready kabul edilebilir.

---

*Bu rapor, yalnızca mevcut kodun statik analizi ile hazırlanmıştır. Hiçbir kod, veritabanı veya dosya değiştirilmemiştir.*
