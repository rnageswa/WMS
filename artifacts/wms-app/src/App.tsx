import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import ProductNew from "@/pages/product-new";
import ProductDetail from "@/pages/product-detail";
import Inventory from "@/pages/inventory";
import InventoryAdjust from "@/pages/inventory-adjust";
import Movements from "@/pages/movements";
import Locations from "@/pages/locations";
import LocationNew from "@/pages/location-new";
import ScanPage from "@/pages/scan";
import ReceivingPage from "@/pages/receiving";
import DispatchPage from "@/pages/dispatch";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/products/new" component={ProductNew} />
      <Route path="/products/:id" component={ProductDetail} />
      <Route path="/products" component={Products} />
      <Route path="/inventory/adjust" component={InventoryAdjust} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/movements" component={Movements} />
      <Route path="/locations/new" component={LocationNew} />
      <Route path="/locations" component={Locations} />
      <Route path="/scan" component={ScanPage} />
      <Route path="/receiving" component={ReceivingPage} />
      <Route path="/dispatch" component={DispatchPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
