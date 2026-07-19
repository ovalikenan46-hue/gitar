# FAZ 3 — Authentication Güçlendirme Raporu

Tarih: 19 Temmuz 2026

## 3.1 Şifre Güvenliği

### bcrypt Şifre Doğrulama
- Admin şifresi artık bellekte **düz metin olarak tutulmuyor**. Sunucu açılışında `ADMIN_PASSWORD` ortam değişkeni bcrypt (cost **12**) ile hash'leniyor ve yalnızca hash bellekte kalıyor.
- Şifre karşılaştırması `bcrypt.compare` ile yapılıyor — sabit süreli karşılaştırma sayesinde **zamanlama saldırılarına (timing attack) karşı korumalı**.
- Cost 12 seçildi: ~250ms doğrulama süresi, kaba kuvvet saldırısını pratik olarak imkânsız kılar ama kullanıcı deneyimini bozmaz.

### JWT Sertleştirme
- Algoritma **HS256 olarak sabitlendi** (hem imzalama hem doğrulamada) — algoritma karıştırma saldırıları engellendi.
- **issuer** (`gitar-ogreniyorum`) ve **audience** (`gitar-app`) claim'leri eklendi — başka sistemler için üretilmiş token'lar artık reddediliyor.
- Token süresi 1 saat olarak korundu (kısa ömür = düşük risk).
- Test edildi: issuer'sız eski format token → 401 reddedildi. ✅

### Refresh Token Değerlendirmesi
- Tam refresh token altyapısı (ayrı token, DB'de saklama, rotasyon) bu ölçekteki uygulama için **gereksiz karmaşıklık** olarak değerlendirildi.
- Yerine **kayan oturum (sliding session)** uygulandı: `POST /api/auth/refresh` — geçerli token'ı olan kullanıcı süresi dolmadan yeni token alır.
- Frontend uygulama açılışında **hemen bir kez** ve sonrasında her **45 dakikada bir** sessizce token yeniler → aktif kullanıcının oturumu kesilmez, terk edilmiş oturum en geç 1 saatte ölür.

### Token Saklama İncelemesi
- Mevcut: `localStorage` (`gitar_token` anahtarı).
- Değerlendirme: httpOnly cookie XSS'e karşı daha güvenli olurdu, ancak mevcut mimari (Bearer token + Authorization header + OpenAPI codegen) localStorage gerektiriyor.
- Risk azaltıcılar: 1 saatlik kısa token ömrü, React'in varsayılan XSS koruması, `dangerouslySetInnerHTML` kullanılmıyor.
- Karar: localStorage **kabul edilebilir**; ileride httpOnly cookie'ye geçiş FAZ 5+ için not edildi.

## 3.2 Global Error Handling

### Tek Tip Hata Sistemi
- Yeni: `src/middlewares/errorHandler.ts`
- `AppError` sınıfı: `statusCode` + `code` + mesaj taşıyan fırlatılabilir hata tipi.
- Express 5'in otomatik async hata yakalama özelliğiyle tüm rotalardaki beklenmeyen hatalar global işleyiciye düşüyor.

### Standart API Cevap Formatı
Middleware üzerinden geçen tüm hatalar (404, bozuk JSON, beklenmeyen hatalar) artık şu formatta (route içi doğrulama hataları kademeli olarak bu formata taşınacak):
```json
{ "error": "İnsan-okur mesaj", "code": "MAKINE_KODU", "requestId": "..." }
```
- `404` → `{ error: "Kaynak bulunamadı", code: "NOT_FOUND", path: "..." }`
- Bozuk JSON gövdesi → `{ error: "Geçersiz JSON gövdesi", code: "INVALID_JSON" }`
- Beklenmeyen hata → `{ error: "Sunucu hatası...", code: "INTERNAL_ERROR" }` (detay sızdırılmaz)

### Düzenli Loglama
- `AppError` → `warn` seviyesi, kod ile birlikte.
- Beklenmeyen hatalar → `error` seviyesi, tam hata nesnesi pino'ya loglanır (istemciye asla sızdırılmaz).
- Her hata cevabında `requestId` — log ile cevabı eşleştirme imkânı.

## Test Sonuçları

| Test | Sonuç |
|---|---|
| `POST /api/auth/refresh` geçerli token → yeni token | ✅ |
| Issuer'sız (eski format) token → 401 | ✅ |
| Sahte token → 401 | ✅ |
| Hatalı admin şifresi (bcrypt yolu) → 401 | ✅ |
| Olmayan rota → standart 404 JSON | ✅ |
| Bozuk JSON gövdesi → standart 400 JSON | ✅ |
| Tam typecheck | ✅ Temiz |

## Not
- JWT'ye issuer/audience eklendiği için **mevcut oturumlar geçersiz oldu** — kullanıcıların bir kez yeniden giriş yapması gerekir (token ömrü zaten 1 saat olduğundan etki minimal).

## Bekleyen (Sonraki Fazlar)
- FAZ 4+: Quota race condition düzeltmesi, N+1 sorgu optimizasyonu, CORS kısıtlaması, httpOnly cookie değerlendirmesi.
