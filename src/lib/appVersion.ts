const APP_VERSION_STORAGE_KEY = "ggform-app-version";
const STALE_UI_STATE_KEYS = ["student-name", "quiz-language-mode"] as const;

export const syncAppVersion = () => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const previousVersion = localStorage.getItem(APP_VERSION_STORAGE_KEY);

    if (previousVersion === __APP_VERSION__) {
      return false;
    }

    STALE_UI_STATE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });

    localStorage.setItem(APP_VERSION_STORAGE_KEY, __APP_VERSION__);
    return previousVersion !== null;
  } catch {
    return false;
  }
};
