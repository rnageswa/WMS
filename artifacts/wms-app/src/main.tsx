import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { hydrateQueryClient } from "@/lib/queryClient";

// Hydrate QueryClient cache from IndexedDB before rendering
hydrateQueryClient().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
