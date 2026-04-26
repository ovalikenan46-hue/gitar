import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useTeacherLogin } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { pageVariants, pageTransition } from "@/lib/animations";
import { Link } from "wouter";

const formSchema = z.object({
  code: z.string().min(1, "Kod gerekli"),
  name: z.string().min(2, "Adınız en az 2 karakter olmalı"),
});

export default function TeacherLogin() {
  const [, setLocation] = useLocation();
  const login = useTeacherLogin();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: "", name: "" },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    login.mutate({ data: values }, {
      onSuccess: (data) => {
        setToken(data.token);
        setLocation("/teacher");
      },
    });
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
            Kurumunuzun sağladığı kod ve adınızla giriş yapın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Öğretmen Kodu</FormLabel>
                    <FormControl>
                      <Input placeholder="Kodunuzu girin" className="text-lg py-6 rounded-2xl bg-white/50" {...field} />
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
                    <FormLabel className="text-base">Adınız Soyadınız</FormLabel>
                    <FormControl>
                      <Input placeholder="Adınızı girin" className="text-lg py-6 rounded-2xl bg-white/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" variant="secondary" className="w-full py-6 text-lg rounded-2xl shadow-md hover:shadow-lg transition-all" disabled={login.isPending}>
                {login.isPending ? "Giriş yapılıyor..." : "Giriş Yap"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
