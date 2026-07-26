import { AppShell, CLIENT_NAV } from "@/components/AppShell";
import { getCurrentClient } from "@/lib/store";

// Always render against live Notion data (no build-time snapshot).
export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = await getCurrentClient();
  return (
    <AppShell
      role="client"
      nav={CLIENT_NAV}
      user={{
        name: client.name,
        initials: client.avatarInitials,
        sub: "Client · SL Strength",
      }}
    >
      {children}
    </AppShell>
  );
}
