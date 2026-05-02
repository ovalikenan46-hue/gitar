import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMe,
  getGetMeQueryKey,
  useListMyClasses,
  getListMyClassesQueryKey,
  useCreateClass,
  useExpandClassCapacity,
  useUnlockNextLevel,
  useGenerateSmartboardCode,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Users,
  Copy,
  LockOpen,
  LogOut,
  Loader2,
  School,
  KeyRound,
  Share2,
  CheckCircle2,
  Circle,
  Plus,
  AlertCircle,
  Monitor,
} from "lucide-react";
import { motion } from "framer-motion";
import { pageVariants, pageTransition } from "@/lib/animations";
import { clearToken } from "@/lib/auth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ApiErr {
  data?: { error?: string };
}
function getApiError(err: unknown, fallback: string): string {
  return (err as ApiErr)?.data?.error ?? fallback;
}

const classSchema = z.object({
  name: z.string().min(2, "Sınıf adı gerekli"),
  studentCount: z.coerce.number().int().min(1, "En az 1 öğrenci olmalı"),
});
const expandSchema = z.object({
  additional: z.coerce.number().int().min(1, "En az 1 ek öğrenci"),
});

interface ClassData {
  id: string;
  name: string;
  levelUnlocked: number;
  smartboardCode?: string | null;
  studentCount: number;
  studentCapacity: number;
  usedStudentCount: number;
  remainingSlots: number;
  unusedStudentCodes: number;
  studentCodes: { code: string; used: boolean; usedByName?: string | null }[];
}

