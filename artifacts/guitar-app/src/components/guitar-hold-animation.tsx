import { useState, useCallback } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw } from "lucide-react";

/* ─── SVG Scene ─── */
function GuitarScene({ playing }: { playing: boolean }) {
  /* Strumming hand: down-up-down-up */
  const strumVariants = {
    idle: { y: 0 },
    playing: {
      y: [0, 14, -8, 14, -8, 14, 0],
      transition: {
        duration: 1.6,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "loop" as const,
      },
    },
  };

  /* Left hand subtle finger movement */
  const leftHandVariants = {
    idle: { x: 0, y: 0 },
    playing: {
      x: [0, -2, 0, 1, 0],
      y: [0, 1, 0, -1, 0],
      transition: {
        duration: 2.4,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "loop" as const,
      },
    },
  };

  /* Subtle body breathing */
  const bodyVariants = {
    idle: { scaleY: 1 },
    playing: {
      scaleY: [1, 1.015, 1],
      transition: { duration: 3, ease: "easeInOut", repeat: Infinity },
    },
  };

  /* Guitar glow pulse */
  const glowVariants = {
    idle: { opacity: 0.2, scale: 1 },
    playing: {
      opacity: [0.15, 0.45, 0.15],
      scale: [1, 1.04, 1],
      transition: { duration: 2, ease: "easeInOut", repeat: Infinity },
    },
  };

  const state = playing ? "playing" : "idle";

  return (
    <svg
      viewBox="0 0 380 460"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      style={{ maxHeight: 420 }}
    >
      {/* ── Background gradient ── */}
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#f0f7ff" />
          <stop offset="100%" stopColor="#e8fdf8" />
        </radialGradient>
        <radialGradient id="guitarGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6C63FF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#6C63FF" stopOpacity="0" />
        </radialGradient>
        {/* Guitar wood gradient */}
        <linearGradient id="guitarBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C8873A" />
          <stop offset="40%" stopColor="#A0612A" />
          <stop offset="100%" stopColor="#7A4420" />
        </linearGradient>
        <linearGradient id="guitarNeck" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8B5E3C" />
          <stop offset="100%" stopColor="#6B3F1C" />
        </linearGradient>
        {/* Chair wood */}
        <linearGradient id="chairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#D4A574" />
          <stop offset="100%" stopColor="#B8865A" />
        </linearGradient>
        {/* Skin */}
        <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFCBA4" />
          <stop offset="100%" stopColor="#F5B080" />
        </linearGradient>
        {/* Clothes */}
        <linearGradient id="shirtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6C63FF" />
          <stop offset="100%" stopColor="#4A42CC" />
        </linearGradient>
        <linearGradient id="pantsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="4" stdDeviation="6" floodOpacity="0.12" />
        </filter>
        <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <rect width="380" height="460" fill="url(#bgGrad)" rx="24" />

      {/* ── Guitar glow ── */}
      <motion.ellipse
        cx="232" cy="290" rx="70" ry="90"
        fill="url(#guitarGlow)"
        variants={glowVariants}
        animate={state}
        style={{ originX: "232px", originY: "290px" }}
      />

      {/* ══════════════════════════════════
          CHAIR
      ══════════════════════════════════ */}
      {/* Seat */}
      <rect x="120" y="370" width="150" height="18" rx="6" fill="url(#chairGrad)" filter="url(#softShadow)" />
      {/* Front legs */}
      <rect x="132" y="388" width="12" height="55" rx="4" fill="#B8865A" />
      <rect x="246" y="388" width="12" height="55" rx="4" fill="#B8865A" />
      {/* Back legs (partially hidden) */}
      <rect x="138" y="375" width="10" height="18" rx="3" fill="#C49060" opacity="0.5" />
      <rect x="242" y="375" width="10" height="18" rx="3" fill="#C49060" opacity="0.5" />

      {/* ══════════════════════════════════
          CHARACTER BODY
      ══════════════════════════════════ */}
      <motion.g variants={bodyVariants} animate={state} style={{ originX: "195px", originY: "340px" }}>
        {/* ── Right leg (extends forward, guitar rests here) ── */}
        <rect x="200" y="332" width="38" height="42" rx="10" fill="url(#pantsGrad)" />
        <rect x="202" y="365" width="34" height="16" rx="5" fill="#2563EB" />
        {/* Right shoe */}
        <ellipse cx="222" cy="383" rx="18" ry="8" fill="#1E293B" />

        {/* ── Left leg (slightly to left) ── */}
        <rect x="152" y="330" width="38" height="46" rx="10" fill="url(#pantsGrad)" />
        <rect x="154" y="364" width="34" height="16" rx="5" fill="#2563EB" />
        {/* Left shoe */}
        <ellipse cx="172" cy="382" rx="18" ry="8" fill="#1E293B" />

        {/* ── Torso ── */}
        <rect x="148" y="255" width="95" height="95" rx="22" fill="url(#shirtGrad)" filter="url(#softShadow)" />
        {/* Collar detail */}
        <path d="M185 255 L195 270 L205 255" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
        {/* Shirt pocket */}
        <rect x="160" y="278" width="20" height="16" rx="4" stroke="white" strokeWidth="1.5" fill="none" opacity="0.3" />
      </motion.g>

      {/* ══════════════════════════════════
          GUITAR (rests on right leg)
      ══════════════════════════════════ */}
      <g filter="url(#softShadow)">
        {/* Neck */}
        <rect x="210" y="145" width="22" height="145" rx="6" fill="url(#guitarNeck)" transform="rotate(-8 210 145)" />
        {/* Frets */}
        {[160, 175, 190, 205, 220, 235, 248, 260, 272].map((y, i) => (
          <line
            key={i}
            x1="206" y1={y} x2="226" y2={y - 2}
            stroke="#D4A020" strokeWidth="1.5" opacity="0.7"
            transform="rotate(-8 216 200)"
          />
        ))}
        {/* Headstock */}
        <rect x="206" y="138" width="30" height="22" rx="6" fill="#7A4420" transform="rotate(-8 220 149)" />
        {/* Tuning pegs */}
        <circle cx="208" cy="143" r="4" fill="#C0A060" transform="rotate(-8 220 149)" />
        <circle cx="216" cy="141" r="4" fill="#C0A060" transform="rotate(-8 220 149)" />
        <circle cx="224" cy="139" r="4" fill="#C0A060" transform="rotate(-8 220 149)" />
        <circle cx="230" cy="143" r="4" fill="#C0A060" transform="rotate(-8 220 149)" />
        <circle cx="224" cy="148" r="4" fill="#C0A060" transform="rotate(-8 220 149)" />
        <circle cx="216" cy="150" r="4" fill="#C0A060" transform="rotate(-8 220 149)" />

        {/* Guitar body — classical hourglass shape */}
        {/* Lower bout (larger) */}
        <ellipse cx="233" cy="310" rx="52" ry="62" fill="url(#guitarBody)" />
        {/* Upper bout (smaller) */}
        <ellipse cx="228" cy="230" rx="40" ry="48" fill="url(#guitarBody)" />
        {/* Waist */}
        <path d="M188 268 Q178 248 188 232 L268 238 Q278 258 268 272 Z" fill="url(#guitarBody)" />
        {/* Bridge/nut detail */}
        <rect x="210" y="330" width="46" height="6" rx="3" fill="#5A3010" />

        {/* Sound hole */}
        <circle cx="232" cy="280" r="22" fill="#1A0A00" opacity="0.85" />
        <circle cx="232" cy="280" r="22" stroke="#8B5A20" strokeWidth="3" fill="none" />
        {/* Rose (decorative ring) */}
        <circle cx="232" cy="280" r="18" stroke="#C8873A" strokeWidth="1" strokeDasharray="4 3" fill="none" opacity="0.5" />

        {/* Strings (6 strings across body) */}
        {[-10, -6, -2, 2, 6, 10].map((offset, i) => (
          <line
            key={i}
            x1={232 + offset} y1="215"
            x2={232 + offset * 1.1} y2="336"
            stroke={i < 3 ? "#C0C0C0" : "#D4A020"}
            strokeWidth={i < 3 ? 1 : 1.5}
            opacity="0.9"
          />
        ))}

        {/* Guitar body shine */}
        <ellipse cx="220" cy="265" rx="14" ry="28" fill="white" opacity="0.08" transform="rotate(-10 220 265)" />
      </g>

      {/* ══════════════════════════════════
          LEFT ARM + HAND (on neck)
      ══════════════════════════════════ */}
      <motion.g variants={leftHandVariants} animate={state}>
        {/* Left upper arm */}
        <rect x="140" y="262" width="28" height="16" rx="8" fill="url(#shirtGrad)"
          transform="rotate(-30 154 270)" />
        {/* Left forearm */}
        <rect x="118" y="240" width="32" height="14" rx="7" fill="url(#skinGrad)"
          transform="rotate(-60 134 247)" />
        {/* Left hand on neck */}
        <ellipse cx="198" cy="220" rx="16" ry="11" fill="url(#skinGrad)" transform="rotate(-8 198 220)" />
        {/* Fingers */}
        {[-6, -2, 2, 6].map((off, i) => (
          <rect key={i} x={193 + off} y="207" width="6" height="12" rx="3"
            fill="url(#skinGrad)" transform={`rotate(-8 ${196 + off} 213)`} />
        ))}
      </motion.g>

      {/* ══════════════════════════════════
          RIGHT ARM + STRUMMING HAND
      ══════════════════════════════════ */}
      {/* Right upper arm — static */}
      <rect x="228" y="262" width="28" height="16" rx="8" fill="url(#shirtGrad)"
        transform="rotate(20 242 270)" />

      {/* Right forearm + hand — animated */}
      <motion.g variants={strumVariants} animate={state} style={{ originX: "238px", originY: "275px" }}>
        {/* Forearm */}
        <rect x="234" y="255" width="30" height="13" rx="6" fill="url(#skinGrad)"
          transform="rotate(60 249 261)" />
        {/* Hand (palm) */}
        <ellipse cx="242" cy="280" rx="12" ry="9" fill="url(#skinGrad)" />
        {/* Fingers strumming */}
        <rect x="238" y="272" width="5" height="11" rx="2.5" fill="url(#skinGrad)" transform="rotate(-10 240 277)" />
        <rect x="244" y="271" width="5" height="13" rx="2.5" fill="url(#skinGrad)" transform="rotate(-5 246 277)" />
        <rect x="250" y="272" width="5" height="11" rx="2.5" fill="url(#skinGrad)" transform="rotate(5 252 277)" />
        {/* Thumb */}
        <ellipse cx="234" cy="284" rx="5" ry="7" fill="url(#skinGrad)" transform="rotate(30 234 284)" />
      </motion.g>

      {/* ══════════════════════════════════
          HEAD + FACE
      ══════════════════════════════════ */}
      {/* Hair */}
      <ellipse cx="195" cy="210" rx="44" ry="20" fill="#3D2C1E" />
      <ellipse cx="195" cy="218" rx="44" ry="36" fill="#3D2C1E" />
      {/* Face */}
      <ellipse cx="195" cy="226" rx="38" ry="42" fill="url(#skinGrad)" />
      {/* Hair top detail */}
      <ellipse cx="195" cy="192" rx="35" ry="16" fill="#4A3525" />

      {/* Eyes */}
      <ellipse cx="180" cy="220" rx="7" ry="8" fill="white" />
      <ellipse cx="210" cy="220" rx="7" ry="8" fill="white" />
      <circle cx="182" cy="222" r="4.5" fill="#2C1810" />
      <circle cx="212" cy="222" r="4.5" fill="#2C1810" />
      {/* Eye shine */}
      <circle cx="184" cy="220" r="1.5" fill="white" />
      <circle cx="214" cy="220" r="1.5" fill="white" />
      {/* Eyebrows — focused/concentrating */}
      <path d="M174 212 Q181 209 187 212" stroke="#3D2C1E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M203 212 Q210 209 216 212" stroke="#3D2C1E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Smile */}
      <path d="M182 238 Q195 248 208 238" stroke="#C47A6A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Nose */}
      <ellipse cx="195" cy="230" rx="4" ry="3" fill="#E8A080" opacity="0.5" />
      {/* Cheeks */}
      <ellipse cx="173" cy="236" rx="8" ry="5" fill="#FFB6B0" opacity="0.35" />
      <ellipse cx="217" cy="236" rx="8" ry="5" fill="#FFB6B0" opacity="0.35" />
      {/* Ears */}
      <ellipse cx="157" cy="228" rx="7" ry="10" fill="url(#skinGrad)" />
      <ellipse cx="233" cy="228" rx="7" ry="10" fill="url(#skinGrad)" />

      {/* ══════════════════════════════════
          SPEECH BUBBLE
      ══════════════════════════════════ */}
      <g>
        <rect x="242" y="162" width="120" height="46" rx="16" fill="#6C63FF" filter="url(#softShadow)" />
        {/* Tail */}
        <path d="M258 208 L244 220 L272 208Z" fill="#6C63FF" />
        <text x="302" y="182" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="system-ui">
          Gitarı
        </text>
        <text x="302" y="198" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="system-ui">
          böyle tut!
        </text>
      </g>

      {/* ══════════════════════════════════
          ANNOTATION ARROWS
      ══════════════════════════════════ */}
      {/* Right hand annotation */}
      <line x1="84" y1="282" x2="228" y2="280" stroke="#FF8C00" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.7" />
      <circle cx="84" cy="282" r="4" fill="#FF8C00" opacity="0.8" />
      <text x="14" y="268" fill="#FF8C00" fontSize="9.5" fontWeight="600" fontFamily="system-ui">Sağ el:</text>
      <text x="6" y="280" fill="#FF8C00" fontSize="9" fontFamily="system-ui">Tel üstünde</text>

      {/* Left hand annotation */}
      <line x1="96" y1="218" x2="184" y2="218" stroke="#00C2A8" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.7" />
      <circle cx="96" cy="218" r="4" fill="#00C2A8" opacity="0.8" />
      <text x="12" y="205" fill="#00C2A8" fontSize="9.5" fontWeight="600" fontFamily="system-ui">Sol el:</text>
      <text x="8" y="217" fill="#00C2A8" fontSize="9" fontFamily="system-ui">Klavyede</text>

      {/* Guitar position annotation */}
      <line x1="284" y1="318" x2="270" y2="318" stroke="#4CAF50" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.7" />
      <circle cx="284" cy="318" r="4" fill="#4CAF50" opacity="0.8" />
      <text x="288" y="314" fill="#4CAF50" fontSize="9.5" fontWeight="600" fontFamily="system-ui">Sağ bacak</text>
      <text x="290" y="326" fill="#4CAF50" fontSize="9" fontFamily="system-ui">üstünde</text>

      {/* Back straight annotation */}
      <line x1="98" y1="300" x2="150" y2="300" stroke="#6C63FF" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.7" />
      <circle cx="98" cy="300" r="4" fill="#6C63FF" opacity="0.8" />
      <text x="10" y="295" fill="#6C63FF" fontSize="9.5" fontWeight="600" fontFamily="system-ui">Sırt:</text>
      <text x="12" y="307" fill="#6C63FF" fontSize="9" fontFamily="system-ui">Dik ve rahat</text>
    </svg>
  );
}

