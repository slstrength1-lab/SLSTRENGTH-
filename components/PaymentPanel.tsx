import { AlertTriangle } from "lucide-react";
import { paymentHandles, venmoProfileLink, cashAppPayLink } from "@/lib/payments";
import { qrDataUri } from "@/lib/payments-qr";
import { PayCard } from "./PayCard";

/**
 * Server wrapper for the Pay card. Reads the configured handles, generates the
 * scannable QR codes server-side, and renders the interactive PayCard.
 *
 * If nothing is configured: the client portal shows nothing (no broken UI); the
 * coach view shows a one-line setup hint.
 */
export async function PaymentPanel({
  variant,
  defaultAmount,
  note,
  clientName,
}: {
  variant: "client" | "coach";
  defaultAmount?: number;
  note?: string;
  clientName?: string;
}) {
  const h = paymentHandles();

  if (!h.venmo && !h.cashApp) {
    if (variant === "coach") {
      return (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-[11px] leading-relaxed text-amber-300/90">
          <div className="mb-1 flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" /> Payment links not set up
          </div>
          Add <code className="text-amber-200">VENMO_HANDLE</code> and/or <code className="text-amber-200">CASHAPP_CASHTAG</code> in your Netlify environment variables, then redeploy. The Pay card will appear here and on each client&apos;s portal.
        </div>
      );
    }
    return null;
  }

  const [venmo, cashApp] = await Promise.all([
    h.venmo ? qrDataUri(venmoProfileLink(h.venmo)).then((qr) => ({ handle: h.venmo!, qr })) : Promise.resolve(undefined),
    h.cashApp ? qrDataUri(cashAppPayLink(h.cashApp)).then((qr) => ({ cashtag: h.cashApp!, qr })) : Promise.resolve(undefined),
  ]);

  return <PayCard variant={variant} venmo={venmo} cashApp={cashApp} defaultAmount={defaultAmount} note={note} clientName={clientName} />;
}
