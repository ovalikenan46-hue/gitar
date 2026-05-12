import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMe,
  getGetMeQueryKey,
  useListMyClasses,
  getListMyClassesQueryKey,
  useCreateClass,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  LogOut,
  Loader2,
  School,
  AlertCircle,
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
import { ClassCard } from "@/components/teacher/class-card";

interface ApiErr { data?: { error?: string } }
function getApiError(err: unknown, fallback: string): string {
  return (err as ApiErr)?.data?.error ?? fallback;
}

const classSchema = z.object({
  name: z.string().min(2, "Sınıf adı gerekli"),
  studentCount: z.coerce.number().int().min(1, "En az 1 öğrenci olmalı"),
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
  studentCodes: { code: string; used: boolean; usedByName?: string | null; usedByUserId?: string | null }[];
}

export default function TeacherDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: classes, isLoading } = useListMyClasses({ query: { queryKey: getListMyClassesQueryKey() } });
  const createClass = useCreateClass();

  const [createOpen, setCreateOpen] = useState(false);

  const classList = (classes as ClassData[] | undefined) ?? [];
  const totalUsedCapacity = classList.reduce((acc, c) => acc + (c.studentCapacity ?? 0), 0);

  const form = useForm<z.infer<typeof classSchema>>({
    resolver: zodResolver(classSchema),
    defaultValues: { name: "", studentCount: 5 },
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
            <ClassCard
              key={cls.id}
              cls={cls}
              onCopy={copyCode}
              onShare={shareCode}
            />
          ))}
        </div>

        {classList.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <School className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Henüz sınıf oluşturmadınız</p>
            <p className="text-sm mt-1">Yukarıdaki "Yeni Sınıf" butonunu kullanarak başlayın.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
