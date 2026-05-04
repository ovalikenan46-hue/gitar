interface Entry<T> {
  data: T;
  expiresAt: number;
}

class TTLCache<T> {
  private store = new Map<string, Entry<T>>();

  set(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }
}

export const teacherDashboardCache = new TTLCache<unknown[]>();
