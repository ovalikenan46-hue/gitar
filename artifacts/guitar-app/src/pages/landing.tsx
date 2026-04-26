import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAdminLogin } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Landing() {
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const adminLogin = useAdminLogin();
  const [, setLocation] = useLocation();

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    adminLogin.mutate({ data: { password: adminPassword } }, {
      onSuccess: (data) => {
        setToken(data.token);
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

      {/* Floating Clefs */}
      <motion.div
        className="absolute top-10 left-10 text-primary/30 z-10 pointer-events-none"
        animate={{ y: [-15, 15, -15], rotate: [-5, 5, -5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width="80" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C8 2 6 5 6 8c0 3 4 5 4 8 0 4-4 4-6 1"/>
          <path d="M12 2v20"/>
        </svg>
      </motion.div>

      <motion.button
        className="absolute top-10 right-10 text-accent/30 z-10 hover:text-accent/60 transition-colors"
        animate={{ y: [15, -15, 15], rotate: [5, -5, 5] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        onClick={() => setAdminOpen(true)}
      >
        <svg width="60" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="9" r="2"/>
          <path d="M11 9c0 5-3 8-7 11"/>
          <circle cx="15" cy="11" r="1"/>
          <circle cx="15" cy="7" r="1"/>
        </svg>
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
