import { useQuery } from "@tanstack/react-query";

export interface UserRoleInfo {
  userId: string;
  role: "admin" | "operator" | "viewer";
}

export function useUserRole() {
  return useQuery<UserRoleInfo>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load user info");
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
}
