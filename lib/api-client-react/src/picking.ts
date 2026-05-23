import { useMutation, useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

// ── Interfaces ───────────────────────────────────────────────────────────

export interface PickingTask {
  id: string;
  orderId: string;
  status: string;
  assignedTo?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  orderNumber?: string;
  customerName?: string;
  lines?: PickingLine[];
}

export interface PickingLine {
  id: string;
  taskId: string;
  orderLineId: string;
  productId: string;
  binId?: string;
  qtyToPick: number;
  qtyPicked: number;
  status: string;
  pickedAt?: string;
  createdAt: string;
  skuCode?: string;
  productName?: string;
  binCode?: string;
  binName?: string;
}

export interface CreatePickingTaskRequest {
  orderId: string;
  assignedTo?: string;
  laborEntryId?: string;
}

export interface AssignPickingTaskRequest {
  assignedTo: string;
}

export interface PickPickingLineRequest {
  qtyPicked: number;
  binId?: string;
}

// ── Queries ────────────────────────────────────────────────────────────

// GET /picking-tasks
export function useGetPickingTasks(params?: {
  status?: string;
  assignedTo?: string;
  orderId?: string;
}) {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.assignedTo) query.set("assignedTo", params.assignedTo);
  if (params?.orderId) query.set("orderId", params.orderId);
  const url = `/api/picking-tasks${query.toString() ? "?" + query.toString() : ""}`;

  return useQuery<PickingTask[]>({
    queryKey: ["picking-tasks", params],
    queryFn: () => customFetch(url, { method: "GET" }),
  });
}

// GET /picking-tasks/:id
export function useGetPickingTask(
  params: { pathParams: { id: string } },
  options?: { query?: { enabled?: boolean } }
) {
  return useQuery<PickingTask>({
    queryKey: ["picking-task", params.pathParams.id],
    queryFn: () =>
      customFetch(`/api/picking-tasks/${params.pathParams.id}`, { method: "GET" }),
    enabled: options?.query?.enabled !== false,
  });
}

// ── Mutations ──────────────────────────────────────────────────────────

// POST /picking-tasks
export function useCreatePickingTask() {
  return useMutation<any, Error, { body: CreatePickingTaskRequest }>({
    mutationFn: ({ body }) =>
      customFetch("/api/picking-tasks", { method: "POST", body: JSON.stringify(body) }),
  });
}

// PUT /picking-tasks/:id/assign
export function useAssignPickingTask() {
  return useMutation<any, Error, { pathParams: { id: string }; body: AssignPickingTaskRequest }>({
    mutationFn: ({ pathParams, body }) =>
      customFetch(`/api/picking-tasks/${pathParams.id}/assign`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
  });
}

// PUT /picking-tasks/:id/start
export function useStartPickingTask() {
  return useMutation<any, Error, { pathParams: { id: string } }>({
    mutationFn: ({ pathParams }) =>
      customFetch(`/api/picking-tasks/${pathParams.id}/start`, { method: "PUT" }),
  });
}

// PUT /picking-tasks/:id/complete
export function useCompletePickingTask() {
  return useMutation<any, Error, { pathParams: { id: string } }>({
    mutationFn: ({ pathParams }) =>
      customFetch(`/api/picking-tasks/${pathParams.id}/complete`, { method: "PUT" }),
  });
}

// PUT /picking-tasks/:id/cancel
export function useCancelPickingTask() {
  return useMutation<any, Error, { pathParams: { id: string } }>({
    mutationFn: ({ pathParams }) =>
      customFetch(`/api/picking-tasks/${pathParams.id}/cancel`, { method: "PUT" }),
  });
}

// PUT /picking-tasks/:id/lines/:lineId/pick
export function usePickPickingLine() {
  return useMutation<any, Error, { pathParams: { id: string; lineId: string }; body: PickPickingLineRequest }>({
    mutationFn: ({ pathParams, body }) =>
      customFetch(`/api/picking-tasks/${pathParams.id}/lines/${pathParams.lineId}/pick`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
  });
}
