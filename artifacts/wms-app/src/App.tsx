import { useEffect, useRef } from "react";
import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  ClerkProvider,
  Show,
  useClerk,
  useAuth,
} from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";

import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import ProductNew from "@/pages/product-new";
import ProductDetail from "@/pages/product-detail";
import Inventory from "@/pages/inventory";
import InventoryAdjust from "@/pages/inventory-adjust";
import Movements from "@/pages/movements";
import Locations from "@/pages/locations";
import LocationNew from "@/pages/location-new";
import LocationLabelsPage from "@/pages/location-labels";
import ScanPage from "@/pages/scan";
import ReceivingPage from "@/pages/receiving";
import DispatchPage from "@/pages/dispatch";
import TransferPage from "@/pages/transfer";
import ReportsPage from "@/pages/reports";
import CycleCountPage from "@/pages/cycle-count";
import CycleCountSchedulePage from "@/pages/cycle-count-schedule";
import PurchaseOrdersPage from "@/pages/purchase-orders";
import PurchaseOrderNewPage from "@/pages/purchase-order-new";
import ReorderSuggestionsPage from "@/pages/purchase-order-reorder";
import PoTemplatesPage from "@/pages/po-templates";
import PoTemplateNewPage from "@/pages/po-template-new";
import PoTemplateDetailPage from "@/pages/po-template-detail";
import PurchaseOrderDetailPage from "@/pages/purchase-order-detail";
import PurchaseOrderPrintPage from "@/pages/purchase-order-print";
import PurchaseOrderGrnPage from "@/pages/purchase-order-grn";
import SuppliersPage from "@/pages/suppliers";
import SupplierDetailPage from "@/pages/supplier-detail";
import SupplierPerformancePage from "@/pages/supplier-performance";
import AdminPage from "@/pages/admin";
import AdminSettingsPage from "@/pages/admin-settings";
import PriceListsPage from "@/pages/price-lists";
import PriceListNewPage from "@/pages/price-list-new";
import PriceListDetailPage from "@/pages/price-list-detail";
import ReceivingSchedulePage from "@/pages/receiving-schedule";
import SalesOrdersPage from "@/pages/sales-orders";
import SalesOrderNewPage from "@/pages/sales-order-new";
import SalesOrderDetailPage from "@/pages/sales-order-detail";
import SalesOrderPickListPage from "@/pages/sales-order-pick-list";
import SalesOrderPackingSlipPage from "@/pages/sales-order-packing-slip";
import ShippingLabelPage from "@/pages/shipping-label";
import PickerPage from "@/pages/picker";
import SmartReplenishment from "@/pages/smart-replenishment";
import SmartPicking from "@/pages/smart-picking";
import DemandForecast from "@/pages/demand-forecast";
import ReturnsPage from "@/pages/returns";
import ReturnNewPage from "@/pages/return-new";
import ReturnDetailPage from "@/pages/return-detail";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import NotFound from "@/pages/not-found";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

// Clerk JS loads from Clerk CDN (js.clerk.com) in both dev and production.
// Only set proxyUrl when VITE_CLERK_PROXY_URL is explicitly provided (legacy).
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL || "";

// No extra ClerkProvider props needed — pk_test_ keys use the standard Clerk
// FAPI host (encoded in the key itself) which is publicly reachable.
const extraClerkProps: Record<string, unknown> = {};

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "none" as const,
  },
  variables: {
    colorPrimary: "#E8622A",
    colorForeground: "#1a2535",
    colorMutedForeground: "#68778d",
    colorDanger: "#ef4444",
    colorBackground: "#ffffff",
    colorInput: "#f1f5f9",
    colorInputForeground: "#1a2535",
    colorNeutral: "#cbd5e1",
    fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#0F2540] font-bold",
    headerSubtitle: "text-[#68778d]",
    socialButtonsBlockButtonText: "text-[#1a2535] font-medium",
    formFieldLabel: "text-[#1a2535] font-medium text-sm",
    footerActionLink: "text-[#E8622A] font-medium",
    footerActionText: "text-[#68778d]",
    dividerText: "text-[#68778d]",
    identityPreviewEditButton: "text-[#E8622A]",
    formFieldSuccessText: "text-green-600",
    alertText: "text-[#1a2535]",
    socialButtonsBlockButton: "border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-[#1a2535]",
    formButtonPrimary: "bg-[#E8622A] hover:bg-[#d4521a] text-white font-semibold",
    formFieldInput: "bg-[#f1f5f9] border-[#e2e8f0] text-[#1a2535] placeholder:text-[#94a3b8]",
    footerAction: "bg-[#f8fafc] border-t border-[#e2e8f0]",
    dividerLine: "bg-[#e2e8f0]",
    alert: "bg-[#fef2f2] border border-[#fecaca]",
    otpCodeFieldInput: "border-[#e2e8f0] text-[#1a2535]",
    formFieldRow: "",
    main: "",
    logoBox: "hidden",
    logoImage: "hidden",
  },
};

// Invalidates query cache when the signed-in user changes
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  return <>{children}</>;
}

