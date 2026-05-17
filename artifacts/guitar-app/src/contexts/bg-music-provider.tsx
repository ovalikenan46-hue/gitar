import { useCallback, useEffect, useRef, useState } from "react";
import { BgMusicContext, BG_SRC } from "./bg-music-context";

export function BgMusicProvider({ children }: { children: React.ReactNode }) {
  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const unlockedRef  = useRef(false);   // true after first user gesture
  const wantPlayRef  = useRef(false);   // true while landing is visible
  const [playing, setPlaying] = useState(false);

  /* ── Audio element oluştur ────────────────────────────── */
  useEffect(() => {
    const audio = new Audio(BG_SRC);
    audio.loop    = true;
    audio.volume  = 0.45;
    audio.preload = "metadata"; // kapıyı aç, tamamını hemen indirme
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  /* ── Çal: her iki koşul sağlandığında ────────────────── */
  const tryPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !unlockedRef.current || !wantPlayRef.current) return;
    if (!audio.paused) return;
    audio.play()
      .then(() => setPlaying(true))
      .catch(() => { /* autoplay engellendi — sessizce devam */ });
  }, []);

  /* ── Ses kilidini aç (kullanıcı dokunuşunda) ─────────── */
  const unlock = useCallback(() => {
    unlockedRef.current = true;
    wantPlayRef.current = true;

    // iOS Safari: AudioContext ile sessizce kilidi aç
    try {
      const AudioCtxCtor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxCtor) {
        const ctx = new AudioCtxCtor();
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        setTimeout(() => ctx.close().catch(() => {}), 500);
      }
    } catch { /* desteklenmiyor */ }

    tryPlay();
  }, [tryPlay]);

  /* ── Landing açıldığında devam et ────────────────────── */
  const resumeOnLanding = useCallback(() => {
    wantPlayRef.current = true;
    tryPlay();
  }, [tryPlay]);

  /* ── Landing kapandığında durdur ─────────────────────── */
  const pauseOnLeave = useCallback(() => {
    wantPlayRef.current = false;
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
  }, []);

  /* ── Kullanıcı mute/unmute ────────────────────────────── */
  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      wantPlayRef.current = true;
      audio.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      wantPlayRef.current = false;
      audio.pause();
      setPlaying(false);
    }
  }, []);

  return (
    <BgMusicContext.Provider
      value={{ playing, toggle, unlock, resumeOnLanding, pauseOnLeave }}
    >
      {children}
    </BgMusicContext.Provider>
  );
}
