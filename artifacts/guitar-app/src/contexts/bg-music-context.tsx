import { createContext, useContext } from "react";

export interface BgMusicCtx {
  playing: boolean;
  toggle: () => void;
  unlock: () => void;
  resumeOnLanding: () => void;
  pauseOnLeave: () => void;
}

const BASE = (import.meta as { env: { BASE_URL: string } }).env.BASE_URL ?? "/";

export const BG_SRC =
  BASE.replace(/\/$/, "") + "/sounds/bg-music.mp3";

export const BgMusicContext = createContext<BgMusicCtx>({
  playing: false,
  toggle: () => {},
  unlock: () => {},
  resumeOnLanding: () => {},
  pauseOnLeave: () => {},
});

export function useBgMusic() {
  return useContext(BgMusicContext);
}
