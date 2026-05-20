import { createContext, useContext } from "react";

export interface BgMusicCtx {
  playing: boolean;
  toggle: () => void;
  /** Intro bitmeden BG müziği ÇALMA, sadece iOS ses kilidini aç (sessiz play/pause) */
  preUnlock: () => void;
  /** Intro bittikten sonra bg-music'i gerçekten başlat */
  unlock: () => void;
  resumeOnLanding: () => void;
  pauseOnLeave: () => void;
}

const BASE = (import.meta as { env: { BASE_URL: string } }).env.BASE_URL ?? "/";

/**
 * .mp3 uzantısı zorunlu: iOS Safari, video/mpeg MIME tipini <audio>'da reddeder.
 */
export const BG_SRC =
  BASE.replace(/\/$/, "") + "/sounds/bg-music.mp3";

export const BgMusicContext = createContext<BgMusicCtx>({
  playing: false,
  toggle: () => {},
  preUnlock: () => {},
  unlock: () => {},
  resumeOnLanding: () => {},
  pauseOnLeave: () => {},
});

export function useBgMusic() {
  return useContext(BgMusicContext);
}
