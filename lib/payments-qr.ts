import QRCode from "qrcode";

/**
 * Server-side QR generation. Renders a scannable SVG (black on white for maximum
 * scanner reliability) as a self-contained data URI — no external image service,
 * no client-side bundle weight. QR encodes the profile/no-amount link, which is
 * the standard "here's my Venmo/Cash App" QR for in-person clients.
 */
export async function qrDataUri(text: string): Promise<string> {
  const svg = await QRCode.toString(text, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0b0b0dff", light: "#ffffffff" },
  });
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
