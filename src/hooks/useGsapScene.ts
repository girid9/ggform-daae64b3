import { DependencyList, RefObject, useLayoutEffect } from "react";

interface UseGsapSceneOptions {
  progressSelector?: string;
  progressValue?: number;
}

/**
 * Animations have been disabled for performance.
 * This hook now only syncs the progress CSS variable (no GSAP work).
 */
export const useGsapScene = (
  scopeRef: RefObject<HTMLElement>,
  deps: DependencyList = [],
  options: UseGsapSceneOptions = {},
) => {
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const scope = scopeRef.current;
    if (!scope) return;

    if (options.progressSelector) {
      const progressNode = scope.querySelector<HTMLElement>(options.progressSelector);
      if (progressNode) {
        progressNode.style.setProperty("--progress-value", `${options.progressValue ?? 0}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeRef, options.progressSelector, options.progressValue, ...deps]);
};
