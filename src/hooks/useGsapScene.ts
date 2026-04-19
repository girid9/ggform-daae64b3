import { DependencyList, RefObject, useLayoutEffect } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

let pluginsRegistered = false;

const ensurePlugins = () => {
  if (!pluginsRegistered) {
    gsap.registerPlugin(ScrollTrigger);
    pluginsRegistered = true;
  }
};

interface UseGsapSceneOptions {
  progressSelector?: string;
  progressValue?: number;
}

export const useGsapScene = (
  scopeRef: RefObject<HTMLElement>,
  deps: DependencyList = [],
  options: UseGsapSceneOptions = {},
) => {
  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const scope = scopeRef.current;
    if (!scope) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const progressNode = options.progressSelector
      ? scope.querySelector<HTMLElement>(options.progressSelector)
      : null;

    if (progressNode) {
      progressNode.style.setProperty("--progress-value", `${options.progressValue ?? 0}`);
    }

    if (prefersReducedMotion) {
      return;
    }

    ensurePlugins();

    const ctx = gsap.context(() => {
      const heroNodes = gsap.utils.toArray<HTMLElement>("[data-hero]");
      const revealNodes = gsap.utils.toArray<HTMLElement>("[data-reveal]");
      const staggerGroups = gsap.utils.toArray<HTMLElement>("[data-stagger]");

      if (heroNodes.length > 0) {
        gsap.from(heroNodes, {
          opacity: 0,
          y: 30,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.08,
          clearProps: "transform",
        });
      }

      staggerGroups.forEach((group) => {
        const children = group.querySelectorAll<HTMLElement>("[data-stagger-item]");
        if (children.length === 0) {
          return;
        }

        gsap.from(children, {
          opacity: 0,
          y: 20,
          duration: 0.55,
          ease: "power2.out",
          stagger: 0.08,
          delay: 0.12,
          clearProps: "transform",
        });
      });

      revealNodes.forEach((node) => {
        gsap.from(node, {
          opacity: 0,
          y: 32,
          duration: 0.7,
          ease: "power3.out",
          clearProps: "transform",
          scrollTrigger: {
            trigger: node,
            start: "top 86%",
            once: true,
          },
        });
      });

      if (progressNode) {
        gsap.fromTo(
          progressNode,
          { "--progress-value": 0 },
          {
            "--progress-value": options.progressValue ?? 0,
            duration: 1.2,
            ease: "power3.out",
          },
        );
      }
    }, scope);

    return () => {
      ctx.revert();
    };
  }, [scopeRef, options.progressSelector, options.progressValue, ...deps]);
};
