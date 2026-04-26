import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, getGetMeQueryKey, useListMyClasses, getListMyClassesQueryKey, useCreateClass, useGenerateStudentCode, useUnlockNextLevel } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Users, Copy, LockOpen, LogOut, Loader2, School } from "lucide-react";
import { motion } from "framer-motion";
import { pageVariants, pageTransition } from "@/lib/animations";
import { clearToken } from "@/lib/auth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const classSchema = z.object({
  name: z.string().min(2, "Sınıf adı gerekli"),
});

export default function TeacherDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: classes, isLoading } = useListMyClasses({ query: { queryKey: getListMyClassesQueryKey() } });
  
  const createClass = useCreateClass();
  const generateCode = useGenerateStudentCode();
  const unlockLevel = useUnlockNextLevel();
  
  const [createOpen, setCreateOpen] = useState(false);

  const form = useForm<z.infer<typeof classSchema>>({
    resolver: zodResolver(classSchema),
    defaultValues: { name: "" },
  });

  const handleCreateClass = (values: z.infer<typeof classSchema>) => {
    createClass.mutate({ data: values }, {
      onSuccess: () => {
        toast.success("Sınıf oluşturuldu!");
        queryClient.invalidateQueries({ queryKey: getListMyClassesQueryKey() });
        setCreateOpen(false);
        form.reset();
      }
    });
  };

  const handleGenerateCode = (id: string) => {
    generateCode.mutate({ id }, {
      onSuccess: (data) => {
        navigator.clipboard.writeText(data.code);
        toast.success("Öğrenci kodu kopyalandı!", {
          description: `Kod: ${data.code}`
        });
        queryClient.invalidateQueries({ queryKey: getListMyClassesQueryKey() });
      }
    });
  };

  const handleUnlockLevel = (id: string) => {
    unlockLevel.mutate({ id }, {
      onSuccess: () => {
        toast.success("Yeni seviye açıldı! 🎉");
        queryClient.invalidateQueries({ queryKey: getListMyClassesQueryKey() });
      }
    });
  };

  const handleLogout = () => {
    clearToken();
    setLocation("/");
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 p-6 rounded-3xl border border-white backdrop-blur-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
              <School className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Merhaba, {me?.name} Öğretmen</h1>
              <p className="text-muted-foreground">{me?.institutionName}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="rounded-xl">
            <LogOut className="w-4 h-4 mr-2" /> Çıkış
          </Button>
        </header>

        <div className="flex items-center justify-between mt-8">
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
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateClass)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({field}) => (
                    <FormItem><FormLabel>Sınıf Adı</FormLabel><FormControl><Input placeholder="Örn: 5/A" className="rounded-xl" {...field} /></FormControl><FormMessage/></FormItem>
                  )} />
                  <DialogFooter className="mt-6">
                    <Button type="submit" className="w-full rounded-xl" disabled={createClass.isPending}>Oluştur</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes?.map(cls => (
            <Card key={cls.id} className="rounded-3xl border-none shadow-md overflow-hidden bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-br from-primary/5 to-transparent pb-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl font-bold">{cls.name}</CardTitle>
                  <Badge variant="outline" className="bg-white rounded-full">Seviye {cls.levelUnlocked}</Badge>
                </div>
                <CardDescription className="flex items-center mt-2 text-foreground font-medium">
                  <Users className="w-4 h-4 mr-2 text-primary" /> {cls.studentCount} Öğrenci
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="bg-muted p-4 rounded-2xl flex flex-col gap-2">
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">Kullanılmamış Kodlar:</span>
                    <span className="font-bold">{cls.unusedStudentCodes}</span>
                  </div>
                  <Button size="sm" variant="outline" className="w-full rounded-xl border-dashed" onClick={() => handleGenerateCode(cls.id)} disabled={generateCode.isPending}>
                    <Copy className="w-4 h-4 mr-2" /> Öğrenci Kodu Üret
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="bg-primary/5 border-t border-primary/10">
                <Button 
                  className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white shadow-sm" 
                  onClick={() => handleUnlockLevel(cls.id)} 
                  disabled={unlockLevel.isPending}
                >
                  <LockOpen className="w-4 h-4 mr-2" /> {cls.levelUnlocked + 1}. Seviyeyi Aç
                </Button>
              </CardFooter>
            </Card>
          ))}
          {classes?.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <School className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium text-foreground">Henüz sınıfınız yok</h3>
              <p className="text-muted-foreground mt-2">Öğrencilerinizi eklemek için ilk sınıfınızı oluşturun.</p>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
}
