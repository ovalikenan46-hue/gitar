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
    audio.src     = BG_SRC; // src en sona — preload ayarlandıktan sonra
    audio.load();
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  /**
   * iOS/Android ses kilidi açma.
   * Bu fonksiyon MUTLAKA kullanıcı gesture (tap/click) event handler'ından
   * senkron olarak çağrılmalı. setTimeout veya Promise callback içinden
   * çağrılırsa iOS bloklayabilir.
   */
  const unlock = useCallback(() => {
    wantPlayRef.current = true;
    const audio = audioRef.current;
    if (!audio) return;

    if (unlockedRef.current) {
      // Zaten açık — sadece çal
      if (audio.paused) {
        audio.play().then(() => setPlaying(true)).catch(() => {});
      }
      return;
    }

    unlockedRef.current = true;

    // iOS/Android: audio.play() kullanıcı gesture içinde senkron çağrılmalı
    audio.play()
      .then(() => {
        setPlaying(true);
      })
      .catch((err: Error) => {
        // NotSupportedError = dosya formatı sorunu
        // NotAllowedError   = policy/autoplay engeli
        // AbortError        = başka bir play/pause yarış durumu
        if (err.name === "AbortError") {
          // Yarış durumu — biraz bekle ve tekrar dene
          setTimeout(() => {
            if (!wantPlayRef.current || !unlockedRef.current) return;
            audio.play().then(() => setPlaying(true)).catch(() => {});
          }, 200);
        }
        // Diğer hatalar için sessizce devam et
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
      value={{ playing, toggle, unlock, resumeOnLanding, pauseOnLeave }}
    >
      {children}
    </BgMusicContext.Provider>
  );
}
