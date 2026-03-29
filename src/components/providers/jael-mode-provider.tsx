"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface JaelModeCtx {
  jaelMode: boolean;
  toggle: () => void;
}

const Ctx = createContext<JaelModeCtx>({ jaelMode: false, toggle: () => {} });

export function useJaelMode() {
  return useContext(Ctx);
}

const STORAGE_KEY = "nutrilens-jael-mode";

export function JaelModeProvider({ children }: { children: ReactNode }) {
  const [jaelMode, setJaelMode] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "1") setJaelMode(true);
  }, []);

  const toggle = useCallback(() => {
    setJaelMode((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ jaelMode, toggle }}>{children}</Ctx.Provider>;
}

/** Hides children when Jael Mode is active. */
export function JaelHide({ children }: { children: ReactNode }) {
  const { jaelMode } = useJaelMode();
  if (jaelMode) return null;
  return <>{children}</>;
}

/** Shows children ONLY when Jael Mode is active. */
export function JaelShow({ children }: { children: ReactNode }) {
  const { jaelMode } = useJaelMode();
  if (!jaelMode) return null;
  return <>{children}</>;
}
