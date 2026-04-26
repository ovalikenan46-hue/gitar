import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Music } from "lucide-react";
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
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center">
      {/* Decorative background shapes */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <motion.div 
          className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[100px]"
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-secondary/20 blur-[100px]"
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Animated background notes */}
      <MusicBg count={16} />

      {/* Sol anahtarı (treble clef) — sol üstte */}
      <motion.div
        className="absolute top-8 left-8 text-primary/40 z-10 pointer-events-none"
        animate={{ y: [-12, 12, -12], rotate: [-4, 4, -4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <TrebleClef className="w-16 h-36 sm:w-20 sm:h-44" />
      </motion.div>

      {/* Fa anahtarı (bass clef) — sağ üstte, admin girişi */}
      <motion.button
        className="absolute top-10 right-8 text-accent/50 z-10 hover:text-accent transition-colors"
        animate={{ y: [12, -12, 12], rotate: [4, -4, 4] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        onClick={() => setAdminOpen(true)}
        aria-label="Yönetici girişi"
      >
        <BassClef className="w-16 h-20 sm:w-20 sm:h-24" />
      </motion.button>

      {/* Main Card */}
      <Card className="relative z-20 w-[90%] max-w-lg p-8 sm:p-12 bg-white/40 backdrop-blur-2xl border-white/50 shadow-2xl rounded-[3rem] text-center border">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
        >
          <div className="mx-auto w-24 h-24 bg-gradient-to-tr from-primary to-accent rounded-[2rem] rotate-12 flex items-center justify-center mb-8 shadow-xl">
            <Music className="w-12 h-12 text-white -rotate-12" />
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
            Gitar <span className="text-primary">Öğreniyorum</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-12 font-medium">
            Eğlenceli ve interaktif gitar eğitimi
          </p>

          <div className="flex flex-col gap-4">
            <Link href="/student-login">
              <Button size="lg" className="w-full text-xl py-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                🎵 Öğrenci Girişi
              </Button>
            </Link>
            <Link href="/teacher-login">
              <Button size="lg" variant="secondary" className="w-full text-xl py-8 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                🎓 Öğretmen Girişi
              </Button>
            </Link>
          </div>
        </motion.div>
      </Card>

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
