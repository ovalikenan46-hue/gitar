import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useGetAdminStats, getGetAdminStatsQueryKey, useListInstitutions, getListInstitutionsQueryKey, useCreateInstitution, useGenerateTeacherCode, useUpdateInstitutionLimits, useDeleteInstitution } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Users, GraduationCap, School, Copy, LogOut, Loader2, Share2, Plus, CheckCircle2, Circle, Settings2, Trash2, Shield, Monitor, Smartphone, ClipboardList, CheckCircle, XCircle, Lock, RefreshCw, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { pageVariants, pageTransition } from "@/lib/animations";
import { clearToken, getToken } from "@/lib/auth";
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

interface AuthorizedDevice {
  id: string;
  deviceType: "pc" | "phone";
  label: string;
  ip: string;
  createdAt: string;
  lastUsedAt: string;
}

interface LoginLogEntry {
  id: string;
  ip: string;
  userAgent: string;
  success: boolean;
  failReason: string | null;
  lockedOut: boolean;
  createdAt: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  details: Record<string, unknown>;
  ip: string;
  browser: string;
  osName: string;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  "institution.create": "Kurum oluşturuldu",
  "institution.delete": "Kurum silindi",
  "institution.update_limits": "Limitler güncellendi",
  "teacher_code.generate": "Öğretmen kodu üretildi",
  "device.authorize": "Cihaz yetkilendirildi",
  "device.revoke": "Cihaz silindi",
  "device.rename": "Cihaz yeniden adlandırıldı",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

type Tab = "kurumlar" | "guvenlik" | "kayitlar";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("kurumlar");

  const { data: stats, isLoading: statsLoading } = useGetAdminStats({ query: { queryKey: getGetAdminStatsQueryKey() } });
  const { data: institutions, isLoading: instLoading } = useListInstitutions({ query: { queryKey: getListInstitutionsQueryKey() } });

  const createInst = useCreateInstitution();
  const generateCode = useGenerateTeacherCode();
  const updateLimits = useUpdateInstitutionLimits();
  const deleteInst = useDeleteInstitution();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InstitutionRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstitutionRow | null>(null);
  const [editDeviceTarget, setEditDeviceTarget] = useState<AuthorizedDevice | null>(null);
  const [editDeviceLabel, setEditDeviceLabel] = useState("");
  const [deleteDeviceTarget, setDeleteDeviceTarget] = useState<AuthorizedDevice | null>(null);

  const form = useForm<z.infer<typeof instSchema>>({
    resolver: zodResolver(instSchema),
    defaultValues: { name: "", teacherLimit: 5, studentLimit: 100 },
  });

  const limitsForm = useForm<z.infer<typeof limitsSchema>>({
    resolver: zodResolver(limitsSchema),
    defaultValues: { teacherLimit: 5, studentLimit: 100 },
  });

  const authHeader = { Authorization: `Bearer ${getToken() ?? ""}` };

  const { data: devices, isLoading: devicesLoading, refetch: refetchDevices } = useQuery<AuthorizedDevice[]>({
    queryKey: ["admin-devices"],
    queryFn: async () => {
      const r = await fetch("/api/admin/devices", { headers: authHeader });
      if (!r.ok) throw new Error("Cihazlar alınamadı");
      return r.json() as Promise<AuthorizedDevice[]>;
    },
    enabled: activeTab === "guvenlik",
  });

  const { data: loginLog, isLoading: loginLogLoading, refetch: refetchLoginLog } = useQuery<LoginLogEntry[]>({
    queryKey: ["admin-login-log"],
    queryFn: async () => {
      const r = await fetch("/api/admin/login-log?limit=30", { headers: authHeader });
      if (!r.ok) throw new Error("Login logu alınamadı");
      return r.json() as Promise<LoginLogEntry[]>;
    },
    enabled: activeTab === "guvenlik",
  });

  const { data: auditLog, isLoading: auditLogLoading, refetch: refetchAuditLog } = useQuery<AuditLogEntry[]>({
    queryKey: ["admin-audit-log"],
    queryFn: async () => {
      const r = await fetch("/api/admin/audit-log?limit=50", { headers: authHeader });
      if (!r.ok) throw new Error("Audit log alınamadı");
      return r.json() as Promise<AuditLogEntry[]>;
    },
    enabled: activeTab === "kayitlar",
  });

