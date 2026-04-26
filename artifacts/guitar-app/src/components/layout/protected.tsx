import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import type { UserRole } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

interface ProtectedProps {
  role?: UserRole;
  children: ReactNode;
}

export function Protected({ role, children }: ProtectedProps) {
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  });

  const notAuthorized =
    !isLoading &&
    (user === undefined || (role !== undefined && user.role !== role));

  useEffect(() => {
    if (notAuthorized) {
      setLocation("/");
    }
  }, [notAuthorized, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notAuthorized) return null;

  return <>{children}</>;
}
