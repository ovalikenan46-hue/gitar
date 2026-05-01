import { useCallback, useEffect, useRef, useState } from "react";
import { BgMusicContext, BG_SRC } from "./bg-music-context";

export function BgMusicProvider({ children }: { children: React.ReactNode }) {
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);  // true after first user gesture (splash done)
  const wantPlayRef = useRef(false);  // true while landing page is mounted
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
    audio.play().then(() => setPlaying(true)).catch(() => {});
  }, []);

  const unlock = useCallback(() => {
    unlockedRef.current = true;
    tryPlay();
  }, [tryPlay]);

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
