"use client";

import { useJaelMode } from "@/components/providers/jael-mode-provider";

export function JaelModeToggle() {
  const { jaelMode, toggle } = useJaelMode();

  return (
    <button
      onClick={toggle}
      className="rounded-full px-3 py-1 text-xs font-medium transition-all"
      style={
        jaelMode
          ? {
              background: "oklch(0.22 0.02 265)",
              color: "oklch(0.65 0.015 265)",
            }
          : {
              background:
                "linear-gradient(135deg, oklch(0.585 0.233 264 / 18%), oklch(0.65 0.25 350 / 14%), oklch(0.75 0.15 180 / 16%))",
              border: "1px solid oklch(0.585 0.233 264 / 22%)",
              color: "var(--glow-indigo)",
            }
      }
    >
      {jaelMode ? "← Back" : "Jael Mode"}
    </button>
  );
}
