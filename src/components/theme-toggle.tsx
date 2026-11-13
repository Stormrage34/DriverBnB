"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  THEME_CHOICES,
  THEME_LABELS,
  THEME_STORAGE_KEY,
  isThemeChoice,
  type ThemeChoice,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

// Avoids React's server warning while still running before paint on the client.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function prefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyChoice(choice: ThemeChoice) {
  const dark = choice === "dark" || (choice === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

function readChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeChoice(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function ThemeToggle({ className }: { className?: string }) {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  // The stored choice is only readable in the browser, so adopt it after mount.
  // Re-applying here also repairs the class React clears on the dev remount.
  useIsomorphicLayoutEffect(() => {
    const stored = readChoice();
    setChoice(stored);
    applyChoice(stored);
  }, []);

  // While following the system, react to the OS switching appearance.
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readChoice() === "system") applyChoice("system");
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const next = THEME_CHOICES[(THEME_CHOICES.indexOf(choice) + 1) % THEME_CHOICES.length];
  const Icon = ICONS[choice];

  function cycle() {
    const chosen = next;
    setChoice(chosen);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, chosen);
    } catch {
      // Private browsing with storage disabled: the choice still applies for this page view.
    }
    applyChoice(chosen);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${THEME_LABELS[choice]}. Switch to ${THEME_LABELS[next].toLowerCase()}.`}
      title={`Theme: ${THEME_LABELS[choice]} — click for ${THEME_LABELS[next].toLowerCase()}`}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-ink/[0.05] hover:text-ink",
        className,
      )}
    >
      <Icon size={16} strokeWidth={1.8} aria-hidden />
    </button>
  );
}