function AppRouter() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      {...extraClerkProps}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to access WareIQ",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Get started with WareIQ",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            {/* Public auth routes */}
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />

            {/* Home — redirect signed-in users to dashboard */}
            <Route path="/">
              <Show when="signed-in"><Dashboard /></Show>
              <Show when="signed-out"><Redirect to="/sign-in" /></Show>
            </Route>

            {/* All protected routes */}
            <Route path="/products/new"><AuthGuard><ProductNew /></AuthGuard></Route>
            <Route path="/products/:id">
              {(params) => <AuthGuard><ProductDetail params={params as { id: string }} /></AuthGuard>}
            </Route>
            <Route path="/products"><AuthGuard><Products /></AuthGuard></Route>
            <Route path="/inventory/adjust"><AuthGuard><InventoryAdjust /></AuthGuard></Route>
            <Route path="/inventory"><AuthGuard><Inventory /></AuthGuard></Route>
            <Route path="/movements"><AuthGuard><Movements /></AuthGuard></Route>
            <Route path="/locations/labels"><AuthGuard><LocationLabelsPage /></AuthGuard></Route>
            <Route path="/locations/new"><AuthGuard><LocationNew /></AuthGuard></Route>
            <Route path="/locations"><AuthGuard><Locations /></AuthGuard></Route>
            <Route path="/scan"><AuthGuard><ScanPage /></AuthGuard></Route>
            <Route path="/receiving"><AuthGuard><ReceivingPage /></AuthGuard></Route>
            <Route path="/dispatch"><AuthGuard><DispatchPage /></AuthGuard></Route>
            <Route path="/transfer"><AuthGuard><TransferPage /></AuthGuard></Route>
            <Route path="/reports"><AuthGuard><ReportsPage /></AuthGuard></Route>
            <Route path="/cycle-count/schedule"><AuthGuard><CycleCountSchedulePage /></AuthGuard></Route>
            <Route path="/cycle-count"><AuthGuard><CycleCountPage /></AuthGuard></Route>
            <Route path="/purchase-orders/schedule"><AuthGuard><ReceivingSchedulePage /></AuthGuard></Route>
            <Route path="/purchase-orders/reorder"><AuthGuard><ReorderSuggestionsPage /></AuthGuard></Route>
            <Route path="/purchase-orders/templates/new"><AuthGuard><PoTemplateNewPage /></AuthGuard></Route>
            <Route path="/purchase-orders/templates/:id"><AuthGuard><PoTemplateDetailPage /></AuthGuard></Route>
            <Route path="/purchase-orders/templates"><AuthGuard><PoTemplatesPage /></AuthGuard></Route>
            <Route path="/purchase-orders/new"><AuthGuard><PurchaseOrderNewPage /></AuthGuard></Route>
            <Route path="/purchase-orders/:id/print"><AuthGuard><PurchaseOrderPrintPage /></AuthGuard></Route>
            <Route path="/purchase-orders/:id/grn"><AuthGuard><PurchaseOrderGrnPage /></AuthGuard></Route>
            <Route path="/purchase-orders/:id"><AuthGuard><PurchaseOrderDetailPage /></AuthGuard></Route>
            <Route path="/purchase-orders"><AuthGuard><PurchaseOrdersPage /></AuthGuard></Route>
            <Route path="/sales-orders/new"><AuthGuard><SalesOrderNewPage /></AuthGuard></Route>
            <Route path="/sales-orders/:id/pick-list"><AuthGuard><SalesOrderPickListPage /></AuthGuard></Route>
            <Route path="/sales-orders/:id/packing-slip"><AuthGuard><SalesOrderPackingSlipPage /></AuthGuard></Route>
            <Route path="/sales-orders/:id/shipping-label"><AuthGuard><ShippingLabelPage /></AuthGuard></Route>
            <Route path="/sales-orders/:id"><AuthGuard><SalesOrderDetailPage /></AuthGuard></Route>
            <Route path="/sales-orders"><AuthGuard><SalesOrdersPage /></AuthGuard></Route>
            <Route path="/picker"><AuthGuard><PickerPage /></AuthGuard></Route>
            <Route path="/smart-replenishment"><AuthGuard><SmartReplenishment /></AuthGuard></Route>
            <Route path="/smart-picking"><AuthGuard><SmartPicking /></AuthGuard></Route>
            <Route path="/demand-forecast"><AuthGuard><DemandForecast /></AuthGuard></Route>
            <Route path="/returns/new"><AuthGuard><ReturnNewPage /></AuthGuard></Route>
            <Route path="/returns/:id"><AuthGuard><ReturnDetailPage /></AuthGuard></Route>
            <Route path="/returns"><AuthGuard><ReturnsPage /></AuthGuard></Route>
            <Route path="/suppliers/performance"><AuthGuard><SupplierPerformancePage /></AuthGuard></Route>
            <Route path="/suppliers/:id"><AuthGuard><SupplierDetailPage /></AuthGuard></Route>
            <Route path="/suppliers"><AuthGuard><SuppliersPage /></AuthGuard></Route>
            <Route path="/admin/settings"><AuthGuard><AdminSettingsPage /></AuthGuard></Route>
            <Route path="/admin"><AuthGuard><AdminPage /></AuthGuard></Route>
            <Route path="/price-lists/new"><AuthGuard><PriceListNewPage /></AuthGuard></Route>
            <Route path="/price-lists/:id"><AuthGuard><PriceListDetailPage /></AuthGuard></Route>
            <Route path="/price-lists"><AuthGuard><PriceListsPage /></AuthGuard></Route>

            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AppRouter />
    </WouterRouter>
  );
}

export default App;
