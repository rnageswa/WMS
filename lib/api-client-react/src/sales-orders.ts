import { useMutation, useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

// Re-export useGetProducts alias for compatibility
export { useListProducts as useGetProducts } from "./generated/api";

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  status: string;
  currency?: string;
  exchangeRate?: number;
  notes?: string;
  expectedShipDate?: string;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  lineCount?: number;
  totalQty?: number;
}

export interface SalesOrderLine {
  id: string;
  productId: string;
  productName?: string;
  skuCode?: string;
  qtyOrdered: number;
  qtyPicked: number;
  qtyPacked: number;
  qtyShipped: number;
  unitPrice?: number;
  status: string;
}

export interface SalesOrderHistoryEvent {
  id: string;
  orderId: string;
  event: string;
  note?: string;
  createdAt: string;
}

export interface SalesOrderDetail extends SalesOrder {
  lines: SalesOrderLine[];
  history: SalesOrderHistoryEvent[];
}

export interface CreateSalesOrderRequest {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  notes?: string;
  expectedShipDate?: string;
  currency?: string;
  lines: {
    productId: string;
    qtyOrdered: number;
    unitPrice?: number;
  }[];
}

export interface UpdateSalesOrderRequest {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  notes?: string;
  expectedShipDate?: string;
}

// GET /sales-orders
export function useGetSalesOrders(params?: { q?: string; status?: string; customer?: string }) {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  if (params?.status) query.set("status", params.status);
  if (params?.customer) query.set("customer", params.customer);
  const url = `/api/sales-orders${query.toString() ? "?" + query.toString() : ""}`;
  
  return useQuery<SalesOrder[]>({
    queryKey: ["sales-orders", params],
    queryFn: () => customFetch(url, { method: "GET" }),
  });
}

// GET /sales-orders/:id
export function useGetSalesOrder(params: { pathParams: { id: string } }) {
  return useQuery<SalesOrderDetail>({
    queryKey: ["sales-order", params.pathParams.id],
    queryFn: () => customFetch(`/api/sales-orders/${params.pathParams.id}`, { method: "GET" }),
  });
}

// POST /sales-orders
export function useCreateSalesOrder() {
  return useMutation<any, Error, { body: CreateSalesOrderRequest }>({
    mutationFn: ({ body }) => customFetch("/api/sales-orders", { method: "POST", body: JSON.stringify(body) }),
  });
}

// PUT /sales-orders/:id
export function useUpdateSalesOrder() {
  return useMutation<any, Error, { pathParams: { id: string }; body: UpdateSalesOrderRequest }>({
    mutationFn: ({ pathParams, body }) => 
      customFetch(`/api/sales-orders/${pathParams.id}`, { method: "PUT", body: JSON.stringify(body) }),
  });
}

// DELETE /sales-orders/:id
export function useDeleteSalesOrder() {
  return useMutation<any, Error, { pathParams: { id: string } }>({
    mutationFn: ({ pathParams }) => 
      customFetch(`/api/sales-orders/${pathParams.id}`, { method: "DELETE" }),
  });
}

// POST /sales-orders/:id/confirm
export function useConfirmSalesOrder() {
  return useMutation<any, Error, { pathParams: { id: string } }>({
    mutationFn: ({ pathParams }) => 
      customFetch(`/api/sales-orders/${pathParams.id}/confirm`, { method: "POST" }),
  });
}

// POST /sales-orders/:id/start-picking
export function useStartPickingSalesOrder() {
  return useMutation<any, Error, { pathParams: { id: string } }>({
    mutationFn: ({ pathParams }) => 
      customFetch(`/api/sales-orders/${pathParams.id}/start-picking`, { method: "POST" }),
  });
}

// POST /sales-orders/:id/complete-picking
export function useCompletePickingSalesOrder() {
  return useMutation<any, Error, { pathParams: { id: string } }>({
    mutationFn: ({ pathParams }) => 
      customFetch(`/api/sales-orders/${pathParams.id}/complete-picking`, { method: "POST" }),
  });
}

// POST /sales-orders/:id/pack
export function usePackSalesOrder() {
  return useMutation<any, Error, { pathParams: { id: string } }>({
    mutationFn: ({ pathParams }) => 
      customFetch(`/api/sales-orders/${pathParams.id}/pack`, { method: "POST" }),
  });
}

// POST /sales-orders/:id/ship
export function useShipSalesOrder() {
  return useMutation<any, Error, { pathParams: { id: string }; body?: { trackingNumber?: string; carrier?: string } }>({
    mutationFn: ({ pathParams, body }) => 
      customFetch(`/api/sales-orders/${pathParams.id}/ship`, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  });
}

// POST /sales-orders/:id/delivered
export function useDeliverSalesOrder() {
  return useMutation<any, Error, { pathParams: { id: string } }>({
    mutationFn: ({ pathParams }) => 
      customFetch(`/api/sales-orders/${pathParams.id}/delivered`, { method: "POST" }),
  });
}

// POST /sales-orders/:id/cancel
export function useCancelSalesOrder() {
  return useMutation<any, Error, { pathParams: { id: string }; body?: { reason?: string } }>({
    mutationFn: ({ pathParams, body }) => 
      customFetch(`/api/sales-orders/${pathParams.id}/cancel`, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  });
}

// PUT /sales-orders/:id/lines/:lineId/pick
export function useUpdateSalesOrderLinePick() {
  return useMutation<any, Error, { pathParams: { id: string; lineId: string }; body: { qtyPicked: number; binId?: string } }>({
    mutationFn: ({ pathParams, body }) => 
      customFetch(`/api/sales-orders/${pathParams.id}/lines/${pathParams.lineId}/pick`, { method: "PUT", body: JSON.stringify(body) }),
  });
}

// GET /sales-orders/:id/pick-list
export function useGetSalesOrderPickList(params: { pathParams: { id: string } }) {
  return useQuery({
    queryKey: ["sales-order-pick-list", params.pathParams.id],
    queryFn: () => customFetch(`/api/sales-orders/${params.pathParams.id}/pick-list`, { method: "GET" }),
  });
}

// GET /sales-orders/:id/packing-slip
export function useGetSalesOrderPackingSlip(params: { pathParams: { id: string } }) {
  return useQuery({
    queryKey: ["sales-order-packing-slip", params.pathParams.id],
    queryFn: () => customFetch(`/api/sales-orders/${params.pathParams.id}/packing-slip`, { method: "GET" }),
  });
}