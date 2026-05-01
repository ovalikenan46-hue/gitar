import { useCallback, useRef } from "react";

export function useSound(src: string, volume = 1) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
    }
    const audio = audioRef.current;
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, [src, volume]);

  return play;
}
