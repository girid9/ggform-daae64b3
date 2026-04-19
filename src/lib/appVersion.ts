const APP_VERSION_STORAGE_KEY = "ggform-app-version";
const STALE_UI_STATE_KEYS = ["student-name", "quiz-language-mode"] as const;

export const syncAppVersion = () => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const previousVersion = localStorage.getItem(APP_VERSION_STORAGE_KEY);
    
    // If no version is stored, it's either a new user or we need to set the initial version
    if (!previousVersion) {
      localStorage.setItem(APP_VERSION_STORAGE_KEY, __APP_VERSION__);
      return false;
    }

    // If versions match, everything is up to date
    if (previousVersion === __APP_VERSION__) {
      return false;
    }

    // Version mismatch detected!
    console.log(`Version mismatch: ${previousVersion} -> ${__APP_VERSION__}. Clearing stale state.`);

    // Clear specific stale UI keys
    STALE_UI_STATE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });

    // Update the stored version
    localStorage.setItem(APP_VERSION_STORAGE_KEY, __APP_VERSION__);
    
    // Return true to trigger a reload
    return true;
  } catch (error) {
    console.error("Error during version sync:", error);
    return false;
  }
};

/**
 * Force a hard reload from the server, bypassing cache
 */
export const forceHardReload = () => {
  if (typeof window !== "undefined") {
    // Adding a timestamp to the URL can help bypass some caches during reload
    const url = new URL(window.location.href);
    url.searchParams.set('v', Date.now().toString());
    window.location.replace(url.toString());
  }
};
