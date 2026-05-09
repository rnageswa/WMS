import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type {
  PriceList,
  PriceListItem,
  CreatePriceListBody,
  UpdatePriceListBody,
  CreatePriceListItemBody,
  UpdatePriceListItemBody,
  DefaultPriceResponse,
} from "./generated/api.schemas";

// ── Price Lists ──────────────────────────────────────────────────────────────────

// GET /api/price-lists
export function useGetPriceLists(params?: { isActive?: boolean }) {
  const query = new URLSearchParams();
  if (params?.isActive !== undefined) query.set("isActive", String(params.isActive));
  const url = `/api/price-lists${query.toString() ? "?" + query.toString() : ""}`;

  return useQuery<PriceList[]>({
    queryKey: ["price-lists", params],
    queryFn: () => customFetch(url, { method: "GET" }),
  });
}

// POST /api/price-lists
export function useCreatePriceList() {
  const qc = useQueryClient();
  return useMutation<PriceList, Error, { body: CreatePriceListBody }>({
    mutationFn: ({ body }) =>
      customFetch("/api/price-lists", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["price-lists"] }),
  });
}

// PUT /api/price-lists/:id
export function useUpdatePriceList() {
  const qc = useQueryClient();
  return useMutation<PriceList, Error, { pathParams: { id: string }; body: UpdatePriceListBody }>({
    mutationFn: ({ pathParams, body }) =>
      customFetch(`/api/price-lists/${pathParams.id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["price-lists"] }),
  });
}

// DELETE /api/price-lists/:id (soft delete)
export function useDeletePriceList() {
  const qc = useQueryClient();
  return useMutation<PriceList, Error, { pathParams: { id: string } }>({
    mutationFn: ({ pathParams }) =>
      customFetch(`/api/price-lists/${pathParams.id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["price-lists"] }),
  });
}

// ── Price List Items ─────────────────────────────────────────────────────────────

// GET /api/price-lists/:id/items
export function useGetPriceListItems(params: { pathParams: { id: string } }) {
  return useQuery<PriceListItem[]>({
    queryKey: ["price-list-items", params.pathParams.id],
    queryFn: () => customFetch(`/api/price-lists/${params.pathParams.id}/items`, { method: "GET" }),
  });
}

// POST /api/price-lists/:id/items
export function useCreatePriceListItem() {
  const qc = useQueryClient();
  return useMutation<
    PriceListItem,
    Error,
    { pathParams: { id: string }; body: CreatePriceListItemBody }
  >({
    mutationFn: ({ pathParams, body }) =>
      customFetch(`/api/price-lists/${pathParams.id}/items`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["price-list-items", vars.pathParams.id] }),
  });
}

// PUT /api/price-lists/:id/items/:itemId
export function useUpdatePriceListItem() {
  const qc = useQueryClient();
  return useMutation<
    PriceListItem,
    Error,
    { pathParams: { id: string; itemId: string }; body: UpdatePriceListItemBody }
  >({
    mutationFn: ({ pathParams, body }) =>
      customFetch(`/api/price-lists/${pathParams.id}/items/${pathParams.itemId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["price-list-items", vars.pathParams.id] }),
  });
}

// DELETE /api/price-lists/:id/items/:itemId
export function useDeletePriceListItem() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { pathParams: { id: string; itemId: string } }
  >({
    mutationFn: ({ pathParams }) =>
      customFetch(`/api/price-lists/${pathParams.id}/items/${pathParams.itemId}`, { method: "DELETE" }),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["price-list-items", vars.pathParams.id] }),
  });
}

// ── Default Price Lookup ─────────────────────────────────────────────────────────

// GET /api/price-lists/default/:productId
export function useGetDefaultPrice(params: { pathParams: { productId: string } }) {
  return useQuery<DefaultPriceResponse>({
    queryKey: ["default-price", params.pathParams.productId],
    queryFn: () =>
      customFetch(`/api/price-lists/default/${params.pathParams.productId}`, { method: "GET" }),
  });
}
