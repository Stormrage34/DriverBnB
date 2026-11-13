"use client";

import { useEffect, useRef } from "react";

/**
 * The tagline reveal: each word lifts from 30% ink to full ink as it enters the
 * viewport, in reading order. Under prefers-reduced-motion every word is shown
 * at full colour immediately.
 */
export function TaglineReveal({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const words = Array.from(root.querySelectorAll<HTMLElement>("[data-word]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      words.forEach((word) => word.setAttribute("data-on", "true"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).setAttribute("data-on", "true");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0.1 },
    );
    words.forEach((word) => observer.observe(word));
    return () => observer.disconnect();
  }, []);

  return (
    <p ref={ref} className="max-w-[20ch] text-4xl font-semibold sm:text-5xl">
      {text.split(" ").map((word, index) => (
        <span key={`${word}-${index}`} data-word className="tagline-word mr-[0.25em] inline-block">
          {word}
        </span>
      ))}
    </p>
  );
}
