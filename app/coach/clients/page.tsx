import { Users } from "lucide-react";
import { getClients } from "@/lib/store";
import { PageHeader, Card, SectionTitle, EmptyState } from "@/components/primitives";
import { ClientRoster } from "@/components/ClientRoster";
import { AddClientForm } from "@/components/AddClientForm";

export const dynamic = "force-dynamic";

/**
 * Clients roster — the home for the client list and the coach-side "Add Client"
 * form. Reads live via store.getClients; the add form writes through
 * POST /api/clients (UI → API → notion → Notion).
 */
export default async function ClientsPage() {
  const clients = await getClients();
  const active = clients.filter((c) => c.status === "Active" || c.status === "Onboarding").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Roster"
        title="Clients"
        subtitle="Everyone you coach — add a new client or open a Command Center."
        actions={<AddClientForm />}
      />

      <Card className="p-5">
        <SectionTitle right={<span className="text-xs text-zinc-500">{active} active · {clients.length} total</span>}>
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blood-500" /> All clients
          </span>
        </SectionTitle>
        {clients.length ? (
          <ClientRoster clients={clients} />
        ) : (
          <EmptyState title="No clients yet" hint="Use “Add client” above, or convert a lead from the Leads pipeline." />
        )}
      </Card>
    </div>
  );
}
