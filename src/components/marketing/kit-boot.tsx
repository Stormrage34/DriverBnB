"use client";

import { useEffect } from "react";

/**
 * Mounts the marketing kit's scripts. They are plain ES modules from
 * /public/assets and are not React components, so they have to be injected
 * after hydration — including when the visitor arrives here by client-side
 * navigation, where a <script> tag in the streamed HTML never runs.
 */
const SCRIPTS = [
  "/assets/backgrounds/backgrounds.js",
  "/assets/system.js",
  "/assets/motion/motion.js",
  "/assets/layout/layout.js",
];

export function KitBoot() {
  useEffect(() => {
    const w = window as Window & { __dfKitBooted?: boolean };
    if (w.__dfKitBooted) return;
    w.__dfKitBooted = true;

    let index = 0;
    const next = () => {
      if (index >= SCRIPTS.length) return;
      const src = SCRIPTS[index++];
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      if (src.endsWith("system.js") || src.endsWith("motion.js") || src.endsWith("layout.js")) {
        script.type = "module";
      }
      script.onload = next;
      script.onerror = next;
      document.body.appendChild(script);
    };
    next();
  }, []);

  return null;
}
