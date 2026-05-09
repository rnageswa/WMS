import { useQuery } from "@tanstack/react-query";

/**
 * Hook that fetches the current base currency from the API.
 * Used across the app to format monetary values in the correct currency.
 * Defaults to "USD" if not yet loaded.
 */
export function useBaseCurrency(): string {
  const { data } = useQuery({
    queryKey: ["baseCurrency"],
    queryFn: async () => {
      const res = await fetch("/api/currencies/base");
      if (!res.ok) throw new Error("Failed to fetch base currency");
      const json = await res.json();
      return json.code as string;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return data ?? "USD";
}
