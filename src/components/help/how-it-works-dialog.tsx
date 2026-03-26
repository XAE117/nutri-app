"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function HowItWorksDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
          />
        }
      >
        <HelpCircle className="size-4" />
        <span className="sr-only">How this app works</span>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How NutriLens Works</DialogTitle>
          <DialogDescription>
            Your AI-powered food tracking companion
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-muted-foreground">
          {/* ── Core Loop ── */}
          <Section title="Dashboard">
            Your home screen shows today&apos;s calorie gauge, macro breakdown,
            and food entries. The gauge fills as you log&mdash;green marker is
            your daily target.
          </Section>

          <Section title="Log Food">
            Six ways to log: snap a <Strong>photo</Strong> and AI reads it,
            scan a <Strong>barcode</Strong>, photograph a{" "}
            <Strong>nutrition label</Strong>, <Strong>search</Strong> a food
            database, pick a <Strong>restaurant</Strong> menu item, or go{" "}
            <Strong>manual</Strong>. Tap &ldquo;Log Food&rdquo; on the
            dashboard to choose.
          </Section>

          <Section title="Entry Details">
            Tap any logged entry to see the full breakdown&mdash;individual
            items, per-item macros, and confidence score. You can edit or delete
            from here.
          </Section>

          {/* ── Soft divider ── */}
          <p className="py-1 text-center text-xs text-muted-foreground/60 italic">
            That covers the basics. Keep reading for the intelligence layer.
          </p>

          {/* ── Intelligence ── */}
          <Section title="Trends">
            Calorie and macro charts over the last 7 or 30 days. Spot patterns,
            see weekly averages, and track consistency.
          </Section>

          <Section title="Coaching">
            AI-generated insights based on your logging patterns. Personalized
            nudges, meal balance feedback, and habit observations.
          </Section>

          <Section title="Weight">
            Log weigh-ins and see your trend line over time. Weight data
            enriches coaching insights.
          </Section>

          {/* ── Extras ── */}
          <Section title="Recipes">
            Save and reuse custom meals with known macros for one-tap logging.
          </Section>

          <Section title="Gallery">
            Browse all your food photos in one place.
          </Section>

          <Section title="Household">
            Share a household with family members to coordinate meals and see
            each other&apos;s logs.
          </Section>

          <Section title="Settings">
            Set calorie and macro targets, manage your profile, and configure
            preferences.
          </Section>

          {/* ── Quick Tips ── */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
            <p className="text-xs font-medium text-foreground">Quick Tips</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                Photo logging is fastest&mdash;AI identifies multiple items in
                one shot.
              </li>
              <li>
                Re-log recent meals from the &ldquo;Quick Relog&rdquo; row on
                the dashboard.
              </li>
              <li>
                Check Coaching weekly for personalized feedback as data builds
                up.
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground mb-0.5">{title}</p>
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="text-foreground font-medium">{children}</span>;
}
