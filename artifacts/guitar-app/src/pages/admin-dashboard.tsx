import { useQueryClient } from "@tanstack/react-query";
import { useGetAdminStats, getGetAdminStatsQueryKey, useListInstitutions, getListInstitutionsQueryKey, useCreateInstitution, useGenerateTeacherCode } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Users, GraduationCap, School, Copy, LogOut, Loader2 } from "lucide-react";
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

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: stats, isLoading: statsLoading } = useGetAdminStats({ query: { queryKey: getGetAdminStatsQueryKey() } });
  const { data: institutions, isLoading: instLoading } = useListInstitutions({ query: { queryKey: getListInstitutionsQueryKey() } });
  
  const createInst = useCreateInstitution();
  const generateCode = useGenerateTeacherCode();
  
  const [createOpen, setCreateOpen] = useState(false);

  const form = useForm<z.infer<typeof instSchema>>({
    resolver: zodResolver(instSchema),
    defaultValues: { name: "", teacherLimit: 5, studentLimit: 100 },
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

  const handleGenerateCode = (id: string) => {
    generateCode.mutate({ id }, {
      onSuccess: (data) => {
        navigator.clipboard.writeText(data.code);
        toast.success("Kod kopyalandı!", {
          description: `Yeni Öğretmen Kodu: ${data.code}`
        });
        queryClient.invalidateQueries({ queryKey: getListInstitutionsQueryKey() });
      }
    });
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
          {institutions?.map(inst => (
            <Card key={inst.id} className="rounded-3xl border-none shadow-sm hover:shadow-md transition-all">
              <CardHeader>
                <CardTitle className="text-xl">{inst.name}</CardTitle>
                <CardDescription>
                  Öğretmen: {inst.totalTeachers}/{inst.teacherLimit} • Öğrenci: {inst.totalStudents}/{inst.studentLimit}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center p-3 bg-muted rounded-2xl">
                  <div className="text-sm">
                    <span className="font-semibold">{inst.unusedTeacherCodes}</span> kullanılmamış kod
                  </div>
                  <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => handleGenerateCode(inst.id)} disabled={generateCode.isPending}>
                    <Copy className="w-4 h-4 mr-2" /> Kod Üret
                  </Button>
                </div>
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
    </motion.div>
  );
}
