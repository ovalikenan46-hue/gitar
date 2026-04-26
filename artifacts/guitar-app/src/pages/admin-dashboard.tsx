import { useQueryClient } from "@tanstack/react-query";
import { useGetAdminStats, getGetAdminStatsQueryKey, useListInstitutions, getListInstitutionsQueryKey, useCreateInstitution, useGenerateTeacherCode, useUpdateInstitutionLimits, useDeleteInstitution } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Users, GraduationCap, School, Copy, LogOut, Loader2, Share2, Plus, CheckCircle2, Circle, Settings2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { pageVariants, pageTransition } from "@/lib/animations";
import { clearToken } from "@/lib/auth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";

const instSchema = z.object({
  name: z.string().min(2, "Kurum adı gerekli"),
  teacherLimit: z.coerce.number().min(1, "En az 1 öğretmen olmalı"),
  studentLimit: z.coerce.number().min(1, "En az 1 öğrenci olmalı"),
});

const limitsSchema = z.object({
  teacherLimit: z.coerce.number().min(1, "En az 1 olmalı"),
  studentLimit: z.coerce.number().min(1, "En az 1 olmalı"),
});

interface InstitutionRow {
  id: string;
  name: string;
  code: string;
  teacherLimit: number;
  studentLimit: number;
  totalTeachers: number;
  totalStudents: number;
  usedTeacherCount: number;
  usedStudentCount: number;
  remainingTeacherSlots: number;
  remainingStudentSlots: number;
  teacherCodes: { code: string; used: boolean }[];
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: stats, isLoading: statsLoading } = useGetAdminStats({ query: { queryKey: getGetAdminStatsQueryKey() } });
  const { data: institutions, isLoading: instLoading } = useListInstitutions({ query: { queryKey: getListInstitutionsQueryKey() } });
  
  const createInst = useCreateInstitution();
  const generateCode = useGenerateTeacherCode();
  const updateLimits = useUpdateInstitutionLimits();
  const deleteInst = useDeleteInstitution();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InstitutionRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstitutionRow | null>(null);

  const form = useForm<z.infer<typeof instSchema>>({
    resolver: zodResolver(instSchema),
    defaultValues: { name: "", teacherLimit: 5, studentLimit: 100 },
  });

  const limitsForm = useForm<z.infer<typeof limitsSchema>>({
    resolver: zodResolver(limitsSchema),
    defaultValues: { teacherLimit: 5, studentLimit: 100 },
  });

  const handleCreateInst = (values: z.infer<typeof instSchema>) => {
    createInst.mutate({ data: values }, {
      onSuccess: () => {
        toast.success("Kurum başarıyla oluşturuldu");
        queryClient.invalidateQueries({ queryKey: getListInstitutionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        setCreateOpen(false);
        form.reset();
      }
    });
  };

  const handleEditLimits = (values: z.infer<typeof limitsSchema>) => {
    if (!editTarget) return;
    updateLimits.mutate({ id: editTarget.id, data: values }, {
      onSuccess: () => {
        toast.success("Limitler güncellendi");
        queryClient.invalidateQueries({ queryKey: getListInstitutionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        setEditTarget(null);
      },
      onError: (err: unknown) => {
        const e = err as { response?: { data?: { error?: string } } };
        toast.error(e.response?.data?.error ?? "Güncelleme başarısız");
      },
    });
  };

  const handleDeleteInst = () => {
    if (!deleteTarget) return;
    deleteInst.mutate({ id: deleteTarget.id }, {
      onSuccess: () => {
        toast.success(`"${deleteTarget.name}" silindi`);
        queryClient.invalidateQueries({ queryKey: getListInstitutionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        setDeleteTarget(null);
      },
      onError: () => {
        toast.error("Kurum silinemedi");
      },
    });
  };

  const handleGenerateCode = (id: string) => {
    generateCode.mutate({ id }, {
      onSuccess: (data) => {
        toast.success("Yeni öğretmen kodu üretildi", {
          description: data.code,
        });
        queryClient.invalidateQueries({ queryKey: getListInstitutionsQueryKey() });
      },
      onError: () => {
        toast.error("Kod üretilemedi (limit aşılmış olabilir)");
      },
    });
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`${code} kopyalandı`);
    } catch {
      toast.error("Kopyalanamadı");
    }
  };

  const shareCode = async (instName: string, code: string) => {
    const text = `${instName} için Gitar Öğreniyorum öğretmen kodun: ${code}`;
    const nav = navigator as Navigator & { share?: (data: { title?: string; text?: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: "Öğretmen Kodu", text });
        return;
      } catch {
        // user cancelled or unsupported, fall back to copy
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Paylaşım metni kopyalandı");
    } catch {
      toast.error("Paylaşılamadı");
    }
  };

  const handleLogout = () => {
    clearToken();
    setLocation("/");
  };

  if (statsLoading || instLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Yönetici Paneli</h1>
            <p className="text-muted-foreground mt-1">Tüm kurumları ve istatistikleri buradan yönetin.</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="rounded-xl">
            <LogOut className="w-4 h-4 mr-2" /> Çıkış Yap
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Kurumlar", value: stats?.totalInstitutions || 0, icon: Building2, color: "text-blue-500", bg: "bg-blue-500/10" },
            { title: "Öğretmenler", value: stats?.totalTeachers || 0, icon: Users, color: "text-orange-500", bg: "bg-orange-500/10" },
            { title: "Sınıflar", value: stats?.totalClasses || 0, icon: School, color: "text-green-500", bg: "bg-green-500/10" },
            { title: "Öğrenciler", value: stats?.totalStudents || 0, icon: GraduationCap, color: "text-purple-500", bg: "bg-purple-500/10" }
          ].map((stat, i) => (
            <Card key={i} className="rounded-3xl border-none shadow-sm">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                  <stat.icon className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between mt-12">
          <h2 className="text-2xl font-bold">Kurumlar</h2>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl">+ Yeni Kurum</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle>Yeni Kurum Ekle</DialogTitle>
                <DialogDescription>Kurum bilgilerini ve limitlerini belirleyin.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateInst)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({field}) => (
                    <FormItem><FormLabel>Kurum Adı</FormLabel><FormControl><Input className="rounded-xl" {...field} /></FormControl><FormMessage/></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="teacherLimit" render={({field}) => (
                      <FormItem><FormLabel>Öğretmen Limiti</FormLabel><FormControl><Input type="number" className="rounded-xl" {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                    <FormField control={form.control} name="studentLimit" render={({field}) => (
                      <FormItem><FormLabel>Öğrenci Limiti</FormLabel><FormControl><Input type="number" className="rounded-xl" {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                  </div>
                  <DialogFooter className="mt-6">
                    <Button type="submit" className="w-full rounded-xl" disabled={createInst.isPending}>Oluştur</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(institutions as InstitutionRow[] | undefined)?.map(inst => (
            <Card key={inst.id} className="rounded-3xl border-none shadow-sm hover:shadow-md transition-all">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-xl truncate">{inst.name}</CardTitle>
                    <CardDescription className="font-mono text-xs mt-1">Kod: {inst.code}</CardDescription>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-lg"
                      title="Limitleri düzenle"
                      onClick={() => {
                        setEditTarget(inst);
                        limitsForm.reset({
                          teacherLimit: inst.teacherLimit,
                          studentLimit: inst.studentLimit,
                        });
                      }}
                    >
                      <Settings2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                      title="Kurumu sil"
                      onClick={() => setDeleteTarget(inst)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-orange-500/10 rounded-2xl p-3">
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <Users className="w-3 h-3" /> Öğretmen
                    </p>
                    <p className="text-base font-bold mt-0.5">
                      <span className="text-orange-600">{inst.usedTeacherCount}</span>
                      <span className="text-muted-foreground"> / {inst.teacherLimit}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">Kalan: {inst.remainingTeacherSlots}</p>
                  </div>
                  <div className="bg-purple-500/10 rounded-2xl p-3">
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" /> Öğrenci
                    </p>
                    <p className="text-base font-bold mt-0.5">
                      <span className="text-purple-600">{inst.usedStudentCount}</span>
                      <span className="text-muted-foreground"> / {inst.studentLimit}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">Kalan: {inst.remainingStudentSlots}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-muted-foreground">Öğretmen Kodları</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-xl h-8"
                    onClick={() => handleGenerateCode(inst.id)}
                    disabled={generateCode.isPending}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Yeni Kod
                  </Button>
                </div>

                {inst.teacherCodes.length === 0 ? (
                  <div className="p-4 bg-muted/60 rounded-2xl text-center text-sm text-muted-foreground">
                    Henüz kod üretilmedi
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {inst.teacherCodes.map((tc) => (
                      <div
                        key={tc.code}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-colors ${
                          tc.used
                            ? "bg-muted/40 border-transparent text-muted-foreground"
                            : "bg-primary/5 border-primary/20"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {tc.used ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-green-500" />
                          ) : (
                            <Circle className="w-4 h-4 shrink-0 text-primary" />
                          )}
                          <span
                            className={`font-mono font-bold tracking-wider truncate ${
                              tc.used ? "line-through" : "text-foreground"
                            }`}
                            title={tc.code}
                          >
                            {tc.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => copyCode(tc.code)}
                            title="Kopyala"
                            disabled={tc.used}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => shareCode(inst.name, tc.code)}
                            title="Paylaş"
                            disabled={tc.used}
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {institutions?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              Henüz kurum bulunmuyor.
            </div>
          )}
        </div>
      </div>

      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> Kurumu Sil
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <span className="block">
                <span className="font-semibold text-foreground">{deleteTarget?.name}</span> kurumunu ve buna bağlı tüm verileri silmek üzeresiniz:
              </span>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Tüm öğretmen kodları ve öğretmen hesapları</li>
                <li>Tüm sınıflar ve öğrenci kodları</li>
                <li>Tüm öğrenci hesapları</li>
              </ul>
              <span className="block font-semibold text-destructive">Bu işlem geri alınamaz.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-2 mt-4">
            <Button variant="ghost" className="rounded-xl flex-1" onClick={() => setDeleteTarget(null)}>
              İptal
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl flex-1"
              onClick={handleDeleteInst}
              disabled={deleteInst.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteInst.isPending ? "Siliniyor..." : "Evet, Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editTarget !== null} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" /> Limitleri Düzenle
            </DialogTitle>
            <DialogDescription>
              {editTarget && (
                <>
                  <span className="font-semibold text-foreground">{editTarget.name}</span> için yeni
                  öğretmen ve öğrenci limitlerini belirleyin. Mevcut kullanımdan az olamaz
                  (Öğretmen kullanımı: {editTarget.usedTeacherCount}, Öğrenci kullanımı: {editTarget.usedStudentCount}).
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <Form {...limitsForm}>
            <form onSubmit={limitsForm.handleSubmit(handleEditLimits)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={limitsForm.control} name="teacherLimit" render={({field}) => (
                  <FormItem>
                    <FormLabel>Öğretmen Limiti</FormLabel>
                    <FormControl><Input type="number" min={1} className="rounded-xl py-6" {...field} /></FormControl>
                    <FormMessage/>
                  </FormItem>
                )} />
                <FormField control={limitsForm.control} name="studentLimit" render={({field}) => (
                  <FormItem>
                    <FormLabel>Öğrenci Limiti</FormLabel>
                    <FormControl><Input type="number" min={1} className="rounded-xl py-6" {...field} /></FormControl>
                    <FormMessage/>
                  </FormItem>
                )} />
              </div>
              <DialogFooter className="mt-6 flex flex-row gap-2">
                <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setEditTarget(null)}>İptal</Button>
                <Button type="submit" className="flex-1 rounded-xl" disabled={updateLimits.isPending}>
                  {updateLimits.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
