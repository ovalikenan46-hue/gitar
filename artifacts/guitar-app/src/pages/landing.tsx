import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MusicBg, TrebleClef, BassClef } from "@/components/music-bg";
import { useAdminLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import logoImg from "@assets/ChatGPT_Image_1_May_2026_08_31_58_1777613580606.png";

export default function Landing() {
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const adminLogin = useAdminLogin();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

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
      {/* Soft color blobs */}
      <div className="absolute inset-0 z-0 pointer-events-none">
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
      </div>

      {/* Animated music notes & symbols */}
      <MusicBg count={18} />

      {/* Sol Anahtarı (Treble Clef) — top-left, large & animated */}
      <motion.div
        className="absolute top-4 left-4 z-10 pointer-events-none"
        style={{ color: "rgba(66,153,225,0.45)" }}
        animate={{
          y: [-16, 16, -8, 16, -16],
          x: [0, 8, -4, 8, 0],
          rotate: [-6, 4, -2, 4, -6],
          scale: [1, 1.06, 0.97, 1.06, 1],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", times: [0, 0.25, 0.5, 0.75, 1] }}
      >
        <TrebleClef className="w-20 h-44 sm:w-28 sm:h-60" />
      </motion.div>

      {/* Sol Anahtarı — bottom-right, secondary */}
      <motion.div
        className="absolute bottom-6 right-12 z-10 pointer-events-none"
        style={{ color: "rgba(108,99,255,0.30)" }}
        animate={{
          y: [10, -18, 6, -18, 10],
          rotate: [5, -3, 5, -3, 5],
          scale: [0.95, 1.08, 0.95, 1.08, 0.95],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.5, times: [0, 0.25, 0.5, 0.75, 1] }}
      >
        <TrebleClef className="w-14 h-32 sm:w-20 sm:h-44" />
      </motion.div>

      {/* Fa Anahtarı (Bass Clef) — top-right, admin trigger */}
      <motion.button
        className="absolute top-6 right-6 z-10 opacity-50 hover:opacity-80 transition-opacity focus:outline-none"
        style={{ color: "#00C2A8" }}
        animate={{
          y: [14, -14, 6, -14, 14],
          x: [0, -6, 0, 6, 0],
          rotate: [6, -4, 2, -4, 6],
          scale: [1, 1.08, 0.96, 1.08, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.5, times: [0, 0.25, 0.5, 0.75, 1] }}
        onClick={() => setAdminOpen(true)}
        aria-label="Yönetici girişi"
      >
        <BassClef className="w-20 h-24 sm:w-28 sm:h-32" />
      </motion.button>

      {/* Fa Anahtarı — bottom-left, secondary */}
      <motion.div
        className="absolute bottom-8 left-8 z-10 pointer-events-none"
        style={{ color: "rgba(0,194,168,0.28)" }}
        animate={{
          y: [-12, 14, -6, 14, -12],
          rotate: [-5, 3, -1, 3, -5],
          scale: [1, 1.1, 0.93, 1.1, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2, times: [0, 0.25, 0.5, 0.75, 1] }}
      >
        <BassClef className="w-16 h-20 sm:w-22 sm:h-26" />
      </motion.div>

      {/* Main card */}
      <Card className="relative z-20 w-[92%] max-w-lg bg-white/50 backdrop-blur-2xl border-white/60 shadow-2xl rounded-[3rem] text-center overflow-hidden">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.45, duration: 0.9 }}
          className="px-8 py-10 sm:px-12 sm:py-12 flex flex-col items-center"
        >
          {/* Logo */}
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
        </motion.div>
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
