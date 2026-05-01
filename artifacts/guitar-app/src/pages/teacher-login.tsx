import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useTeacherLogin, useCheckInviteCode, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { setToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, ArrowLeft, Building2, ArrowRight, Loader2, UserCheck, RefreshCw, BookmarkCheck } from "lucide-react";
import { motion } from "framer-motion";
import { pageVariants, pageTransition } from "@/lib/animations";
import { Link } from "wouter";
import { toast } from "sonner";
import { useSound } from "@/hooks/use-sound";

const ICON_SFX_SRC = "sounds/ikon_ses_efekti_1777623358028.mp4";

const STORAGE_KEY = "guitar_teacher_saved";

interface SavedTeacher {
  code: string;
  firstName: string;
  lastName: string;
  institutionName: string;
}

function loadSaved(): SavedTeacher | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedTeacher) : null;
  } catch {
    return null;
  }
}
function saveSaved(data: SavedTeacher) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function clearSaved() {
  localStorage.removeItem(STORAGE_KEY);
}

const codeSchema = z.object({ code: z.string().min(1, "Kod gerekli") });
const identitySchema = z.object({
  firstName: z.string().min(2, "Adınız en az 2 karakter olmalı"),
  lastName: z.string().min(2, "Soyadınız en az 2 karakter olmalı"),
});

export default function TeacherLogin() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const checkCode = useCheckInviteCode();
  const login = useTeacherLogin();
  const playIconSfx = useSound(ICON_SFX_SRC, 0.8);

  const [saved, setSaved] = useState<SavedTeacher | null>(null);
  const [validatedCode, setValidatedCode] = useState<{ code: string; institutionName: string } | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });
  const identityForm = useForm<z.infer<typeof identitySchema>>({
    resolver: zodResolver(identitySchema),
    defaultValues: { firstName: "", lastName: "" },
  });

  const doLogin = async (code: string, firstName: string, lastName: string, institutionName: string, remember: boolean) => {
    login.mutate(
      { data: { code, firstName, lastName } },
      {
        onSuccess: async (data) => {
          if (remember) {
            saveSaved({ code, firstName, lastName, institutionName });
          } else {
            clearSaved();
          }
          setToken(data.token);
          await queryClient.refetchQueries({ queryKey: getGetMeQueryKey() });
          setLocation("/teacher");
        },
        onError: () => {
          toast.error("Giriş başarısız. Bilgilerinizi kontrol edin.");
        },
      },
    );
  };

  const onQuickLogin = () => {
    if (!saved) return;
    doLogin(saved.code, saved.firstName, saved.lastName, saved.institutionName, true);
  };

  const onCheckCode = (values: z.infer<typeof codeSchema>) => {
    checkCode.mutate(
      { data: { code: values.code } },
      {
        onSuccess: (data) => {
          if (data.kind !== "teacher") {
            toast.error("Bu kod öğretmen kodu değil");
            return;
          }
          setValidatedCode({ code: values.code, institutionName: data.institutionName });
        },
        onError: () => {
          toast.error("Kod bulunamadı");
        },
      },
    );
  };

  const onLogin = (values: z.infer<typeof identitySchema>) => {
    if (!validatedCode) return;
    doLogin(validatedCode.code, values.firstName, values.lastName, validatedCode.institutionName, rememberMe);
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
          <div className="mx-auto w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mb-4 text-secondary">
            <GraduationCap className="w-8 h-8" />
          </div>
          <CardTitle className="text-3xl font-bold text-foreground">Öğretmen Girişi</CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            {saved
              ? "Kaydedilmiş hesabınızla hızlı giriş yapın"
              : validatedCode
              ? "Bilgilerinizi doğrulayın ve devam edin"
              : "Kurumunuzun verdiği kodu girin"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ── HIZLI GİRİŞ KARTI ── */}
          {saved && !validatedCode && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="bg-secondary/10 border border-secondary/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary/20 rounded-xl flex items-center justify-center text-secondary shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground text-lg truncate">
                      {saved.firstName} {saved.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {saved.institutionName}
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full py-6 text-base rounded-2xl bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-md"
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

          {/* ── KOD FORMU ── */}
          {!saved && !validatedCode && (
            <Form {...codeForm}>
              <form onSubmit={codeForm.handleSubmit(onCheckCode)} className="space-y-6">
                <FormField
                  control={codeForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Öğretmen Kodu</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Kodunuzu girin"
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
                <Button
                  type="submit"
                  variant="secondary"
                  onClick={playIconSfx}
                  className="w-full py-6 text-lg rounded-2xl shadow-md hover:shadow-lg transition-all"
                  disabled={checkCode.isPending}
                >
                  {checkCode.isPending ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Kontrol ediliyor...</>
                  ) : (
                    <>Devam Et <ArrowRight className="w-5 h-5 ml-2" /></>
                  )}
                </Button>
              </form>
            </Form>
          )}

          {/* ── KİMLİK FORMU ── */}
          {!saved && validatedCode && (
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center text-primary shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">Kurumunuz</p>
                  <p className="font-bold text-foreground truncate">{validatedCode.institutionName}</p>
                </div>
              </motion.div>

              <Form {...identityForm}>
                <form onSubmit={identityForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={identityForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Adınız</FormLabel>
                        <FormControl>
                          <Input placeholder="Ad" autoFocus className="text-lg py-6 rounded-2xl bg-white/50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={identityForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Soyadınız</FormLabel>
                        <FormControl>
                          <Input placeholder="Soyad" className="text-lg py-6 rounded-2xl bg-white/50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Beni Hatırla */}
                  <button
                    type="button"
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-colors text-left ${
                      rememberMe
                        ? "bg-secondary/10 border-secondary/40 text-secondary-foreground"
                        : "bg-muted/30 border-transparent text-muted-foreground"
                    }`}
                    onClick={() => setRememberMe((v) => !v)}
                  >
                    <BookmarkCheck className={`w-5 h-5 shrink-0 transition-colors ${rememberMe ? "text-secondary" : "text-muted-foreground/50"}`} />
                    <div>
                      <p className="text-sm font-semibold">Bu cihazda beni hatırla</p>
                      <p className="text-xs opacity-70">Bir sonraki girişte hızlı giriş yapabilirsin</p>
                    </div>
                    <div className={`ml-auto w-4 h-4 rounded border-2 flex-shrink-0 transition-colors ${rememberMe ? "bg-secondary border-secondary" : "border-muted-foreground/30"}`}>
                      {rememberMe && <svg viewBox="0 0 10 8" fill="white" className="w-full h-full p-0.5"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </button>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-2xl"
                      onClick={() => {
                        setValidatedCode(null);
                        identityForm.reset();
                      }}
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" /> Kodu değiştir
                    </Button>
                    <Button
                      type="submit"
                      variant="secondary"
                      onClick={playIconSfx}
                      className="flex-1 py-6 text-lg rounded-2xl shadow-md"
                      disabled={login.isPending}
                    >
                      {login.isPending ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Giriş yapılıyor...</>
                      ) : (
                        "Giriş Yap"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
