import { BottomNav } from "@/components/nav/bottom-nav";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { ErrorBoundary } from "@/components/error/error-boundary";
import { JaelModeProvider } from "@/components/providers/jael-mode-provider";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <JaelModeProvider>
        <OfflineIndicator />
        <div className="mx-auto w-full max-w-md pb-20">
          <main className="px-4 py-4">{children}</main>
          <BottomNav />
        </div>
      </JaelModeProvider>
    </ErrorBoundary>
  );
}
