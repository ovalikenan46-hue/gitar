import { useCallback, useEffect, useRef, useState } from "react";
import { BgMusicContext, BG_SRC } from "./bg-music-context";

export function BgMusicProvider({ children }: { children: React.ReactNode }) {
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);  // true after first user gesture
  const wantPlayRef = useRef(false);  // true while landing is visible
  const [playing, setPlaying] = useState(false);

  /* ── Audio element — preload:auto ile hazır beklet ────── */
  useEffect(() => {
    const audio = new Audio(BG_SRC);
    audio.loop    = true;
    audio.volume  = 0.45;
    audio.preload = "auto"; // tam olarak yükle — ilk dokunuşta gecikme olmasın
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  /* ── Çal ─────────────────────────────────────────────── */
  const tryPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !unlockedRef.current || !wantPlayRef.current) return;
    if (!audio.paused) return;
    audio.play()
      .then(() => setPlaying(true))
      .catch(() => {/* autoplay engellendi — kullanıcı hareketi bekleniyor */});
  }, []);

  /* ── Ses kilidini aç (kullanıcı dokunuşunda çağrılır) ── */
  const unlock = useCallback(() => {
    if (unlockedRef.current) {
      // Zaten açık — sadece çalmayı dene
      wantPlayRef.current = true;
      tryPlay();
      return;
    }
    unlockedRef.current = true;
    wantPlayRef.current = true;

    const audio = audioRef.current;
    if (!audio) return;

    // Kısa süreliğine sessiz çal/durdur → iOS/Android audio session kilidi açılır
    audio.volume = 0;
    audio.play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 0.45;
        // Şimdi gerçekten başlat
        if (wantPlayRef.current) {
          audio.play()
            .then(() => setPlaying(true))
            .catch(() => {});
        }
      })
      .catch(() => {
        // Sessiz çalma bile başarısız oldu — direkt dene
        audio.volume = 0.45;
        audio.play()
          .then(() => setPlaying(true))
          .catch(() => {});
      });
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
