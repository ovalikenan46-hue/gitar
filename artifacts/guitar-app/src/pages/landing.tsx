import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MusicBg } from "@/components/music-bg";
import { useAdminLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Volume2, VolumeX } from "lucide-react";
import logoImg from "@assets/ChatGPT_Image_1_May_2026_08_31_58_1777613580606.png";
import { useBgMusic } from "@/contexts/bg-music-context";
import { useLiteMode } from "@/hooks/use-lite-mode";

export default function Landing() {
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const adminLogin = useAdminLogin();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { playing, toggle: toggleMusic, resumeOnLanding, pauseOnLeave } = useBgMusic();
  const lite = useLiteMode();

  useEffect(() => {
    resumeOnLanding();
    return () => pauseOnLeave();
  }, [resumeOnLanding, pauseOnLeave]);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    adminLogin.mutate({ data: { password: adminPassword } }, {
      onSuccess: async (data) => {
        setToken(data.token);
        await queryClient.refetchQueries({ queryKey: getGetMeQueryKey() });
        setAdminOpen(false);
        setLocation("/admin");
      },
      onError: () => {
        toast.error("Hatalı şifre");
      }
    });
  };

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #e3f2fd 0%, #ffffff 35%, #fff9f0 65%, #e8fdf8 100%)",
      }}
    >
      {/* Renk bloblari — mobilde statik (animasyonsuz), masaüstünde hareketli */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {lite ? (
          /* Mobil: statik, blur azaltılmış */
          <>
            <div
              className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full opacity-20 blur-[60px]"
              style={{ background: "radial-gradient(circle, #4299e1, transparent)" }}
            />
            <div
              className="absolute bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full opacity-15 blur-[50px]"
              style={{ background: "radial-gradient(circle, #00C2A8, transparent)" }}
            />
          </>
        ) : (
          /* Masaüstü: tam animasyonlu */
          <>
            <motion.div
              className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full opacity-25 blur-[110px]"
              style={{ background: "radial-gradient(circle, #4299e1, transparent)" }}
              animate={{ x: [0, 40, 0], y: [0, 25, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full opacity-20 blur-[90px]"
              style={{ background: "radial-gradient(circle, #00C2A8, transparent)" }}
              animate={{ x: [0, -35, 0], y: [0, -20, 0] }}
              transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute top-[30%] right-[-5%] w-[30vw] h-[30vw] rounded-full opacity-15 blur-[70px]"
              style={{ background: "radial-gradient(circle, #6C63FF, transparent)" }}
              animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-[20%] left-[5%] w-[25vw] h-[25vw] rounded-full opacity-15 blur-[60px]"
              style={{ background: "radial-gradient(circle, #FFB86C, transparent)" }}
              animate={{ x: [0, 25, 0], y: [0, -15, 0] }}
              transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}
      </div>

      {/* Müzik sembolleri — mobilde az, masaüstünde tam */}
      <MusicBg count={lite ? 5 : 18} />

      {/* Ses butonu */}
      <button
        className="absolute bottom-5 left-5 z-30 w-11 h-11 rounded-full flex items-center justify-center shadow-lg border border-white/50 focus:outline-none"
        style={{ background: "rgba(255,255,255,0.75)" }}
        onClick={toggleMusic}
        aria-label={playing ? "Müziği kapat" : "Müziği aç"}
      >
        {playing
          ? <Volume2 className="w-5 h-5 text-primary" />
          : <VolumeX className="w-5 h-5 text-gray-500" />
        }
      </button>

      {/* Sol Anahtarı — top-left */}
      {lite ? (
        <span
          className="absolute top-4 left-4 z-10 pointer-events-none select-none leading-none font-bold"
          style={{ fontSize: 100, color: "rgba(66,153,225,0.22)", fontFamily: "'Times New Roman', Georgia, serif" }}
        >
          𝄞
        </span>
      ) : (
        <motion.span
          className="absolute top-4 left-4 z-10 pointer-events-none select-none leading-none font-bold"
          style={{ fontSize: 100, color: "rgba(66,153,225,0.30)", fontFamily: "'Times New Roman', Georgia, serif" }}
          animate={{ y: [-14, 14, -6, 14, -14], x: [0, 6, -3, 6, 0], rotate: [-5, 4, -2, 4, -5], scale: [1, 1.06, 0.97, 1.06, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", times: [0, 0.25, 0.5, 0.75, 1] }}
        >
          𝄞
        </motion.span>
      )}

      {/* Sol Anahtarı — bottom-right */}
      {!lite && (
        <motion.span
          className="absolute bottom-6 right-12 z-10 pointer-events-none select-none leading-none font-bold"
          style={{ fontSize: 82, color: "rgba(108,99,255,0.30)", fontFamily: "'Times New Roman', Georgia, serif" }}
          animate={{ y: [10, -16, 4, -16, 10], rotate: [4, -3, 4, -3, 4], scale: [0.95, 1.08, 0.95, 1.08, 0.95] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.5, times: [0, 0.25, 0.5, 0.75, 1] }}
        >
          𝄞
        </motion.span>
      )}

      {/* Fa Anahtarı — top-right, admin trigger */}
      {lite ? (
        <button
          className="absolute top-6 right-6 z-10 select-none leading-none font-bold focus:outline-none"
          style={{ fontSize: 100, color: "rgba(0,194,168,0.22)", fontFamily: "'Times New Roman', Georgia, serif", background: "none", border: "none", padding: 0, cursor: "default" }}
          onClick={() => setAdminOpen(true)}
          aria-label="Yönetici girişi"
        >
          𝄢
        </button>
      ) : (
        <motion.button
          className="absolute top-6 right-6 z-10 select-none leading-none font-bold focus:outline-none"
          style={{ fontSize: 100, color: "rgba(0,194,168,0.30)", fontFamily: "'Times New Roman', Georgia, serif", background: "none", border: "none", padding: 0, cursor: "default" }}
          animate={{ y: [12, -12, 5, -12, 12], x: [0, -5, 0, 5, 0], rotate: [5, -4, 2, -4, 5], scale: [1, 1.08, 0.96, 1.08, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.5, times: [0, 0.25, 0.5, 0.75, 1] }}
          onClick={() => setAdminOpen(true)}
          aria-label="Yönetici girişi"
        >
          𝄢
        </motion.button>
      )}

      {/* Fa Anahtarı — bottom-left */}
      {!lite && (
        <motion.span
          className="absolute bottom-8 left-8 z-10 pointer-events-none select-none leading-none font-bold"
          style={{ fontSize: 82, color: "rgba(0,194,168,0.30)", fontFamily: "'Times New Roman', Georgia, serif" }}
          animate={{ y: [-10, 12, -4, 12, -10], rotate: [-4, 3, -1, 3, -4], scale: [1, 1.1, 0.93, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2, times: [0, 0.25, 0.5, 0.75, 1] }}
        >
          𝄢
        </motion.span>
      )}

      {/* Ana kart — mobilde anında görünür (opacity 0'da kalmaz) */}
      <Card
        className={[
          "relative z-20 w-[92%] max-w-lg border-white/60 shadow-2xl rounded-[3rem] text-center overflow-hidden",
          lite ? "bg-white/90" : "bg-white/50 backdrop-blur-2xl",
        ].join(" ")}
      >
        {lite ? (
          /* Mobil: animasyonsuz, içerik hemen görünür */
          <div className="px-8 py-10 sm:px-12 sm:py-12 flex flex-col items-center">
            <CardInner logoImg={logoImg} lite={true} />
          </div>
        ) : (
          /* Masaüstü: spring animasyonlu */
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.45, duration: 0.9 }}
            className="px-8 py-10 sm:px-12 sm:py-12 flex flex-col items-center"
          >
            <CardInner logoImg={logoImg} lite={false} />
          </motion.div>
        )}
      </Card>

      {/* Admin dialog */}
      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Yönetici Girişi</DialogTitle>
            <DialogDescription>
              Sistemi yönetmek için şifrenizi girin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdminSubmit} className="space-y-4 mt-4">
            <Input
              type="password"
              placeholder="Şifre"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="py-6 text-lg rounded-xl"
            />
            <Button type="submit" className="w-full py-6 text-lg rounded-xl" disabled={adminLogin.isPending}>
              Giriş Yap
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CardInner({ logoImg, lite }: { logoImg: string; lite: boolean }) {
  return (
    <>
      {/* Logo */}
      {lite ? (
        <div className="mb-4">
          <img
            src={logoImg}
            alt="Gitar Öğreniyorum"
            className="w-56 h-56 sm:w-72 sm:h-72 object-cover rounded-3xl drop-shadow-xl select-none"
            draggable={false}
          />
        </div>
      ) : (
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="mb-4"
        >
          <img
            src={logoImg}
            alt="Gitar Öğreniyorum"
            className="w-56 h-56 sm:w-72 sm:h-72 object-cover rounded-3xl drop-shadow-2xl select-none"
            draggable={false}
          />
        </motion.div>
      )}

      <p className="text-base sm:text-lg text-gray-500 mb-10 font-medium">
        Eğlenceli ve interaktif gitar eğitimi
      </p>

      <div className="flex flex-col gap-4 w-full">
        <Link href="/student-login">
          <Button
            size="lg"
            className="w-full text-xl py-8 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-white font-bold"
            style={{ background: "linear-gradient(135deg, #4299e1 0%, #6C63FF 100%)" }}
          >
            🎵 Öğrenci Girişi
          </Button>
        </Link>
        <Link href="/teacher-login">
          <Button
            size="lg"
            className="w-full text-xl py-8 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-white font-bold border-0"
            style={{ background: "linear-gradient(135deg, #FF8C00 0%, #FFB86C 100%)" }}
          >
            🎓 Öğretmen Girişi
          </Button>
        </Link>
      </div>
    </>
  );
}
