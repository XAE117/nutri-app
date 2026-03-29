"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  useJaelMode,
  JaelHide,
} from "@/components/providers/jael-mode-provider";

export function DashboardActions() {
  const { jaelMode } = useJaelMode();

  return (
    <div className="flex gap-2">
      <JaelHide>
        <Link href="/gallery">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            Gallery
          </Button>
        </Link>
        <Link href="/trends">
          <Button variant="outline" size="sm">
            Trends
          </Button>
        </Link>
      </JaelHide>
      <Link href={jaelMode ? "/log/new/photo" : "/log/new"}>
        <Button
          size="sm"
          className="bg-[#6366f1] hover:bg-[#5558e6] text-white"
        >
          {jaelMode ? "Snap Photo" : "Log Food"}
        </Button>
      </Link>
    </div>
  );
}
