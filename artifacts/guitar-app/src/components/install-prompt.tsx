import { useEffect, useState } from "react";
import { X, Share, PlusSquare } from "lucide-react";

type Platform = "ios" | "android" | null;

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  const isIOS     = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
  const isAndroid = /Android/.test(ua);
  if (isIOS)     return "ios";
  if (isAndroid) return "android";
  return null;
}

function isInStandaloneMode(): boolean {
  return (
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

const DISMISS_KEY = "guitar_pwa_dismissed";

export function InstallPrompt() {
  const [show, setShow]     = useState(false);
  const [platform, setPlatform] = useState<Platform>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt?: () => void } | null>(null);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const p = detectPlatform();
    if (!p) return;
    setPlatform(p);

    if (p === "android") {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as Event & { prompt?: () => void });
        setShow(true);
      };
      window.addEventListener("beforeinstallprompt", handler as EventListener);
      const t = setTimeout(() => setShow(true), 3000);
      return () => {
        window.removeEventListener("beforeinstallprompt", handler as EventListener);
        clearTimeout(t);
      };
    }

    // ios
    const t = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  const installAndroid = () => {
    if (deferredPrompt?.prompt) {
      deferredPrompt.prompt();
    }
    dismiss();
  };

  if (!show) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9998] flex items-start gap-3 px-4 py-4 shadow-2xl border-t border-blue-100"
      style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(8px)" }}
      role="banner"
      aria-label="Uygulamayı ana ekrana ekle"
    >
      <img
        src="icon-192.png"
        alt="Gitar Öğreniyorum"
        className="w-12 h-12 rounded-2xl flex-shrink-0 shadow-md object-cover"
      />

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-gray-900 leading-tight">Ana Ekrana Ekle</p>

        {platform === "ios" ? (
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">
            Paylaş{" "}
            <Share className="inline w-3.5 h-3.5 text-blue-500 align-text-bottom" />
            {" "}butonuna bas → <strong>Ana Ekrana Ekle</strong>{" "}
            <PlusSquare className="inline w-3.5 h-3.5 text-blue-500 align-text-bottom" />
          </p>
        ) : (
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">
            Uygulamayı telefona ekle — hızlı, offline çalışır.
          </p>
        )}
      </div>

      {platform === "android" && deferredPrompt?.prompt && (
        <button
          onClick={installAndroid}
          className="flex-shrink-0 text-xs font-bold text-white px-3 py-1.5 rounded-xl"
          style={{ background: "linear-gradient(135deg, #4299e1, #6C63FF)" }}
        >
          Ekle
        </button>
      )}

      <button
        onClick={dismiss}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded-full"
        aria-label="Kapat"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
