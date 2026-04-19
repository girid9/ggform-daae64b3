import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { syncAppVersion } from "@/lib/appVersion";

// Global version synchronization to clear stale UI state on any route
if (syncAppVersion()) {
  window.location.reload();
}

createRoot(document.getElementById("root")!).render(<App />);
