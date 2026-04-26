import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, LogOut, Loader2, Award } from "lucide-react";
import { motion } from "framer-motion";
import { pageVariants, pageTransition } from "@/lib/animations";
import { clearToken } from "@/lib/auth";
import { useLocation } from "wouter";

export default function StudentProfile() {
  const [, setLocation] = useLocation();
  const { data: me, isLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });

  const handleLogout = () => {
    clearToken();
    setLocation("/");
  };

  if (isLoading) {
    return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!me) return null;

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="space-y-6">
      
      <div className="text-center mt-8">
        <div className="w-24 h-24 bg-primary/10 text-primary rounded-[2rem] flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-xl rotate-3">
          <User className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{me.name}</h1>
        <p className="text-muted-foreground">{me.className} • {me.institutionName}</p>
      </div>

      <Card className="rounded-[2rem] border-none shadow-md bg-white/80 backdrop-blur-sm mt-8">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 p-4 bg-secondary/10 rounded-2xl mb-4">
            <Award className="w-8 h-8 text-secondary" />
            <div>
              <p className="text-sm font-bold text-muted-foreground">Rol</p>
              <p className="font-bold text-lg capitalize">{me.role}</p>
            </div>
          </div>
          
          <Button variant="destructive" className="w-full py-6 text-lg rounded-2xl shadow-sm" onClick={handleLogout}>
            <LogOut className="w-5 h-5 mr-2" /> Çıkış Yap
          </Button>
        </CardContent>
      </Card>

    </motion.div>
  );
}
