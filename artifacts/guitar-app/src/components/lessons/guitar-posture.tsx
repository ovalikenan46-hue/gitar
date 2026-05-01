import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw } from "lucide-react";

/* ─────────────────────────────────────
   Pure SVG animated classical-guitar-
   holding scene (front 3/4 view).
   Classical position: guitar on LEFT leg,
   left leg elevated, neck upper-left.
───────────────────────────────────── */

function ClassicalGuitarScene({ playing }: { playing: boolean }) {
  const st = playing ? "play" : "idle";

  /* ── Strumming (right hand) ── */
  const strumAnim = {
    idle: { y: 0, rotate: 0 },
    play: {
      y: [0, 12, -7, 10, -5, 12, 0],
      rotate: [0, 8, -5, 8, -3, 8, 0],
      transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" as const },
    },
  };

  /* ── Left hand (finger press micro-movement) ── */
  const leftHandAnim = {
    idle: { x: 0, y: 0 },
    play: {
      x: [0, -1.5, 0, 1, 0],
      y: [0, 1, 0, -1, 0],
      transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" as const },
    },
  };

  /* ── Guitar glow ── */
  const glowAnim = {
    idle: { opacity: 0 },
    play: {
      opacity: [0, 0.35, 0],
      transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" as const },
    },
  };

  /* ── Subtle body sway ── */
  const bodyAnim = {
    idle: { scaleY: 1 },
    play: {
      scaleY: [1, 1.012, 1],
      transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" as const },
    },
  };

  return (
    <svg
      viewBox="0 0 360 460"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full"
      style={{ maxHeight: 400 }}
    >
      <defs>
        <linearGradient id="bgGr" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EEF4FF" />
          <stop offset="100%" stopColor="#E8FDF8" />
        </linearGradient>
        <linearGradient id="woodGr" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4904A" />
          <stop offset="50%" stopColor="#A8621E" />
          <stop offset="100%" stopColor="#7A4210" />
        </linearGradient>
        <linearGradient id="neckGr" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7A5030" />
          <stop offset="100%" stopColor="#5A3010" />
        </linearGradient>
        <linearGradient id="shirtGr" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6C63FF" />
          <stop offset="100%" stopColor="#4A42CC" />
        </linearGradient>
        <linearGradient id="pantsGr" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="skinGr" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FDDCB8" />
          <stop offset="100%" stopColor="#F0B880" />
        </linearGradient>
        <linearGradient id="chairGr" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#D4A574" />
          <stop offset="100%" stopColor="#A87040" />
        </linearGradient>
        <radialGradient id="glowGr" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6C63FF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#6C63FF" stopOpacity="0" />
        </radialGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="3" stdDeviation="5" floodOpacity="0.10" />
        </filter>
      </defs>

      {/* Background */}
      <rect width="360" height="460" fill="url(#bgGr)" rx="20" />

      {/* ── CHAIR ── */}
      {/* Seat */}
      <rect x="100" y="368" width="162" height="18" rx="7" fill="url(#chairGr)" filter="url(#shadow)" />
      {/* Chair legs */}
      <rect x="112" y="385" width="12" height="60" rx="5" fill="#9A6030" />
      <rect x="238" y="385" width="12" height="60" rx="5" fill="#9A6030" />

      {/* ── FOOTSTOOL (for elevated left leg) ── */}
      <rect x="50" y="426" width="74" height="12" rx="5" fill="#B87840" />
      <rect x="58"  y="438" width="8" height="18" rx="3" fill="#9A6030" />
      <rect x="108" y="438" width="8" height="18" rx="3" fill="#9A6030" />

      {/* ── CHARACTER BODY ── */}
      <motion.g
        variants={bodyAnim}
        animate={st}
        style={{ originX: "193px", originY: "300px" }}
      >
        {/* Right leg (lower, resting normally) */}
        <rect x="202" y="300" width="38" height="72" rx="14" fill="url(#pantsGr)" />
        {/* Right shoe */}
        <ellipse cx="221" cy="378" rx="20" ry="9" fill="#1E293B" />

        {/* Left leg (elevated on footstool — angled forward-down) */}
        <path
          d="M148 300 Q140 330 108 360 Q92 378 87 398"
          stroke="url(#pantsGr)" strokeWidth="36" strokeLinecap="round" fill="none"
        />
        {/* Left shoe */}
        <ellipse cx="90" cy="404" rx="22" ry="10" fill="#1E293B" />

        {/* Torso */}
        <rect x="155" y="215" width="82" height="100" rx="22"
          fill="url(#shirtGr)" filter="url(#shadow)" />
        {/* Collar V */}
        <path d="M187 215 L196 232 L205 215" stroke="white" strokeWidth="2"
          strokeLinecap="round" fill="none" opacity="0.4" />
      </motion.g>

      {/* ── GUITAR (group rotated so neck points upper-left, body on left leg) ── */}
      {/* Glow behind guitar */}
      <motion.ellipse
        cx="152" cy="292" rx="62" ry="76"
        fill="url(#glowGr)"
        variants={glowAnim}
        animate={st}
      />

      <g transform="rotate(-18 155 290)" filter="url(#shadow)">
        {/* Neck */}
        <rect x="141" y="148" width="26" height="118" rx="8" fill="url(#neckGr)" />
        {/* Frets */}
        {[160, 174, 187, 199, 210, 221, 231, 240, 249, 257].map((y, i) => (
          <line key={i} x1="141" y1={y} x2="167" y2={y}
            stroke="#C0952A" strokeWidth="1.5" opacity="0.65" />
        ))}
        {/* Headstock */}
        <rect x="137" y="138" width="34" height="18" rx="7" fill="#5A3010" />
        {/* Tuning pegs */}
        {[0, 1, 2].map(i => (
          <circle key={i} cx={141 + i * 10} cy="138" r="4.5" fill="#C8A040" />
        ))}
        {[0, 1, 2].map(i => (
          <circle key={i} cx={141 + i * 10} cy="156" r="4.5" fill="#C8A040" />
        ))}

        {/* Upper bout */}
        <ellipse cx="154" cy="244" rx="38" ry="46" fill="url(#woodGr)" />
        {/* Lower bout */}
        <ellipse cx="154" cy="322" rx="52" ry="62" fill="url(#woodGr)" />
        {/* Waist (connecting path) */}
        <path d="M116 263 Q104 282 116 301 L192 301 Q204 282 192 263 Z"
          fill="url(#woodGr)" />

        {/* Bridge */}
        <rect x="128" y="338" width="52" height="7" rx="3" fill="#4A2808" />

        {/* Sound hole */}
        <circle cx="154" cy="285" r="24" fill="#0A0500" opacity="0.9" />
        <circle cx="154" cy="285" r="24"
          stroke="#8B5420" strokeWidth="3" fill="none" />
        <circle cx="154" cy="285" r="19"
          stroke="#C8873A" strokeWidth="1" strokeDasharray="5 4" fill="none" opacity="0.5" />

        {/* Strings (6) */}
        {[-12, -7, -2, 3, 8, 13].map((off, i) => (
          <line key={i}
            x1={154 + off * 0.6} y1="202"
            x2={154 + off} y2="345"
            stroke={i < 3 ? "#D0D0D0" : "#C8A830"}
            strokeWidth={i === 0 ? 2.5 : i < 3 ? 1.8 : 1.2}
            opacity="0.9"
          />
        ))}
        {/* Guitar shine */}
        <ellipse cx="142" cy="270" rx="10" ry="24"
          fill="white" opacity="0.07" transform="rotate(-5 142 270)" />
      </g>

      {/* ── LEFT ARM (goes up to guitar neck – upper-left area) ── */}
      <motion.g variants={leftHandAnim} animate={st}>
        {/* Upper arm */}
        <path d="M163 228 Q140 238 126 252"
          stroke="url(#shirtGr)" strokeWidth="18" strokeLinecap="round" fill="none" />
        {/* Forearm */}
        <path d="M126 252 Q116 258 108 260"
          stroke="url(#skinGr)" strokeWidth="14" strokeLinecap="round" fill="none" />
        {/* Hand on neck */}
        <ellipse cx="110" cy="260" rx="13" ry="10"
          fill="url(#skinGr)" transform="rotate(-20 110 260)" />
        {/* Fingers pressing */}
        {[-5, -1, 3, 7].map((off, i) => (
          <rect key={i} x={104 + off} y="250" width="5" height="10" rx="2.5"
            fill="url(#skinGr)"
            transform={`rotate(-25 ${106 + off} 255)`} />
        ))}
      </motion.g>

      {/* ── RIGHT ARM (comes over guitar body to sound hole) ── */}
      {/* Upper arm – static */}
      <path d="M228 228 Q220 255 214 268"
        stroke="url(#shirtGr)" strokeWidth="18" strokeLinecap="round" fill="none" />

      {/* Forearm + hand – animated (strumming) */}
      <motion.g
        variants={strumAnim}
        animate={st}
        style={{ originX: "200px", originY: "268px" }}
      >
        <path d="M214 268 Q200 272 192 278"
          stroke="url(#skinGr)" strokeWidth="14" strokeLinecap="round" fill="none" />
        {/* Palm */}
        <ellipse cx="188" cy="282" rx="13" ry="10"
          fill="url(#skinGr)" transform="rotate(15 188 282)" />
        {/* Fingers strumming */}
        <rect x="183" y="272" width="6" height="12" rx="3"
          fill="url(#skinGr)" transform="rotate(-10 186 278)" />
        <rect x="190" y="270" width="6" height="14" rx="3"
          fill="url(#skinGr)" transform="rotate(-5 193 277)" />
        <rect x="197" y="272" width="6" height="12" rx="3"
          fill="url(#skinGr)" transform="rotate(5 200 278)" />
        {/* Thumb */}
        <ellipse cx="180" cy="286" rx="5" ry="8"
          fill="url(#skinGr)" transform="rotate(30 180 286)" />
      </motion.g>

      {/* ── HEAD ── */}
      {/* Hair */}
      <ellipse cx="196" cy="178" rx="44" ry="20" fill="#3A2510" />
      <ellipse cx="196" cy="188" rx="44" ry="34" fill="#3A2510" />
      {/* Face */}
      <ellipse cx="196" cy="192" rx="38" ry="40" fill="url(#skinGr)" />
      {/* Hair top */}
      <ellipse cx="196" cy="162" rx="34" ry="16" fill="#4A3018" />

      {/* Eyes */}
      <ellipse cx="183" cy="186" rx="7" ry="8.5" fill="white" />
      <ellipse cx="210" cy="186" rx="7" ry="8.5" fill="white" />
      <circle cx="185" cy="188" r="5" fill="#1A0C00" />
      <circle cx="212" cy="188" r="5" fill="#1A0C00" />
      <circle cx="187" cy="186" r="1.8" fill="white" />
      <circle cx="214" cy="186" r="1.8" fill="white" />
      {/* Eyebrows – concentrating */}
      <path d="M177 178 Q184 175 190 178" stroke="#3A2510" strokeWidth="2.5"
        strokeLinecap="round" fill="none" />
      <path d="M202 178 Q209 175 215 178" stroke="#3A2510" strokeWidth="2.5"
        strokeLinecap="round" fill="none" />
      {/* Smile */}
      <path d="M184 204 Q196 213 208 204" stroke="#C06060" strokeWidth="2.5"
        strokeLinecap="round" fill="none" />
      {/* Nose */}
      <ellipse cx="196" cy="196" rx="4" ry="2.5" fill="#E09870" opacity="0.45" />
      {/* Cheeks */}
      <ellipse cx="175" cy="202" rx="8" ry="5" fill="#FFB0A0" opacity="0.30" />
      <ellipse cx="217" cy="202" rx="8" ry="5" fill="#FFB0A0" opacity="0.30" />
      {/* Ears */}
      <ellipse cx="158" cy="194" rx="7" ry="10" fill="url(#skinGr)" />
      <ellipse cx="234" cy="194" rx="7" ry="10" fill="url(#skinGr)" />

      {/* ── SPEECH BUBBLE ── */}
      <rect x="238" y="140" width="112" height="52" rx="16" fill="#6C63FF" filter="url(#shadow)" />
      <path d="M254 192 L242 208 L270 192" fill="#6C63FF" />
      <text x="294" y="161" textAnchor="middle" fill="white"
        fontSize="12.5" fontWeight="700" fontFamily="system-ui, sans-serif">Gitarı
      </text>
      <text x="294" y="178" textAnchor="middle" fill="white"
        fontSize="12.5" fontWeight="700" fontFamily="system-ui, sans-serif">böyle tut!
      </text>
      <text x="294" y="192" textAnchor="middle" fill="white"
        fontSize="11" fontFamily="system-ui, sans-serif" opacity="0.85">🎸
      </text>

      {/* ── ANNOTATION LABELS ── */}
      {/* 1: Left hand on neck */}
      <line x1="60" y1="250" x2="98" y2="258"
        stroke="#00C2A8" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.8" />
      <circle cx="60" cy="250" r="5" fill="#00C2A8" />
      <text x="4"  y="238" fill="#00C2A8" fontSize="9.5" fontWeight="700" fontFamily="system-ui">Sol el</text>
      <text x="2"  y="250" fill="#00C2A8" fontSize="9" fontFamily="system-ui">klavyede</text>

      {/* 2: Right hand strumming */}
      <line x1="276" y1="282" x2="208" y2="282"
        stroke="#FF8C00" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.8" />
      <circle cx="276" cy="282" r="5" fill="#FF8C00" />
      <text x="280" y="278" fill="#FF8C00" fontSize="9.5" fontWeight="700" fontFamily="system-ui">Sağ el</text>
      <text x="278" y="290" fill="#FF8C00" fontSize="9" fontFamily="system-ui">tel vurur</text>

      {/* 3: Guitar on left leg */}
      <line x1="60" y1="345" x2="100" y2="330"
        stroke="#4CAF50" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.8" />
      <circle cx="60" cy="345" r="5" fill="#4CAF50" />
      <text x="2"  y="340" fill="#4CAF50" fontSize="9.5" fontWeight="700" fontFamily="system-ui">Sol bacak</text>
      <text x="8"  y="352" fill="#4CAF50" fontSize="9" fontFamily="system-ui">üstünde</text>

      {/* 4: Straight back */}
      <line x1="282" y1="225" x2="237" y2="240"
        stroke="#6C63FF" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.8" />
      <circle cx="282" cy="225" r="5" fill="#6C63FF" />
      <text x="285" y="222" fill="#6C63FF" fontSize="9.5" fontWeight="700" fontFamily="system-ui">Sırt dik</text>
      <text x="283" y="234" fill="#6C63FF" fontSize="9" fontFamily="system-ui">rahat dur</text>
    </svg>
  );
}

