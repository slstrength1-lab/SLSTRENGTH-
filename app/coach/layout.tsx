import { AppShell, COACH_NAV } from "@/components/AppShell";

// Always render against live Notion data (no build-time snapshot).
export const dynamic = "force-dynamic";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      role="coach"
      nav={COACH_NAV}
      user={{ name: "Shane Lanteigne", initials: "SL", sub: "Head Coach" }}
    >
      {children}
    </AppShell>
  );
}
