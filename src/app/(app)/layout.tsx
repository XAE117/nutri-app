import { BottomNav } from "@/components/nav/bottom-nav";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md pb-20">
      <main className="px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}
