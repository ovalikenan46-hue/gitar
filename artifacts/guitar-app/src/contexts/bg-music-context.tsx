import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface BgMusicCtx {
  playing: boolean;
  toggle: () => void;
  startAfterSplash: () => void;
}

const BASE = (import.meta as { env: { BASE_URL: string } }).env.BASE_URL ?? "/";
const BG_SRC = BASE.replace(/\/$/, "") + "/sounds/gitar_uygulama_alt_muzik_1777623358028.mpeg";

const BgMusicContext = createContext<BgMusicCtx>({
  playing: false,
  toggle: () => {},
  startAfterSplash: () => {},
});

export function BgMusicProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = new Audio(BG_SRC);
    audio.loop = true;
    audio.volume = 0.45;
    audio.preload = "auto";
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Called by App once splash finishes — user has just interacted, so play() will succeed
  const startAfterSplash = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play()
      .then(() => setPlaying(true))
      .catch(() => {
        // Browser still blocked; wait for next user gesture on landing page
        const handler = () => {
          audio.play().then(() => setPlaying(true)).catch(() => {});
          document.removeEventListener("pointerdown", handler);
        };
        document.addEventListener("pointerdown", handler);
      });
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, []);

  return (
    <BgMusicContext.Provider value={{ playing, toggle, startAfterSplash }}>
      {children}
    </BgMusicContext.Provider>
  );
}

export function useBgMusic() {
  return useContext(BgMusicContext);
}
