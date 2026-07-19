const TOKEN_KEY = "gitar_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * FAZ 3.1: Sessiz oturum yenileme.
 * Token 1 saat geçerli — her 45 dakikada bir /api/auth/refresh çağrılarak
 * oturum kesintisiz uzatılır. Token yoksa veya yenileme başarısızsa sessizce geçilir
 * (kullanıcı bir sonraki istekte normal şekilde 401 alır ve girişe yönlenir).
 */
const REFRESH_INTERVAL_MS = 45 * 60 * 1000;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

async function refreshOnce(): Promise<void> {
  const token = getToken();
  if (!token) return;
  try {
    const r = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) {
      const data = (await r.json()) as { token?: string };
      if (data.token) setToken(data.token);
    }
  } catch {
    // Ağ hatası — sessizce geç, bir sonraki denemede tekrar dener
  }
}

export function startSessionRefresh(): void {
  if (refreshTimer) return;
  // Açılışta hemen bir kez yenile — token yaşı bilinmediğinden (ör. 50 dk'lık
  // eski token ile açılış) ilk yenilemeyi 45 dk beklemek oturum düşürebilir.
  void refreshOnce();
  refreshTimer = setInterval(() => {
    void refreshOnce();
  }, REFRESH_INTERVAL_MS);
}
