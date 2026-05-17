import { useCallback, useEffect, useRef, useState } from "react";
import { BgMusicContext, BG_SRC } from "./bg-music-context";

export function BgMusicProvider({ children }: { children: React.ReactNode }) {
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);
  const wantPlayRef = useRef(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = new Audio(BG_SRC);
    audio.loop    = true;
    audio.volume  = 0.45;
    audio.preload = "auto";
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const tryPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !unlockedRef.current || !wantPlayRef.current) return;
    if (!audio.paused) return;
    audio.play()
      .then(() => setPlaying(true))
      .catch(() => {});
  }, []);

  /**
   * Kullanıcı hareketi (button tap/click) içinde DOĞRUDAN çağrılmalı.
   * iOS/Android: audio.play() kullanıcı hareketi event handler'ında
   * senkron çağrıldığında izin verilir — asenkron callback'te çalışmaz.
   */
  const unlock = useCallback(() => {
    wantPlayRef.current = true;
    const audio = audioRef.current;
    if (!audio) return;

    if (unlockedRef.current) {
      // Zaten açık, sadece çal
      if (audio.paused) {
        audio.play().then(() => setPlaying(true)).catch(() => {});
      }
      return;
    }

    unlockedRef.current = true;
    // Tek bir play() çağrısı — kullanıcı hareketi event'ine doğrudan bağlı
    audio.play()
      .then(() => setPlaying(true))
      .catch(() => {
        // Autoplay tamamen bloklandı (ör. bazı desktop tarayıcılar)
        // Sessizce devam et — kullanıcı ses butonundan açabilir
      });
  }, []);

  const resumeOnLanding = useCallback(() => {
    wantPlayRef.current = true;
    tryPlay();
  }, [tryPlay]);

  const pauseOnLeave = useCallback(() => {
    wantPlayRef.current = false;
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      wantPlayRef.current = true;
      unlockedRef.current = true;
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
