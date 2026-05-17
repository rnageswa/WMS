import { useUserRole } from "@/hooks/use-user-role";
import type { ReactNode } from "react";

/**
 * RoleGate — hides children if user's role is not in the allowed list.
 * Defaults to showing nothing while role is still loading.
 */
export function RoleGate({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { data } = useUserRole();
  if (!data) return null;
  if (!roles.includes(data.role)) return null;
  return <>{children}</>;
}
