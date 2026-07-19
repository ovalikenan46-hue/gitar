# FAZ 5 — Production Hazırlığı Raporu

Tarih: 19 Temmuz 2026

## 5.1 Monitoring ✅

Üç katmanlı health check yapısı kuruldu (`routes/health.ts`):

| Uç | Amaç | Yetki |
|---|---|---|
| `GET /api/healthz` | Liveness — hızlı, bağımlılıksız. Deployment health check bunu kullanır. | Herkese açık |
| `GET /api/healthz/ready` | Readiness — DB'ye `SELECT 1` atar, gecikmeyi ölçer. DB ulaşılamazsa **503**. | Herkese açık |
| `GET /api/healthz/details` | Detaylı izleme: bellek, CPU, DB gecikmesi, bağlantı havuzu, cache istatistikleri. | **Yalnızca admin** |

### Canlı test sonuçları
- `/healthz` → `{"status":"ok"}` ✅
- `/healthz/ready` → `{"status":"ok","db":"ok","dbLatencyMs":31}` ✅ (soğuk bağlantı; ısındıktan sonra 1 ms)
- `/healthz/details` yetkisiz → **401** ✅; admin token ile → tam metrik seti ✅

### Ölçülen metrikler (örnek anlık görüntü)
- **Memory**: RSS 112 MB, heap 21/37 MB — sağlıklı, sızıntı belirtisi yok
- **CPU**: loadavg 0.43 (2 çekirdek) — düşük yük
- **DB**: latency 1 ms, pool `total:1 idle:1 waiting:0`
- **Cache**: teacherDashboard + lessons hit/miss sayaçları ve bekleyen öğrenme yazma kuyruğu izleniyor

## 5.2 Backup ✅

**Strateji:** Replit ortamında iki katman mevcut:
1. **Checkpoint tabanlı rollback** — her checkpoint kod + veritabanı anlık görüntüsü alır; platform üzerinden geri dönülebilir.
2. **Manuel `pg_dump` yedekleri** — doğrulandı (aşağıda). İstenirse periyodik dump + harici saklama eklenebilir.

**Restore testi (gerçek, uçtan uca):**
1. `pg_dump -Fc` ile tam yedek alındı (29 KB, custom format — seçmeli restore destekler).
2. Aynı sunucuda `restore_test` adında boş veritabanı oluşturuldu.
3. `pg_restore` ile yedek geri yüklendi — **hatasız**.
4. Doğrulama:
   - Tablo sayısı: kaynak 11 = restore 11 ✅
   - Tüm tabloların satır sayıları birebir eşit (users 2, lessons 22, student_codes 20, institutions 1, classes 1, lesson_progress 3, teacher_codes 2, audit/login logları dahil) ✅
   - İçerik bütünlüğü: `users` tablosunun MD5 özeti kaynak ve restore'da **aynı** ✅
5. Temizlik: `restore_test` veritabanı ve dump dosyası silindi.

**Sonuç:** Yedek alınabiliyor ve geri yüklenebiliyor; veri kaybı/bozulma yok. Araç sürümü (pg_dump 16.10) sunucu sürümüyle (PostgreSQL 16.10) birebir uyumlu.

## 5.3 Production Config Analizi ✅

> Not: Kontrol listesindeki "Render Standard" ve "Neon Scale" kalemleri bu projenin
> gerçek ortamına çevrildi: uygulama **Replit Deployment** üzerinde yayınlanıyor,
> veritabanı **Replit-managed PostgreSQL (Neon altyapılı)**. Analiz buna göre yapıldı.

### Barındırma (Render Standard karşılığı → Replit Deployment)
- Yayınlama Replit üzerinden yapılır; TLS, health check ve domain yönetimi platform tarafından sağlanır.
- Deployment health check için `/api/healthz` (hızlı liveness) uygundur; DB bağımlı `/healthz/ready` bilinçli olarak ayrı tutuldu — DB'deki geçici bir yavaşlama instance'ın yeniden başlatılmasına yol açmamalı.
- Tek instance için mevcut bellek profili (RSS ~112 MB) fazlasıyla rahat.

### Veritabanı (Neon Scale karşılığı → Replit PG / Neon)
- Neon serverless mimaride boştaki bağlantıları ~5 dk'da kapatır; havuz ayarları buna uyumlu hale getirildi.
- Bağlantı limiti Neon planına bağlıdır; tek instance × `max:10` güvenli bölgede.

### Pool ayarları (uygulandı — `lib/db/src/index.ts`)
Önceki durum: `new Pool({ connectionString })` — **tüm değerler varsayılandaydı**, en riskli olanı `connectionTimeoutMillis: 0` (havuz doluysa sonsuz bekleme).

| Ayar | Yeni değer | Gerekçe |
|---|---|---|
| `max` | 10 (env `PG_POOL_MAX` ile ayarlanabilir) | Tek instance için yeterli; Neon bağlantı limitine saygılı. Ölçekleme gerekirse env ile artırılır. |
| `idleTimeoutMillis` | 30 000 | Boş bağlantılar bırakılır; Neon'un kendi idle kapatmasıyla çakışıp "stale connection" hatası üretmez. |
| `connectionTimeoutMillis` | 10 000 | Havuz doluysa istek sonsuza kadar askıda kalmaz — kontrollü hata döner, izlenebilir. |
| `statement_timeout` | 15 000 | Takılan tek bir sorgu bağlantıyı rehin alamaz; havuz tükenmesini önler. |

### Timeout zinciri (bütünsel görünüm)
Bağlantı alma en fazla 10 sn bekler (`connectionTimeoutMillis`); bağlantı alındıktan sonra tek bir sorgu en fazla 15 sn çalışabilir (`statement_timeout`). Her iki katman da takıldığında kontrollü hata döner — sonsuz askıda kalma veya kaskad kilitlenme oluşmaz.

## Doğrulama
- `pnpm run typecheck` (libs + api-server) temiz.
- Üç health ucu canlı test edildi; restore testi uçtan uca çalıştırıldı ve temizlendi.