  const registerCurrentDevice = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/devices/register-current", {
        method: "POST",
        headers: authHeader,
      });
      const data = await r.json() as { error?: string };
      if (!r.ok) throw new Error(data.error ?? "Hata");
      return data;
    },
    onSuccess: () => {
      toast.success("Mevcut cihaz yetkilendirildi");
      void refetchDevices();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteDevice = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/devices/${id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (!r.ok) throw new Error("Silinemedi");
    },
    onSuccess: () => {
      toast.success("Cihaz silindi");
      setDeleteDeviceTarget(null);
      void refetchDevices();
    },
    onError: () => toast.error("Cihaz silinemedi"),
  });

  const renameDevice = useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const r = await fetch(`/api/admin/devices/${id}`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (!r.ok) throw new Error("Güncellenemedi");
    },
    onSuccess: () => {
      toast.success("Etiket güncellendi");
      setEditDeviceTarget(null);
      void refetchDevices();
    },
    onError: () => toast.error("Güncellenemedi"),
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
        const e = err as { data?: { error?: string } };
        toast.error(e.data?.error ?? "Güncelleme başarısız");
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
        toast.success("Yeni öğretmen kodu üretildi", { description: data.code });
        queryClient.invalidateQueries({ queryKey: getListInstitutionsQueryKey() });
      },
      onError: (err: unknown) => {
        const e = err as { data?: { error?: string } };
        toast.error(e.data?.error ?? "Kod üretilemedi (limit aşılmış olabilir)");
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
      try { await nav.share({ title: "Öğretmen Kodu", text }); return; } catch { /* fallthrough */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Paylaşım metni kopyalandı");
    } catch {
      toast.error("Paylaşılamadı");
    }
  };

  const handleLogout = () => { clearToken(); setLocation("/"); };

  if (statsLoading || instLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "kurumlar", label: "Kurumlar", icon: Building2 },
    { id: "guvenlik", label: "Güvenlik", icon: Shield },
    { id: "kayitlar", label: "İşlem Kayıtları", icon: ClipboardList },
  ];

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Yönetici Paneli</h1>
            <p className="text-muted-foreground mt-1">Tüm kurumları ve istatistikleri buradan yönetin.</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="rounded-xl">
            <LogOut className="w-4 h-4 mr-2" /> Çıkış Yap
          </Button>
        </div>

        {/* Stats Cards */}
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

        {/* Tabs */}
        <div className="flex gap-2 bg-muted/60 p-1 rounded-2xl w-fit">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === id
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ===== TAB: KURUMLAR ===== */}
        {activeTab === "kurumlar" && (
          <>
            <div className="flex items-center justify-between">
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
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" title="Limitleri düzenle"
                          onClick={() => { setEditTarget(inst); limitsForm.reset({ teacherLimit: inst.teacherLimit, studentLimit: inst.studentLimit }); }}>
                          <Settings2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                          title="Kurumu sil" onClick={() => setDeleteTarget(inst)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-orange-500/10 rounded-2xl p-3">
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Users className="w-3 h-3" /> Öğretmen</p>
                        <p className="text-base font-bold mt-0.5"><span className="text-orange-600">{inst.usedTeacherCount}</span><span className="text-muted-foreground"> / {inst.teacherLimit}</span></p>
                        <p className="text-[11px] text-muted-foreground">Kalan: {inst.remainingTeacherSlots}</p>
                      </div>
                      <div className="bg-purple-500/10 rounded-2xl p-3">
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Öğrenci</p>
                        <p className="text-base font-bold mt-0.5"><span className="text-purple-600">{inst.usedStudentCount}</span><span className="text-muted-foreground"> / {inst.studentLimit}</span></p>
                        <p className="text-[11px] text-muted-foreground">Kalan: {inst.remainingStudentSlots}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-muted-foreground">Öğretmen Kodları</p>
                      <Button size="sm" variant="secondary" className="rounded-xl h-8"
                        onClick={() => handleGenerateCode(inst.id)} disabled={generateCode.isPending}>
                        <Plus className="w-4 h-4 mr-1" /> Yeni Kod
                      </Button>
                    </div>
                    {inst.teacherCodes.length === 0 ? (
                      <div className="p-4 bg-muted/60 rounded-2xl text-center text-sm text-muted-foreground">Henüz kod üretilmedi</div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {inst.teacherCodes.map((tc) => (
                          <div key={tc.code} className={`flex items-center justify-between p-3 rounded-2xl border transition-colors ${tc.used ? "bg-muted/40 border-transparent text-muted-foreground" : "bg-primary/5 border-primary/20"}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              {tc.used ? <CheckCircle2 className="w-4 h-4 shrink-0 text-green-500" /> : <Circle className="w-4 h-4 shrink-0 text-primary" />}
                              <span className={`font-mono font-bold tracking-wider truncate ${tc.used ? "line-through" : "text-foreground"}`} title={tc.code}>{tc.code}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => copyCode(tc.code)} title="Kopyala" disabled={tc.used}><Copy className="w-4 h-4" /></Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => shareCode(inst.name, tc.code)} title="Paylaş" disabled={tc.used}><Share2 className="w-4 h-4" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {institutions?.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground">Henüz kurum bulunmuyor.</div>
              )}
            </div>
          </>
        )}

        {/* ===== TAB: GÜVENLİK ===== */}
        {activeTab === "guvenlik" && (
          <div className="space-y-8">
            {/* Authorized Devices */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Yetkili Cihazlar</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Maksimum 1 bilgisayar + 1 telefon. Yalnızca kayıtlı cihazlardan giriş yapılabilir.</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => refetchDevices()}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button size="sm" className="rounded-xl gap-1" onClick={() => registerCurrentDevice.mutate()} disabled={registerCurrentDevice.isPending}>
                    <Plus className="w-4 h-4" /> Mevcut Cihazı Ekle
                  </Button>
                </div>
              </div>

              {devicesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {["pc", "phone"].map((type) => {
                    const device = devices?.find(d => d.deviceType === type);
                    return (
                      <Card key={type} className={`rounded-3xl border-2 ${device ? "border-primary/30 bg-primary/5" : "border-dashed border-muted"}`}>
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              {type === "pc" ? <Monitor className="w-8 h-8 text-muted-foreground" /> : <Smartphone className="w-8 h-8 text-muted-foreground" />}
                              <div>
                                <p className="font-semibold text-sm">{type === "pc" ? "Bilgisayar" : "Telefon"}</p>
                                {device ? (
                                  <>
                                    <p className="text-sm text-foreground font-medium mt-0.5">{device.label}</p>
                                    <p className="text-xs text-muted-foreground">IP: {device.ip}</p>
                                    <p className="text-xs text-muted-foreground">Son giriş: {formatDate(device.lastUsedAt)}</p>
                                    <p className="text-xs text-muted-foreground">Kayıt: {formatDate(device.createdAt)}</p>
                                  </>
                                ) : (
                                  <p className="text-xs text-muted-foreground mt-0.5">Kayıtlı cihaz yok</p>
                                )}
                              </div>
                            </div>
                            {device && (
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg"
                                  onClick={() => { setEditDeviceTarget(device); setEditDeviceLabel(device.label); }}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteDeviceTarget(device)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Login Log */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2"><Lock className="w-5 h-5 text-orange-500" /> Son Giriş Denemeleri</h2>
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => refetchLoginLog()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              {loginLogLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : loginLog?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Henüz kayıt yok.</p>
              ) : (
                <div className="space-y-2">
                  {loginLog?.map(entry => (
                    <div key={entry.id} className={`flex items-start gap-3 p-3 rounded-2xl border ${entry.success ? "bg-green-500/5 border-green-500/20" : entry.lockedOut ? "bg-red-500/10 border-red-500/30" : "bg-red-500/5 border-red-500/20"}`}>
                      <div className="mt-0.5 shrink-0">
                        {entry.success ? <CheckCircle className="w-4 h-4 text-green-500" /> : entry.lockedOut ? <Lock className="w-4 h-4 text-red-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${entry.success ? "text-green-700" : "text-red-700"}`}>
                            {entry.success ? "Başarılı Giriş" : entry.lockedOut ? "Kilitli — Engellendi" : "Başarısız Giriş"}
                          </span>
                          {entry.failReason && <span className="text-xs text-muted-foreground">({entry.failReason})</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">IP: {entry.ip} · {formatDate(entry.createdAt)}</p>
                        <p className="text-[11px] text-muted-foreground truncate" title={entry.userAgent}>{entry.userAgent.substring(0, 80)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== TAB: İŞLEM KAYITLARI ===== */}
        {activeTab === "kayitlar" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="w-5 h-5 text-blue-500" /> İşlem Kayıtları (Audit Log)</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Yönetici panelinde yapılan tüm işlemler</p>
              </div>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => refetchAuditLog()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            {auditLogLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : auditLog?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Henüz kayıt yok.</p>
            ) : (
              <div className="space-y-2">
                {auditLog?.map(entry => (
                  <div key={entry.id} className="p-4 rounded-2xl border bg-card hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                          <span className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{entry.action}</span>
                        </div>
                        {Object.keys(entry.details).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
                            {Object.entries(entry.details).map(([k, v]) => (
                              <span key={k} className="text-xs text-muted-foreground">
                                <span className="font-medium">{k}:</span> {String(v)}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                          <span>IP: {entry.ip}</span>
                          <span>{entry.browser}</span>
                          <span>{entry.osName}</span>
                          <span>{formatDate(entry.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== DIALOGS ===== */}

      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="w-5 h-5" /> Kurumu Sil</DialogTitle>
            <DialogDescription asChild>
              <div className="pt-2 space-y-3 text-sm text-muted-foreground">
                <p><span className="font-semibold text-foreground">{deleteTarget?.name}</span> kurumunu ve buna bağlı tüm verileri silmek üzeresiniz:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Tüm öğretmen kodları ve öğretmen hesapları</li>
                  <li>Tüm sınıflar ve öğrenci kodları</li>
                  <li>Tüm öğrenci hesapları</li>
                </ul>
                <p className="font-semibold text-destructive">Bu işlem geri alınamaz.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-2 mt-4">
            <Button variant="ghost" className="rounded-xl flex-1" onClick={() => setDeleteTarget(null)}>İptal</Button>
            <Button variant="destructive" className="rounded-xl flex-1" onClick={handleDeleteInst} disabled={deleteInst.isPending}>
              <Trash2 className="w-4 h-4 mr-2" />{deleteInst.isPending ? "Siliniyor..." : "Evet, Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editTarget !== null} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5 text-primary" /> Limitleri Düzenle</DialogTitle>
            <DialogDescription>
              {editTarget && (
                <><span className="font-semibold text-foreground">{editTarget.name}</span> için yeni öğretmen ve öğrenci limitlerini belirleyin. Mevcut kullanımdan az olamaz (Öğretmen: {editTarget.usedTeacherCount}, Öğrenci: {editTarget.usedStudentCount}).</>
              )}
            </DialogDescription>
          </DialogHeader>
          <Form {...limitsForm}>
            <form onSubmit={limitsForm.handleSubmit(handleEditLimits)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={limitsForm.control} name="teacherLimit" render={({field}) => (
                  <FormItem><FormLabel>Öğretmen Limiti</FormLabel><FormControl><Input type="number" min={1} className="rounded-xl py-6" {...field} /></FormControl><FormMessage/></FormItem>
                )} />
                <FormField control={limitsForm.control} name="studentLimit" render={({field}) => (
                  <FormItem><FormLabel>Öğrenci Limiti</FormLabel><FormControl><Input type="number" min={1} className="rounded-xl py-6" {...field} /></FormControl><FormMessage/></FormItem>
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

      {/* Delete Device Dialog */}
      <Dialog open={deleteDeviceTarget !== null} onOpenChange={(o) => !o && setDeleteDeviceTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="w-5 h-5" /> Cihazı Kaldır</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">{deleteDeviceTarget?.label}</span> cihazını yetki listesinden kaldırmak istediğinize emin misiniz? Bu cihazdan bir daha giriş yapılamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-2 mt-4">
            <Button variant="ghost" className="rounded-xl flex-1" onClick={() => setDeleteDeviceTarget(null)}>İptal</Button>
            <Button variant="destructive" className="rounded-xl flex-1" onClick={() => deleteDeviceTarget && deleteDevice.mutate(deleteDeviceTarget.id)} disabled={deleteDevice.isPending}>
              <Trash2 className="w-4 h-4 mr-2" />{deleteDevice.isPending ? "Kaldırılıyor..." : "Kaldır"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Device Dialog */}
      <Dialog open={editDeviceTarget !== null} onOpenChange={(o) => !o && setEditDeviceTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5 text-primary" /> Cihaz Etiketini Düzenle</DialogTitle>
            <DialogDescription>Cihaz için özel bir isim belirleyin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              className="rounded-xl"
              value={editDeviceLabel}
              onChange={e => setEditDeviceLabel(e.target.value)}
              placeholder="Örn: Öğretmenler Odası PC"
            />
            <DialogFooter className="flex flex-row gap-2">
              <Button variant="ghost" className="rounded-xl" onClick={() => setEditDeviceTarget(null)}>İptal</Button>
              <Button className="flex-1 rounded-xl"
                onClick={() => editDeviceTarget && renameDevice.mutate({ id: editDeviceTarget.id, label: editDeviceLabel })}
                disabled={renameDevice.isPending || !editDeviceLabel.trim()}>
                {renameDevice.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