/* ─── Main Component ─── */
export function GuitarHoldAnimation() {
  const [playing, setPlaying] = useState(true);
  const [key, setKey] = useState(0);

  const handleReplay = useCallback(() => {
    setPlaying(false);
    setTimeout(() => {
      setKey((k) => k + 1);
      setPlaying(true);
    }, 100);
  }, []);

  const tips = [
    { color: "#6C63FF", icon: "🪑", label: "Oturuş", text: "Sırtını dik tut, omuzların rahat olsun. Sandalyenin kenarına otur." },
    { color: "#FF8C00", icon: "🤚", label: "Sağ el", text: "Sağ elin ses deliği üzerinde hafifçe dursun, yukarı-aşağı vur." },
    { color: "#00C2A8", icon: "🖐️", label: "Sol el", text: "Sol elin baş parmağı sap arkasında, diğer parmaklar klavyeye hafifçe bassın." },
    { color: "#4CAF50", icon: "🎸", label: "Gitar", text: "Gitar sağ bacağın üzerinde, hafif öne eğik şekilde duracak." },
  ];

  return (
    <div className="rounded-3xl overflow-hidden bg-white/80 backdrop-blur-sm shadow-xl border border-primary/10">
      {/* Header */}
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-foreground">Doğru Gitar Tutuşu</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Klasik gitar pozisyonu — adım adım öğren</p>
        </div>
        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md transition-transform active:scale-95"
            style={{ background: playing ? "#6C63FF" : "#00C2A8" }}
            aria-label={playing ? "Duraklat" : "Oynat"}
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            onClick={handleReplay}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md transition-transform active:scale-95"
            style={{ background: "#FF8C00" }}
            aria-label="Yeniden başlat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Animation area */}
      <div className="px-4 py-2">
        <motion.div
          key={key}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <GuitarScene playing={playing} />
        </motion.div>
      </div>

      {/* Tip cards */}
      <div className="px-4 pb-5 pt-1 grid grid-cols-2 gap-2.5">
        {tips.map((tip) => (
          <div
            key={tip.label}
            className="rounded-2xl p-3 flex gap-2.5 items-start"
            style={{ background: tip.color + "12", border: `1.5px solid ${tip.color}30` }}
          >
            <span className="text-xl shrink-0 mt-0.5">{tip.icon}</span>
            <div>
              <p className="text-xs font-bold mb-0.5" style={{ color: tip.color }}>{tip.label}</p>
              <p className="text-[11px] text-gray-600 leading-relaxed">{tip.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Status indicator */}
      <div className="px-5 pb-4 flex items-center gap-2">
        <AnimatePresence mode="wait">
          {playing ? (
            <motion.div
              key="playing"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              className="flex items-center gap-1.5"
            >
              <motion.div
                className="w-2 h-2 rounded-full bg-green-500"
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-xs text-green-600 font-medium">Animasyon oynatılıyor</span>
            </motion.div>
          ) : (
            <motion.div
              key="paused"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              className="flex items-center gap-1.5"
            >
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-xs text-gray-500 font-medium">Duraklatıldı</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
