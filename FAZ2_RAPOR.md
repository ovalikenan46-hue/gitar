# FAZ 2 — Admin Güvenliği Raporu

**Tamamlanma Tarihi:** Temmuz 2026  
**Durum:** ✅ Tamamlandı

---

## 2.1 Admin Login Security

### Rate Limiting & Brute Force Koruması

**Mekanizma:** IP tabanlı in-memory lockout (sunucu restart'ta sıfırlanır — kasıtlı tasarım)

| Parametre | Değer |
|-----------|-------|
| Maks. başarısız deneme | 5 |
| Kilit süresi | 15 dakika |
| Kalan hak bildirimi | Evet — her başarısız denemede gösterilir |

**Akış:**
```
1. IP locked? → 429 (kalan dakika bilgisi ile)
2. Şifre yanlış → attempt++ → kalan hakkı göster
3. 5. başarısız → IP 15 dk kilitlenir
4. Şifre doğru → attempt sıfırla → devam
```

**Test Sonuçları:**
```
Deneme 1: "Hatalı şifre. 4 deneme hakkınız kaldı." ✅
Deneme 2: "Hatalı şifre. 3 deneme hakkınız kaldı." ✅
Deneme 3: "Hatalı şifre. 2 deneme hakkınız kaldı." ✅
Deneme 4: "Hatalı şifre. 1 deneme hakkınız kaldı." ✅
Deneme 5: "Çok fazla hatalı giriş. 15 dakika sonra tekrar deneyin." (lockedOut: true) ✅
Deneme 6: "Çok fazla hatalı giriş. 15 dakika sonra tekrar deneyin." (lockedOut: true) ✅
```

### Login Log

**Tablo:** `admin_login_log`

| Kolon | Açıklama |
|-------|----------|
| `ip` | Gerçek istemci IP (X-Forwarded-For dahil) |
| `user_agent` | Tam User-Agent string |
| `success` | Giriş başarılı mı? |
| `fail_reason` | Hatalı şifre / Hesap kilitli / Yetkisiz cihaz |
| `locked_out` | Kilit nedeniyle mi engellendi? |
| `created_at` | Timestamp |

**Admin panelinden görüntülenebilir:** Güvenlik sekmesi → Son Giriş Denemeleri

---

## 2.2 Admin Device Authorization

### Tasarım Kararları

- **Cihaz tanımlama:** SHA-256 hash(User-Agent) — değişmez fingerprint
- **Cihaz tipi:** UA içinde `mobile/android/iphone/ipad/tablet/windows phone` kelimesi → `phone`, diğeri → `pc`
- **Limit:** 1 PC + 1 telefon (her tip için max 1 cihaz)
- **İlk giriş:** Kayıtlı cihaz yoksa otomatik kayıt — admin panelini ilk açan cihaz onaylanır
- **Yetkisiz cihaz:** `403 deviceBlocked: true` — hangi endpoint'ten bypass edilemez

### Giriş Akışı

```
POST /auth/admin-login
  ↓
  IP kilit kontrolü
  ↓
  Şifre doğrulama
  ↓
  Device fingerprint hesapla
  ↓
  Fingerprint kayıtlı mı? → ✅ İzin ver, lastUsedAt güncelle
  ↓
  Kayıtlı değil → o tipte boş slot var mı?
    ✅ Evet → Otomatik kayıt → İzin ver
    ❌ Hayır → 403 "Bu cihaz yetkili değil"
  ↓
  JWT döndür
```

### Cihaz Yönetim Endpoint'leri

| Endpoint | Açıklama |
|----------|----------|
| `GET /admin/devices` | Kayıtlı cihazları listele |
| `DELETE /admin/devices/:id` | Cihazı yetki listesinden kaldır |
| `PATCH /admin/devices/:id` | Cihaz etiketini güncelle |
| `POST /admin/devices/register-current` | Mevcut cihazı kaydet (slot boşsa) |

### Test Sonuçları

```
PC login (Chrome/Windows — kayıtlı):        ✅ Token alındı
iPhone login (boş telefon slotu):            ✅ Otomatik kayıt + token
Pixel Android (telefon slotu dolu):          ✅ 403 "Bu cihaz yetkili değil"
Cihaz listesi:                               ✅ 2 cihaz (1 PC + 1 phone)
```

### Tablo: `admin_authorized_devices`

| Kolon | Açıklama |
|-------|----------|
| `device_type` | `pc` veya `phone` |
| `fingerprint` | SHA-256(User-Agent) — UNIQUE |
| `label` | Okunabilir isim (ör. "Chrome — Windows") |
| `ip` | Son kullanılan IP |
| `created_at` | İlk kayıt zamanı |
| `last_used_at` | Son başarılı giriş zamanı |

---

## 2.3 Audit Log

### Kaydedilen İşlemler

| Action Key | Açıklama |
|------------|----------|
| `institution.create` | Kurum oluşturma |
| `institution.delete` | Kurum silme |
| `institution.update_limits` | Limit güncelleme |
| `teacher_code.generate` | Öğretmen kodu üretme |
| `device.authorize` | Cihaz yetkilendirme |
| `device.revoke` | Cihaz silme |
| `device.rename` | Cihaz yeniden adlandırma |

### Kaydedilen Bilgiler

| Alan | İçerik |
|------|--------|
| `action` | İşlem kodu |
| `details` | jsonb — işleme özel veriler (id, isim, eski/yeni değer vs.) |
| `ip` | İstemci IP |
| `user_agent` | Tam UA string |
| `browser` | Tarayıcı (Edge/Chrome/Firefox/Safari/Opera) |
| `os_name` | OS (Windows/macOS/Linux/Android/iOS) |
| `created_at` | Zaman damgası |

### Tablo: `admin_audit_log`

JSONB `details` alanı işleme göre farklı içerik taşır:

```json
// institution.create
{"institutionId": "xxx", "name": "Okul A", "teacherLimit": 5, "studentLimit": 100}

// institution.delete  
{"institutionId": "xxx", "name": "Okul A"}

// institution.update_limits
{"institutionId": "xxx", "oldTeacherLimit": 5, "newTeacherLimit": 10, "oldStudentLimit": 100, "newStudentLimit": 200}

// teacher_code.generate
{"institutionId": "xxx", "name": "Okul A", "code": "XYZABCDE"}

// device.revoke
{"deviceId": "xxx", "deviceType": "phone", "label": "Safari — iOS"}
```

### Admin Panel Entegrasyonu

**Güvenlik Sekmesi:**
- Yetkili cihaz kartları (PC/Telefon slot durumu + cihaz bilgileri)
- Cihaz etiket düzenleme
- Cihaz silme (yetki iptali)
- Mevcut cihazı ekle butonu
- Son 30 giriş denemesi (başarı/başarısız/kilitli renkli gösterim)

**İşlem Kayıtları Sekmesi:**
- Son 50 audit log kaydı
- Action kodları Türkçe etiket ile gösterilir
- Detaylar (details) key-value olarak listelenir
- IP, tarayıcı, OS, zaman bilgisi her satırda

---

## Yeni Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `lib/db/src/schema/adminLoginLog.ts` | Login log Drizzle schema |
| `lib/db/src/schema/adminAuthorizedDevices.ts` | Cihaz yetkisi Drizzle schema |
| `lib/db/src/schema/adminAuditLog.ts` | Audit log Drizzle schema |
| `artifacts/api-server/src/lib/adminSecurity.ts` | Güvenlik yardımcı fonksiyonları |

## Güncellenen Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `lib/db/src/schema/index.ts` | 3 yeni tablo export |
| `artifacts/api-server/src/routes/auth.ts` | Admin-login güvenlik katmanı |
| `artifacts/api-server/src/routes/admin.ts` | Audit log + 5 yeni endpoint |
| `artifacts/guitar-app/src/pages/admin-dashboard.tsx` | 2 yeni sekme |

---

## Doğrulama

### TypeScript Typecheck
```
✅ @workspace/api-server — Done
✅ @workspace/guitar-app — Done
✅ @workspace/mockup-sandbox — Done
✅ scripts — Done
```

### API Testleri
```
✅ Brute force: 5 denemede kilit, geri sayım mesajları
✅ IP lockout: Kilitli IP'den 429 + kalan süre
✅ Cihaz tipi tespiti: Chrome/Windows → pc, iPhone → phone
✅ İlk giriş otomatik kayıt: Boş slot → fingerprint DB'ye yazıldı
✅ Yetkisiz cihaz reddi: 403 deviceBlocked flag ile
✅ İkinci aynı tip cihaz engeli: "telefon slotu dolu" hatası
✅ Login log: Tüm başarılı/başarısız denemeler kaydedildi
✅ Audit log: Tüm admin işlemleri kaydedildi
✅ Cihaz listeleme: GET /admin/devices
✅ Cihaz silme: DELETE /admin/devices/:id
```

### Güvenlik Sınır Senaryoları

| Senaryo | Beklenen | Sonuç |
|---------|----------|-------|
| 4 hatalı + 1 doğru şifre | Sayaç sıfırlanır | ✅ |
| 5 hatalı → 429 | lockedOut: true + remainingMs | ✅ |
| Kilitliyken doğru şifre deneme | 429 (şifreye bakmaz) | ✅ |
| Kayıtlı cihaz + doğru şifre | Token + lastUsedAt güncellenir | ✅ |
| Kayıtsız cihaz + boş slot | Otomatik kayıt + token | ✅ |
| Kayıtsız cihaz + dolu slot | 403 deviceBlocked | ✅ |
| Kayıtsız cihaz + yanlış şifre | 401 attemptsLeft (cihaza bakmaz) | ✅ |
