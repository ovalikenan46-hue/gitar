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

    /**
     * iOS / Android ilk dokunuş fallback'i.
     * Splash'ta gesture olmadığından unlock() bloklanabilir.
     * wantPlayRef=true ama unlockedRef=false ise, kullanıcının
     * sayfada ilk dokunuşunda ses başlatılır.
     */
    const onFirstInteraction = () => {
      if (wantPlayRef.current && !unlockedRef.current) {
        unlockedRef.current = true;
        audio.play().then(() => setPlaying(true)).catch(() => {});
      }
    };
    document.addEventListener("touchstart", onFirstInteraction, { once: true });
    document.addEventListener("click",      onFirstInteraction, { once: true });

    return () => {
      document.removeEventListener("touchstart", onFirstInteraction);
      document.removeEventListener("click",      onFirstInteraction);
      audio.pause();
      audio.src = "";
    };
  }, []);

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

    unlockedRef.current = true;
    audio.play()
      .then(() => setPlaying(true))
      .catch((err: Error) => {
        // iOS autoplay blokladı — ilk dokunuşta onFirstInteraction devreye girer
        unlockedRef.current = false; // tekrar denenmesi için sıfırla
        if (err.name === "AbortError") {
          setTimeout(() => {
            if (!wantPlayRef.current) return;
            audio.play().then(() => setPlaying(true)).catch(() => {});
          }, 300);
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
      value={{ playing, toggle, unlock, resumeOnLanding, pauseOnLeave }}
    >
      {children}
    </BgMusicContext.Provider>
  );
}