export default function TeacherDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: classes, isLoading } = useListMyClasses({ query: { queryKey: getListMyClassesQueryKey() } });

  const createClass = useCreateClass();
  const expandClass = useExpandClassCapacity();
  const unlockLevel = useUnlockNextLevel();
  const genSmartboard = useGenerateSmartboardCode();

  const [createOpen, setCreateOpen] = useState(false);
  const [expandTarget, setExpandTarget] = useState<ClassData | null>(null);

  const classList = (classes as ClassData[] | undefined) ?? [];
  const totalUsedCapacity = classList.reduce((acc, c) => acc + (c.studentCapacity ?? 0), 0);

  const form = useForm<z.infer<typeof classSchema>>({
    resolver: zodResolver(classSchema),
    defaultValues: { name: "", studentCount: 5 },
  });

  const expandForm = useForm<z.infer<typeof expandSchema>>({
    resolver: zodResolver(expandSchema),
    defaultValues: { additional: 5 },
  });

  const handleCreateClass = (values: z.infer<typeof classSchema>) => {
    createClass.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast.success(`"${values.name}" sınıfı oluşturuldu — ${values.studentCount} öğrenci kodu hazır`);
          queryClient.invalidateQueries({ queryKey: getListMyClassesQueryKey() });
          setCreateOpen(false);
          form.reset({ name: "", studentCount: 5 });
        },
        onError: (err) => {
          toast.error(getApiError(err, "Sınıf oluşturulamadı"), { duration: 6000 });
        },
      },
    );
  };

  const handleExpand = (values: z.infer<typeof expandSchema>) => {
    if (!expandTarget) return;
    expandClass.mutate(
      { id: expandTarget.id, data: values },
      {
        onSuccess: () => {
          toast.success(`${values.additional} ek öğrenci kodu üretildi`);
          queryClient.invalidateQueries({ queryKey: getListMyClassesQueryKey() });
          setExpandTarget(null);
          expandForm.reset({ additional: 5 });
        },
        onError: (err) => {
          toast.error(getApiError(err, "Genişletme başarısız"), { duration: 6000 });
        },
      },
    );
  };

  const handleUnlockLevel = (id: string) => {
    unlockLevel.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Yeni seviye açıldı! 🎉");
          queryClient.invalidateQueries({ queryKey: getListMyClassesQueryKey() });
        },
        onError: (err) => {
          toast.error(getApiError(err, "Seviye açılamadı"));
        },
      },
    );
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`${code} kopyalandı`);
    } catch {
      toast.error("Kopyalanamadı");
    }
  };

  const shareCode = async (className: string, code: string) => {
    const text = `${className} sınıfı için Gitar Öğreniyorum öğrenci kodun: ${code}`;
    const nav = navigator as Navigator & { share?: (data: { title?: string; text?: string }) => Promise<void> };
    if (nav.share) {
      try { await nav.share({ title: "Öğrenci Kodu", text }); return; } catch { /* ignore */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Paylaşım metni kopyalandı");
    } catch { toast.error("Paylaşılamadı"); }
  };

  const handleGenerateSmartboardCode = (id: string) => {
    genSmartboard.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Akıllı tahta kodu oluşturuldu!");
          queryClient.invalidateQueries({ queryKey: getListMyClassesQueryKey() });
        },
        onError: () => toast.error("Kod oluşturulamadı"),
      },
    );
  };

  const handleLogout = () => {
    clearToken();
    queryClient.clear();
    setLocation("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="min-h-screen bg-background p-4 sm:p-8"
    >
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 p-6 rounded-3xl border border-white backdrop-blur-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
              <School className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Merhaba, {me?.name}</h1>
              <p className="text-muted-foreground">{me?.institutionName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {totalUsedCapacity > 0 && (
              <div className="bg-primary/8 rounded-2xl px-4 py-2 text-center">
                <p className="text-xs text-muted-foreground">Toplam öğrenci kotası</p>
                <p className="font-bold text-primary">{totalUsedCapacity} kullanılıyor</p>
              </div>
            )}
            <Button variant="ghost" onClick={handleLogout} className="rounded-xl">
              <LogOut className="w-4 h-4 mr-2" /> Çıkış
            </Button>
          </div>
        </header>

        {/* Class list header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Sınıflarım</h2>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-md">
                + Yeni Sınıf
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle>Yeni Sınıf Oluştur</DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-2">
                    <p>Sınıf kapasitesi kadar öğrenci kodu otomatik üretilir ve kurum kotanızdan düşülür.</p>
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Öğrenci sayısı kurumunuzun kalan kotasını aşamaz. Kota yetersizse yöneticinizden limit artırmasını isteyin.</span>
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateClass)} className="space-y-4 mt-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sınıf Adı</FormLabel>
                        <FormControl>
                          <Input placeholder="Örn: 5/A" className="rounded-xl" autoFocus {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="studentCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Öğrenci Sayısı (Kontenjan)</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} className="rounded-xl" {...field} />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">Bu kadar öğrenci kodu oluşturulacak</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="mt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-xl"
                      onClick={() => setCreateOpen(false)}
                    >
                      İptal
                    </Button>
                    <Button type="submit" className="rounded-xl flex-1" disabled={createClass.isPending}>
                      {createClass.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Oluşturuluyor...</> : "Oluştur"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Classes grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classList.map((cls) => (
            <Card key={cls.id} className="rounded-3xl border-none shadow-md overflow-hidden bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-br from-primary/5 to-transparent pb-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl font-bold">{cls.name}</CardTitle>
                  <Badge variant="outline" className="bg-white rounded-full">
                    Seviye {cls.levelUnlocked}
                  </Badge>
                </div>
                <CardDescription className="flex items-center mt-2 text-foreground font-medium">
                  <Users className="w-4 h-4 mr-2 text-primary" /> {cls.studentCount} kayıtlı öğrenci
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Capacity counters */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-primary/5 rounded-2xl p-3">
                    <p className="text-xs text-muted-foreground">Toplam</p>
                    <p className="text-xl font-extrabold text-primary">{cls.studentCapacity}</p>
                  </div>
                  <div className="bg-secondary/10 rounded-2xl p-3">
                    <p className="text-xs text-muted-foreground">Kayıtlı</p>
                    <p className="text-xl font-extrabold text-secondary-foreground">{cls.usedStudentCount}</p>
                  </div>
                  <div className="bg-accent/10 rounded-2xl p-3">
                    <p className="text-xs text-muted-foreground">Boş Kod</p>
                    <p className="text-xl font-extrabold text-accent-foreground">{cls.unusedStudentCodes}</p>
                  </div>
                </div>

                {/* Student codes header */}
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-muted-foreground">Öğrenci Kodları</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-xl h-8"
                    onClick={() => {
                      setExpandTarget(cls);
                      expandForm.reset({ additional: 5 });
                    }}
                    title="Ek öğrenci kodu üret"
                  >
                    <KeyRound className="w-4 h-4 mr-1" /> Ek Öğrenci
                  </Button>
                </div>

                {/* Code list */}
                {cls.studentCodes.length === 0 ? (
                  <div className="p-4 bg-muted/60 rounded-2xl text-center text-sm text-muted-foreground">
                    Henüz kod yok
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {cls.studentCodes.map((sc) => (
                      <div
                        key={sc.code}
                        className={`flex items-center justify-between p-2.5 rounded-xl border ${
                          sc.used
                            ? "bg-muted/40 border-transparent text-muted-foreground"
                            : "bg-primary/5 border-primary/20"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {sc.used ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-green-500" />
                          ) : (
                            <Circle className="w-4 h-4 shrink-0 text-primary" />
                          )}
                          <div className="min-w-0">
                            <span
                              className={`font-mono font-bold tracking-wider text-sm block ${
                                sc.used ? "line-through" : "text-foreground"
                              }`}
                            >
                              {sc.code}
                            </span>
                            {sc.used && sc.usedByName && (
                              <span className="text-[11px] text-muted-foreground truncate block">
                                {sc.usedByName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7 rounded-lg"
                            onClick={() => copyCode(sc.code)} title="Kopyala" disabled={sc.used}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7 rounded-lg"
                            onClick={() => shareCode(cls.name, sc.code)} title="Paylaş" disabled={sc.used}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-primary/5 border-t border-primary/10 flex flex-col gap-3 pt-4">
                {/* Seviye aç */}
                <Button
                  className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white shadow-sm"
                  onClick={() => handleUnlockLevel(cls.id)}
                  disabled={unlockLevel.isPending || cls.levelUnlocked >= 6}
                >
                  <LockOpen className="w-4 h-4 mr-2" />
                  {cls.levelUnlocked >= 6 ? "Tüm Seviyeler Açık"
                    : cls.levelUnlocked === 1 ? "C/D Akorlarını Aç"
                    : cls.levelUnlocked === 2 ? "Modül 3'ü Aç"
                    : cls.levelUnlocked === 3 ? "Geçiş A — Em→Am'ı Aç"
                    : cls.levelUnlocked === 4 ? "Geçiş B — Am→C'yi Aç"
                    : "Geçiş C — C→D'yi Aç"}
                </Button>

                {/* Akıllı Tahta */}
                <div className="w-full space-y-2">
                  {cls.smartboardCode ? (
                    <div className="bg-accent/10 border border-accent/30 rounded-2xl p-3 space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <Monitor className="w-3.5 h-3.5" /> Akıllı Tahta Kodu
                      </span>
                      <p className="text-xs text-muted-foreground">Öğrenciler bu kodu giriş ekranından girerek tahtayı açabilir.</p>
                      <span className="font-mono font-black text-3xl tracking-[0.3em] text-accent-foreground block pt-1">
                        {cls.smartboardCode}
                      </span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-accent/40 text-accent-foreground hover:bg-accent/10"
                      onClick={() => handleGenerateSmartboardCode(cls.id)}
                      disabled={genSmartboard.isPending}
                    >
                      {genSmartboard.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Oluşturuluyor...</>
                      ) : (
                        <><Monitor className="w-4 h-4 mr-2" /> Akıllı Tahta Kodu Oluştur</>
                      )}
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}

          {classList.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <School className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium text-foreground">Henüz sınıfınız yok</h3>
              <p className="text-muted-foreground mt-2">İlk sınıfınızı oluşturmak için "Yeni Sınıf" butonuna tıklayın.</p>
            </div>
          )}
        </div>
      </div>

      {/* Expand modal */}
      <Dialog open={expandTarget !== null} onOpenChange={(o) => !o && setExpandTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" /> Ek Öğrenci Ekle
            </DialogTitle>
            <DialogDescription>
              {expandTarget && (
                <span>
                  <span className="font-semibold text-foreground">{expandTarget.name}</span> sınıfına yeni
                  öğrenci kontenjanı ekleyin. Kurum kotanızdan düşülür.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <Form {...expandForm}>
            <form onSubmit={expandForm.handleSubmit(handleExpand)} className="space-y-4">
              <FormField
                control={expandForm.control}
                name="additional"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Eklenecek Öğrenci Sayısı</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} className="rounded-xl py-6 text-lg" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="flex flex-row gap-2">
                <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setExpandTarget(null)}>
                  İptal
                </Button>
                <Button type="submit" className="flex-1 rounded-xl" disabled={expandClass.isPending}>
                  <Plus className="w-4 h-4 mr-1" />
                  {expandClass.isPending ? "Ekleniyor..." : "Ekle ve Kodları Üret"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
