import { AppShell, COACH_NAV } from "@/components/AppShell";

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
