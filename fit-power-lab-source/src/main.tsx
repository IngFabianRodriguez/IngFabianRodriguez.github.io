import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/App";
import "@/index.css";
import { registerServiceWorker } from "@/lib/serviceWorker";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Only on a production build: it makes the app installable and keeps the map tiles already seen.
void registerServiceWorker();
