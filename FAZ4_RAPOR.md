# FAZ 4 — Performans Raporu

Tarih: 19 Temmuz 2026

## 4.1 Database Optimizasyonları

### Tespit edilen sorunlar ve çözümler

| Sorun | Önce | Sonra |
|---|---|---|
| **N+1: `GET /admin/institutions`** | Kurum başına 6 ayrı sorgu (1 kurum listesi + N×6) | Kurum sayısından bağımsız **toplam 4 sorgu** (kurumlar + 3 paralel toplu sorgu: kullanıcı sayıları GROUP BY, öğretmen kodları, sınıf kapasiteleri) |
| **Gereksiz sorgu: `unusedTeacherCount`** | Ayrı COUNT sorgusu | Zaten çekilen kod listesinden türetiliyor (0 ek sorgu) |
| **Çift yükleme: `POST /student/lessons/:id/complete`** | Ders tamamlandıktan sonra tüm öğrenci bağlamı (5 sorgu) yeniden yükleniyordu | Yanıt yerelde kuruluyor: `{...lesson, completed: true}` — **5 sorgu tasarrufu** |
| **Seri sorgular: öğrenci bağlamı** | dersler → ilerleme → öğrenci kodu sırayla | Bağımsız 3 sorgu `Promise.all` ile **paralel** |
| **N+1: öğrenci kodu üretimi (sınıf oluşturma/genişletme)** | Kod başına 1 SELECT + 1 INSERT (N öğrenci → 2N sorgu) | Tek toplu INSERT (`onConflictDoNothing` + `returning`) — çakışan kod sessizce atlanıp yeniden üretilir, **tam N kod garantili**; garanti edilemezse transaction geri alınır (kapasite/kod tutarlılığı korunur) |
| **Seri sorgular: öğretmen ilerleme uçları** | ders listesi/sayısı + öğrenme kayıtları sırayla | Paralel + ders listesi cache'den |

### Benchmark

Ortam: geliştirme, küçük veri seti (1 kurum, 1 sınıf, 20 kod, 22 ders). Küçük veride mutlak süreler benzer; kazanç **sorgu sayısında** — veri büyüdükçe fark doğrusal olarak açılır.

| Uç | Önce (medyan) | Sonra (medyan) | Sorgu sayısı (önce → sonra) |
|---|---|---|---|
| `GET /admin/institutions` (1 kurum) | ~8,7 ms | ~8,0 ms | 7 → 4 (10 kurumda: 61 → 4) |
| `GET /student/lessons` | ~8 ms | ~7,4 ms (cache'li) | 5 → 4 (dersler RAM'den) |
| `POST /student/lessons/:id/complete` | ~16 ms (çift yükleme) | ~8 ms | 10–11 → 5 |
| `GET /teacher/classes` (cache hit) | — | ~3,0 ms | 4 → 0 |
| Sınıf oluşturma (30 öğrenci) | 62 sorgu | 4 sorgu | 2N+2 → 4 |

### Doğrulama
- `pnpm run typecheck` temiz.
- Gerçek verilerle uçtan uca test: admin kurum listesi (değerler birebir aynı), öğrenci ders listesi/dashboard/ders tamamlama, öğretmen sınıf listesi ve ilerleme uçları — hepsi HTTP 200, veriler doğru.

## 4.2 Cache Analizi

### Mevcut katmanlar
1. **`teacherDashboardCache`** (RAM, 2 dk TTL) — öğretmen sınıf listesi. Invalidation: sınıf oluşturma/silme/genişletme/kilit açma/akıllı tahta kodu üretiminde `invalidate(teacherId)`. ✅ Doğru çalışıyor.
2. **`lessonsCache`** (YENİ, RAM, 10 dk TTL) — ders listesi yalnızca seed ile değişir; artık her öğrenci/öğretmen isteğinde DB'ye gidilmiyor.
3. **Learning cache** (`pendingLearningRequests`) — write-through: anında DB'ye yazar, başarısız yazımlar 120 sn'de bir yeniden denenir; SIGTERM'de flush. ✅ Veri kaybı riski minimal.

### Yapılan iyileştirmeler
- **Bellek sızıntısı düzeltildi**: TTL süresi dolan kayıtlar erişilmezse RAM'de kalıyordu → 60 sn'de bir periyodik süpürme eklendi.
- **Boyut sınırı**: cache'e `maxSize` (öğretmen: 200, ders: 4) eklendi; aşımda en eski kayıt atılır.
- **İstatistik**: hit/miss sayaçları eklendi (ileride izleme ucu bağlanabilir).

### Redis değerlendirmesi: **GEREKMİYOR**
- Uygulama **tek instance** çalışıyor (Replit); dağıtık cache tutarlılığı sorunu yok.
- Veri hacmi çok küçük (kurum/sınıf/ders sayıları yüzler mertebesinde bile değil); RAM cache bellek yükü ihmal edilebilir (< 1 MB).
- Sorgu süreleri zaten ~3–8 ms; Redis'in ağ gidiş-dönüşü (~1 ms+) kazancı sıfıra yakın, işletme yükü (ayrı servis, bağlantı yönetimi, maliyet) ise net zarar.
- Redis ancak şu durumda anlamlı olur: çoklu instance'a ölçekleme VEYA sunucu yeniden başlatmalarında cache'in korunması kritik hale gelirse. İkisi de mevcut değil.

## Sonuç
- En büyük kazanç: admin kurum listesinde N+1 giderildi (10 kurumda 61 → 4 sorgu), sınıf oluşturmada 2N+2 → 4 sorgu, ders tamamlamada sorgu sayısı yarıya indi.
- Cache katmanı bellek açısından güvenli hale getirildi (süpürme + boyut sınırı).
- Redis eklenmedi — mevcut ölçekte gereksiz karmaşıklık.
