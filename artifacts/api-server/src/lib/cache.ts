interface Entry<T> {
  data: T;
  expiresAt: number;
}

/**
 * FAZ 4.2: Geliştirilmiş in-memory TTL cache.
 * - Periyodik süpürme: süresi dolan kayıtlar erişilmese bile 60 sn'de bir silinir
 *   (bellek sızıntısı önlenir).
 * - maxSize sınırı: aşılırsa en eski kayıt atılır (basit FIFO koruması).
 * - İstatistik: hit/miss sayaçları rapor ve izleme için.
 */
class TTLCache<T> {
  private store = new Map<string, Entry<T>>();
  private hits = 0;
  private misses = 0;

  constructor(private maxSize = 500) {}

  set(key: string, data: T, ttlMs: number): void {
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.data;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidateAll(): void {
    this.store.clear();
  }

  sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }

  stats() {
    return { size: this.store.size, hits: this.hits, misses: this.misses };
  }
}

export const teacherDashboardCache = new TTLCache<unknown[]>(200);

/**
 * FAZ 4.2: Ders listesi cache'i.
 * Dersler yalnızca seed ile değişir — her öğrenci/öğretmen isteğinde DB'den
 * çekmek gereksiz. 10 dk TTL yeterli.
 */
export const lessonsCache = new TTLCache<unknown[]>(4);
export const LESSONS_CACHE_KEY = "all-lessons";
export const LESSONS_CACHE_TTL = 10 * 60 * 1000;

// Periyodik süpürme — süresi dolan kayıtlar bellekte birikmesin
setInterval(() => {
  teacherDashboardCache.sweep();
  lessonsCache.sweep();
}, 60_000).unref();
