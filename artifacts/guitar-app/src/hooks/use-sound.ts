import { useCallback, useEffect, useRef } from "react";

const BASE = (import.meta as { env: { BASE_URL: string } }).env.BASE_URL ?? "/";

export function useSound(path: string, volume = 1) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pre-load the audio element so it's ready for the first click
  useEffect(() => {
    const src = BASE.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = volume;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [path, volume]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);

  return play;
}
