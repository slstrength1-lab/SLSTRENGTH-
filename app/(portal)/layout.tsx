import { AppShell, CLIENT_NAV } from "@/components/AppShell";
import { getCurrentClient } from "@/lib/data";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = getCurrentClient();
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
