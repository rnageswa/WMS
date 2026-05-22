// ─── useOfflineMutation ────────────────────────────────────────────────────────
// Wraps a TanStack Query mutation with offline queueing.
// When offline: persists mutation to IndexedDB queue, shows "saved offline" toast.
// When online: executes the real mutation normally.

import { useCallback } from "react";
import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { enqueueMutation, invalidateCachedQueries } from "@/lib/offline";
import { networkDetector } from "@/lib/offline/network";
import { useToast } from "@/hooks/use-toast";

interface Config<TData, TVariables> {
  mutationFn: (vars: TVariables) => Promise<TData>;
  url: string | ((vars: TVariables) => string);
  method?: string;
  entityType: string;
  entityIdExtractor: (vars: TVariables) => string;
  invalidateKeys?: string[];
  successMessage?: string;
}

export function useOfflineMutation<TData = unknown, TVariables = void>(
  config: Config<TData, TVariables>,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn">
) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const mutationFn = useCallback(
    async (vars: TVariables): Promise<TData> => {
      if (!networkDetector.isOnline) {
        const url = typeof config.url === "function" ? config.url(vars) : config.url;
        await enqueueMutation({
          url,
          method: config.method || "POST",
          body: JSON.stringify(vars),
          headers: { "Content-Type": "application/json" },
          entityType: config.entityType,
          entityId: config.entityIdExtractor(vars),
          clientTimestamp: Date.now(),
        });
        return { queued: true } as TData;
      }
      return config.mutationFn(vars);
    },
    [config]
  );

  return useMutation<TData, Error, TVariables>({
    mutationFn,
    ...options,
    onSuccess: (data, vars, ctx, mutation) => {
      if ((data as any)?.queued) {
        toast({
          title: "Saved offline",
          description: "Will sync when connection is restored.",
        });
      } else {
        if (config.invalidateKeys) {
          config.invalidateKeys.forEach((key) => {
            qc.invalidateQueries({ queryKey: [key] });
            invalidateCachedQueries(key).catch(() => {});
          });
        }
        if (config.successMessage) {
          toast({ title: config.successMessage });
        }
      }
      options?.onSuccess?.(data, vars, ctx, mutation);
    },
    onError: (err, vars, ctx, mutation) => {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Operation failed",
        variant: "destructive",
      });
      options?.onError?.(err, vars, ctx, mutation);
    },
  });
}
