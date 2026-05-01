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

      {/* Animated music notes */}
      <MusicBg count={14} />

      {/* Treble clef — top left */}
      <motion.div
        className="absolute top-8 left-8 z-10 pointer-events-none opacity-30"
        style={{ color: "#4299e1" }}
        animate={{ y: [-12, 12, -12], rotate: [-4, 4, -4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <TrebleClef className="w-16 h-36 sm:w-20 sm:h-44" />
      </motion.div>

      {/* Bass clef — top right, admin trigger */}
      <motion.button
        className="absolute top-10 right-8 z-10 opacity-40 hover:opacity-70 transition-opacity"
        style={{ color: "#00C2A8" }}
        animate={{ y: [12, -12, 12], rotate: [4, -4, 4] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        onClick={() => setAdminOpen(true)}
        aria-label="Yönetici girişi"
      >
        <BassClef className="w-16 h-20 sm:w-20 sm:h-24" />
      </motion.button>

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
