import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { syncAppVersion, forceHardReload } from "@/lib/appVersion";

// Global version synchronization to clear stale UI state on any route
// If a version mismatch is detected, we trigger a hard reload to fetch the latest assets
if (syncAppVersion()) {
  console.log("Version mismatch detected. Performing hard reload...");
  forceHardReload();
}

createRoot(document.getElementById("root")!).render(<App />);
