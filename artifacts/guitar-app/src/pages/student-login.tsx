import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useStudentLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { setToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, ArrowLeft, UserCheck, RefreshCw, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { pageVariants, pageTransition } from "@/lib/animations";
import { Link } from "wouter";
import { toast } from "sonner";
import { useSound } from "@/hooks/use-sound";

const ICON_SFX_SRC = "sounds/ikon_ses_efekti_1777625648690.mp4";

const STORAGE_KEY = "guitar_student_saved";

interface SavedStudent {
  code: string;
  name: string;
}

function loadSaved(): SavedStudent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedStudent) : null;
  } catch {
    return null;
  }
}
function saveSaved(data: SavedStudent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function clearSaved() {
  localStorage.removeItem(STORAGE_KEY);
}

const formSchema = z.object({
  code: z.string().min(1, "Kod gerekli"),
  name: z.string().min(2, "Ad Soyad en az 2 karakter olmalı"),
});

export default function StudentLogin() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const login = useStudentLogin();
  const playIconSfx = useSound(ICON_SFX_SRC, 0.8);

  const [saved, setSaved] = useState<SavedStudent | null>(null);

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: "", name: "" },
  });

  const doLogin = async (code: string, name: string) => {
    login.mutate(
      { data: { code, name } },
      {
        onSuccess: async (data) => {
          saveSaved({ code, name });
          setToken(data.token);
          await queryClient.refetchQueries({ queryKey: getGetMeQueryKey() });
          setLocation("/student");
        },
        onError: () => {
          toast.error("Giriş başarısız. Kodunu veya adını kontrol et.");
        },
      },
    );
  };

  const onQuickLogin = () => {
    if (!saved) return;
    doLogin(saved.code, saved.name);
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    doLogin(values.code, values.name);
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="min-h-screen w-full flex items-center justify-center p-4 relative"
    >
      <Link href="/" className="absolute top-4 left-4 p-2 text-muted-foreground hover:text-foreground bg-white/50 rounded-full backdrop-blur-sm">
        <ArrowLeft className="w-6 h-6" />
      </Link>

      <Card className="w-full max-w-md shadow-xl border-white/50 bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
            <Music className="w-8 h-8" />
          </div>
          <CardTitle className="text-3xl font-bold text-foreground">Öğrenci Girişi</CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            {saved
              ? "Kaydedilmiş hesabınla hızlı giriş yapabilirsin"
              : "Öğretmeninin verdiği kodu ve adını girerek derslerine başla!"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ── HIZLI GİRİŞ KARTI ── */}
          {saved && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="bg-primary/8 border border-primary/25 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center text-primary shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground text-lg truncate">{saved.name}</p>
                    <p className="text-xs text-muted-foreground font-mono tracking-wider">{saved.code}</p>
                  </div>
                </div>

                <Button
                  className="w-full py-6 text-base rounded-2xl shadow-md"
                  onClick={() => { playIconSfx(); onQuickLogin(); }}
                  disabled={login.isPending}
                >
                  {login.isPending ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Giriş yapılıyor...</>
                  ) : (
                    "Hızlı Giriş Yap →"
                  )}
                </Button>
              </div>

              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-1 transition-colors"
                onClick={() => {
                  clearSaved();
                  setSaved(null);
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Farklı hesapla giriş yap
              </button>
            </motion.div>
          )}

          {/* ── NORMAL FORM ── */}
          {!saved && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Öğrenci Kodu</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Örn: XYZ-123"
                          autoFocus
                          className="text-lg py-6 rounded-2xl bg-white/50 uppercase tracking-widest font-mono"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Ad Soyad</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Adın ve soyadın"
                          className="text-lg py-6 rounded-2xl bg-white/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  onClick={playIconSfx}
                  className="w-full py-6 text-lg rounded-2xl shadow-md hover:shadow-lg transition-all"
                  disabled={login.isPending}
                >
                  {login.isPending ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Giriş yapılıyor...</>
                  ) : (
                    "Hadi Başlayalım! 🎸"
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
