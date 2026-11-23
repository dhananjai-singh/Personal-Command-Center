import { Sidebar } from "@/components/nav/Sidebar";
import { BottomNav } from "@/components/nav/BottomNav";
import { ProfileGate } from "@/components/system/ProfileGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileGate>
      {/* ── Desktop: sidebar + scrollable main ────────────────────────────── */}
      <div className="hidden md:flex min-h-dvh" style={{ background: "var(--bg)" }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
          {children}
        </main>
      </div>

      {/* ── Mobile: full-screen scroll + fixed bottom nav ─────────────────── */}
      <div
        className="flex md:hidden flex-col min-h-dvh"
        style={{ background: "var(--bg)" }}
      >
        <main style={{ flex: 1, overflowY: "auto", paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
          {children}
        </main>
        <BottomNav />
      </div>
    </ProfileGate>
  );
}
