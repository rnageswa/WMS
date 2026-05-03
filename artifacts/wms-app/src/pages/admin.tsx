import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, User, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type UserRole = {
  id: string;
  clerkUserId: string;
  role: string;
  displayName: string | null;
  email: string | null;
  createdAt: string;
};

type Me = { userId: string; role: string };

const ROLES = ["admin", "operator", "viewer"] as const;
const ROLE_COLORS: Record<string, string> = {
  admin: "bg-orange-50 text-orange-700 border-orange-200",
  operator: "bg-blue-50 text-blue-700 border-blue-200",
  viewer: "bg-gray-50 text-gray-600 border-gray-200",
};

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, { credentials: "include", ...options });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function AdminPage() {
  const qc = useQueryClient();

  const { data: me } = useQuery<Me>({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch("/api/auth/me"),
  });

  const { data: users = [], isLoading } = useQuery<UserRole[]>({
    queryKey: ["auth", "users"],
    queryFn: () => apiFetch("/api/auth/users"),
    enabled: me?.role === "admin",
  });

  const updateRole = useMutation({
    mutationFn: ({ clerkUserId, role }: { clerkUserId: string; role: string }) =>
      apiFetch(`/api/auth/users/${clerkUserId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auth", "users"] }),
  });

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  if (me?.role !== "admin") {
    return (
      <Layout>
        <PageHeader title="Admin" subtitle="User Management" />
        <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-3 text-center">
          <Shield className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            You need admin privileges to access this page.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="User Management"
        subtitle="Manage who has access to WareIQ and their permission level."
      />
      <div className="p-6 max-w-3xl">
        {/* Role reference */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { role: "admin", desc: "Full access — settings, alerts, reports, user management." },
            { role: "operator", desc: "Warehouse ops — receive, dispatch, transfer, cycle count." },
            { role: "viewer", desc: "Read-only access to inventory and reports." },
          ].map(({ role, desc }) => (
            <Card key={role} className="border border-border">
              <CardContent className="pt-4 pb-3 px-4">
                <span
                  className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full border capitalize mb-2 inline-block",
                    ROLE_COLORS[role]
                  )}
                >
                  {role}
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              Users
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-1">
                {users.length}
              </span>
            </CardTitle>
            <CardDescription>
              Every user who has signed in to WareIQ. The first user is automatically admin.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 bg-muted/40 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No users yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {users.map((u) => {
                  const isMe = u.clerkUserId === me?.userId;
                  const isOpen = openDropdown === u.clerkUserId;

                  return (
                    <div key={u.id} className="flex items-center gap-4 py-3">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {(u.displayName ?? u.email ?? u.clerkUserId)
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {u.displayName ?? u.email ?? u.clerkUserId}
                          {isMe && (
                            <span className="ml-2 text-xs text-muted-foreground font-normal">
                              (you)
                            </span>
                          )}
                        </p>
                        {u.email && u.displayName && (
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        )}
                      </div>

                      {/* Role selector */}
                      <div className="relative shrink-0">
                        <button
                          disabled={isMe || updateRole.isPending}
                          onClick={() => setOpenDropdown(isOpen ? null : u.clerkUserId)}
                          className={cn(
                            "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border capitalize transition-colors",
                            ROLE_COLORS[u.role] ?? ROLE_COLORS.operator,
                            isMe ? "opacity-60 cursor-not-allowed" : "hover:opacity-80 cursor-pointer"
                          )}
                        >
                          {u.role}
                          {!isMe && <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />}
                        </button>

                        {isOpen && !isMe && (
                          <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                            {ROLES.map((role) => (
                              <button
                                key={role}
                                className={cn(
                                  "w-full text-left px-3 py-2 text-xs capitalize hover:bg-muted/60 transition-colors",
                                  role === u.role && "font-semibold text-primary"
                                )}
                                onClick={async () => {
                                  setOpenDropdown(null);
                                  if (role !== u.role) {
                                    await updateRole.mutateAsync({
                                      clerkUserId: u.clerkUserId,
                                      role,
                                    });
                                  }
                                }}
                              >
                                {role}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
