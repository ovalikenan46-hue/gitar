import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useUnlockNextLevel,
  useGenerateSmartboardCode,
  useExpandClassCapacity,
  useGetClassStudentCodesProgress,
  useGetStudentLearningProgress,
  getListMyClassesQueryKey,
  getGetClassStudentCodesProgressQueryKey,
  type StudentCodeProgress,
  type StudentActivityProgress,
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
  Loader2,
  KeyRound,
  Share2,
  CheckCircle2,
  Circle,
  Plus,
  AlertCircle,
  Monitor,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface StudentCodeInfo {
  code: string;
  used: boolean;
  usedByName?: string | null;
  usedByUserId?: string | null;
}

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
  studentCodes: StudentCodeInfo[];
}

interface ApiErr { data?: { error?: string } }
function getApiError(err: unknown, fallback: string) {
  return (err as ApiErr)?.data?.error ?? fallback;
}

const expandSchema = z.object({
  additional: z.coerce.number().int().min(1, "En az 1 ek öğrenci"),
});

// ── Ders progress paneli (lazy-loaded) ────────────────────────────────────────
function StudentProgressPanel({ studentId }: { studentId: string }) {
  const { data: activities, isLoading } = useGetStudentLearningProgress(studentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-2">Ders bulunamadı.</p>;
  }

  const learnedCount = activities.filter((a) => a.learned).length;

  return (
    <div className="space-y-3 pt-2">
      <p className="text-xs font-semibold text-muted-foreground">
        {learnedCount} / {activities.length} ders tamamlandı
      </p>
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
        {activities.map((a: StudentActivityProgress) => (
          <div
            key={a.activityKey}
            title={a.activityTitle}
            className={`relative flex flex-col items-center justify-center rounded-xl p-1.5 aspect-square cursor-default transition-all ${
              a.learned
                ? "bg-emerald-100 border border-emerald-300"
                : "bg-muted border border-border"
            }`}
          >
            <span className={`text-[10px] font-bold leading-none ${a.learned ? "text-emerald-700" : "text-muted-foreground"}`}>
              {a.moduleKey}
            </span>
            {a.learned && (
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 mt-0.5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tek öğrenci kodu satırı ───────────────────────────────────────────────────
function StudentCodeRow({
  sc,
  progress,
  className: clsName,
  onCopy,
  onShare,
}: {
  sc: StudentCodeInfo;
  progress?: StudentCodeProgress;
  className: string;
  onCopy: (code: string) => void;
  onShare: (name: string, code: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = sc.used && !!sc.usedByUserId;

  return (
    <div className="rounded-xl border overflow-hidden">
      <div
        className={`flex items-center gap-2 p-2.5 ${
          canExpand ? "cursor-pointer hover:bg-muted/30 transition-colors" : ""
        } ${sc.used ? "bg-muted/20 border-transparent" : "bg-primary/5 border-primary/20"}`}
        onClick={() => canExpand && setExpanded((v) => !v)}
      >
        {/* Status icon */}
        {sc.used ? (
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
        ) : (
          <Circle className="w-4 h-4 shrink-0 text-primary" />
        )}

        {/* Code + name */}
        <div className="min-w-0 flex-1">
          <span className="font-mono font-bold tracking-wider text-sm text-foreground block leading-tight">
            {sc.code}
          </span>
          {sc.used && sc.usedByName && (
            <span className="text-[11px] text-muted-foreground truncate block leading-tight">
              {sc.usedByName}
            </span>
          )}
        </div>

        {/* Progress badge (if active) */}
        {sc.used && progress && (
          <span className={`shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 ${
            progress.learnedCount > 0
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
              : "bg-muted text-muted-foreground border border-border"
          }`}>
            {progress.learnedCount}/{progress.totalActivityCount}
          </span>
        )}

        {/* Expand chevron (if active) */}
        {canExpand && (
          <span className="shrink-0 text-muted-foreground">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        )}

        {/* Copy / share (only for unused codes) */}
        {!sc.used && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon" variant="ghost" className="h-7 w-7 rounded-lg"
              onClick={(e) => { e.stopPropagation(); onCopy(sc.code); }}
              title="Kopyala"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon" variant="ghost" className="h-7 w-7 rounded-lg"
              onClick={(e) => { e.stopPropagation(); onShare(clsName, sc.code); }}
              title="Paylaş"
            >
              <Share2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Expand panel */}
      <AnimatePresence>
        {expanded && sc.usedByUserId && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border bg-white/60"
          >
            <div className="px-3 pb-3 pt-2">
              <StudentProgressPanel studentId={sc.usedByUserId} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Ana ClassCard bileşeni ────────────────────────────────────────────────────
export function ClassCard({
  cls,
  onCopy,
  onShare,
}: {
  cls: ClassData;
  onCopy: (code: string) => void;
  onShare: (className: string, code: string) => void;
}) {
  const queryClient = useQueryClient();
  const [expandOpen, setExpandOpen] = useState(false);

  const { data: codesProgress } = useGetClassStudentCodesProgress(cls.id, {
    query: {
      queryKey: getGetClassStudentCodesProgressQueryKey(cls.id),
      refetchInterval: 60_000,
    },
  });

  const progressByCode = (codesProgress ?? []).reduce<Record<string, StudentCodeProgress>>(
    (acc, p) => { acc[p.code] = p; return acc; },
    {}
  );

  const unlockLevel = useUnlockNextLevel();
  const genSmartboard = useGenerateSmartboardCode();
  const expandClass = useExpandClassCapacity();

  const expandForm = useForm<z.infer<typeof expandSchema>>({
    resolver: zodResolver(expandSchema),
    defaultValues: { additional: 5 },
  });

  const handleUnlockLevel = () => {
    unlockLevel.mutate({ id: cls.id }, {
      onSuccess: () => {
        toast.success("Yeni seviye açıldı! 🎉");
        queryClient.invalidateQueries({ queryKey: getListMyClassesQueryKey() });
      },
      onError: (err) => toast.error(getApiError(err, "Seviye açılamadı")),
    });
  };

  const handleGenerateSmartboardCode = () => {
    genSmartboard.mutate({ id: cls.id }, {
      onSuccess: () => {
        toast.success("Akıllı tahta kodu oluşturuldu!");
        queryClient.invalidateQueries({ queryKey: getListMyClassesQueryKey() });
      },
      onError: () => toast.error("Kod oluşturulamadı"),
    });
  };

  const handleExpand = (values: z.infer<typeof expandSchema>) => {
    expandClass.mutate({ id: cls.id, data: values }, {
      onSuccess: () => {
        toast.success(`${values.additional} ek öğrenci kodu üretildi`);
        queryClient.invalidateQueries({ queryKey: getListMyClassesQueryKey() });
        setExpandOpen(false);
        expandForm.reset({ additional: 5 });
      },
      onError: (err) => toast.error(getApiError(err, "Genişletme başarısız"), { duration: 6000 }),
    });
  };

  const activeCount = cls.studentCodes.filter((c) => c.used).length;
  const totalLearned = Object.values(progressByCode).reduce((s, p) => s + p.learnedCount, 0);
  const totalActivity = codesProgress?.[0]?.totalActivityCount ?? 0;

  return (
    <>
      <Card className="rounded-3xl border-none shadow-md overflow-hidden bg-white/80 backdrop-blur-sm">
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

          {/* Özet öğrenme ilerleme (varsa) */}
          {activeCount > 0 && totalActivity > 0 && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-2">
              <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-800 font-medium">
                {activeCount} aktif öğrenci · toplam <strong>{totalLearned}</strong> ders öğrenildi
              </p>
            </div>
          )}

          {/* Student codes header */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">Öğrenci Kodları</p>
            <Button
              size="sm"
              variant="secondary"
              className="rounded-xl h-8"
              onClick={() => { setExpandOpen(true); expandForm.reset({ additional: 5 }); }}
              title="Ek öğrenci kodu üret"
            >
              <KeyRound className="w-4 h-4 mr-1" /><Plus className="w-3 h-3" />
            </Button>
          </div>

          {/* Code list */}
          {cls.studentCodes.length === 0 ? (
            <div className="p-4 bg-muted/60 rounded-2xl text-center text-sm text-muted-foreground">
              Henüz kod yok
            </div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
              {cls.studentCodes.map((sc) => (
                <StudentCodeRow
                  key={sc.code}
                  sc={sc}
                  progress={progressByCode[sc.code]}
                  className={cls.name}
                  onCopy={onCopy}
                  onShare={onShare}
                />
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="bg-primary/5 border-t border-primary/10 flex flex-col gap-3 pt-4">
          {/* Seviye aç */}
          <Button
            className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white shadow-sm"
            onClick={handleUnlockLevel}
            disabled={unlockLevel.isPending || cls.levelUnlocked >= 18}
          >
            <LockOpen className="w-4 h-4 mr-2" />
            {cls.levelUnlocked >= 18 ? "Tüm Seviyeler Açık"
              : cls.levelUnlocked === 1  ? "C/D Akorlarını Aç"
              : cls.levelUnlocked === 2  ? "Modül 3'ü Aç"
              : cls.levelUnlocked === 3  ? "Geçiş A — Em→Am'ı Aç"
              : cls.levelUnlocked === 4  ? "Geçiş B — Am→C'yi Aç"
              : cls.levelUnlocked === 5  ? "Geçiş C — C→D'yi Aç"
              : cls.levelUnlocked === 6  ? "Modül 4A — Em→Am→C'yi Aç"
              : cls.levelUnlocked === 7  ? "Modül 4B — Am→C→D'yi Aç"
              : cls.levelUnlocked === 8  ? "Modül 4C — Em→D→Am'ı Aç"
              : cls.levelUnlocked === 9  ? "Modül 4D — C→D→Em'i Aç"
              : cls.levelUnlocked === 10 ? "Şarkı Modunu Aç"
              : cls.levelUnlocked === 11 ? "Modül 5A — E & A'yı Aç"
              : cls.levelUnlocked === 12 ? "Modül 5B — Dm & G'yi Aç"
              : cls.levelUnlocked === 13 ? "Modül 5C — F & B7'yi Aç"
              : cls.levelUnlocked === 14 ? "Modül 6A — Em→E→Am→A'yı Aç"
              : cls.levelUnlocked === 15 ? "Modül 6B — Dm→C→G'yi Aç"
              : cls.levelUnlocked === 16 ? "Modül 6C — C→F→Em'i Aç"
              : cls.levelUnlocked === 17 ? "Modül 6D — Em→B7→C→D'yi Aç"
              : "Tüm Seviyeler Açık"}
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
                onClick={handleGenerateSmartboardCode}
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

      {/* Ek öğrenci dialog */}
      <Dialog open={expandOpen} onOpenChange={setExpandOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Ek Öğrenci Kodu Üret</DialogTitle>
            <DialogDescription asChild>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-sm mt-1">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Eklenen kodlar kurum kotanızdan düşülür.</span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <Form {...expandForm}>
            <form onSubmit={expandForm.handleSubmit(handleExpand)} className="space-y-4 mt-2">
              <FormField
                control={expandForm.control}
                name="additional"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Eklenecek Öğrenci Sayısı</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} className="rounded-xl" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="mt-4">
                <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setExpandOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" className="rounded-xl flex-1" disabled={expandClass.isPending}>
                  {expandClass.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Üretiliyor...</> : "Üret"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