/* ── Main exported component ── */
export function GuitarPosture() {
  const [playing, setPlaying]   = useState(true);
  const [sceneKey, setSceneKey] = useState(0);

  const replay = useCallback(() => {
    setPlaying(false);
    setTimeout(() => { setSceneKey(k => k + 1); setPlaying(true); }, 80);
  }, []);

  const tips = [
    {
      color: "#6C63FF", emoji: "🪑",
      title: "Oturuş",
      desc: "Sandalyenin kenarına otur, sırtını dik ama rahat tut.",
    },
    {
      color: "#4CAF50", emoji: "🦵",
      title: "Sol bacak",
      desc: "Sol ayağını ayak taburesiyle yükselt; gitar sol uyluğunun üstünde durur.",
    },
    {
      color: "#00C2A8", emoji: "🖐️",
      title: "Sol el – klavye",
      desc: "Baş parmak sap arkasında, diğer parmaklar tellerine hafifçe bassın.",
    },
    {
      color: "#FF8C00", emoji: "🤚",
      title: "Sağ el – vurma",
      desc: "Sağ elin ses deliği üzerinde; yukarı-aşağı hafif vuruşlarla teli çal.",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-base font-extrabold text-foreground leading-tight">
            Doğru Klasik Gitar Tutuşu
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sol bacak üzeri — klasik pozisyon
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPlaying(p => !p)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow active:scale-95 transition-transform"
            style={{ background: playing ? "#6C63FF" : "#00C2A8" }}
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            onClick={replay}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow active:scale-95 transition-transform"
            style={{ background: "#FF8C00" }}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SVG animation */}
      <motion.div
        key={sceneKey}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl overflow-hidden bg-white/60 backdrop-blur-sm shadow-lg border border-primary/10"
      >
        <ClassicalGuitarScene playing={playing} />
      </motion.div>

      {/* Status dot */}
      <div className="flex items-center gap-2 px-1">
        <AnimatePresence mode="wait">
          {playing ? (
            <motion.div key="on"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1.5"
            >
              <motion.div
                className="w-2 h-2 rounded-full bg-green-500"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-xs text-green-600 font-medium">Animasyon oynatılıyor</span>
            </motion.div>
          ) : (
            <motion.div key="off"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1.5"
            >
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <span className="text-xs text-gray-400 font-medium">Duraklatıldı</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tip cards 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        {tips.map(t => (
          <div
            key={t.title}
            className="rounded-2xl p-3.5 flex gap-2.5 items-start"
            style={{
              background: t.color + "12",
              border: `1.5px solid ${t.color}28`,
            }}
          >
            <span className="text-xl shrink-0 mt-0.5">{t.emoji}</span>
            <div>
              <p className="text-[11px] font-bold mb-0.5 uppercase tracking-wide"
                style={{ color: t.color }}>{t.title}</p>
              <p className="text-[11px] text-gray-600 leading-relaxed">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
