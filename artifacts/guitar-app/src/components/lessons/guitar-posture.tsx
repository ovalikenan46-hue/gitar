import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import postureImg from "@assets/ChatGPT_Image_1_May_2026_09_19_12_1777616524016.png";

export function GuitarPosture() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  return (
    <div className="space-y-4">
      {/* Thumbnail — click to open */}
      <div
        className="rounded-3xl overflow-hidden shadow-lg border border-primary/10 bg-white cursor-zoom-in"
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        aria-label="Görseli tam ekran aç"
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen(true); }}
      >
        <img
          src={postureImg}
          alt="Gitar Tutuş Pozisyonu"
          className="w-full h-auto object-contain"
          draggable={false}
        />
        {/* Hint badge */}
        <div className="flex justify-center pb-3">
          <span className="inline-flex items-center gap-1 text-xs text-primary/60 bg-primary/5 rounded-full px-3 py-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
            Büyütmek için tıkla
          </span>
        </div>
      </div>

      {/* Lightbox portal */}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="lightbox-overlay"
              className="fixed inset-0 z-[9999] flex items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.88)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={close}
            >
              {/* Image */}
              <motion.img
                src={postureImg}
                alt="Gitar Tutuş Pozisyonu"
                draggable={false}
                className="select-none"
                style={{
                  maxWidth: "min(96vw, 1200px)",
                  maxHeight: "92vh",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  borderRadius: 20,
                  boxShadow: "0 8px 64px rgba(0,0,0,0.7)",
                  cursor: "zoom-out",
                }}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 26 }}
                onClick={(e) => e.stopPropagation()}
              />

              {/* Close button */}
              <motion.button
                className="absolute top-4 right-4 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-sm text-white transition-colors"
                style={{ width: 44, height: 44 }}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1 }}
                onClick={close}
                aria-label="Kapat"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
