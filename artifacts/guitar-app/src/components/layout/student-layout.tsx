import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Home, BookOpen, User } from "lucide-react";
import { motion } from "framer-motion";

export function StudentLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const tabs = [
    { href: "/student", icon: Home, label: "Ana Sayfa" },
    { href: "/student/lessons", icon: BookOpen, label: "Dersler" },
    { href: "/student/profile", icon: User, label: "Profil" },
  ];

  return (
    <div className="min-h-screen pb-20 bg-background flex flex-col">
      {/* İçerik — telefonda tam genişlik, tablette/masaüstünde ortalanmış */}
      <div className="flex-1 w-full max-w-2xl mx-auto relative px-4 pt-6 pb-6">
        {children}
      </div>

      {/* Alt navigasyon barı */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-border safe-area-inset-bottom">
        <div className="max-w-2xl mx-auto flex items-center justify-around h-16 px-4">
          {tabs.map((tab) => {
            const isActive = location === tab.href || (tab.href !== "/student" && location.startsWith(tab.href));
            const Icon = tab.icon;
            return (
              <Link key={tab.href} href={tab.href}>
                <button className={`flex flex-col items-center justify-center min-w-[64px] h-full gap-1 transition-colors touch-manipulation ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  <div className="relative">
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-primary/10 rounded-full -m-2"
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-medium mt-1">{tab.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
