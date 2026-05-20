import { useCallback, useEffect, useRef, useState } from "react";
import { BgMusicContext, BG_SRC } from "./bg-music-context";

export function BgMusicProvider({ children }: { children: React.ReactNode }) {
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);
  const wantPlayRef = useRef(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = new Audio();
    audio.loop    = true;
    audio.volume  = 0.45;
    audio.preload = "auto";
    audio.src     = BG_SRC;
    audio.load();
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  /**
   * preUnlock — KULLANICI GESTURE içinde çağrılmalı.
   *
   * iOS Safari kuralı: audio.play() yalnızca tap/click handler'ında senkron
   * çağrılırsa izin verilir. Bu fonksiyon sessizce (vol=0) play→pause yaparak
   * audio element'i "user-activated" duruma getirir. Böylece intro bittikten
   * sonra setTimeout içinden bile bg-music başlatılabilir.
   *
   * ÇALMAZ — sadece kilit açar.
   */
  const preUnlock = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || unlockedRef.current) return;
    const savedVol = audio.volume;
    audio.volume = 0;
    audio.play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = savedVol;
        unlockedRef.current = true;
      })
      .catch(() => {
        audio.volume = savedVol;
      });
  }, []);

  /**
   * unlock — bg-music'i gerçekten BAŞLATIR.
   * Eğer preUnlock zaten çağrıldıysa (unlock edildi), play() çalışır.
   * Eğer çağrılmadıysa (masaüstü autoplay akışı), ilk kez açar.
   * setTimeout / onComplete callback içinden çağrılabilir — iOS güvenli ✓
   */
  const unlock = useCallback(() => {
    wantPlayRef.current = true;
    const audio = audioRef.current;
    if (!audio) return;

    if (unlockedRef.current) {
      if (audio.paused) {
        audio.play().then(() => setPlaying(true)).catch(() => {});
      }
      return;
    }

    // Masaüstü / ilk kez: user gesture'dan çağrılmışsa çalışır
    unlockedRef.current = true;
    audio.play()
      .then(() => setPlaying(true))
      .catch((err: Error) => {
        if (err.name === "AbortError") {
          setTimeout(() => {
            if (!wantPlayRef.current) return;
            audio.play().then(() => setPlaying(true)).catch(() => {});
          }, 200);
        }
      });
  }, []);

  const resumeOnLanding = useCallback(() => {
    wantPlayRef.current = true;
    const audio = audioRef.current;
    if (!audio || !unlockedRef.current) return;
    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, []);

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
      value={{ playing, toggle, preUnlock, unlock, resumeOnLanding, pauseOnLeave }}
    >
      {children}
    </BgMusicContext.Provider>
  );
}
