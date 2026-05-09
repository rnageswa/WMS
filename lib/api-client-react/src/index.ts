export * from "./generated/api";
export * from "./generated/api.schemas";
// Export only the custom hooks, not the interfaces that duplicate generated ones
export {
  useGetProducts,
  useCreateSalesOrder,
  useGetSalesOrders,
  useGetSalesOrder,
  useDeleteSalesOrder,
  useUpdateSalesOrder,
  useConfirmSalesOrder,
  useStartPickingSalesOrder,
  useCompletePickingSalesOrder,
  usePackSalesOrder,
  useShipSalesOrder,
  useDeliverSalesOrder,
  useCancelSalesOrder,
  useUpdateSalesOrderLinePick,
  useGetSalesOrderPickList,
  useGetSalesOrderPackingSlip,
} from "./sales-orders";
export {
  useGetPickingTasks,
  useGetPickingTask,
  useCreatePickingTask,
  useAssignPickingTask,
  useStartPickingTask,
  useCompletePickingTask,
  useCancelPickingTask,
  usePickPickingLine,
} from "./picking";
export {
  useGetPriceLists,
  useCreatePriceList,
  useUpdatePriceList,
  useDeletePriceList,
  useGetPriceListItems,
  useCreatePriceListItem,
  useUpdatePriceListItem,
  useDeletePriceListItem,
  useGetDefaultPrice,
} from "./pricing";
export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";
